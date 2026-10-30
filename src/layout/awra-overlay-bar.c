/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra-context.h>
#include <awra/awra-layout.h>
#include <awra/awra-motion.h>
#include <awra/awra-overlay-bar.h>

struct _AwraOverlayBar {
  GtkWidget parent_instance;
  GtkWidget *content, *bar;
  GtkRevealer *revealer;
  AwraSurface *surface;
  GtkBox *inset_box;
  gboolean revealed, auto_hide, inhibit, hovering, focused;
  guint hide_delay, max_width, hide_source;
  AwraSpacing inset;
  AwraStyleManager *style;
  gulong style_handler;
};
enum {
  P_0,
  P_CONTENT,
  P_BAR,
  P_REVEALED,
  P_AUTO_HIDE,
  P_INHIBIT,
  P_HIDE_DELAY,
  P_MAX_WIDTH,
  P_INSET,
  N_PROPS
};
static GParamSpec *props[N_PROPS];
G_DEFINE_FINAL_TYPE(AwraOverlayBar, awra_overlay_bar, GTK_TYPE_WIDGET)

static void cancel_hide(AwraOverlayBar *self) {
  if (self->hide_source) {
    g_source_remove(self->hide_source);
    self->hide_source = 0;
  }
}
static gboolean focus_protects(AwraOverlayBar *self) {
  GtkRoot *root = gtk_widget_get_root(GTK_WIDGET(self));
  GtkWidget *focus = root ? gtk_root_get_focus(root) : NULL;
  return focus && gtk_widget_is_ancestor(focus, GTK_WIDGET(self->revealer)) &&
         (gtk_widget_has_visible_focus(focus) || GTK_IS_EDITABLE(focus) ||
          GTK_IS_TEXT_VIEW(focus));
}
static gboolean hide_cb(gpointer data) {
  AwraOverlayBar *self = data;
  self->hide_source = 0;
  if (self->auto_hide && !self->inhibit && !self->hovering &&
      !focus_protects(self))
    awra_overlay_bar_set_revealed(self, FALSE);
  return G_SOURCE_REMOVE;
}
static void schedule_hide(AwraOverlayBar *self) {
  cancel_hide(self);
  if (self->auto_hide && self->revealed && !self->inhibit && !self->hovering &&
      !focus_protects(self) && gtk_widget_get_mapped(GTK_WIDGET(self)))
    self->hide_source = g_timeout_add(self->hide_delay, hide_cb, self);
}
static void sync_motion(AwraOverlayBar *self) {
  guint duration =
      self->style
          ? awra_motion_get_duration(self->style, AWRA_MOTION_PRESET_FAST)
          : 0;
  gtk_revealer_set_transition_duration(self->revealer, duration);
  gtk_revealer_set_transition_type(
      self->revealer, duration ? GTK_REVEALER_TRANSITION_TYPE_CROSSFADE
                               : GTK_REVEALER_TRANSITION_TYPE_NONE);
}
static void style_changed(GObject *object, GParamSpec *pspec,
                          AwraOverlayBar *self) {
  (void)object;
  (void)pspec;
  sync_motion(self);
}
static void map(GtkWidget *widget) {
  AwraOverlayBar *self = AWRA_OVERLAY_BAR(widget);
  GTK_WIDGET_CLASS(awra_overlay_bar_parent_class)->map(widget);
  self->style = awra_context_get_style_manager(
      awra_context_get_for_display(gtk_widget_get_display(widget)));
  self->style_handler = g_signal_connect(self->style, "notify::reduced-motion",
                                         G_CALLBACK(style_changed), self);
  sync_motion(self);
  schedule_hide(self);
}
static void unmap(GtkWidget *widget) {
  AwraOverlayBar *self = AWRA_OVERLAY_BAR(widget);
  cancel_hide(self);
  if (self->style)
    g_clear_signal_handler(&self->style_handler, self->style);
  self->style = NULL;
  self->hovering = FALSE;
  self->focused = FALSE;
  GTK_WIDGET_CLASS(awra_overlay_bar_parent_class)->unmap(widget);
}
static void measure(GtkWidget *widget, GtkOrientation orientation, int size,
                    int *minimum, int *natural, int *min_baseline,
                    int *nat_baseline) {
  AwraOverlayBar *self = AWRA_OVERLAY_BAR(widget);
  *minimum = *natural = 0;
  *min_baseline = *nat_baseline = -1;
  if (self->content)
    gtk_widget_measure(self->content, orientation, size, minimum, natural,
                       min_baseline, nat_baseline);
  if (self->bar && orientation == GTK_ORIENTATION_HORIZONTAL) {
    int bar_min;
    gtk_widget_measure(GTK_WIDGET(self->surface), orientation, -1, &bar_min,
                       NULL, NULL, NULL);
    bar_min += 2 * awra_spacing_resolve(widget, self->inset);
    *minimum = MAX(*minimum, bar_min);
    *natural = MAX(*natural, *minimum);
  }
}
static void allocate(GtkWidget *widget, int width, int height, int baseline) {
  AwraOverlayBar *self = AWRA_OVERLAY_BAR(widget);
  if (self->content)
    gtk_widget_allocate(self->content, width, height, baseline, NULL);
  if (self->bar) {
    int inset = awra_spacing_resolve(widget, self->inset);
    int minimum, natural, minimum_width;
    gtk_widget_measure(GTK_WIDGET(self->surface), GTK_ORIENTATION_HORIZONTAL,
                       -1, &minimum_width, NULL, NULL, NULL);
    int bar_width =
        MAX(minimum_width, MIN(width - 2 * inset, (int)self->max_width));
    gtk_widget_measure(GTK_WIDGET(self->revealer), GTK_ORIENTATION_VERTICAL,
                       bar_width, &minimum, &natural, NULL, NULL);
    int bar_height = MIN(MAX(natural, minimum), MAX(0, height - 2 * inset));
    graphene_point_t origin = GRAPHENE_POINT_INIT(
        (width - bar_width) / 2.0f, MAX(inset, height - inset - bar_height));
    GskTransform *transform = gsk_transform_translate(NULL, &origin);
    gtk_widget_allocate(GTK_WIDGET(self->revealer), bar_width, bar_height, -1,
                        transform);
  }
}
static void snapshot(GtkWidget *widget, GtkSnapshot *snapshot) {
  AwraOverlayBar *self = AWRA_OVERLAY_BAR(widget);
  if (self->content)
    gtk_widget_snapshot_child(widget, self->content, snapshot);
  gtk_widget_snapshot_child(widget, GTK_WIDGET(self->revealer), snapshot);
}
static void moved(GtkEventControllerMotion *c, double x, double y,
                  AwraOverlayBar *self) {
  (void)c;
  (void)x;
  (void)y;
  awra_overlay_bar_reveal(self);
}
static gboolean key(GtkEventControllerKey *c, guint value, guint code,
                    GdkModifierType mods, AwraOverlayBar *self) {
  (void)c;
  (void)value;
  (void)code;
  (void)mods;
  awra_overlay_bar_reveal(self);
  return FALSE;
}
static void enter(GtkEventControllerMotion *c, double x, double y,
                  AwraOverlayBar *self) {
  (void)c;
  (void)x;
  (void)y;
  self->hovering = TRUE;
  cancel_hide(self);
  awra_overlay_bar_set_revealed(self, TRUE);
}
static void leave(GtkEventControllerMotion *c, AwraOverlayBar *self) {
  (void)c;
  self->hovering = FALSE;
  schedule_hide(self);
}
static void focus_enter(GtkEventControllerFocus *c, AwraOverlayBar *self) {
  (void)c;
  self->focused = TRUE;
  cancel_hide(self);
  awra_overlay_bar_set_revealed(self, TRUE);
  schedule_hide(self);
}
static void focus_leave(GtkEventControllerFocus *c, AwraOverlayBar *self) {
  (void)c;
  self->focused = FALSE;
  schedule_hide(self);
}
static void dispose(GObject *object) {
  AwraOverlayBar *self = AWRA_OVERLAY_BAR(object);
  cancel_hide(self);
  if (self->style)
    g_clear_signal_handler(&self->style_handler, self->style);
  self->style = NULL;
  if (self->content) {
    gtk_widget_unparent(self->content);
    self->content = NULL;
  }
  if (self->revealer) {
    gtk_widget_unparent(GTK_WIDGET(self->revealer));
    self->revealer = NULL;
  }
  self->bar = NULL;
  self->surface = NULL;
  self->inset_box = NULL;
  G_OBJECT_CLASS(awra_overlay_bar_parent_class)->dispose(object);
}
static void get_property(GObject *o, guint id, GValue *v, GParamSpec *pspec) {
  AwraOverlayBar *s = AWRA_OVERLAY_BAR(o);
  switch (id) {
  case P_CONTENT:
    g_value_set_object(v, s->content);
    break;
  case P_BAR:
    g_value_set_object(v, s->bar);
    break;
  case P_REVEALED:
    g_value_set_boolean(v, s->revealed);
    break;
  case P_AUTO_HIDE:
    g_value_set_boolean(v, s->auto_hide);
    break;
  case P_INHIBIT:
    g_value_set_boolean(v, s->inhibit);
    break;
  case P_HIDE_DELAY:
    g_value_set_uint(v, s->hide_delay);
    break;
  case P_MAX_WIDTH:
    g_value_set_uint(v, s->max_width);
    break;
  case P_INSET:
    g_value_set_enum(v, s->inset);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID(o, id, pspec);
  }
}
static void set_property(GObject *o, guint id, const GValue *v,
                         GParamSpec *pspec) {
  AwraOverlayBar *s = AWRA_OVERLAY_BAR(o);
  switch (id) {
  case P_CONTENT:
    awra_overlay_bar_set_content(s, g_value_get_object(v));
    break;
  case P_BAR:
    awra_overlay_bar_set_bar(s, g_value_get_object(v));
    break;
  case P_REVEALED:
    awra_overlay_bar_set_revealed(s, g_value_get_boolean(v));
    break;
  case P_AUTO_HIDE:
    awra_overlay_bar_set_auto_hide(s, g_value_get_boolean(v));
    break;
  case P_INHIBIT:
    awra_overlay_bar_set_inhibit_auto_hide(s, g_value_get_boolean(v));
    break;
  case P_HIDE_DELAY:
    awra_overlay_bar_set_hide_delay(s, g_value_get_uint(v));
    break;
  case P_MAX_WIDTH:
    awra_overlay_bar_set_max_width(s, g_value_get_uint(v));
    break;
  case P_INSET:
    awra_overlay_bar_set_inset(s, g_value_get_enum(v));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID(o, id, pspec);
  }
}
static void awra_overlay_bar_class_init(AwraOverlayBarClass *klass) {
  GObjectClass *o = G_OBJECT_CLASS(klass);
  GtkWidgetClass *w = GTK_WIDGET_CLASS(klass);
  o->dispose = dispose;
  o->get_property = get_property;
  o->set_property = set_property;
  w->map = map;
  w->unmap = unmap;
  w->measure = measure;
  w->size_allocate = allocate;
  w->snapshot = snapshot;
  GParamFlags f =
      G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS;
  props[P_CONTENT] =
      g_param_spec_object("content", NULL, NULL, GTK_TYPE_WIDGET, f);
  props[P_BAR] = g_param_spec_object("bar", NULL, NULL, GTK_TYPE_WIDGET, f);
  props[P_REVEALED] = g_param_spec_boolean("revealed", NULL, NULL, TRUE, f);
  props[P_AUTO_HIDE] = g_param_spec_boolean("auto-hide", NULL, NULL, FALSE, f);
  props[P_INHIBIT] =
      g_param_spec_boolean("inhibit-auto-hide", NULL, NULL, FALSE, f);
  props[P_HIDE_DELAY] =
      g_param_spec_uint("hide-delay", NULL, NULL, 100, 60000, 2200, f);
  props[P_MAX_WIDTH] =
      g_param_spec_uint("max-width", NULL, NULL, 240, 8192, 1120, f);
  props[P_INSET] = g_param_spec_enum("inset", NULL, NULL, AWRA_TYPE_SPACING,
                                     AWRA_SPACING_LG, f);
  g_object_class_install_properties(o, N_PROPS, props);
  gtk_widget_class_set_css_name(w, "awraoverlaybar");
  gtk_widget_class_set_accessible_role(w, GTK_ACCESSIBLE_ROLE_GROUP);
}
static void awra_overlay_bar_init(AwraOverlayBar *self) {
  self->revealed = TRUE;
  self->hide_delay = 2200;
  self->max_width = 1120;
  self->inset = AWRA_SPACING_LG;
  self->surface =
      AWRA_SURFACE(awra_surface_new_with_role(AWRA_SURFACE_ROLE_FLOATING));
  awra_surface_set_elevation_level(self->surface, AWRA_ELEVATION_FLOATING);
  self->inset_box = GTK_BOX(gtk_box_new(GTK_ORIENTATION_VERTICAL, 0));
  awra_widget_set_margin(GTK_WIDGET(self->inset_box), AWRA_SPACING_SM);
  awra_surface_set_child(self->surface, GTK_WIDGET(self->inset_box));
  self->revealer = GTK_REVEALER(gtk_revealer_new());
  gtk_revealer_set_child(self->revealer, GTK_WIDGET(self->surface));
  gtk_revealer_set_reveal_child(self->revealer, TRUE);
  gtk_widget_set_parent(GTK_WIDGET(self->revealer), GTK_WIDGET(self));
  GtkEventController *motion = gtk_event_controller_motion_new();
  gtk_event_controller_set_propagation_phase(motion, GTK_PHASE_CAPTURE);
  g_signal_connect(motion, "motion", G_CALLBACK(moved), self);
  gtk_widget_add_controller(GTK_WIDGET(self), motion);
  GtkEventController *keys = gtk_event_controller_key_new();
  gtk_event_controller_set_propagation_phase(keys, GTK_PHASE_CAPTURE);
  g_signal_connect(keys, "key-pressed", G_CALLBACK(key), self);
  gtk_widget_add_controller(GTK_WIDGET(self), keys);
  GtkEventController *hover = gtk_event_controller_motion_new();
  g_signal_connect(hover, "enter", G_CALLBACK(enter), self);
  g_signal_connect(hover, "leave", G_CALLBACK(leave), self);
  gtk_widget_add_controller(GTK_WIDGET(self->revealer), hover);
  GtkEventController *focus = gtk_event_controller_focus_new();
  g_signal_connect(focus, "enter", G_CALLBACK(focus_enter), self);
  g_signal_connect(focus, "leave", G_CALLBACK(focus_leave), self);
  gtk_widget_add_controller(GTK_WIDGET(self->revealer), focus);
}
GtkWidget *awra_overlay_bar_new(void) {
  return g_object_new(AWRA_TYPE_OVERLAY_BAR, NULL);
}
GtkWidget *awra_overlay_bar_get_content(AwraOverlayBar *s) {
  g_return_val_if_fail(AWRA_IS_OVERLAY_BAR(s), NULL);
  return s->content;
}
void awra_overlay_bar_set_content(AwraOverlayBar *s, GtkWidget *child) {
  g_return_if_fail(AWRA_IS_OVERLAY_BAR(s));
  g_return_if_fail(child == NULL || GTK_IS_WIDGET(child));
  if (s->content == child)
    return;
  g_return_if_fail(child == NULL || gtk_widget_get_parent(child) == NULL);
  if (s->content)
    gtk_widget_unparent(s->content);
  s->content = child;
  if (child)
    gtk_widget_insert_before(child, GTK_WIDGET(s), GTK_WIDGET(s->revealer));
  gtk_widget_queue_resize(GTK_WIDGET(s));
  g_object_notify_by_pspec(G_OBJECT(s), props[P_CONTENT]);
}
GtkWidget *awra_overlay_bar_get_bar(AwraOverlayBar *s) {
  g_return_val_if_fail(AWRA_IS_OVERLAY_BAR(s), NULL);
  return s->bar;
}
void awra_overlay_bar_set_bar(AwraOverlayBar *s, GtkWidget *child) {
  g_return_if_fail(AWRA_IS_OVERLAY_BAR(s));
  g_return_if_fail(child == NULL || GTK_IS_WIDGET(child));
  if (s->bar == child)
    return;
  g_return_if_fail(child == NULL || gtk_widget_get_parent(child) == NULL);
  if (s->bar)
    gtk_box_remove(s->inset_box, s->bar);
  s->bar = child;
  if (child)
    gtk_box_append(s->inset_box, child);
  gtk_widget_set_visible(GTK_WIDGET(s->revealer), child != NULL);
  gtk_widget_queue_resize(GTK_WIDGET(s));
  g_object_notify_by_pspec(G_OBJECT(s), props[P_BAR]);
}
AwraSurface *awra_overlay_bar_get_surface(AwraOverlayBar *s) {
  g_return_val_if_fail(AWRA_IS_OVERLAY_BAR(s), NULL);
  return s->surface;
}
#define BOOL_PROP(name, field, id, after)                                      \
  gboolean awra_overlay_bar_get_##name(AwraOverlayBar *s) {                    \
    g_return_val_if_fail(AWRA_IS_OVERLAY_BAR(s), FALSE);                       \
    return s->field;                                                           \
  }                                                                            \
  void awra_overlay_bar_set_##name(AwraOverlayBar *s, gboolean value) {        \
    g_return_if_fail(AWRA_IS_OVERLAY_BAR(s));                                  \
    value = !!value;                                                           \
    if (s->field == value)                                                     \
      return;                                                                  \
    s->field = value;                                                          \
    after;                                                                     \
    g_object_notify_by_pspec(G_OBJECT(s), props[id]);                          \
  }
