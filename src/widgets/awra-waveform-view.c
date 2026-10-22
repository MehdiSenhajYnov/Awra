/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <math.h>

#include <awra/awra-context.h>
#include <awra/awra-motion.h>
#include <awra/awra-waveform-view.h>

#include "awra-i18n-private.h"
#include "widgets/awra-media-time-private.h"

#define BAR_WIDTH     2.5f
#define BAR_GAP       1.5f
#define INSET         4.0f
#define HANDLE_RADIUS 4.5f
#define HIT_SLOP      8.0

typedef enum {
  DRAG_NONE,
  DRAG_MARKER,
  DRAG_SEEK,
} DragMode;

struct _AwraWaveformView {
  GtkWidget parent_instance;

  GArray *peaks;            /* float */
  guint expected_peaks;
  double duration;
  double position;
  double marker_position;
  double hint_position;
  gboolean marker_editable;

  guint reveal_from;
  gint64 reveal_start;
  guint reveal_duration;
  double reveal_progress;
  guint tick_id;

  DragMode drag_mode;
  double drag_start_x;
  double seek_target;

  AwraStyleManager *style;
  gulong style_handler;
};

enum {
  PROP_0,
  PROP_DURATION,
  PROP_POSITION,
  PROP_MARKER_POSITION,
  PROP_HINT_POSITION,
  PROP_MARKER_EDITABLE,
  PROP_EXPECTED_PEAKS,
  N_PROPS,
};

enum {
  SIGNAL_MARKER_MOVED,
  SIGNAL_MARKER_COMMITTED,
  SIGNAL_SEEK_REQUESTED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraWaveformView, awra_waveform_view, GTK_TYPE_WIDGET)

static AwraTokenSet *
get_tokens (AwraWaveformView *self)
{
  AwraStyleManager *style = self->style;

  if (style == NULL)
    style = awra_context_get_style_manager (awra_context_get_for_display (
      gtk_widget_get_display (GTK_WIDGET (self))));
  return awra_style_manager_get_token_set (style);
}

static gboolean
is_rtl (AwraWaveformView *self)
{
  return gtk_widget_get_direction (GTK_WIDGET (self)) == GTK_TEXT_DIR_RTL;
}

static double
time_to_x (AwraWaveformView *self,
           double            time,
           double            width)
{
  double fraction;
  double span = MAX (width - 2.0 * INSET, 1.0);

  fraction = self->duration > 0.0 ? CLAMP (time / self->duration, 0.0, 1.0)
                                  : 0.0;
  if (is_rtl (self))
    fraction = 1.0 - fraction;
  return INSET + fraction * span;
}

static double
x_to_time (AwraWaveformView *self,
           double            x)
{
  double width = gtk_widget_get_width (GTK_WIDGET (self));
  double span = MAX (width - 2.0 * INSET, 1.0);
  double fraction = CLAMP ((x - INSET) / span, 0.0, 1.0);

  if (is_rtl (self))
    fraction = 1.0 - fraction;
  return fraction * MAX (self->duration, 0.0);
}

static double
value_time (AwraWaveformView *self)
{
  if (self->marker_editable && self->marker_position >= 0.0)
    return self->marker_position;
  return MAX (self->position, 0.0);
}

static void
update_accessible (AwraWaveformView *self)
{
  g_autofree char *now = awra_media_format_time (value_time (self));
  g_autofree char *total = awra_media_format_time (self->duration);
  g_autofree char *text = g_strdup_printf (_("%s of %s"), now, total);

  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_VALUE_MIN, 0.0,
                                  GTK_ACCESSIBLE_PROPERTY_VALUE_MAX,
                                  MAX (self->duration, 0.0),
                                  GTK_ACCESSIBLE_PROPERTY_VALUE_NOW,
                                  value_time (self),
                                  GTK_ACCESSIBLE_PROPERTY_VALUE_TEXT, text,
                                  -1);
}

