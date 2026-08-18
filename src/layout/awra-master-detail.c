/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-layout.h>
#include <awra/awra-master-detail.h>

struct _AwraMasterDetail {
  GtkWidget parent_instance;
  GtkBox *root;
  GtkWidget *master;
  GtkWidget *detail;
  guint master_width;
  AwraLayoutMode layout_mode;
  AwraMasterDetailPane visible_pane;
};

enum { PROP_0, PROP_MASTER, PROP_DETAIL, PROP_MASTER_WIDTH,
       PROP_LAYOUT_MODE, PROP_VISIBLE_PANE, N_PROPS };
static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraMasterDetail, awra_master_detail, GTK_TYPE_WIDGET)

static void
update_visibility (AwraMasterDetail *self)
{
  gboolean compact = self->layout_mode == AWRA_LAYOUT_MODE_COMPACT;

  if (self->master != NULL)
    gtk_widget_set_visible (self->master,
                            !compact || self->visible_pane ==
                                        AWRA_MASTER_DETAIL_PANE_MASTER);
  if (self->detail != NULL)
    gtk_widget_set_visible (self->detail,
                            !compact || self->visible_pane ==
                                        AWRA_MASTER_DETAIL_PANE_DETAIL);
}

static void
update_layout (AwraMasterDetail *self,
               int               width)
{
  AwraLayoutMode mode = width < 680 ? AWRA_LAYOUT_MODE_COMPACT
                                    : (width < 1040 ? AWRA_LAYOUT_MODE_MEDIUM
                                                    : AWRA_LAYOUT_MODE_EXPANDED);
  guint effective_width = mode == AWRA_LAYOUT_MODE_MEDIUM
                            ? MIN (self->master_width, 280u)
                            : self->master_width;

  if (self->master != NULL)
    gtk_widget_set_size_request (self->master,
                                 mode == AWRA_LAYOUT_MODE_COMPACT
                                   ? -1 : (int) effective_width,
                                 -1);
  if (mode != self->layout_mode) {
    self->layout_mode = mode;
    if (mode == AWRA_LAYOUT_MODE_COMPACT)
      gtk_widget_add_css_class (GTK_WIDGET (self), "awra-compact");
    else
      gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-compact");
    update_visibility (self);
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LAYOUT_MODE]);
  }
}

static GtkSizeRequestMode
awra_master_detail_request_mode (GtkWidget *widget)
{
  return gtk_widget_get_request_mode (
    GTK_WIDGET (AWRA_MASTER_DETAIL (widget)->root));
}

static void
awra_master_detail_measure (GtkWidget *widget, GtkOrientation orientation,
                            int for_size, int *minimum, int *natural,
                            int *minimum_baseline, int *natural_baseline)
{
  gtk_widget_measure (GTK_WIDGET (AWRA_MASTER_DETAIL (widget)->root),
                      orientation, for_size, minimum, natural,
                      minimum_baseline, natural_baseline);
}

static void
awra_master_detail_allocate (GtkWidget *widget, int width, int height,
                             int baseline)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (widget);

  update_layout (self, width);
  gtk_widget_allocate (GTK_WIDGET (self->root), width, height, baseline, NULL);
}

static void
awra_master_detail_dispose (GObject *object)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (object);
  if (self->root != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->root));
    self->root = NULL;
    self->master = NULL;
    self->detail = NULL;
  }
  G_OBJECT_CLASS (awra_master_detail_parent_class)->dispose (object);
}