BOOL_PROP(revealed, revealed, P_REVEALED,
          gtk_revealer_set_reveal_child(s->revealer, value);
          schedule_hide(s))
BOOL_PROP(auto_hide, auto_hide, P_AUTO_HIDE, awra_overlay_bar_reveal(s))
BOOL_PROP(inhibit_auto_hide, inhibit, P_INHIBIT,
          if (value) awra_overlay_bar_set_revealed(s, TRUE);
          schedule_hide(s))
#undef BOOL_PROP
#define UINT_PROP(name, field, id, low, high, after)                           \
  guint awra_overlay_bar_get_##name(AwraOverlayBar *s) {                       \
    g_return_val_if_fail(AWRA_IS_OVERLAY_BAR(s), 0);                           \
    return s->field;                                                           \
  }                                                                            \
  void awra_overlay_bar_set_##name(AwraOverlayBar *s, guint value) {           \
    g_return_if_fail(AWRA_IS_OVERLAY_BAR(s));                                  \
    value = CLAMP(value, low, high);                                           \
    if (s->field == value)                                                     \
      return;                                                                  \
    s->field = value;                                                          \
    after;                                                                     \
    g_object_notify_by_pspec(G_OBJECT(s), props[id]);                          \
  }
UINT_PROP(hide_delay, hide_delay, P_HIDE_DELAY, 100, 60000, schedule_hide(s))
UINT_PROP(max_width, max_width, P_MAX_WIDTH, 240, 8192,
          gtk_widget_queue_allocate(GTK_WIDGET(s)))
#undef UINT_PROP
AwraSpacing awra_overlay_bar_get_inset(AwraOverlayBar *s) {
  g_return_val_if_fail(AWRA_IS_OVERLAY_BAR(s), AWRA_SPACING_NONE);
  return s->inset;
}
void awra_overlay_bar_set_inset(AwraOverlayBar *s, AwraSpacing value) {
  g_return_if_fail(AWRA_IS_OVERLAY_BAR(s));
  g_return_if_fail(value >= AWRA_SPACING_XS && value <= AWRA_SPACING_NONE);
  if (s->inset == value)
    return;
  s->inset = value;
  gtk_widget_queue_allocate(GTK_WIDGET(s));
  g_object_notify_by_pspec(G_OBJECT(s), props[P_INSET]);
}
void awra_overlay_bar_reveal(AwraOverlayBar *s) {
  g_return_if_fail(AWRA_IS_OVERLAY_BAR(s));
  awra_overlay_bar_set_revealed(s, TRUE);
  schedule_hide(s);
}