static gboolean
reveal_tick_cb (GtkWidget     *widget,
                GdkFrameClock *clock,
                gpointer       data)
{
  AwraWaveformView *self = data;
  gint64 now = gdk_frame_clock_get_frame_time (clock);

  (void) widget;
  if (self->reveal_start == 0)
    self->reveal_start = now;
  self->reveal_progress = self->reveal_duration == 0
                            ? 1.0
                            : (double) (now - self->reveal_start) /
                              ((double) self->reveal_duration * 1000.0);
  gtk_widget_queue_draw (GTK_WIDGET (self));
  if (self->reveal_progress >= 1.0) {
    self->reveal_progress = 1.0;
    self->tick_id = 0;
    return G_SOURCE_REMOVE;
  }
  return G_SOURCE_CONTINUE;
}

static void
stop_reveal (AwraWaveformView *self)
{
  if (self->tick_id != 0) {
    gtk_widget_remove_tick_callback (GTK_WIDGET (self), self->tick_id);
    self->tick_id = 0;
  }
  self->reveal_progress = 1.0;
}

static void
start_reveal (AwraWaveformView *self,
              guint             from)
{
  guint duration = 0;

  if (self->style != NULL && gtk_widget_get_mapped (GTK_WIDGET (self)))
    duration = awra_motion_get_duration (self->style,
                                         AWRA_MOTION_PRESET_SLOW);
  if (duration == 0) {
    stop_reveal (self);
    return;
  }
  /* Bars from an interrupted reveal complete; only the new ones grow. */
  self->reveal_from = from;
  self->reveal_duration = duration;
  self->reveal_start = 0;
  self->reveal_progress = 0.0;
  if (self->tick_id == 0)
    self->tick_id = gtk_widget_add_tick_callback (GTK_WIDGET (self),
                                                  reveal_tick_cb, self, NULL);
}

