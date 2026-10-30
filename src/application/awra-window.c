/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-header.h>
#include <awra/awra-window.h>

#include "awra-config.h"
#include "core/awra-context-private.h"
#ifdef AWRA_HAVE_WIN32
#include "platform/win32/awra-win32-private.h"
#include <gdk/win32/gdkwin32.h>
#endif

typedef struct
{
  AwraSurface *root_surface;
  GtkWidget *default_chrome;
  GtkWidget *chrome;
  GtkOverlay *chrome_overlay;
  GtkBox *chrome_box;
  gboolean overlay_chrome;
  gboolean keep_rounded_corners;
  AwraContext *context;
  gulong material_handler;
  gulong style_handler;
} AwraWindowPrivate;

enum
{
  PROP_0,
  PROP_CONTENT,
  PROP_ROOT_SURFACE,
  PROP_CHROME,
  PROP_OVERLAY_CHROME,
  PROP_KEEP_ROUNDED_CORNERS,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_TYPE_WITH_PRIVATE (AwraWindow, awra_window, GTK_TYPE_APPLICATION_WINDOW)

static void sync_native_effect (AwraWindow *self);

static AwraWindowPrivate *
get_priv (AwraWindow *self)
{
  return awra_window_get_instance_private (self);
}

static double
get_effect_radius (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);
  if (!priv->keep_rounded_corners &&
      (gtk_window_is_maximized (GTK_WINDOW (self)) ||
       gtk_window_is_fullscreen (GTK_WINDOW (self))))
    return 0.0;
  double radius = awra_surface_get_radius (priv->root_surface);

  if (radius >= 0.0)
    return radius;
  if (priv->context != NULL)
    {
      g_autoptr (AwraMaterialResolution) resolved = awra_context_resolve_material (
          priv->context, awra_surface_get_material (priv->root_surface),
          awra_surface_get_role (priv->root_surface),
          gtk_window_is_active (GTK_WINDOW (self)),
          awra_surface_get_elevation (priv->root_surface));

      return awra_material_resolution_get_radius (resolved);
    }
  return 22.0;
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
  if (awra_style_manager_get_high_contrast (manager))
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-high-contrast");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-high-contrast");
}

static void
style_changed_cb (AwraStyleManager *manager, GParamSpec *pspec, AwraWindow *self)
{
  (void)manager;
  (void)pspec;
  update_appearance_class (self);
  sync_native_effect (self);
}

static void
sync_native_effect (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);

  if (priv->context == NULL || !gtk_widget_get_mapped (GTK_WIDGET (self)))
    return;

  awra_effect_coordinator_update (
      awra_context_get_effect_coordinator (priv->context), GTK_NATIVE (self),
      awra_surface_get_material (priv->root_surface), get_effect_radius (self));
}

static void
redraw_chrome_surfaces (GtkWidget *widget)
{
  if (widget == NULL)
    return;
  if (AWRA_IS_SURFACE (widget))
    {
      gtk_widget_queue_draw (widget);
      return;
    }
  for (GtkWidget *child = gtk_widget_get_first_child (widget); child != NULL;
       child = gtk_widget_get_next_sibling (child))
    redraw_chrome_surfaces (child);
}

static void
frame_state_changed_cb (AwraWindow *self, GParamSpec *pspec, gpointer data)
{
  AwraWindowPrivate *priv = get_priv (self);
  (void) pspec;
  (void) data;
  if (priv->root_surface == NULL)
    return;
  /* A parent redraw alone can reuse a cached rounded header render node. */
  gtk_widget_queue_draw (GTK_WIDGET (priv->root_surface));
  redraw_chrome_surfaces (priv->chrome);
  sync_native_effect (self);
}

static void
sync_header_material (AwraWindow *self, GtkWidget *chrome)
{
  AwraWindowPrivate *priv = get_priv (self);

  if (AWRA_IS_HEADER (chrome) && awra_header_get_blend_with_window (AWRA_HEADER (chrome)))
    awra_header_set_material (AWRA_HEADER (chrome),
                              awra_surface_get_material (priv->root_surface));
}

