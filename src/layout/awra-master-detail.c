/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-layout.h>
#include <awra/awra-master-detail.h>

struct _AwraMasterDetail {
  GtkWidget parent_instance;
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

/* The layout follows from the width being measured or allocated, and the
 * panes are never changed while allocating: parents measure exactly what is
 * then laid out, in the first frame as after a resize. In compact mode the
 * other pane is only taken off screen (child-visible); its visibility and
 * size request stay in the hands of the application. */

#define COMPACT_BELOW 680
#define EXPANDED_FROM 1040
#define MEDIUM_MASTER 280u

static gboolean
pane_shown (GtkWidget *pane)
{
  return pane != NULL && gtk_widget_get_visible (pane);
}

static void
measure_pane (GtkWidget      *pane,
              GtkOrientation  orientation,
              int             for_size,
              int            *minimum,
              int            *natural)
{
  *minimum = *natural = 0;
  if (!pane_shown (pane))
    return;
  if (for_size >= 0) {
    int min_size, nat_size;

    /* Never measured for less than it can take. */
    gtk_widget_measure (pane,
                        orientation == GTK_ORIENTATION_HORIZONTAL
                          ? GTK_ORIENTATION_VERTICAL
                          : GTK_ORIENTATION_HORIZONTAL,
                        -1, &min_size, &nat_size, NULL, NULL);
    for_size = MAX (for_size, min_size);
  }
  gtk_widget_measure (pane, orientation, for_size, minimum, natural, NULL, NULL);
}

static int
pane_spacing (AwraMasterDetail *self)
{
  return awra_spacing_resolve (GTK_WIDGET (self), AWRA_SPACING_MD);
}

/* The pane shown alone in compact mode. */
static GtkWidget *
compact_pane (AwraMasterDetail *self)
{
  gboolean detail = self->visible_pane == AWRA_MASTER_DETAIL_PANE_DETAIL;

  if (detail ? pane_shown (self->detail) : pane_shown (self->master))
    return detail ? self->detail : self->master;
  return pane_shown (self->master) ? self->master : self->detail;
}

static int
master_width_for (AwraMasterDetail *self,
                  AwraLayoutMode    mode)
{
  int minimum, natural;

  measure_pane (self->master, GTK_ORIENTATION_HORIZONTAL, -1, &minimum, &natural);
  return MAX ((int) (mode == AWRA_LAYOUT_MODE_MEDIUM
                       ? MIN (self->master_width, MEDIUM_MASTER)
                       : self->master_width),
              minimum);
}

static gboolean
both_panes (AwraMasterDetail *self)
{
  return pane_shown (self->master) && pane_shown (self->detail);
}

static AwraLayoutMode
mode_for_width (AwraMasterDetail *self,
                int               width)
{
  AwraLayoutMode mode = width < COMPACT_BELOW ? AWRA_LAYOUT_MODE_COMPACT
                        : width < EXPANDED_FROM ? AWRA_LAYOUT_MODE_MEDIUM
                                                : AWRA_LAYOUT_MODE_EXPANDED;

  /* Side by side only when both panes fit. */
  if (mode != AWRA_LAYOUT_MODE_COMPACT && both_panes (self)) {
    int detail_min, detail_nat;

    measure_pane (self->detail, GTK_ORIENTATION_HORIZONTAL, -1, &detail_min, &detail_nat);
    if (width < master_width_for (self, mode) + pane_spacing (self) + detail_min)
      mode = AWRA_LAYOUT_MODE_COMPACT;
  }
  return mode;
}

static GtkSizeRequestMode
awra_master_detail_request_mode (GtkWidget *widget)
{
  (void) widget;
  return GTK_SIZE_REQUEST_HEIGHT_FOR_WIDTH;
}

static void
awra_master_detail_measure (GtkWidget *widget, GtkOrientation orientation,
                            int for_size, int *minimum, int *natural,
                            int *minimum_baseline, int *natural_baseline)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (widget);
  AwraLayoutMode mode;
  int master_min, master_nat, detail_min, detail_nat;

  *minimum_baseline = *natural_baseline = -1;
  if (orientation == GTK_ORIENTATION_HORIZONTAL) {
    /* As narrow as the pane shown alone, as wide as both side by side. */
    measure_pane (compact_pane (self), orientation, for_size, minimum, natural);
    if (both_panes (self)) {
      measure_pane (self->detail, orientation, for_size, &detail_min, &detail_nat);
      *natural = MAX (*natural, master_width_for (self, AWRA_LAYOUT_MODE_EXPANDED) +
                                  pane_spacing (self) + detail_nat);
    }
    return;
  }

  mode = for_size >= 0 ? mode_for_width (self, for_size) : self->layout_mode;
  if (mode == AWRA_LAYOUT_MODE_COMPACT || !both_panes (self)) {
    measure_pane (compact_pane (self), orientation, for_size, minimum, natural);
    return;
  }
  {
    int master_width = master_width_for (self, mode);
    int detail_width = for_size >= 0 ? for_size - master_width - pane_spacing (self) : -1;

    measure_pane (self->master, orientation, for_size >= 0 ? master_width : -1,
                  &master_min, &master_nat);
    measure_pane (self->detail, orientation, detail_width, &detail_min, &detail_nat);
    *minimum = MAX (master_min, detail_min);
    *natural = MAX (master_nat, detail_nat);
  }
}