static void
style_changed_cb (AwraStyleManager *style,
                  GParamSpec       *pspec,
                  AwraWaveformView *self)
{
  (void) style;
  (void) pspec;
  if (awra_style_manager_get_reduced_motion (self->style))
    stop_reveal (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

static void
awra_waveform_view_map (GtkWidget *widget)
{
  AwraWaveformView *self = AWRA_WAVEFORM_VIEW (widget);

  GTK_WIDGET_CLASS (awra_waveform_view_parent_class)->map (widget);
  self->style = awra_context_get_style_manager (
    awra_context_get_for_display (gtk_widget_get_display (widget)));
  self->style_handler = g_signal_connect (self->style, "notify",
                                          G_CALLBACK (style_changed_cb), self);
}

static void
awra_waveform_view_unmap (GtkWidget *widget)
{
  AwraWaveformView *self = AWRA_WAVEFORM_VIEW (widget);

  stop_reveal (self);
  if (self->style != NULL)
    g_clear_signal_handler (&self->style_handler, self->style);
  self->style = NULL;
  GTK_WIDGET_CLASS (awra_waveform_view_parent_class)->unmap (widget);
}

static void
awra_waveform_view_measure (GtkWidget      *widget,
                            GtkOrientation  orientation,
                            int             for_size,
                            int            *minimum,
                            int            *natural,
                            int            *minimum_baseline,
                            int            *natural_baseline)
{
  (void) widget;
  (void) for_size;
  if (orientation == GTK_ORIENTATION_HORIZONTAL) {
    *minimum = 48;
    *natural = 240;
  } else {
    *minimum = 24;
    *natural = 48;
  }
  *minimum_baseline = -1;
  *natural_baseline = -1;
}

static float
bucket_peak (AwraWaveformView *self,
             guint             bar,
             guint             n_bars,
             guint             capacity,
             gboolean         *present,
             guint            *peak_index)
{
  guint start = (guint) ((guint64) bar * capacity / n_bars);
  guint end = (guint) ((guint64) (bar + 1) * capacity / n_bars);
  float value = 0.0f;

  end = MAX (end, start + 1);
  *present = start < self->peaks->len;
  *peak_index = start;
  for (guint i = start; i < end && i < self->peaks->len; i++)
    value = MAX (value, CLAMP (g_array_index (self->peaks, float, i), 0.0f,
                               1.0f));
  return value;
}

static void
append_dashed_line (GtkSnapshot   *snapshot,
                    float          x,
                    float          top,
                    float          bottom,
                    const GdkRGBA *color)
{
  for (float y = top; y < bottom; y += 6.0f) {
    graphene_rect_t dash = GRAPHENE_RECT_INIT (x - 0.75f, y, 1.5f,
                                               MIN (3.0f, bottom - y));

    gtk_snapshot_append_color (snapshot, color, &dash);
  }
}

static void
append_handle (GtkSnapshot   *snapshot,
               float          x,
               float          y,
               float          radius,
               const GdkRGBA *fill,
               const GdkRGBA *rim)
{
  graphene_rect_t bounds = GRAPHENE_RECT_INIT (x - radius, y - radius,
                                               radius * 2.0f, radius * 2.0f);
  GskRoundedRect circle;
  const float widths[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
  const GdkRGBA colors[4] = { *rim, *rim, *rim, *rim };

  gsk_rounded_rect_init_from_rect (&circle, &bounds, radius);
  gtk_snapshot_push_rounded_clip (snapshot, &circle);
  gtk_snapshot_append_color (snapshot, fill, &bounds);
  gtk_snapshot_pop (snapshot);
  gtk_snapshot_append_border (snapshot, &circle, widths, colors);
}

static void
awra_waveform_view_snapshot (GtkWidget   *widget,
                             GtkSnapshot *snapshot)
{
  AwraWaveformView *self = AWRA_WAVEFORM_VIEW (widget);
  AwraTokenSet *tokens = get_tokens (self);
  float width = (float) gtk_widget_get_width (widget);
  float height = (float) gtk_widget_get_height (widget);
  float radius = (float) awra_token_set_get_radius_for_size (tokens,
                                                             AWRA_RADIUS_SMALL);
  float center = height / 2.0f;
  float amplitude = MAX (height / 2.0f - INSET, 1.0f);
  float pitch = BAR_WIDTH + BAR_GAP;
  float span = MAX (width - 2.0f * INSET, 1.0f);
  guint n_bars = (guint) MAX (floorf ((span + BAR_GAP) / pitch), 1.0f);
  guint capacity = MAX (MAX (self->expected_peaks, self->peaks->len), 1);
  gboolean has_position = self->position >= 0.0 && self->duration > 0.0;
  gboolean has_marker = self->marker_position >= 0.0 && self->duration > 0.0;
  gboolean rtl = is_rtl (self);
  double position_x = has_position ? time_to_x (self, self->position, width)
                                   : -1.0;
  double marker_x = has_marker ? time_to_x (self, self->marker_position, width)
                               : -1.0;
  GskPathBuilder *builders[4];
  GdkRGBA colors[4];
  GskRoundedRect well;
  graphene_rect_t bounds;
  gboolean any_peak = self->peaks->len > 0;

  if (width <= 0.0f || height <= 0.0f)
    return;

  bounds = GRAPHENE_RECT_INIT (0.0f, 0.0f, width, height);
  gsk_rounded_rect_init_from_rect (&well, &bounds, MIN (radius, height / 2.0f));
  gtk_snapshot_push_rounded_clip (snapshot, &well);
  gtk_snapshot_append_color (snapshot,
                             awra_token_set_get_control_well (tokens),
                             &bounds);
  gtk_snapshot_pop (snapshot);

  /* 0: unplayed, 1: played, 2: unplayed before marker, 3: played before. */
  colors[0] = *awra_token_set_get_foreground (tokens);
  colors[0].alpha = any_peak ? 0.38 : 0.12;
  colors[1] = *awra_token_set_get_accent (tokens);
  colors[2] = colors[0];
  colors[2].alpha *= 0.5;
  colors[3] = colors[1];
  colors[3].alpha *= 0.55;
  for (guint i = 0; i < G_N_ELEMENTS (builders); i++)
    builders[i] = gsk_path_builder_new ();

  for (guint bar = 0; bar < n_bars; bar++) {
    gboolean present;
    guint peak_index;
    float peak = bucket_peak (self, bar, n_bars, capacity, &present,
                              &peak_index);
    float x = INSET + (float) bar * pitch;
    float bar_height;
    double scale = 1.0;
    double bar_center;
    guint slot;
    graphene_rect_t rect;
    GskRoundedRect rounded;

    if (rtl)
      x = width - INSET - (float) bar * pitch - BAR_WIDTH;
    if (any_peak && !present)
      continue;
    if (present && peak_index >= self->reveal_from &&
        self->reveal_progress < 1.0)
      scale = awra_motion_ease_out_cubic (self->reveal_progress);
    bar_height = MAX (2.0f, peak * 2.0f * amplitude * (float) scale);
    bar_center = x + BAR_WIDTH / 2.0f;
    slot = has_position && (rtl ? bar_center >= position_x
                                : bar_center <= position_x) ? 1 : 0;
    if (has_marker && (rtl ? bar_center > marker_x : bar_center < marker_x))
      slot += 2;
    rect = GRAPHENE_RECT_INIT (x, center - bar_height / 2.0f, BAR_WIDTH,
                               bar_height);
    gsk_rounded_rect_init_from_rect (&rounded, &rect, BAR_WIDTH / 2.0f);
    gsk_path_builder_add_rounded_rect (builders[slot], &rounded);
  }

  for (guint i = 0; i < G_N_ELEMENTS (builders); i++) {
    g_autoptr (GskPath) path = gsk_path_builder_free_to_path (builders[i]);

    if (!gsk_path_is_empty (path))
      gtk_snapshot_append_fill (snapshot, path, GSK_FILL_RULE_WINDING,
                                &colors[i]);
  }

  if (self->hint_position >= 0.0 && self->duration > 0.0) {
    GdkRGBA hint = *awra_token_set_get_foreground (tokens);

    hint.alpha = 0.62;
    append_dashed_line (snapshot,
                        (float) time_to_x (self, self->hint_position, width),
                        2.0f, height - 2.0f, &hint);
  }

  if (has_position) {
    GdkRGBA cursor = *awra_token_set_get_foreground (tokens);
    graphene_rect_t line = GRAPHENE_RECT_INIT ((float) position_x - 0.75f,
                                               2.0f, 1.5f, height - 4.0f);

    cursor.alpha = 0.85;
    gtk_snapshot_append_color (snapshot, &cursor, &line);
  }

  if (has_marker) {
    const GdkRGBA *accent = awra_token_set_get_accent_content (tokens);
    graphene_rect_t line = GRAPHENE_RECT_INIT ((float) marker_x - 1.0f, 0.0f,
                                               2.0f, height);
    GdkRGBA rim = *awra_token_set_get_control_thumb (tokens);

    gtk_snapshot_append_color (snapshot, accent, &line);
    append_handle (snapshot, (float) marker_x,
                   MIN (HANDLE_RADIUS + 1.0f, center), HANDLE_RADIUS,
                   accent, &rim);
  }

  if (awra_token_set_get_high_contrast (tokens)) {
    const float widths[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
    const GdkRGBA *outline = awra_token_set_get_outline (tokens);
    const GdkRGBA border[4] = { *outline, *outline, *outline, *outline };

    gtk_snapshot_append_border (snapshot, &well, widths, border);
  }

  if (gtk_widget_get_state_flags (widget) & GTK_STATE_FLAG_FOCUS_VISIBLE) {
    const float widths[4] = { 2.0f, 2.0f, 2.0f, 2.0f };
    const GdkRGBA *focus = awra_token_set_get_focus_ring (tokens);
    const GdkRGBA ring_colors[4] = { *focus, *focus, *focus, *focus };
    graphene_rect_t outer;
    GskRoundedRect ring;

    graphene_rect_inset_r (&bounds, -3.0f, -3.0f, &outer);
    gsk_rounded_rect_init_from_rect (&ring, &outer, well.corner[0].width + 3.0f);
    gtk_snapshot_append_border (snapshot, &ring, widths, ring_colors);
  }
}

static void
set_marker_internal (AwraWaveformView *self,
                     double            position,
                     gboolean          commit)
{
  awra_waveform_view_set_marker_position (self, position);
  g_signal_emit (self, signals[SIGNAL_MARKER_MOVED], 0, self->marker_position);
  if (commit)
    g_signal_emit (self, signals[SIGNAL_MARKER_COMMITTED], 0,
                   self->marker_position);
}

static void
drag_begin_cb (GtkGestureDrag   *gesture,
               double            x,
               double            y,
               AwraWaveformView *self)
{
  GdkModifierType state = gtk_event_controller_get_current_event_state (
    GTK_EVENT_CONTROLLER (gesture));
  gboolean seek_modifier = (state & (GDK_CONTROL_MASK | GDK_SHIFT_MASK)) != 0;

  (void) y;
  if (self->duration <= 0.0) {
    gtk_gesture_set_state (GTK_GESTURE (gesture), GTK_EVENT_SEQUENCE_DENIED);
    return;
  }
  gtk_widget_grab_focus (GTK_WIDGET (self));
  self->drag_start_x = x;
  if (self->marker_editable && !seek_modifier) {
    self->drag_mode = DRAG_MARKER;
    set_marker_internal (self, x_to_time (self, x), FALSE);
  } else {
    self->drag_mode = DRAG_SEEK;
    self->seek_target = x_to_time (self, x);
  }
  gtk_gesture_set_state (GTK_GESTURE (gesture), GTK_EVENT_SEQUENCE_CLAIMED);
}

static void
drag_update_cb (GtkGestureDrag   *gesture,
                double            offset_x,
                double            offset_y,
                AwraWaveformView *self)
{
  double x = self->drag_start_x + offset_x;

  (void) gesture;
  (void) offset_y;
  if (self->drag_mode == DRAG_MARKER)
    set_marker_internal (self, x_to_time (self, x), FALSE);
  else if (self->drag_mode == DRAG_SEEK)
    self->seek_target = x_to_time (self, x);
}

static void
drag_end_cb (GtkGestureDrag   *gesture,
             double            offset_x,
             double            offset_y,
             AwraWaveformView *self)
{
  DragMode mode = self->drag_mode;

  (void) gesture;
  (void) offset_x;
  (void) offset_y;
  self->drag_mode = DRAG_NONE;
  if (mode == DRAG_MARKER)
    g_signal_emit (self, signals[SIGNAL_MARKER_COMMITTED], 0,
                   self->marker_position);
  else if (mode == DRAG_SEEK)
    g_signal_emit (self, signals[SIGNAL_SEEK_REQUESTED], 0, self->seek_target);
}

static gboolean
key_pressed_cb (GtkEventControllerKey *controller,
                guint                  keyval,
                guint                  keycode,
                GdkModifierType        state,
                AwraWaveformView      *self)
{
  double small = MAX (self->duration * 0.01, 0.01);
  double big = MAX (self->duration * 0.10, 0.1);
  double step = (state & GDK_SHIFT_MASK) != 0 ? big : small;
  double base = value_time (self);
  double target;
  double direction = is_rtl (self) ? -1.0 : 1.0;

  (void) controller;
  (void) keycode;
  if (self->duration <= 0.0)
    return FALSE;
  switch (keyval) {
  case GDK_KEY_Left:
  case GDK_KEY_KP_Left:
    target = base - step * direction;
    break;
  case GDK_KEY_Right:
  case GDK_KEY_KP_Right:
    target = base + step * direction;
    break;
  case GDK_KEY_Page_Down:
    target = base - big;
    break;
  case GDK_KEY_Page_Up:
    target = base + big;
    break;
  case GDK_KEY_Home:
  case GDK_KEY_KP_Home:
    target = 0.0;
    break;
  case GDK_KEY_End:
  case GDK_KEY_KP_End:
    target = self->duration;
    break;
  default:
    return FALSE;
  }
  target = CLAMP (target, 0.0, self->duration);
  if (self->marker_editable)
    set_marker_internal (self, target, TRUE);
  else
    g_signal_emit (self, signals[SIGNAL_SEEK_REQUESTED], 0, target);
  return TRUE;
}

static void
awra_waveform_view_state_flags_changed (GtkWidget     *widget,
                                        GtkStateFlags  previous)
{
  GTK_WIDGET_CLASS (awra_waveform_view_parent_class)->state_flags_changed (
    widget, previous);
  gtk_widget_queue_draw (widget);
}

static void
awra_waveform_view_dispose (GObject *object)
{
  AwraWaveformView *self = AWRA_WAVEFORM_VIEW (object);

  if (self->style != NULL)
    g_clear_signal_handler (&self->style_handler, self->style);
  self->style = NULL;
  G_OBJECT_CLASS (awra_waveform_view_parent_class)->dispose (object);
}

static void
awra_waveform_view_finalize (GObject *object)
{
  g_array_unref (AWRA_WAVEFORM_VIEW (object)->peaks);
  G_OBJECT_CLASS (awra_waveform_view_parent_class)->finalize (object);
}

static void
awra_waveform_view_get_property (GObject    *object,
                                 guint       property_id,
                                 GValue     *value,
                                 GParamSpec *pspec)
{
  AwraWaveformView *self = AWRA_WAVEFORM_VIEW (object);

  switch (property_id) {
  case PROP_DURATION:
    g_value_set_double (value, self->duration);
    break;
  case PROP_POSITION:
    g_value_set_double (value, self->position);
    break;
  case PROP_MARKER_POSITION:
    g_value_set_double (value, self->marker_position);
    break;
  case PROP_HINT_POSITION:
    g_value_set_double (value, self->hint_position);
    break;
  case PROP_MARKER_EDITABLE:
    g_value_set_boolean (value, self->marker_editable);
    break;
  case PROP_EXPECTED_PEAKS:
    g_value_set_uint (value, self->expected_peaks);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_waveform_view_set_property (GObject      *object,
                                 guint         property_id,
                                 const GValue *value,
                                 GParamSpec   *pspec)
{
  AwraWaveformView *self = AWRA_WAVEFORM_VIEW (object);

  switch (property_id) {
  case PROP_DURATION:
    awra_waveform_view_set_duration (self, g_value_get_double (value));
    break;
  case PROP_POSITION:
    awra_waveform_view_set_position (self, g_value_get_double (value));
    break;
  case PROP_MARKER_POSITION:
    awra_waveform_view_set_marker_position (self, g_value_get_double (value));
    break;
  case PROP_HINT_POSITION:
    awra_waveform_view_set_hint_position (self, g_value_get_double (value));
    break;
  case PROP_MARKER_EDITABLE:
    awra_waveform_view_set_marker_editable (self, g_value_get_boolean (value));
    break;
  case PROP_EXPECTED_PEAKS:
    awra_waveform_view_set_expected_peaks (self, g_value_get_uint (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_waveform_view_class_init (AwraWaveformViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  const GParamFlags flags = G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                            G_PARAM_STATIC_STRINGS;

  object_class->dispose = awra_waveform_view_dispose;
  object_class->finalize = awra_waveform_view_finalize;
  object_class->get_property = awra_waveform_view_get_property;
  object_class->set_property = awra_waveform_view_set_property;
  widget_class->map = awra_waveform_view_map;
  widget_class->unmap = awra_waveform_view_unmap;
  widget_class->measure = awra_waveform_view_measure;
  widget_class->snapshot = awra_waveform_view_snapshot;
  widget_class->state_flags_changed = awra_waveform_view_state_flags_changed;

  properties[PROP_DURATION] =
    g_param_spec_double ("duration", NULL, NULL, 0.0, G_MAXDOUBLE, 0.0,
                         flags);
  properties[PROP_POSITION] =
    g_param_spec_double ("position", NULL, NULL, -1.0, G_MAXDOUBLE, -1.0,
                         flags);
  properties[PROP_MARKER_POSITION] =
    g_param_spec_double ("marker-position", NULL, NULL, -1.0, G_MAXDOUBLE,
                         -1.0, flags);
  properties[PROP_HINT_POSITION] =
    g_param_spec_double ("hint-position", NULL, NULL, -1.0, G_MAXDOUBLE,
                         -1.0, flags);
  properties[PROP_MARKER_EDITABLE] =
    g_param_spec_boolean ("marker-editable", NULL, NULL, FALSE, flags);
  properties[PROP_EXPECTED_PEAKS] =
    g_param_spec_uint ("expected-peaks", NULL, NULL, 0, G_MAXUINT, 0, flags);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraWaveformView::marker-moved:
   * @self: the waveform view
   * @position: the new marker position in seconds
   *
   * Emitted continuously while the marker is dragged and after each
   * keyboard change.
   */
  signals[SIGNAL_MARKER_MOVED] =
    g_signal_new ("marker-moved", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  G_TYPE_DOUBLE);
  /**
   * AwraWaveformView::marker-committed:
   * @self: the waveform view
   * @position: the final marker position in seconds
   *
   * Emitted when a pointer drag ends or a keyboard change is applied.
   */
  signals[SIGNAL_MARKER_COMMITTED] =
    g_signal_new ("marker-committed", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  G_TYPE_DOUBLE);
  /**
   * AwraWaveformView::seek-requested:
   * @self: the waveform view
   * @position: the requested playback position in seconds
   *
   * Emitted on click (or Ctrl/Shift+click while the marker is editable) and
   * for keyboard steps when the marker is not editable. The view never
   * changes #AwraWaveformView:position itself.
   */
  signals[SIGNAL_SEEK_REQUESTED] =
    g_signal_new ("seek-requested", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  G_TYPE_DOUBLE);

  gtk_widget_class_set_css_name (widget_class, "awrawaveformview");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_SLIDER);
}

static void
awra_waveform_view_init (AwraWaveformView *self)
{
  GtkGesture *drag;
  GtkEventController *keys;

  self->peaks = g_array_new (FALSE, FALSE, sizeof (float));
  self->position = -1.0;
  self->marker_position = -1.0;
  self->hint_position = -1.0;
  self->reveal_progress = 1.0;
  gtk_widget_set_focusable (GTK_WIDGET (self), TRUE);
  gtk_widget_set_overflow (GTK_WIDGET (self), GTK_OVERFLOW_VISIBLE);

  drag = gtk_gesture_drag_new ();
  gtk_gesture_single_set_button (GTK_GESTURE_SINGLE (drag), GDK_BUTTON_PRIMARY);
  g_signal_connect (drag, "drag-begin", G_CALLBACK (drag_begin_cb), self);
  g_signal_connect (drag, "drag-update", G_CALLBACK (drag_update_cb), self);
  g_signal_connect (drag, "drag-end", G_CALLBACK (drag_end_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), GTK_EVENT_CONTROLLER (drag));

  keys = gtk_event_controller_key_new ();
  g_signal_connect (keys, "key-pressed", G_CALLBACK (key_pressed_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), keys);

  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  _("Waveform"), -1);
  update_accessible (self);
}

GtkWidget *
awra_waveform_view_new (void)
{
  return g_object_new (AWRA_TYPE_WAVEFORM_VIEW, NULL);
}

void
awra_waveform_view_set_peaks (AwraWaveformView *self,
                              const float      *peaks,
                              gsize             n_peaks)
{
  guint previous;
  gboolean extends = TRUE;

  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  g_return_if_fail (peaks != NULL || n_peaks == 0);
  g_return_if_fail (n_peaks <= G_MAXUINT);

  previous = self->peaks->len;
  if (n_peaks < previous) {
    extends = FALSE;
  } else {
    for (guint i = 0; i < previous; i++) {
      if (g_array_index (self->peaks, float, i) != peaks[i]) {
        extends = FALSE;
        break;
      }
    }
  }
  if (extends && n_peaks == previous)
    return;

  g_array_set_size (self->peaks, 0);
  if (n_peaks > 0)
    g_array_append_vals (self->peaks, peaks, (guint) n_peaks);
  if (n_peaks > 0)
    start_reveal (self, extends ? previous : 0);
  else
    stop_reveal (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

const float *
awra_waveform_view_get_peaks (AwraWaveformView *self,
                              gsize            *n_peaks)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), NULL);
  g_return_val_if_fail (n_peaks != NULL, NULL);
  *n_peaks = self->peaks->len;
  return self->peaks->len > 0 ? (const float *) self->peaks->data : NULL;
}

double
awra_waveform_view_get_duration (AwraWaveformView *self)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), 0.0);
  return self->duration;
}

void
awra_waveform_view_set_duration (AwraWaveformView *self,
                                 double            duration)
{
  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  if (!isfinite (duration) || duration < 0.0)
    duration = 0.0;
  if (self->duration == duration)
    return;
  self->duration = duration;
  update_accessible (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DURATION]);
}

static double
normalize_time (double value)
{
  if (!isfinite (value) || value < 0.0)
    return -1.0;
  return value;
}

double
awra_waveform_view_get_position (AwraWaveformView *self)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), -1.0);
  return self->position;
}

