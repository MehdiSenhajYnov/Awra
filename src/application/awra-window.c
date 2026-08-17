/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-window.h>

#include "core/awra-context-private.h"

typedef struct {
  AwraSurface *root_surface;
  GtkWidget *title_label;
  AwraContext *context;
  gulong material_handler;
  gulong style_handler;
} AwraWindowPrivate;

enum {
  PROP_0,
  PROP_CONTENT,
  PROP_ROOT_SURFACE,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_TYPE_WITH_PRIVATE (AwraWindow, awra_window, GTK_TYPE_APPLICATION_WINDOW)

static AwraWindowPrivate *
get_priv (AwraWindow *self)
{
  return awra_window_get_instance_private (self);
}

static void
update_appearance_class (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);
  AwraStyleManager *manager;
  gboolean dark;

  if (priv->context == NULL)
    return;
  manager = awra_context_get_style_manager (priv->context);
  dark = awra_token_set_get_dark (awra_style_manager_get_token_set (manager));
  gtk_widget_remove_css_class (GTK_WIDGET (self), dark ? "awra-light" : "awra-dark");
  gtk_widget_add_css_class (GTK_WIDGET (self), dark ? "awra-dark" : "awra-light");
}

static void
style_changed_cb (AwraStyleManager *manager,
                  GParamSpec       *pspec,
                  AwraWindow       *self)
{
  (void) manager;
  (void) pspec;
  update_appearance_class (self);
}

static void
sync_native_effect (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);

  if (priv->context == NULL || !gtk_widget_get_mapped (GTK_WIDGET (self)))
    return;

  awra_effect_coordinator_update (
    awra_context_get_effect_coordinator (priv->context),
    GTK_NATIVE (self),
    awra_surface_get_material (priv->root_surface),
    awra_surface_get_radius (priv->root_surface) >= 0.0
      ? awra_surface_get_radius (priv->root_surface)
      : 18.0);
}

static void
material_changed_cb (AwraSurface *surface,
                     GParamSpec  *pspec,
                     AwraWindow  *self)
{
  (void) surface;
  (void) pspec;
  sync_native_effect (self);
}

static void
active_changed_cb (AwraWindow *self,
                   GParamSpec *pspec,
                   gpointer    user_data)
{
  AwraWindowPrivate *priv = get_priv (self);

  (void) pspec;
  (void) user_data;
  gtk_widget_queue_draw (GTK_WIDGET (priv->root_surface));
}

static void
awra_window_map (GtkWidget *widget)
{
  AwraWindow *self = AWRA_WINDOW (widget);
  AwraWindowPrivate *priv = get_priv (self);

  GTK_WIDGET_CLASS (awra_window_parent_class)->map (widget);
  priv->context = awra_context_get_for_display (gtk_widget_get_display (widget));
  update_appearance_class (self);
  if (priv->style_handler == 0) {
    priv->style_handler = g_signal_connect (
      awra_context_get_style_manager (priv->context),
      "notify::token-set",
      G_CALLBACK (style_changed_cb),
      self);
  }
  awra_effect_coordinator_attach (
    awra_context_get_effect_coordinator (priv->context),
    GTK_NATIVE (self),
    awra_surface_get_material (priv->root_surface),
    awra_surface_get_radius (priv->root_surface) >= 0.0
      ? awra_surface_get_radius (priv->root_surface)
      : 18.0);
}

static void
awra_window_unmap (GtkWidget *widget)
{
  AwraWindow *self = AWRA_WINDOW (widget);
  AwraWindowPrivate *priv = get_priv (self);

  if (priv->context != NULL) {
    awra_effect_coordinator_detach (
      awra_context_get_effect_coordinator (priv->context),
      GTK_NATIVE (self));
  }
  if (priv->style_handler != 0) {
    g_signal_handler_disconnect (awra_context_get_style_manager (priv->context),
                                 priv->style_handler);
    priv->style_handler = 0;
  }
  GTK_WIDGET_CLASS (awra_window_parent_class)->unmap (widget);
}

static void
awra_window_size_allocate (GtkWidget *widget,
                           int        width,
                           int        height,
                           int        baseline)
{
  GTK_WIDGET_CLASS (awra_window_parent_class)->size_allocate (widget,
                                                              width,
                                                              height,
                                                              baseline);
  sync_native_effect (AWRA_WINDOW (widget));
}

static void
awra_window_dispose (GObject *object)
{
  AwraWindow *self = AWRA_WINDOW (object);
  AwraWindowPrivate *priv = get_priv (self);

  if (priv->material_handler != 0) {
    g_signal_handler_disconnect (priv->root_surface, priv->material_handler);
    priv->material_handler = 0;
  }
  if (priv->style_handler != 0 && priv->context != NULL) {
    g_signal_handler_disconnect (awra_context_get_style_manager (priv->context),
                                 priv->style_handler);
    priv->style_handler = 0;
  }
  priv->root_surface = NULL;
  priv->title_label = NULL;
  priv->context = NULL;

  G_OBJECT_CLASS (awra_window_parent_class)->dispose (object);
}

