/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-layout.h>
#include <awra/awra-toolbar.h>

struct _AwraToolbar {
  GtkWidget parent_instance;
  GtkCenterBox *center_box;
  GtkWidget *start_widget;
  GtkWidget *center_widget;
  GtkWidget *end_widget;
  gboolean compact;
};

enum { PROP_0, PROP_START_WIDGET, PROP_CENTER_WIDGET, PROP_END_WIDGET,
       PROP_COMPACT, N_PROPS };
static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraToolbar, awra_toolbar, GTK_TYPE_WIDGET)

static void
update_layout (AwraToolbar *self)
{
  awra_widget_set_margin (GTK_WIDGET (self->center_box),
                          self->compact ? AWRA_SPACING_SM : AWRA_SPACING_MD);
  if (self->compact)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-compact");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-compact");
}

static void
awra_toolbar_dispose (GObject *object)
{
  AwraToolbar *self = AWRA_TOOLBAR (object);
  if (self->center_box != NULL) {
    gtk_center_box_set_start_widget (self->center_box, NULL);
    gtk_center_box_set_center_widget (self->center_box, NULL);
    gtk_center_box_set_end_widget (self->center_box, NULL);
    gtk_widget_unparent (GTK_WIDGET (self->center_box));
    self->center_box = NULL;
    self->start_widget = NULL;
    self->center_widget = NULL;
    self->end_widget = NULL;
  }
  G_OBJECT_CLASS (awra_toolbar_parent_class)->dispose (object);
}

static void
awra_toolbar_snapshot (GtkWidget *widget, GtkSnapshot *snapshot)
{
  AwraToolbar *self = AWRA_TOOLBAR (widget);
  if (self->center_box != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->center_box), snapshot);
}

static void
awra_toolbar_get_property (GObject *object, guint id, GValue *value,
                           GParamSpec *pspec)
{
  AwraToolbar *self = AWRA_TOOLBAR (object);
  switch (id) {
  case PROP_START_WIDGET: g_value_set_object (value, self->start_widget); break;
  case PROP_CENTER_WIDGET: g_value_set_object (value, self->center_widget); break;
  case PROP_END_WIDGET: g_value_set_object (value, self->end_widget); break;
  case PROP_COMPACT: g_value_set_boolean (value, self->compact); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_toolbar_set_property (GObject *object, guint id, const GValue *value,
                           GParamSpec *pspec)
{
  AwraToolbar *self = AWRA_TOOLBAR (object);
  switch (id) {
  case PROP_START_WIDGET: awra_toolbar_set_start_widget (self, g_value_get_object (value)); break;
  case PROP_CENTER_WIDGET: awra_toolbar_set_center_widget (self, g_value_get_object (value)); break;
  case PROP_END_WIDGET: awra_toolbar_set_end_widget (self, g_value_get_object (value)); break;
  case PROP_COMPACT: awra_toolbar_set_compact (self, g_value_get_boolean (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_toolbar_class_init (AwraToolbarClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_toolbar_dispose;
  object_class->get_property = awra_toolbar_get_property;
  object_class->set_property = awra_toolbar_set_property;
  widget_class->snapshot = awra_toolbar_snapshot;
  properties[PROP_START_WIDGET] = g_param_spec_object (
    "start-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_CENTER_WIDGET] = g_param_spec_object (
    "center-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_END_WIDGET] = g_param_spec_object (
    "end-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_COMPACT] = g_param_spec_boolean (
    "compact", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awratoolbar");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_TOOLBAR);
}

static void
awra_toolbar_init (AwraToolbar *self)
{
  self->center_box = GTK_CENTER_BOX (gtk_center_box_new ());
  gtk_widget_set_hexpand (GTK_WIDGET (self->center_box), TRUE);
  gtk_widget_set_parent (GTK_WIDGET (self->center_box), GTK_WIDGET (self));
  update_layout (self);
}

GtkWidget *awra_toolbar_new (void) { return g_object_new (AWRA_TYPE_TOOLBAR, NULL); }
GtkWidget *awra_toolbar_get_start_widget (AwraToolbar *self) { g_return_val_if_fail (AWRA_IS_TOOLBAR (self), NULL); return self->start_widget; }
void awra_toolbar_set_start_widget (AwraToolbar *self, GtkWidget *widget) { g_return_if_fail (AWRA_IS_TOOLBAR (self)); g_return_if_fail (widget == NULL || GTK_IS_WIDGET (widget)); if (self->start_widget == widget) return; self->start_widget = widget; gtk_center_box_set_start_widget (self->center_box, widget); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_START_WIDGET]); }
GtkWidget *awra_toolbar_get_center_widget (AwraToolbar *self) { g_return_val_if_fail (AWRA_IS_TOOLBAR (self), NULL); return self->center_widget; }
void awra_toolbar_set_center_widget (AwraToolbar *self, GtkWidget *widget) { g_return_if_fail (AWRA_IS_TOOLBAR (self)); g_return_if_fail (widget == NULL || GTK_IS_WIDGET (widget)); if (self->center_widget == widget) return; self->center_widget = widget; gtk_center_box_set_center_widget (self->center_box, widget); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CENTER_WIDGET]); }
GtkWidget *awra_toolbar_get_end_widget (AwraToolbar *self) { g_return_val_if_fail (AWRA_IS_TOOLBAR (self), NULL); return self->end_widget; }
void awra_toolbar_set_end_widget (AwraToolbar *self, GtkWidget *widget) { g_return_if_fail (AWRA_IS_TOOLBAR (self)); g_return_if_fail (widget == NULL || GTK_IS_WIDGET (widget)); if (self->end_widget == widget) return; self->end_widget = widget; gtk_center_box_set_end_widget (self->center_box, widget); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_END_WIDGET]); }
gboolean awra_toolbar_get_compact (AwraToolbar *self) { g_return_val_if_fail (AWRA_IS_TOOLBAR (self), FALSE); return self->compact; }
void awra_toolbar_set_compact (AwraToolbar *self, gboolean compact) { g_return_if_fail (AWRA_IS_TOOLBAR (self)); compact = !!compact; if (self->compact == compact) return; self->compact = compact; update_layout (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_COMPACT]); }
