/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include <math.h>
#include <gdk/wayland/gdkwayland.h>

#include "ext-background-effect-v1-client-protocol.h"
#include "platform/awra-effect-backend-private.h"

typedef struct {
  AwraEffectBackend parent;
  struct wl_display *wl_display;
  struct wl_compositor *compositor;
  struct ext_background_effect_manager_v1 *manager;
} WaylandBackend;

typedef struct {
  struct ext_background_effect_surface_v1 *effect;
} WaylandEffect;

static void
manager_capabilities (void                                    *data,
                      struct ext_background_effect_manager_v1 *manager,
                      uint32_t                                 flags)
{
  WaylandBackend *self = data;
  AwraEffectCapability capabilities = AWRA_EFFECT_CAPABILITY_NONE;

  (void) manager;

  if (flags & EXT_BACKGROUND_EFFECT_MANAGER_V1_CAPABILITY_BLUR)
    capabilities |= AWRA_EFFECT_CAPABILITY_BLUR;

  self->parent.capabilities = capabilities;
  if (self->parent.capabilities_changed != NULL)
    self->parent.capabilities_changed (&self->parent,
                                       capabilities,
                                       self->parent.capabilities_changed_data);
}

static const struct ext_background_effect_manager_v1_listener manager_listener = {
  .capabilities = manager_capabilities,
};

static void
registry_global (void               *data,
                 struct wl_registry *registry,
                 uint32_t            name,
                 const char         *interface,
                 uint32_t            version)
{
  WaylandBackend *self = data;

  if (g_strcmp0 (interface, ext_background_effect_manager_v1_interface.name) != 0)
    return;

  self->parent.interface_announced = TRUE;
  self->manager = wl_registry_bind (registry,
                                    name,
                                    &ext_background_effect_manager_v1_interface,
                                    MIN (version, 1));
  ext_background_effect_manager_v1_add_listener (self->manager,
                                                  &manager_listener,
                                                  self);
}

static void
registry_global_remove (void               *data,
                        struct wl_registry *registry,
                        uint32_t            name)
{
  (void) data;
  (void) registry;
  (void) name;
}

static const struct wl_registry_listener registry_listener = {
  .global = registry_global,
  .global_remove = registry_global_remove,
};

static struct wl_region *
create_rounded_region (WaylandBackend *self,
                       int             width,
                       int             height,
                       int             radius)
{
  struct wl_region *region;
  int r;

  region = wl_compositor_create_region (self->compositor);
  if (width <= 0 || height <= 0)
    return region;

  r = CLAMP (radius, 0, MIN (width, height) / 2);
  if (r == 0) {
    wl_region_add (region, 0, 0, width, height);
    return region;
  }

  wl_region_add (region, r, 0, width - 2 * r, height);
  wl_region_add (region, 0, r, width, height - 2 * r);

  for (int y = 0; y < r; y++) {
    double dy = (double) r - ((double) y + 0.5);
    int inset = (int) ceil ((double) r - sqrt ((double) r * r - dy * dy));
    int band_width = width - 2 * inset;

    if (band_width > 0) {
      wl_region_add (region, inset, y, band_width, 1);
      if (height - y - 1 != y)
        wl_region_add (region, inset, height - y - 1, band_width, 1);
    }
  }

  return region;
}

static gboolean
wayland_update (AwraEffectBackend *backend,
                gpointer           handle,
                GdkSurface        *surface,
                int                width,
                int                height,
                int                radius,
                GError           **error)
{
  WaylandBackend *self = (WaylandBackend *) backend;
  WaylandEffect *effect = handle;
  struct wl_region *region;

  g_return_val_if_fail (effect != NULL, FALSE);
  g_return_val_if_fail (GDK_IS_WAYLAND_SURFACE (surface), FALSE);

  if (!(backend->capabilities & AWRA_EFFECT_CAPABILITY_BLUR)) {
    g_set_error_literal (error,
                         G_IO_ERROR,
                         G_IO_ERROR_NOT_SUPPORTED,
                         "blur capability is no longer advertised");
    return FALSE;
  }

  region = create_rounded_region (self, width, height, radius);
  ext_background_effect_surface_v1_set_blur_region (effect->effect, region);
  wl_region_destroy (region);
  gdk_wayland_surface_force_next_commit (surface);

  return TRUE;
}