static void
awra_window_get_property (GObject    *object,
                          guint       property_id,
                          GValue     *value,
                          GParamSpec *pspec)
{
  AwraWindow *self = AWRA_WINDOW (object);
  AwraWindowPrivate *priv = get_priv (self);

  switch (property_id) {
  case PROP_CONTENT:
    g_value_set_object (value, awra_surface_get_child (priv->root_surface));
    break;
  case PROP_ROOT_SURFACE:
    g_value_set_object (value, priv->root_surface);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_window_set_property (GObject      *object,
                          guint         property_id,
                          const GValue *value,
                          GParamSpec   *pspec)
{
  switch (property_id) {
  case PROP_CONTENT:
    awra_window_set_content (AWRA_WINDOW (object), g_value_get_object (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_window_class_init (AwraWindowClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_window_dispose;
  object_class->get_property = awra_window_get_property;
  object_class->set_property = awra_window_set_property;
  widget_class->map = awra_window_map;
  widget_class->unmap = awra_window_unmap;
  widget_class->size_allocate = awra_window_size_allocate;

  properties[PROP_CONTENT] =
    g_param_spec_object ("content", NULL, NULL, GTK_TYPE_WIDGET,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ROOT_SURFACE] =
    g_param_spec_object ("root-surface", NULL, NULL, AWRA_TYPE_SURFACE,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static GtkWidget *
create_titlebar (AwraWindow *self,
                 GtkWidget **title_label)
{
  GtkWidget *handle = gtk_window_handle_new ();
  GtkWidget *bar = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 8);
  GtkWidget *start = gtk_window_controls_new (GTK_PACK_START);
  GtkWidget *label = gtk_label_new (NULL);
  GtkWidget *end = gtk_window_controls_new (GTK_PACK_END);

  gtk_widget_add_css_class (bar, "awra-titlebar");
  gtk_widget_add_css_class (label, "awra-title");
  gtk_widget_set_hexpand (label, TRUE);
  gtk_widget_set_halign (label, GTK_ALIGN_CENTER);
  gtk_label_set_ellipsize (GTK_LABEL (label), PANGO_ELLIPSIZE_END);
  gtk_box_append (GTK_BOX (bar), start);
  gtk_box_append (GTK_BOX (bar), label);
  gtk_box_append (GTK_BOX (bar), end);
  gtk_window_handle_set_child (GTK_WINDOW_HANDLE (handle), bar);
  g_object_bind_property (self,
                          "title",
                          label,
                          "label",
                          G_BINDING_SYNC_CREATE);
  *title_label = label;

  return handle;
}

static void
awra_window_init (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);
  g_autoptr (AwraMaterial) frosted = awra_material_new_frosted ();

  priv->root_surface = AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_WINDOW));
  awra_surface_set_material (priv->root_surface, frosted);
  awra_surface_set_radius (priv->root_surface, 18.0);
  gtk_window_set_child (GTK_WINDOW (self), GTK_WIDGET (priv->root_surface));
  gtk_window_set_titlebar (GTK_WINDOW (self), create_titlebar (self, &priv->title_label));
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-window");
  gtk_window_set_default_size (GTK_WINDOW (self), 900, 620);

  priv->material_handler = g_signal_connect (priv->root_surface,
                                             "notify::material",
                                             G_CALLBACK (material_changed_cb),
                                             self);
  g_signal_connect (self,
                    "notify::is-active",
                    G_CALLBACK (active_changed_cb),
                    NULL);
}

GtkWidget *
awra_window_new (GtkApplication *application)
{
  g_return_val_if_fail (GTK_IS_APPLICATION (application), NULL);
  return g_object_new (AWRA_TYPE_WINDOW, "application", application, NULL);
}

GtkWidget *
awra_window_get_content (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), NULL);
  return awra_surface_get_child (get_priv (self)->root_surface);
}

void
awra_window_set_content (AwraWindow *self,
                         GtkWidget  *content)
{
  g_return_if_fail (AWRA_IS_WINDOW (self));
  g_return_if_fail (content == NULL || GTK_IS_WIDGET (content));

  if (awra_surface_get_child (get_priv (self)->root_surface) == content)
    return;
  awra_surface_set_child (get_priv (self)->root_surface, content);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CONTENT]);
}

AwraSurface *
awra_window_get_root_surface (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), NULL);
  return get_priv (self)->root_surface;
}

gboolean
awra_window_get_active (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), FALSE);
  return gtk_window_is_active (GTK_WINDOW (self));
}