static void
set_layout_mode (AwraMasterDetail *self,
                 AwraLayoutMode    mode)
{
  if (mode == self->layout_mode)
    return;
  self->layout_mode = mode;
  if (mode == AWRA_LAYOUT_MODE_COMPACT)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-compact");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-compact");
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LAYOUT_MODE]);
}

static void
place_pane (GtkWidget *pane,
            gboolean   on_screen,
            int        x,
            int        width,
            int        height)
{
  if (pane == NULL)
    return;
  gtk_widget_set_child_visible (pane, on_screen);
  if (on_screen && gtk_widget_get_visible (pane))
    gtk_widget_allocate (pane, width, height, -1,
                         gsk_transform_translate (NULL, &GRAPHENE_POINT_INIT (x, 0)));
}

static void
awra_master_detail_allocate (GtkWidget *widget, int width, int height,
                             int baseline)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (widget);
  AwraLayoutMode mode = mode_for_width (self, width);

  (void) baseline;
  set_layout_mode (self, mode);
  if (mode != AWRA_LAYOUT_MODE_COMPACT && both_panes (self)) {
    int master_width = master_width_for (self, mode);
    int detail_x = master_width + pane_spacing (self);
    int detail_width = MAX (width - detail_x, 0);
    gboolean rtl = gtk_widget_get_direction (widget) == GTK_TEXT_DIR_RTL;

    place_pane (self->master, TRUE, rtl ? width - master_width : 0, master_width, height);
    place_pane (self->detail, TRUE, rtl ? 0 : detail_x, detail_width, height);
  } else {
    GtkWidget *alone = compact_pane (self);

    place_pane (self->master, alone == self->master, 0, width, height);
    place_pane (self->detail, alone == self->detail, 0, width, height);
  }
}

static void
awra_master_detail_dispose (GObject *object)
{
  AwraMasterDetail *self = AWRA_MASTER_DETAIL (object);

  g_clear_pointer (&self->master, gtk_widget_unparent);
  g_clear_pointer (&self->detail, gtk_widget_unparent);
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
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-compact");
}

GtkWidget *awra_master_detail_new (void) { return g_object_new (AWRA_TYPE_MASTER_DETAIL, NULL); }
GtkWidget *awra_master_detail_get_master (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), NULL); return self->master; }
void awra_master_detail_set_master (AwraMasterDetail *self, GtkWidget *master) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (master == NULL || GTK_IS_WIDGET (master)); if (self->master == master) return; g_return_if_fail (master == NULL || gtk_widget_get_parent (master) == NULL); if (self->master != NULL) gtk_widget_unparent (self->master); self->master = master; if (master != NULL) gtk_widget_insert_after (master, GTK_WIDGET (self), NULL); gtk_widget_queue_resize (GTK_WIDGET (self)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MASTER]); }
GtkWidget *awra_master_detail_get_detail (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), NULL); return self->detail; }
void awra_master_detail_set_detail (AwraMasterDetail *self, GtkWidget *detail) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (detail == NULL || GTK_IS_WIDGET (detail)); if (self->detail == detail) return; g_return_if_fail (detail == NULL || gtk_widget_get_parent (detail) == NULL); if (self->detail != NULL) gtk_widget_unparent (self->detail); self->detail = detail; if (detail != NULL) { gtk_widget_set_hexpand (detail, TRUE); gtk_widget_insert_before (detail, GTK_WIDGET (self), NULL); } gtk_widget_queue_resize (GTK_WIDGET (self)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DETAIL]); }
guint awra_master_detail_get_master_width (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), 0); return self->master_width; }
void awra_master_detail_set_master_width (AwraMasterDetail *self, guint width) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (width >= 180 && width <= 640); if (self->master_width == width) return; self->master_width = width; gtk_widget_queue_resize (GTK_WIDGET (self)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MASTER_WIDTH]); }
AwraLayoutMode awra_master_detail_get_layout_mode (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), AWRA_LAYOUT_MODE_COMPACT); return self->layout_mode; }
AwraMasterDetailPane awra_master_detail_get_visible_pane (AwraMasterDetail *self) { g_return_val_if_fail (AWRA_IS_MASTER_DETAIL (self), AWRA_MASTER_DETAIL_PANE_MASTER); return self->visible_pane; }
void awra_master_detail_set_visible_pane (AwraMasterDetail *self, AwraMasterDetailPane pane) { g_return_if_fail (AWRA_IS_MASTER_DETAIL (self)); g_return_if_fail (pane == AWRA_MASTER_DETAIL_PANE_MASTER || pane == AWRA_MASTER_DETAIL_PANE_DETAIL); if (self->visible_pane == pane) return; self->visible_pane = pane; gtk_widget_queue_resize (GTK_WIDGET (self)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_VISIBLE_PANE]); }
void awra_master_detail_show_master (AwraMasterDetail *self) { awra_master_detail_set_visible_pane (self, AWRA_MASTER_DETAIL_PANE_MASTER); }
void awra_master_detail_show_detail (AwraMasterDetail *self) { awra_master_detail_set_visible_pane (self, AWRA_MASTER_DETAIL_PANE_DETAIL); }