static void
material_changed_cb (AwraSurface *surface, GParamSpec *pspec, AwraWindow *self)
{
  (void)surface;
  (void)pspec;
  sync_header_material (self, get_priv (self)->chrome);
  sync_native_effect (self);
}

static void
active_changed_cb (AwraWindow *self, GParamSpec *pspec, gpointer user_data)
{
  AwraWindowPrivate *priv = get_priv (self);

  (void)pspec;
  (void)user_data;
  /* Reassert the compositor-owned region on both focus transitions. The
   * request is deliberately identical; this only prevents a compositor from
   * retaining stale double-buffered state. */
  sync_native_effect (self);
  gtk_widget_queue_draw (GTK_WIDGET (priv->root_surface));
  if (priv->chrome != NULL)
    gtk_widget_queue_draw (priv->chrome);
}

static void
awra_window_realize (GtkWidget *widget)
{
  GTK_WIDGET_CLASS (awra_window_parent_class)->realize (widget);
#ifdef AWRA_HAVE_WIN32
  if (gtk_widget_has_css_class (widget, "awra-win32")) {
    /* DWM shadows the window (dialogs and the palette ask for elevation):
     * Awra's own shadow would only darken the corners inside it. */
    awra_surface_set_elevation_level (get_priv (AWRA_WINDOW (widget))->root_surface,
                                      AWRA_ELEVATION_FLAT);
    awra_win32_window_attach (GTK_WINDOW (widget));
  }
#endif
}

static void
awra_window_map (GtkWidget *widget)
{
  AwraWindow *self = AWRA_WINDOW (widget);
  AwraWindowPrivate *priv = get_priv (self);

  GTK_WIDGET_CLASS (awra_window_parent_class)->map (widget);
  priv->context = awra_context_get_for_display (gtk_widget_get_display (widget));
  update_appearance_class (self);
  if (priv->style_handler == 0)
    {
      priv->style_handler
          = g_signal_connect (awra_context_get_style_manager (priv->context),
                              "notify::token-set", G_CALLBACK (style_changed_cb), self);
    }
  awra_effect_coordinator_attach (
      awra_context_get_effect_coordinator (priv->context), GTK_NATIVE (self),
      awra_surface_get_material (priv->root_surface), get_effect_radius (self));
}

static void
awra_window_unmap (GtkWidget *widget)
{
  AwraWindow *self = AWRA_WINDOW (widget);
  AwraWindowPrivate *priv = get_priv (self);

  if (priv->context != NULL)
    {
      awra_effect_coordinator_detach (awra_context_get_effect_coordinator (priv->context),
                                      GTK_NATIVE (self));
    }
  if (priv->style_handler != 0)
    {
      g_signal_handler_disconnect (awra_context_get_style_manager (priv->context),
                                   priv->style_handler);
      priv->style_handler = 0;
    }
  GTK_WIDGET_CLASS (awra_window_parent_class)->unmap (widget);
}

static void
awra_window_size_allocate (GtkWidget *widget, int width, int height, int baseline)
{
  GTK_WIDGET_CLASS (awra_window_parent_class)
      ->size_allocate (widget, width, height, baseline);
  sync_native_effect (AWRA_WINDOW (widget));
}

static void
awra_window_dispose (GObject *object)
{
  AwraWindow *self = AWRA_WINDOW (object);
  AwraWindowPrivate *priv = get_priv (self);

  if (priv->material_handler != 0)
    {
      g_signal_handler_disconnect (priv->root_surface, priv->material_handler);
      priv->material_handler = 0;
    }
  if (priv->style_handler != 0 && priv->context != NULL)
    {
      g_signal_handler_disconnect (awra_context_get_style_manager (priv->context),
                                   priv->style_handler);
      priv->style_handler = 0;
    }
  priv->root_surface = NULL;
  g_clear_object (&priv->default_chrome);
  priv->chrome = NULL;
  priv->context = NULL;

  G_OBJECT_CLASS (awra_window_parent_class)->dispose (object);
}

