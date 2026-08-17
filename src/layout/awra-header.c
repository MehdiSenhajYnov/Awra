/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-header.h>
#include <awra/awra-surface.h>

struct _AwraHeader {
  GtkWidget parent_instance;
  AwraSurface *surface;
  GtkBox *box;
  GtkBox *titles;
  GtkLabel *title;
  GtkLabel *subtitle;
  GtkWidget *start_widget;
  GtkWidget *end_widget;
};

enum { PROP_0, PROP_TITLE, PROP_SUBTITLE, PROP_START_WIDGET, PROP_END_WIDGET, N_PROPS };
static GParamSpec *properties[N_PROPS];
G_DEFINE_FINAL_TYPE (AwraHeader, awra_header, GTK_TYPE_WIDGET)

static void
awra_header_dispose (GObject *object)
{
  AwraHeader *self = AWRA_HEADER (object);
  if (self->surface != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->surface));
    self->surface = NULL;
  }
  self->box = NULL;
  self->titles = NULL;
  self->title = NULL;
  self->subtitle = NULL;
  self->start_widget = NULL;
  self->end_widget = NULL;
  G_OBJECT_CLASS (awra_header_parent_class)->dispose (object);
}

static void
awra_header_snapshot (GtkWidget *widget, GtkSnapshot *snapshot)
{
  gtk_widget_snapshot_child (widget,
                             GTK_WIDGET (AWRA_HEADER (widget)->surface),
                             snapshot);
}

static void
awra_header_get_property (GObject *object, guint id, GValue *value, GParamSpec *pspec)
{
  AwraHeader *self = AWRA_HEADER (object);
  switch (id) {
  case PROP_TITLE: g_value_set_string (value, awra_header_get_title (self)); break;
  case PROP_SUBTITLE: g_value_set_string (value, awra_header_get_subtitle (self)); break;
  case PROP_START_WIDGET: g_value_set_object (value, self->start_widget); break;
  case PROP_END_WIDGET: g_value_set_object (value, self->end_widget); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_header_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec)
{
  AwraHeader *self = AWRA_HEADER (object);
  switch (id) {
  case PROP_TITLE: awra_header_set_title (self, g_value_get_string (value)); break;
  case PROP_SUBTITLE: awra_header_set_subtitle (self, g_value_get_string (value)); break;
  case PROP_START_WIDGET: awra_header_set_start_widget (self, g_value_get_object (value)); break;
  case PROP_END_WIDGET: awra_header_set_end_widget (self, g_value_get_object (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
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
  properties[PROP_TITLE] = g_param_spec_string ("title", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SUBTITLE] = g_param_spec_string ("subtitle", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_START_WIDGET] = g_param_spec_object ("start-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_END_WIDGET] = g_param_spec_object ("end-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awraheader");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_BANNER);
}

static void
awra_header_init (AwraHeader *self)
{
  g_autoptr (AwraMaterial) material = awra_material_new_translucent ();
  self->surface = AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_TOOLBAR));
  awra_surface_set_material (self->surface, material);
  awra_surface_set_radius (self->surface, 0.0);
  self->box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 12));
  self->titles = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 2));
  self->title = GTK_LABEL (gtk_label_new (NULL));
  self->subtitle = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->box), "awra-header-content");
  gtk_widget_add_css_class (GTK_WIDGET (self->title), "awra-header-title");
  gtk_widget_add_css_class (GTK_WIDGET (self->subtitle), "awra-header-subtitle");
  gtk_label_set_xalign (self->title, 0.0f);
  gtk_label_set_xalign (self->subtitle, 0.0f);
  gtk_widget_set_hexpand (GTK_WIDGET (self->titles), TRUE);
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle), FALSE);
  gtk_box_append (self->titles, GTK_WIDGET (self->title));
  gtk_box_append (self->titles, GTK_WIDGET (self->subtitle));
  gtk_box_append (self->box, GTK_WIDGET (self->titles));
  awra_surface_set_child (self->surface, GTK_WIDGET (self->box));
  gtk_widget_set_parent (GTK_WIDGET (self->surface), GTK_WIDGET (self));
}

GtkWidget *awra_header_new (void) { return g_object_new (AWRA_TYPE_HEADER, NULL); }
const char *awra_header_get_title (AwraHeader *self) {
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL); return gtk_label_get_text (self->title);
}
void awra_header_set_title (AwraHeader *self, const char *title) {
  g_return_if_fail (AWRA_IS_HEADER (self)); if (g_strcmp0 (awra_header_get_title (self), title) == 0) return;
  gtk_label_set_text (self->title, title != NULL ? title : ""); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TITLE]);
}
const char *awra_header_get_subtitle (AwraHeader *self) {
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL); return gtk_label_get_text (self->subtitle);
}
void awra_header_set_subtitle (AwraHeader *self, const char *subtitle) {
  g_return_if_fail (AWRA_IS_HEADER (self)); if (g_strcmp0 (awra_header_get_subtitle (self), subtitle) == 0) return;
  gtk_label_set_text (self->subtitle, subtitle != NULL ? subtitle : "");
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle), subtitle != NULL && *subtitle != '\0');
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SUBTITLE]);
}
GtkWidget *awra_header_get_start_widget (AwraHeader *self) {
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL); return self->start_widget;
}
void awra_header_set_start_widget (AwraHeader *self, GtkWidget *widget) {
  g_return_if_fail (AWRA_IS_HEADER (self)); if (self->start_widget == widget) return;
  if (self->start_widget != NULL) gtk_box_remove (self->box, self->start_widget);
  self->start_widget = widget;
  if (widget != NULL) gtk_box_prepend (self->box, widget);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_START_WIDGET]);
}
GtkWidget *awra_header_get_end_widget (AwraHeader *self) {
  g_return_val_if_fail (AWRA_IS_HEADER (self), NULL); return self->end_widget;
}
void awra_header_set_end_widget (AwraHeader *self, GtkWidget *widget) {
  g_return_if_fail (AWRA_IS_HEADER (self)); if (self->end_widget == widget) return;
  if (self->end_widget != NULL) gtk_box_remove (self->box, self->end_widget);
  self->end_widget = widget;
  if (widget != NULL) gtk_box_append (self->box, widget);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_END_WIDGET]);
}