/**
 * awra_waveform_view_set_position:
 * @self: an Awra waveform view
 * @position: the playback cursor in seconds, or a negative value to hide it
 */
void
awra_waveform_view_set_position (AwraWaveformView *self,
                                 double            position)
{
  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  position = normalize_time (position);
  if (self->position == position)
    return;
  self->position = position;
  if (!self->marker_editable)
    update_accessible (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_POSITION]);
}

double
awra_waveform_view_get_marker_position (AwraWaveformView *self)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), -1.0);
  return self->marker_position;
}

/**
 * awra_waveform_view_set_marker_position:
 * @self: an Awra waveform view
 * @position: the primary marker in seconds, or a negative value to hide it
 *
 * The marker is clamped to the duration when one is known.
 */
void
awra_waveform_view_set_marker_position (AwraWaveformView *self,
                                        double            position)
{
  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  position = normalize_time (position);
  if (position >= 0.0 && self->duration > 0.0)
    position = MIN (position, self->duration);
  if (self->marker_position == position)
    return;
  self->marker_position = position;
  update_accessible (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_MARKER_POSITION]);
}

double
awra_waveform_view_get_hint_position (AwraWaveformView *self)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), -1.0);
  return self->hint_position;
}

/**
 * awra_waveform_view_set_hint_position:
 * @self: an Awra waveform view
 * @position: a secondary dashed marker in seconds, such as a suggestion, or
 *   a negative value to hide it
 */