static void
awra_window_get_property (GObject *object, guint property_id, GValue *value,
                          GParamSpec *pspec)
{
  AwraWindow *self = AWRA_WINDOW (object);
  AwraWindowPrivate *priv = get_priv (self);

  switch (property_id)
    {
    case PROP_CONTENT:
      g_value_set_object (value, awra_surface_get_child (priv->root_surface));
      break;
    case PROP_ROOT_SURFACE:
      g_value_set_object (value, priv->root_surface);
      break;
    case PROP_CHROME:
      g_value_set_object (value, priv->chrome);
      break;
    case PROP_OVERLAY_CHROME:
      g_value_set_boolean (value, priv->overlay_chrome);
      break;
    case PROP_KEEP_ROUNDED_CORNERS:
      g_value_set_boolean (value, priv->keep_rounded_corners);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
    }
}

static void
awra_window_set_property (GObject *object, guint property_id, const GValue *value,
                          GParamSpec *pspec)
{
  switch (property_id)
    {
    case PROP_CONTENT:
      awra_window_set_content (AWRA_WINDOW (object), g_value_get_object (value));
      break;
    case PROP_CHROME:
      awra_window_set_chrome (AWRA_WINDOW (object), g_value_get_object (value));
      break;
    case PROP_OVERLAY_CHROME:
      awra_window_set_overlay_chrome (AWRA_WINDOW (object), g_value_get_boolean (value));
      break;
    case PROP_KEEP_ROUNDED_CORNERS:
      awra_window_set_keep_rounded_corners (AWRA_WINDOW (object), g_value_get_boolean (value));
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
    }
}

static void
awra_window_constructed (GObject *object)
{
  AwraWindow *self = AWRA_WINDOW (object);
  G_OBJECT_CLASS (awra_window_parent_class)->constructed (object);
  /* Binding a not-yet-constructed GtkWindow can consume its initial floating
   * reference before GtkWindow establishes top-level ownership. */
  g_object_bind_property (self, "title", get_priv (self)->default_chrome, "title",
                          G_BINDING_SYNC_CREATE);
}