static gpointer
wayland_apply (AwraEffectBackend *backend,
               GdkSurface        *surface,
               int                width,
               int                height,
               int                radius,
               GError           **error)
{
  WaylandBackend *self = (WaylandBackend *) backend;
  WaylandEffect *effect;
  struct wl_surface *wl_surface;

  if (!GDK_IS_WAYLAND_SURFACE (surface)) {
    g_set_error_literal (error,
                         G_IO_ERROR,
                         G_IO_ERROR_NOT_SUPPORTED,
                         "GdkSurface is not a Wayland surface");
    return NULL;
  }

  wl_surface = gdk_wayland_surface_get_wl_surface (surface);
  if (wl_surface == NULL) {
    g_set_error_literal (error,
                         G_IO_ERROR,
                         G_IO_ERROR_NOT_INITIALIZED,
                         "GDK has not created the wl_surface yet");
    return NULL;
  }

  effect = g_new0 (WaylandEffect, 1);
  effect->effect = ext_background_effect_manager_v1_get_background_effect (
    self->manager,
    wl_surface);

  if (!wayland_update (backend,
                       effect,
                       surface,
                       width,
                       height,
                       radius,
                       error)) {
    ext_background_effect_surface_v1_destroy (effect->effect);
    g_free (effect);
    return NULL;
  }

  return effect;
}

static void
wayland_clear (AwraEffectBackend *backend,
               gpointer           handle,
               GdkSurface        *surface)
{
  WaylandEffect *effect = handle;

  (void) backend;

  if (effect == NULL)
    return;

  ext_background_effect_surface_v1_set_blur_region (effect->effect, NULL);
  ext_background_effect_surface_v1_destroy (effect->effect);
  if (surface != NULL && GDK_IS_WAYLAND_SURFACE (surface))
    gdk_wayland_surface_force_next_commit (surface);
  g_free (effect);
}

static void
wayland_destroy (AwraEffectBackend *backend)
{
  WaylandBackend *self = (WaylandBackend *) backend;

  if (self->manager != NULL)
    ext_background_effect_manager_v1_destroy (self->manager);
  g_free (self);
}

AwraEffectBackend *
awra_wayland_effect_backend_new (GdkDisplay *display,
                                 GError    **error)
{
  WaylandBackend *self;
  struct wl_event_queue *queue;
  struct wl_registry *registry;
  int result;

  if (!GDK_IS_WAYLAND_DISPLAY (display))
    return NULL;

  self = g_new0 (WaylandBackend, 1);
  self->parent.name = "wayland-background-effect";
  self->parent.apply = wayland_apply;
  self->parent.update = wayland_update;
  self->parent.clear = wayland_clear;
  self->parent.destroy = wayland_destroy;
  self->wl_display = gdk_wayland_display_get_wl_display (display);
  self->compositor = gdk_wayland_display_get_wl_compositor (display);

  queue = wl_display_create_queue (self->wl_display);
  registry = wl_display_get_registry (self->wl_display);
  wl_proxy_set_queue ((struct wl_proxy *) registry, queue);
  wl_registry_add_listener (registry, &registry_listener, self);

  result = wl_display_roundtrip_queue (self->wl_display, queue);
  if (result >= 0 && self->manager != NULL)
    result = wl_display_roundtrip_queue (self->wl_display, queue);

  if (self->manager != NULL)
    wl_proxy_set_queue ((struct wl_proxy *) self->manager, NULL);
  wl_registry_destroy (registry);
  wl_event_queue_destroy (queue);

  if (result < 0) {
    g_set_error_literal (error,
                         G_IO_ERROR,
                         G_IO_ERROR_FAILED,
                         "Wayland registry roundtrip failed");
    wayland_destroy (&self->parent);
    return NULL;
  }

  if (self->manager == NULL) {
    g_set_error_literal (error,
                         G_IO_ERROR,
                         G_IO_ERROR_NOT_SUPPORTED,
                         "ext-background-effect-v1 is not announced");
    wayland_destroy (&self->parent);
    return NULL;
  }

  return &self->parent;
}

