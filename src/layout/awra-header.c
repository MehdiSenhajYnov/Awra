/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-header.h>
#include <awra/awra-layout.h>
#include <awra/awra-surface.h>

struct _AwraHeader {
  GtkWidget parent_instance;
  AwraSurface *surface;
  GtkWindowHandle *handle;
  GtkWidget *root;
  GtkCenterBox *center_box;
  GtkBox *start_box;
  GtkBox *end_box;
  GtkBox *titles;
  GtkLabel *title;
  GtkLabel *subtitle;
  GtkWidget *start_controls;
  GtkWidget *end_controls;
  GtkWidget *start_widget;
  GtkWidget *center_widget;
  GtkWidget *end_widget;
  gboolean show_window_controls;
  gboolean drag_enabled;
  gboolean blend_with_window;
};

enum {
  PROP_0,
  PROP_TITLE,
  PROP_SUBTITLE,
  PROP_START_WIDGET,
  PROP_CENTER_WIDGET,
  PROP_END_WIDGET,
  PROP_SHOW_WINDOW_CONTROLS,
  PROP_DRAG_ENABLED,
  PROP_MATERIAL,
  PROP_BLEND_WITH_WINDOW,
  N_PROPS
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraHeader, awra_header, GTK_TYPE_WIDGET)

static void
update_surface_grammar (AwraHeader *self)
{
  if (self->blend_with_window) {
    /* A blended header is part of the window canvas, not a second toolbar
     * plane. Keeping the toolbar role here made the resolver apply a distinct
     * tint even though AwraWindow supplied the exact root material. */
    awra_surface_set_role (self->surface, AWRA_SURFACE_ROLE_WINDOW);
    awra_surface_set_corner_mask (
      self->surface,
      AWRA_SURFACE_CORNER_TOP_START | AWRA_SURFACE_CORNER_TOP_END);
    awra_surface_set_edge_mask (
      self->surface,
      AWRA_SURFACE_EDGE_TOP | AWRA_SURFACE_EDGE_START | AWRA_SURFACE_EDGE_END);
  } else {
    awra_surface_set_role (self->surface, AWRA_SURFACE_ROLE_TOOLBAR);
    awra_surface_set_corner_mask (self->surface, AWRA_SURFACE_CORNER_ALL);
    awra_surface_set_edge_mask (self->surface, AWRA_SURFACE_EDGE_ALL);
  }
}

static void
rebuild_root (AwraHeader *self)
{
  GtkWidget *surface = GTK_WIDGET (self->surface);
  GtkWidget *next_root;

  if (self->root != NULL && gtk_widget_get_parent (self->root) == GTK_WIDGET (self))
    gtk_widget_unparent (self->root);

  if (self->drag_enabled) {
    if (gtk_widget_get_parent (surface) != GTK_WIDGET (self->handle))
      gtk_window_handle_set_child (self->handle, surface);
    next_root = GTK_WIDGET (self->handle);
  } else {
    if (gtk_widget_get_parent (surface) == GTK_WIDGET (self->handle))
      gtk_window_handle_set_child (self->handle, NULL);
    next_root = surface;
  }

  self->root = next_root;
  gtk_widget_set_parent (self->root, GTK_WIDGET (self));
}

static void
awra_header_dispose (GObject *object)
{
  AwraHeader *self = AWRA_HEADER (object);

  if (self->root != NULL && gtk_widget_get_parent (self->root) == GTK_WIDGET (self))
    gtk_widget_unparent (self->root);
  if (gtk_widget_get_parent (GTK_WIDGET (self->surface)) ==
      GTK_WIDGET (self->handle))
    gtk_window_handle_set_child (self->handle, NULL);
  g_clear_object (&self->surface);
  g_clear_object (&self->handle);
  self->root = NULL;
  self->center_box = NULL;
  self->start_box = NULL;
  self->end_box = NULL;
  self->titles = NULL;
  self->title = NULL;
  self->subtitle = NULL;
  self->start_controls = NULL;
  self->end_controls = NULL;
  self->start_widget = NULL;
  self->center_widget = NULL;
  self->end_widget = NULL;
  G_OBJECT_CLASS (awra_header_parent_class)->dispose (object);
}

static void
awra_header_snapshot (GtkWidget   *widget,
                      GtkSnapshot *snapshot)
{
  AwraHeader *self = AWRA_HEADER (widget);

  if (self->root != NULL)
    gtk_widget_snapshot_child (widget, self->root, snapshot);
}