static void
awra_window_class_init (AwraWindowClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->constructed = awra_window_constructed;
  object_class->dispose = awra_window_dispose;
  object_class->get_property = awra_window_get_property;
  object_class->set_property = awra_window_set_property;
  widget_class->realize = awra_window_realize;
  widget_class->map = awra_window_map;
  widget_class->unmap = awra_window_unmap;
  widget_class->size_allocate = awra_window_size_allocate;

  properties[PROP_CONTENT] = g_param_spec_object (
      "content", NULL, NULL, GTK_TYPE_WIDGET,
      G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ROOT_SURFACE]
      = g_param_spec_object ("root-surface", NULL, NULL, AWRA_TYPE_SURFACE,
                             G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_CHROME] = g_param_spec_object (
      "chrome", NULL, NULL, GTK_TYPE_WIDGET,
      G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  /**
   * AwraWindow:overlay-chrome:
   *
   * Place chrome above the full content allocation.
   *
   * Since: 1.1
   */
  properties[PROP_OVERLAY_CHROME] = g_param_spec_boolean (
      "overlay-chrome", NULL, "Chrome overlays the content without reserving height",
      FALSE, G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  /**
   * AwraWindow:keep-rounded-corners:
   *
   * Retain configured frame rounding when maximized or fullscreen.
   *
   * Since: 1.1
   */
  properties[PROP_KEEP_ROUNDED_CORNERS] = g_param_spec_boolean (
      "keep-rounded-corners", NULL,
      "Keep configured frame rounding when maximized or fullscreen", FALSE,
      G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static GtkWidget *
create_titlebar (AwraWindow *self)
{
  GtkWidget *header = awra_header_new ();

  awra_header_set_blend_with_window (AWRA_HEADER (header), TRUE);
  awra_header_set_drag_enabled (AWRA_HEADER (header), TRUE);
  awra_header_set_show_window_controls (AWRA_HEADER (header), TRUE);
  (void) self;
  return header;
}

static void
awra_window_init (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);

  priv->root_surface
      = AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_WINDOW));
  awra_surface_set_corner_mask (priv->root_surface, AWRA_SURFACE_CORNER_BOTTOM_START
                                                        | AWRA_SURFACE_CORNER_BOTTOM_END);
  awra_surface_set_edge_mask (priv->root_surface, AWRA_SURFACE_EDGE_BOTTOM
                                                      | AWRA_SURFACE_EDGE_START
                                                      | AWRA_SURFACE_EDGE_END);
  gtk_window_set_child (GTK_WINDOW (self), GTK_WIDGET (priv->root_surface));
  priv->default_chrome = g_object_ref_sink (create_titlebar (self));
  priv->chrome = priv->default_chrome;
  sync_header_material (self, priv->chrome);
  gtk_window_set_titlebar (GTK_WINDOW (self), priv->default_chrome);
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-window");
  gtk_window_set_default_size (GTK_WINDOW (self), 900, 620);
#ifdef AWRA_HAVE_WIN32
  /* DWM draws the shadow and rounds the corners natively; GTK's own shadow
   * and resize margin would otherwise be filled by the backdrop too (see
   * awra_win32_window_attach). */
  if (GDK_IS_WIN32_DISPLAY (gtk_widget_get_display (GTK_WIDGET (self)))) {
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-win32");
    awra_surface_set_radius (priv->root_surface,
                             awra_win32_window_corner_radius ());
  }
#endif

  priv->material_handler = g_signal_connect (priv->root_surface, "notify::material",
                                             G_CALLBACK (material_changed_cb), self);
  g_signal_connect (self, "notify::is-active", G_CALLBACK (active_changed_cb), NULL);
  g_signal_connect (self, "notify::maximized", G_CALLBACK (frame_state_changed_cb), NULL);
  g_signal_connect (self, "notify::fullscreened", G_CALLBACK (frame_state_changed_cb), NULL);
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
awra_window_set_content (AwraWindow *self, GtkWidget *content)
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

GtkWidget *
awra_window_get_chrome (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), NULL);
  return get_priv (self)->chrome;
}

static void
place_embedded_chrome (AwraWindow *self)
{
  AwraWindowPrivate *priv = get_priv (self);
  GtkWidget *chrome = priv->chrome;
  g_object_ref (chrome);
  if (gtk_widget_get_parent (chrome) == GTK_WIDGET (priv->chrome_box))
    gtk_box_remove (priv->chrome_box, chrome);
  else if (gtk_widget_get_parent (chrome) == GTK_WIDGET (priv->chrome_overlay))
    gtk_overlay_remove_overlay (priv->chrome_overlay, chrome);
  gtk_widget_set_vexpand (chrome, FALSE);
  gtk_widget_set_halign (chrome, GTK_ALIGN_FILL);
  gtk_widget_set_valign (chrome, priv->overlay_chrome ? GTK_ALIGN_START : GTK_ALIGN_FILL);
  if (priv->overlay_chrome)
    gtk_overlay_add_overlay (priv->chrome_overlay, chrome);
  else
    gtk_box_prepend (priv->chrome_box, chrome);
  g_object_unref (chrome);
  awra_surface_set_corner_mask (
      priv->root_surface, priv->overlay_chrome ? AWRA_SURFACE_CORNER_ALL
                                               : AWRA_SURFACE_CORNER_BOTTOM_START
                                                     | AWRA_SURFACE_CORNER_BOTTOM_END);
  awra_surface_set_edge_mask (priv->root_surface, priv->overlay_chrome
                                                      ? AWRA_SURFACE_EDGE_ALL
                                                      : AWRA_SURFACE_EDGE_BOTTOM
                                                            | AWRA_SURFACE_EDGE_START
                                                            | AWRA_SURFACE_EDGE_END);
}

