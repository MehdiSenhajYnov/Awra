/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include "platform/awra-diagnostics-private.h"
#include "platform/awra-effect-backend-private.h"
#include "platform/awra-effect-coordinator-private.h"

typedef struct {
  GtkNative *native;
  AwraMaterial *material;
  double radius;
  gpointer backend_handle;
  gboolean applied;
  char *error;
} TrackedNative;

struct _AwraEffectCoordinator {
  GdkDisplay *display;
  AwraStyleManager *style_manager;
  AwraDiagnostics *diagnostics;
  AwraEffectBackend *backend;
  GHashTable *tracked;
  gulong style_handler;
};

static void sync_tracked (AwraEffectCoordinator *self,
                          TrackedNative         *tracked);

static const char *
fallback_reason (AwraEffectCoordinator *self)
{
  GHashTableIter iter;
  gpointer value;

  if (g_getenv ("AWRA_FORCE_FALLBACK") != NULL)
    return "forced by AWRA_FORCE_FALLBACK";
  if (!self->backend->interface_announced)
    return "ext-background-effect-v1 is not announced";
  if (!(self->backend->capabilities & AWRA_EFFECT_CAPABILITY_BLUR))
    return "the compositor did not advertise blur";
  if (awra_style_manager_get_reduced_transparency (self->style_manager))
    return "reduced transparency is enabled";

  g_hash_table_iter_init (&iter, self->tracked);
  while (g_hash_table_iter_next (&iter, NULL, &value)) {
    TrackedNative *tracked = value;
    if (tracked->error != NULL)
      return tracked->error;
  }
  return NULL;
}

static void
update_diagnostics (AwraEffectCoordinator *self)
{
  GHashTableIter iter;
  gpointer value;
  guint effects = 0;

  g_hash_table_iter_init (&iter, self->tracked);
  while (g_hash_table_iter_next (&iter, NULL, &value)) {
    TrackedNative *tracked = value;
    if (tracked->applied)
      effects++;
  }

  awra_diagnostics_set_backend (self->diagnostics,
                                self->backend->name,
                                self->backend->interface_announced,
                                self->backend->capabilities,
                                fallback_reason (self));
  awra_diagnostics_set_counts (self->diagnostics,
                               g_hash_table_size (self->tracked),
                               effects);
}

static void
native_gone_cb (gpointer data,
                GObject *where_the_object_was)
{
  AwraEffectCoordinator *self = data;
  TrackedNative *tracked = g_hash_table_lookup (self->tracked, where_the_object_was);

  if (tracked != NULL) {
    if (tracked->backend_handle != NULL)
      self->backend->clear (self->backend, tracked->backend_handle, NULL);
    g_clear_object (&tracked->material);
    g_clear_pointer (&tracked->error, g_free);
    g_hash_table_steal (self->tracked, where_the_object_was);
    g_free (tracked);
    update_diagnostics (self);
  }
}

static void
remove_tracked (AwraEffectCoordinator *self,
                GtkNative             *native)
{
  TrackedNative *tracked = g_hash_table_lookup (self->tracked, native);

  if (tracked == NULL)
    return;

  g_object_weak_unref (G_OBJECT (native), native_gone_cb, self);
  if (tracked->backend_handle != NULL)
    self->backend->clear (self->backend,
                          tracked->backend_handle,
                          gtk_native_get_surface (native));
  g_clear_object (&tracked->material);
  g_clear_pointer (&tracked->error, g_free);
  g_hash_table_steal (self->tracked, native);
  g_free (tracked);
}

static void
sync_tracked (AwraEffectCoordinator *self,
              TrackedNative         *tracked)
{
  GdkSurface *surface;
  gboolean wants_blur;
  int width;
  int height;
  g_autoptr (GError) error = NULL;

  surface = gtk_native_get_surface (tracked->native);
  if (surface == NULL)
    return;

  width = gdk_surface_get_width (surface);
  height = gdk_surface_get_height (surface);
  wants_blur = awra_material_requests_blur (tracked->material) &&
               awra_effect_coordinator_has_blur (self) &&
               !awra_style_manager_get_reduced_transparency (self->style_manager);

  if (!wants_blur) {
    if (tracked->backend_handle != NULL) {
      self->backend->clear (self->backend, tracked->backend_handle, surface);
      tracked->backend_handle = NULL;
    }
    tracked->applied = FALSE;
    g_clear_pointer (&tracked->error, g_free);
    return;
  }

  if (tracked->backend_handle == NULL) {
    tracked->backend_handle = self->backend->apply (self->backend,
                                                    surface,
                                                    width,
                                                    height,
                                                    (int) tracked->radius,
                                                    &error);
    tracked->applied = tracked->backend_handle != NULL;
  } else {
    tracked->applied = self->backend->update (self->backend,
                                              tracked->backend_handle,
                                              surface,
                                              width,
                                              height,
                                              (int) tracked->radius,
                                              &error);
  }

  if (error != NULL) {
    g_warning ("Native background effect failed: %s; using solid fallback",
               error->message);
    if (tracked->backend_handle != NULL) {
      self->backend->clear (self->backend, tracked->backend_handle, surface);
      tracked->backend_handle = NULL;
    }
    tracked->applied = FALSE;
    g_free (tracked->error);
    tracked->error = g_strdup_printf ("native effect failed: %s", error->message);
  } else if (tracked->applied) {
    g_clear_pointer (&tracked->error, g_free);
  }
}

static void
resync_all (AwraEffectCoordinator *self)
{
  GHashTableIter iter;
  gpointer value;

  g_hash_table_iter_init (&iter, self->tracked);
  while (g_hash_table_iter_next (&iter, NULL, &value))
    sync_tracked (self, value);
  update_diagnostics (self);
}