static void
awra_header_get_property (GObject    *object,
                          guint       id,
                          GValue     *value,
                          GParamSpec *pspec)
{
  AwraHeader *self = AWRA_HEADER (object);

  switch (id) {
  case PROP_TITLE:
    g_value_set_string (value, awra_header_get_title (self));
    break;
  case PROP_SUBTITLE:
    g_value_set_string (value, awra_header_get_subtitle (self));
    break;
  case PROP_START_WIDGET:
    g_value_set_object (value, self->start_widget);
    break;
  case PROP_CENTER_WIDGET:
    g_value_set_object (value, self->center_widget);
    break;
  case PROP_END_WIDGET:
    g_value_set_object (value, self->end_widget);
    break;
  case PROP_SHOW_WINDOW_CONTROLS:
    g_value_set_boolean (value, self->show_window_controls);
    break;
  case PROP_DRAG_ENABLED:
    g_value_set_boolean (value, self->drag_enabled);
    break;
  case PROP_MATERIAL:
    g_value_set_object (value, awra_header_get_material (self));
    break;
  case PROP_BLEND_WITH_WINDOW:
    g_value_set_boolean (value, self->blend_with_window);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_header_set_property (GObject      *object,
                          guint         id,
                          const GValue *value,
                          GParamSpec   *pspec)
{
  AwraHeader *self = AWRA_HEADER (object);

  switch (id) {
  case PROP_TITLE:
    awra_header_set_title (self, g_value_get_string (value));
    break;
  case PROP_SUBTITLE:
    awra_header_set_subtitle (self, g_value_get_string (value));
    break;
  case PROP_START_WIDGET:
    awra_header_set_start_widget (self, g_value_get_object (value));
    break;
  case PROP_CENTER_WIDGET:
    awra_header_set_center_widget (self, g_value_get_object (value));
    break;
  case PROP_END_WIDGET:
    awra_header_set_end_widget (self, g_value_get_object (value));
    break;
  case PROP_SHOW_WINDOW_CONTROLS:
    awra_header_set_show_window_controls (self, g_value_get_boolean (value));
    break;
  case PROP_DRAG_ENABLED:
    awra_header_set_drag_enabled (self, g_value_get_boolean (value));
    break;
  case PROP_MATERIAL:
    awra_header_set_material (self, g_value_get_object (value));
    break;
  case PROP_BLEND_WITH_WINDOW:
    awra_header_set_blend_with_window (self, g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_header_class_init (AwraHeaderClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_header_dispose;
  object_class->get_property = awra_header_get_property;
  object_class->set_property = awra_header_set_property;
  widget_class->snapshot = awra_header_snapshot;
  properties[PROP_TITLE] = g_param_spec_string (
    "title", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SUBTITLE] = g_param_spec_string (
    "subtitle", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_START_WIDGET] = g_param_spec_object (
    "start-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_CENTER_WIDGET] = g_param_spec_object (
    "center-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_END_WIDGET] = g_param_spec_object (
    "end-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SHOW_WINDOW_CONTROLS] = g_param_spec_boolean (
    "show-window-controls", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_DRAG_ENABLED] = g_param_spec_boolean (
    "drag-enabled", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_MATERIAL] = g_param_spec_object (
    "material", NULL, NULL, AWRA_TYPE_MATERIAL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_BLEND_WITH_WINDOW] = g_param_spec_boolean (
    "blend-with-window", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awraheader");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_BANNER);
}

static void
awra_header_init (AwraHeader *self)
{
  self->surface = g_object_ref_sink (
    AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_TOOLBAR)));
  self->handle = g_object_ref_sink (GTK_WINDOW_HANDLE (gtk_window_handle_new ()));
  self->center_box = GTK_CENTER_BOX (gtk_center_box_new ());
  self->start_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->end_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->titles = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 1));
  awra_box_set_spacing (self->start_box, AWRA_SPACING_MD);
  awra_box_set_spacing (self->end_box, AWRA_SPACING_SM);
  self->title = GTK_LABEL (gtk_label_new (NULL));
  self->subtitle = GTK_LABEL (gtk_label_new (NULL));
  self->start_controls = gtk_window_controls_new (GTK_PACK_START);
  self->end_controls = gtk_window_controls_new (GTK_PACK_END);

  gtk_widget_add_css_class (GTK_WIDGET (self->center_box), "awra-header-content");
  gtk_widget_add_css_class (GTK_WIDGET (self->title), "awra-header-title");
  gtk_widget_add_css_class (GTK_WIDGET (self->subtitle), "awra-header-subtitle");
  gtk_widget_add_css_class (self->start_controls, "awra-header-controls");
  gtk_widget_add_css_class (self->end_controls, "awra-header-controls");
  gtk_label_set_xalign (self->title, 0.0f);
  gtk_label_set_xalign (self->subtitle, 0.0f);
  gtk_label_set_ellipsize (self->title, PANGO_ELLIPSIZE_END);
  gtk_label_set_ellipsize (self->subtitle, PANGO_ELLIPSIZE_END);
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle), FALSE);
  gtk_widget_set_visible (self->start_controls, FALSE);
  gtk_widget_set_visible (self->end_controls, FALSE);
  gtk_widget_set_hexpand (GTK_WIDGET (self->center_box), TRUE);

  gtk_box_append (self->start_box, self->start_controls);
  gtk_box_append (self->titles, GTK_WIDGET (self->title));
  gtk_box_append (self->titles, GTK_WIDGET (self->subtitle));
  gtk_box_append (self->start_box, GTK_WIDGET (self->titles));
  gtk_box_append (self->end_box, self->end_controls);
  gtk_center_box_set_start_widget (self->center_box, GTK_WIDGET (self->start_box));
  gtk_center_box_set_end_widget (self->center_box, GTK_WIDGET (self->end_box));
  awra_surface_set_child (self->surface, GTK_WIDGET (self->center_box));
  rebuild_root (self);
}