static void
awra_master_detail_get_property (GObject *object, guint id, GValue *value,
                                 GParamSpec *pspec)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (object);
  switch (id) {
  case PROP_MASTER: g_value_set_object (value, self->master); break;
  case PROP_DETAIL: g_value_set_object (value, self->detail); break;
  case PROP_MASTER_WIDTH: g_value_set_uint (value, self->master_width); break;
  case PROP_LAYOUT_MODE: g_value_set_enum (value, self->layout_mode); break;
  case PROP_VISIBLE_PANE: g_value_set_enum (value, self->visible_pane); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_master_detail_set_property (GObject *object, guint id,
                                 const GValue *value, GParamSpec *pspec)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (object);
  switch (id) {
  case PROP_MASTER: awra_master_detail_set_master (self, g_value_get_object (value)); break;
  case PROP_DETAIL: awra_master_detail_set_detail (self, g_value_get_object (value)); break;
  case PROP_MASTER_WIDTH: awra_master_detail_set_master_width (self, g_value_get_uint (value)); break;
  case PROP_VISIBLE_PANE: awra_master_detail_set_visible_pane (self, g_value_get_enum (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_master_detail_class_init (AwraMasterDetailClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_master_detail_dispose;
  object_class->get_property = awra_master_detail_get_property;
  object_class->set_property = awra_master_detail_set_property;
  properties[PROP_MASTER] = g_param_spec_object (
    "master", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_DETAIL] = g_param_spec_object (
    "detail", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_MASTER_WIDTH] = g_param_spec_uint (
    "master-width", NULL, NULL, 180, 640, 320,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_LAYOUT_MODE] = g_param_spec_enum (
    "layout-mode", NULL, NULL, AWRA_TYPE_LAYOUT_MODE, AWRA_LAYOUT_MODE_COMPACT,
    G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_VISIBLE_PANE] = g_param_spec_enum (
    "visible-pane", NULL, NULL, AWRA_TYPE_MASTER_DETAIL_PANE,
    AWRA_MASTER_DETAIL_PANE_MASTER,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_css_name (widget_class, "awramasterdetail");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_master_detail_init (AwraMasterDetail *self)
{
  gtk_widget_set_layout_manager (
    GTK_WIDGET (self),
    gtk_custom_layout_new (awra_master_detail_request_mode,
                           awra_master_detail_measure,
                           awra_master_detail_allocate));
  self->master_width = 320;
  self->layout_mode = AWRA_LAYOUT_MODE_COMPACT;
  self->visible_pane = AWRA_MASTER_DETAIL_PANE_MASTER;
  self->root = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  awra_box_set_spacing (self->root, AWRA_SPACING_MD);
  gtk_widget_set_parent (GTK_WIDGET (self->root), GTK_WIDGET (self));
}

GtkWidget *awra_master_detail_new (void) { return g_object_new (AWRA_TYPE_MASTER_DETAIL, NULL); }
GtkWidget *awra_master_detail_get_master (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), NULL); return self->master; }
void awra_master_detail_set_master (AwraMasterDetail *self, GtkWidget *master) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (master == NULL || GTK_IS_WIDGET (master)); if (self->master == master) return; if (self->master != NULL) gtk_box_remove (self->root, self->master); self->master = master; if (master != NULL) { gtk_widget_set_size_request (master, self->master_width, -1); gtk_box_prepend (self->root, master); } update_visibility (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MASTER]); }
GtkWidget *awra_master_detail_get_detail (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), NULL); return self->detail; }
void awra_master_detail_set_detail (AwraMasterDetail *self, GtkWidget *detail) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (detail == NULL || GTK_IS_WIDGET (detail)); if (self->detail == detail) return; if (self->detail != NULL) gtk_box_remove (self->root, self->detail); self->detail = detail; if (detail != NULL) { gtk_widget_set_hexpand (detail, TRUE); gtk_box_append (self->root, detail); } update_visibility (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DETAIL]); }
guint awra_master_detail_get_master_width (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), 0); return self->master_width; }
void awra_master_detail_set_master_width (AwraMasterDetail *self, guint width) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (width >= 180 && width <= 640); if (self->master_width == width) return; self->master_width = width; gtk_widget_queue_resize (GTK_WIDGET (self)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MASTER_WIDTH]); }
AwraLayoutMode awra_master_detail_get_layout_mode (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), AWRA_LAYOUT_MODE_COMPACT); return self->layout_mode; }
AwraMasterDetailPane awra_master_detail_get_visible_pane (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), AWRA_MASTER_DETAIL_PANE_MASTER); return self->visible_pane; }
void awra_master_detail_set_visible_pane (AwraMasterDetail *self, AwraMasterDetailPane pane) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (pane == AWRA_MASTER_DETAIL_PANE_MASTER || pane == AWRA_MASTER_DETAIL_PANE_DETAIL); if (self->visible_pane == pane) return; self->visible_pane = pane; update_visibility (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_VISIBLE_PANE]); }
void awra_master_detail_show_master (AwraMasterDetail *self) { awra_master_detail_set_visible_pane (self, AWRA_MASTER_DETAIL_PANE_MASTER); }
void awra_master_detail_show_detail (AwraMasterDetail *self) { awra_master_detail_set_visible_pane (self, AWRA_MASTER_DETAIL_PANE_DETAIL); }