static void
style_changed_cb (AwraStyleManager     *manager,
                  GParamSpec           *pspec,
                  AwraEffectCoordinator *self)
{
  (void) manager;
  (void) pspec;
  resync_all (self);
}

static void
capabilities_changed_cb (AwraEffectBackend     *backend,
                         AwraEffectCapability  capabilities,
                         gpointer              user_data)
{
  AwraEffectCoordinator *self = user_data;

  backend->capabilities = capabilities;
  resync_all (self);
}

AwraEffectCoordinator *
awra_effect_coordinator_new (GdkDisplay       *display,
                             AwraStyleManager *style_manager,
                             AwraDiagnostics  *diagnostics)
{
  AwraEffectCoordinator *self;
  g_autoptr (GError) error = NULL;

  g_return_val_if_fail (GDK_IS_DISPLAY (display), NULL);
  g_return_val_if_fail (AWRA_IS_STYLE_MANAGER (style_manager), NULL);
  g_return_val_if_fail (AWRA_IS_DIAGNOSTICS (diagnostics), NULL);

  self = g_new0 (AwraEffectCoordinator, 1);
  self->display = display;
  self->style_manager = g_object_ref (style_manager);
  self->diagnostics = g_object_ref (diagnostics);
  self->tracked = g_hash_table_new (g_direct_hash, g_direct_equal);
#ifdef AWRA_HAVE_WAYLAND_EFFECTS
  if (g_getenv ("AWRA_FORCE_FALLBACK") == NULL)
    self->backend = awra_wayland_effect_backend_new (display, &error);
#endif
  if (self->backend == NULL) {
    if (error != NULL)
      g_message ("Wayland effects unavailable: %s", error->message);
    self->backend = awra_generic_effect_backend_new ();
  }

  self->backend->capabilities_changed = capabilities_changed_cb;
  self->backend->capabilities_changed_data = self;
  self->style_handler = g_signal_connect (style_manager,
                                          "notify::reduced-transparency",
                                          G_CALLBACK (style_changed_cb),
                                          self);
  update_diagnostics (self);
  g_message ("Effect backend: %s (interface=%s, blur=%s)",
             self->backend->name,
             self->backend->interface_announced ? "yes" : "no",
             (self->backend->capabilities & AWRA_EFFECT_CAPABILITY_BLUR) ? "yes" : "no");

  return self;
}

void
awra_effect_coordinator_free (AwraEffectCoordinator *self)
{
  GHashTableIter iter;
  gpointer value;

  if (self == NULL)
    return;

  g_signal_handler_disconnect (self->style_manager, self->style_handler);
  g_hash_table_iter_init (&iter, self->tracked);
  while (g_hash_table_iter_next (&iter, NULL, &value)) {
    TrackedNative *tracked = value;
    g_object_weak_unref (G_OBJECT (tracked->native), native_gone_cb, self);
    if (tracked->backend_handle != NULL)
      self->backend->clear (self->backend,
                            tracked->backend_handle,
                            gtk_native_get_surface (tracked->native));
    g_clear_object (&tracked->material);
    g_clear_pointer (&tracked->error, g_free);
    g_free (tracked);
  }
  g_hash_table_destroy (self->tracked);
  self->backend->destroy (self->backend);
  g_clear_object (&self->style_manager);
  g_clear_object (&self->diagnostics);
  g_free (self);
}

void
awra_effect_coordinator_attach (AwraEffectCoordinator *self,
                                GtkNative             *native,
                                AwraMaterial          *material,
                                double                 radius)
{
  TrackedNative *tracked;

  g_return_if_fail (self != NULL);
  g_return_if_fail (GTK_IS_NATIVE (native));
  g_return_if_fail (AWRA_IS_MATERIAL (material));

  tracked = g_hash_table_lookup (self->tracked, native);
  if (tracked == NULL) {
    tracked = g_new0 (TrackedNative, 1);
    tracked->native = native;
    tracked->material = g_object_ref (material);
    tracked->radius = radius;
    g_hash_table_insert (self->tracked, native, tracked);
    g_object_weak_ref (G_OBJECT (native), native_gone_cb, self);
  } else {
    g_set_object (&tracked->material, material);
    tracked->radius = radius;
  }

  sync_tracked (self, tracked);
  update_diagnostics (self);
}

void
awra_effect_coordinator_update (AwraEffectCoordinator *self,
                                GtkNative             *native,
                                AwraMaterial          *material,
                                double                 radius)
{
  TrackedNative *tracked;

  g_return_if_fail (self != NULL);
  g_return_if_fail (GTK_IS_NATIVE (native));
  g_return_if_fail (AWRA_IS_MATERIAL (material));

  tracked = g_hash_table_lookup (self->tracked, native);
  if (tracked == NULL) {
    awra_effect_coordinator_attach (self, native, material, radius);
    return;
  }

  g_set_object (&tracked->material, material);
  tracked->radius = radius;
  sync_tracked (self, tracked);
  update_diagnostics (self);
}

void
awra_effect_coordinator_detach (AwraEffectCoordinator *self,
                                GtkNative             *native)
{
  g_return_if_fail (self != NULL);
  g_return_if_fail (GTK_IS_NATIVE (native));

  remove_tracked (self, native);
  update_diagnostics (self);
}

gboolean
awra_effect_coordinator_has_blur (AwraEffectCoordinator *self)
{
  g_return_val_if_fail (self != NULL, FALSE);
  return (self->backend->capabilities & AWRA_EFFECT_CAPABILITY_BLUR) != 0;
}