GtkWidget *
awra_header_new (void)
{
  return g_object_new (AWRA_TYPE_HEADER, NULL);
}

const char *
awra_header_get_title (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL);
  return gtk_label_get_text (self->title);
}

void
awra_header_set_title (AwraHeader *self,
                       const char *title)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  if (g_strcmp0 (awra_header_get_title (self), title) == 0)
    return;
  gtk_label_set_text (self->title, title != NULL ? title : "");
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TITLE]);
}

const char *
awra_header_get_subtitle (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL);
  return gtk_label_get_text (self->subtitle);
}

void
awra_header_set_subtitle (AwraHeader *self,
                          const char *subtitle)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  if (g_strcmp0 (awra_header_get_subtitle (self), subtitle) == 0)
    return;
  gtk_label_set_text (self->subtitle, subtitle != NULL ? subtitle : "");
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle),
                          subtitle != NULL && *subtitle != '\0');
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SUBTITLE]);
}

GtkWidget *
awra_header_get_start_widget (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL);
  return self->start_widget;
}

void
awra_header_set_start_widget (AwraHeader *self,
                              GtkWidget  *widget)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  g_return_if_fail (widget == NULL || GTK_IS_WIDGET (widget));
  if (self->start_widget == widget)
    return;
  if (self->start_widget != NULL)
    gtk_box_remove (self->start_box, self->start_widget);
  self->start_widget = widget;
  if (widget != NULL)
    gtk_box_insert_child_after (self->start_box, widget, self->start_controls);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_START_WIDGET]);
}

GtkWidget *
awra_header_get_center_widget (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL);
  return self->center_widget;
}

void
awra_header_set_center_widget (AwraHeader *self,
                               GtkWidget  *widget)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  g_return_if_fail (widget == NULL || GTK_IS_WIDGET (widget));
  if (self->center_widget == widget)
    return;
  gtk_center_box_set_center_widget (self->center_box, widget);
  self->center_widget = widget;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CENTER_WIDGET]);
}

GtkWidget *
awra_header_get_end_widget (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL);
  return self->end_widget;
}

void
awra_header_set_end_widget (AwraHeader *self,
                            GtkWidget  *widget)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  g_return_if_fail (widget == NULL || GTK_IS_WIDGET (widget));
  if (self->end_widget == widget)
    return;
  if (self->end_widget != NULL)
    gtk_box_remove (self->end_box, self->end_widget);
  self->end_widget = widget;
  if (widget != NULL)
    gtk_box_prepend (self->end_box, widget);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_END_WIDGET]);
}

gboolean
awra_header_get_show_window_controls (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), FALSE);
  return self->show_window_controls;
}

void
awra_header_set_show_window_controls (AwraHeader *self,
                                      gboolean    show_controls)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  show_controls = !!show_controls;
  if (self->show_window_controls == show_controls)
    return;
  self->show_window_controls = show_controls;
  gtk_widget_set_visible (self->start_controls, show_controls);
  gtk_widget_set_visible (self->end_controls, show_controls);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_SHOW_WINDOW_CONTROLS]);
}

gboolean
awra_header_get_drag_enabled (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), FALSE);
  return self->drag_enabled;
}

void
awra_header_set_drag_enabled (AwraHeader *self,
                              gboolean    drag_enabled)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  drag_enabled = !!drag_enabled;
  if (self->drag_enabled == drag_enabled)
    return;
  self->drag_enabled = drag_enabled;
  rebuild_root (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DRAG_ENABLED]);
}

AwraMaterial *
awra_header_get_material (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL);
  return awra_surface_get_material (self->surface);
}

void
awra_header_set_material (AwraHeader   *self,
                          AwraMaterial *material)
{
  g_return_if_fail (AWRA_IS_HEADER (self));
  g_return_if_fail (AWRA_IS_MATERIAL (material));
  if (awra_header_get_material (self) == material)
    return;
  awra_surface_set_material (self->surface, material);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MATERIAL]);
}

gboolean
awra_header_get_blend_with_window (AwraHeader *self)
{
  g_return_val_if_fail (AWRA_IS_HEADER (self), FALSE);
  return self->blend_with_window;
}

void
awra_header_set_blend_with_window (AwraHeader *self,
                                   gboolean    blend)
{
  g_autoptr (AwraMaterial) material = NULL;

  g_return_if_fail (AWRA_IS_HEADER (self));
  blend = !!blend;
  if (self->blend_with_window == blend)
    return;
  self->blend_with_window = blend;
  material = awra_material_new_for_preset (
    blend ? AWRA_MATERIAL_PRESET_CANVAS : AWRA_MATERIAL_PRESET_CHROME);
  awra_header_set_material (self, material);
  update_surface_grammar (self);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_BLEND_WITH_WINDOW]);
}