void
awra_waveform_view_set_hint_position (AwraWaveformView *self,
                                      double            position)
{
  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  position = normalize_time (position);
  if (self->hint_position == position)
    return;
  self->hint_position = position;
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_HINT_POSITION]);
}

guint
awra_waveform_view_get_expected_peaks (AwraWaveformView *self)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), 0);
  return self->expected_peaks;
}

/**
 * awra_waveform_view_set_expected_peaks:
 * @self: an Awra waveform view
 * @expected_peaks: the final number of peaks of a streamed analysis, or 0
 *
 * When larger than the current number of peaks, the received peaks keep
 * their final horizontal position and the remainder stays empty until it
 * arrives.
 */
void
awra_waveform_view_set_expected_peaks (AwraWaveformView *self,
                                       guint             expected_peaks)
{
  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  if (self->expected_peaks == expected_peaks)
    return;
  self->expected_peaks = expected_peaks;
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EXPECTED_PEAKS]);
}

gboolean
awra_waveform_view_get_marker_editable (AwraWaveformView *self)
{
  g_return_val_if_fail (AWRA_IS_WAVEFORM_VIEW (self), FALSE);
  return self->marker_editable;
}

void
awra_waveform_view_set_marker_editable (AwraWaveformView *self,
                                        gboolean          editable)
{
  g_return_if_fail (AWRA_IS_WAVEFORM_VIEW (self));
  editable = !!editable;
  if (self->marker_editable == editable)
    return;
  self->marker_editable = editable;
  update_accessible (self);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_MARKER_EDITABLE]);
}
