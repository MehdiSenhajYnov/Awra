/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-skeleton.h>

struct _AwraSkeleton {
  GtkWidget parent_instance;
  AwraStyleManager *style;
  gulong style_handler;
  guint tick_id;
  guint lines;
  gboolean animated;
  double pulse;
};

enum { PROP_0, PROP_LINES, PROP_ANIMATED, N_PROPS };
static GParamSpec *properties[N_PROPS];
G_DEFINE_FINAL_TYPE (AwraSkeleton, awra_skeleton, GTK_TYPE_WIDGET)

static gboolean
skeleton_tick_cb (GtkWidget *widget, GdkFrameClock *clock, gpointer data)
{
  AwraSkeleton *self = data;
  gint64 micros = gdk_frame_clock_get_frame_time (clock);
  double phase = (double) (micros % 1200000) / 1200000.0;
  (void) widget;
  self->pulse = 0.72 + 0.28 * (1.0 - ABS (phase * 2.0 - 1.0));
  gtk_widget_queue_draw (GTK_WIDGET (self));
  return G_SOURCE_CONTINUE;
}

static void
update_animation (AwraSkeleton *self)
{
  gboolean reduced = self->style != NULL &&
    awra_style_manager_get_reduced_motion (self->style);
  gboolean should_run = self->animated && !reduced &&
                        gtk_widget_get_mapped (GTK_WIDGET (self));
  if (should_run && self->tick_id == 0)
    self->tick_id = gtk_widget_add_tick_callback (
      GTK_WIDGET (self), skeleton_tick_cb, self, NULL);
  else if (!should_run && self->tick_id != 0) {
    gtk_widget_remove_tick_callback (GTK_WIDGET (self), self->tick_id);
    self->tick_id = 0;
    self->pulse = 1.0;
    gtk_widget_queue_draw (GTK_WIDGET (self));
  }
}

static void
style_changed_cb (AwraStyleManager *style, GParamSpec *pspec,
                  AwraSkeleton *self)
{
  (void) style; (void) pspec;
  update_animation (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

static void
skeleton_map (GtkWidget *widget)
{
  AwraSkeleton *self = AWRA_SKELETON (widget);
  AwraContext *context;
  GTK_WIDGET_CLASS (awra_skeleton_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style = awra_context_get_style_manager (context);
  self->style_handler = g_signal_connect (self->style, "notify::token-set",
                                          G_CALLBACK (style_changed_cb), self);
  update_animation (self);
}

static void
skeleton_unmap (GtkWidget *widget)
{
  AwraSkeleton *self = AWRA_SKELETON (widget);
  if (self->tick_id != 0) {
    gtk_widget_remove_tick_callback (widget, self->tick_id);
    self->tick_id = 0;
  }
  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style, self->style_handler);
    self->style_handler = 0;
  }
  self->style = NULL;
  GTK_WIDGET_CLASS (awra_skeleton_parent_class)->unmap (widget);
}

static void
skeleton_snapshot (GtkWidget *widget, GtkSnapshot *snapshot)
{
  AwraSkeleton *self = AWRA_SKELETON (widget);
  GdkRGBA color = { 0.5, 0.5, 0.52, 0.22 };
  float width = gtk_widget_get_width (widget);

  if (self->style != NULL)
    color = *awra_token_set_get_control_cap (
      awra_style_manager_get_token_set (self->style));
  color.alpha = MAX (color.alpha, 0.08) * self->pulse;
  for (guint i = 0; i < self->lines; i++) {
    float line_width = i + 1 == self->lines ? width * 0.64f : width;
    graphene_rect_t rect = GRAPHENE_RECT_INIT (0, (float) i * 18.0f,
                                                line_width, 10.0f);
    GskRoundedRect rounded;
    gsk_rounded_rect_init_from_rect (&rounded, &rect, 5.0f);
    gtk_snapshot_push_rounded_clip (snapshot, &rounded);
    gtk_snapshot_append_color (snapshot, &color, &rect);
    gtk_snapshot_pop (snapshot);
  }
}

static void
skeleton_measure (GtkWidget *widget, GtkOrientation orientation, int for_size,
                  int *minimum, int *natural, int *minimum_baseline,
                  int *natural_baseline)
{
  AwraSkeleton *self = AWRA_SKELETON (widget);
  (void) for_size;
  if (orientation == GTK_ORIENTATION_HORIZONTAL) {
    *minimum = 96;
    *natural = 320;
  } else {
    *minimum = *natural = (int) self->lines * 18 - 8;
  }
  *minimum_baseline = *natural_baseline = -1;
}

static void skeleton_get_property (GObject *object, guint id, GValue *value, GParamSpec *pspec) { AwraSkeleton *self = AWRA_SKELETON (object); if (id == PROP_LINES) g_value_set_uint (value, self->lines); else if (id == PROP_ANIMATED) g_value_set_boolean (value, self->animated); else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec); }
static void skeleton_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec) { if (id == PROP_LINES) awra_skeleton_set_lines (AWRA_SKELETON (object), g_value_get_uint (value)); else if (id == PROP_ANIMATED) awra_skeleton_set_animated (AWRA_SKELETON (object), g_value_get_boolean (value)); else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec); }

static void
awra_skeleton_class_init (AwraSkeletonClass *klass)
{
  GObjectClass *oc = G_OBJECT_CLASS (klass);
  GtkWidgetClass *wc = GTK_WIDGET_CLASS (klass);
  oc->get_property = skeleton_get_property;
  oc->set_property = skeleton_set_property;
  wc->map = skeleton_map;
  wc->unmap = skeleton_unmap;
  wc->snapshot = skeleton_snapshot;
  wc->measure = skeleton_measure;
  properties[PROP_LINES] = g_param_spec_uint (
    "lines", NULL, NULL, 1, 12, 3,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ANIMATED] = g_param_spec_boolean (
    "animated", NULL, NULL, TRUE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (oc, N_PROPS, properties);
  gtk_widget_class_set_css_name (wc, "awraskeleton");
  gtk_widget_class_set_accessible_role (wc, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void awra_skeleton_init (AwraSkeleton *self) { self->lines = 3; self->animated = TRUE; self->pulse = 1.0; }
GtkWidget *awra_skeleton_new (void) { return g_object_new (AWRA_TYPE_SKELETON, NULL); }
guint awra_skeleton_get_lines (AwraSkeleton *self) { g_return_val_if_fail (AWRA_IS_SKELETON (self), 0); return self->lines; }
void awra_skeleton_set_lines (AwraSkeleton *self, guint lines) { g_return_if_fail (AWRA_IS_SKELETON (self)); g_return_if_fail (lines >= 1 && lines <= 12); if (self->lines == lines) return; self->lines = lines; gtk_widget_queue_resize (GTK_WIDGET (self)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LINES]); }
gboolean awra_skeleton_get_animated (AwraSkeleton *self) { g_return_val_if_fail (AWRA_IS_SKELETON (self), FALSE); return self->animated; }
void awra_skeleton_set_animated (AwraSkeleton *self, gboolean animated) { g_return_if_fail (AWRA_IS_SKELETON (self)); animated = !!animated; if (self->animated == animated) return; self->animated = animated; update_animation (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ANIMATED]); }