void
awra_window_set_overlay_chrome (AwraWindow *self, gboolean overlaid)
{
  g_return_if_fail (AWRA_IS_WINDOW (self));
  AwraWindowPrivate *priv = get_priv (self);
  overlaid = !!overlaid;
  if (priv->overlay_chrome == overlaid)
    return;
  if (!priv->chrome_overlay)
    {
      g_return_if_fail (!gtk_widget_get_realized (GTK_WIDGET (self)));
      /* A native, empty WindowHandle requests CSD once. All visible chrome is
       * thereafter owned by this public composition, without remapping surfaces. */
      int default_width, default_height;
      gtk_window_get_default_size (GTK_WINDOW (self), &default_width, &default_height);
      g_object_ref (priv->chrome);
      GtkWidget *anchor = gtk_window_handle_new ();
      gtk_widget_add_css_class (anchor, "awra-chrome-anchor");
      gtk_window_set_titlebar (GTK_WINDOW (self), anchor);
      g_object_ref (priv->root_surface);
      gtk_window_set_child (GTK_WINDOW (self), NULL);
      priv->chrome_overlay = GTK_OVERLAY (gtk_overlay_new ());
      priv->chrome_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
      gtk_widget_set_vexpand (GTK_WIDGET (priv->root_surface), TRUE);
      gtk_box_append (priv->chrome_box, GTK_WIDGET (priv->root_surface));
      gtk_overlay_set_child (priv->chrome_overlay, GTK_WIDGET (priv->chrome_box));
      gtk_window_set_child (GTK_WINDOW (self), GTK_WIDGET (priv->chrome_overlay));
      g_object_unref (priv->root_surface);
      priv->overlay_chrome = overlaid;
      place_embedded_chrome (self);
      g_object_unref (priv->chrome);
      gtk_window_set_default_size (GTK_WINDOW (self), default_width, default_height);
    }
  else
    {
      priv->overlay_chrome = overlaid;
      place_embedded_chrome (self);
    }
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_OVERLAY_CHROME]);
}

gboolean
awra_window_get_overlay_chrome (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), FALSE);
  return get_priv (self)->overlay_chrome;
}

void
awra_window_set_chrome (AwraWindow *self, GtkWidget *chrome)
{
  g_return_if_fail (AWRA_IS_WINDOW (self));
  g_return_if_fail (chrome == NULL || GTK_IS_WIDGET (chrome));
  AwraWindowPrivate *priv = get_priv (self);
  if (chrome == NULL)
    chrome = priv->default_chrome;
  if (priv->chrome == chrome)
    return;
  g_return_if_fail (gtk_widget_get_parent (chrome) == NULL);
  sync_header_material (self, chrome);
  if (priv->chrome_overlay)
    {
      GtkWidget *old = priv->chrome;
      if (priv->overlay_chrome)
        gtk_overlay_remove_overlay (priv->chrome_overlay, old);
      else
        gtk_box_remove (priv->chrome_box, old);
      priv->chrome = chrome;
      place_embedded_chrome (self);
    }
  else
    {
      int width, height;
      gtk_window_get_default_size (GTK_WINDOW (self), &width, &height);
      gtk_window_set_titlebar (GTK_WINDOW (self), chrome);
      priv->chrome = chrome;
      gtk_window_set_default_size (GTK_WINDOW (self), width, height);
    }
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHROME]);
}

gboolean
awra_window_get_active (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), FALSE);
  return gtk_window_is_active (GTK_WINDOW (self));
}

void
awra_window_set_keep_rounded_corners (AwraWindow *self, gboolean keep)
{
  g_return_if_fail (AWRA_IS_WINDOW (self));
  AwraWindowPrivate *priv = get_priv (self);
  keep = !!keep;
  if (priv->keep_rounded_corners == keep)
    return;
  priv->keep_rounded_corners = keep;
  frame_state_changed_cb (self, NULL, NULL);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_KEEP_ROUNDED_CORNERS]);
}

gboolean
awra_window_get_keep_rounded_corners (AwraWindow *self)
{
  g_return_val_if_fail (AWRA_IS_WINDOW (self), FALSE);
  return get_priv (self)->keep_rounded_corners;
}
