/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <math.h>

#include <awra/awra-context.h>
#include <awra/awra-key-cap.h>
#include <awra/awra-motion.h>

#include "widgets/awra-key-cap-private.h"

/* One standard key (1u) is a square of this many logical pixels at its
 * natural size. Containers such as AwraKeyboardView scale it freely. */
#define KEY_UNIT_NATURAL 48.0
#define KEY_UNIT_MINIMUM 20.0
#define PULSE_PERIOD_US  1600000.0
#define PRESS_TRAVEL     1.5

typedef enum {
  ANIMATION_NONE,
  ANIMATION_FLASH,
  ANIMATION_RELEASE,
} AnimationKind;

struct _AwraKeyCap {
  GtkWidget parent_instance;

  GtkLabel *label;
  GtkLabel *secondary;
  GtkLabel *badge;

  char *key_code;
  double width_units;
  double height_units;
  gboolean bound;
  gboolean active;
  gboolean selected;
  gboolean dimmed;
  gboolean drop_highlight;
  gboolean pointer_pressed;
  GdkRGBA tint;
  gboolean tint_set;
  GdkRGBA edge_color;
  gboolean edge_color_set;

  AwraStyleManager *style;
  gulong token_handler;
  gulong motion_handler;
  guint tick_id;
  AnimationKind animation;
  gint64 animation_start;
  guint animation_duration;
  double release_from;
  double depth;
  double pulse;
};

enum {
  PROP_0,
  PROP_KEY_CODE,
  PROP_LABEL,
  PROP_SECONDARY_LABEL,
  PROP_WIDTH_UNITS,
  PROP_BOUND,
  PROP_ACTIVE,
  PROP_SELECTED,
  PROP_DIMMED,
  PROP_TINT,
  PROP_EDGE_COLOR,
  PROP_BADGE,
  N_PROPS,
};

enum {
  SIGNAL_ACTIVATED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraKeyCap, awra_key_cap, GTK_TYPE_WIDGET)

static AwraTokenSet *
get_tokens (AwraKeyCap *self)
{
  AwraStyleManager *style = self->style;

  if (style == NULL) {
    AwraContext *context = awra_context_get_for_display (
      gtk_widget_get_display (GTK_WIDGET (self)));
    style = awra_context_get_style_manager (context);
  }
  return awra_style_manager_get_token_set (style);
}

static gboolean
reduced_motion (AwraKeyCap *self)
{
  return self->style == NULL ||
         awra_style_manager_get_reduced_motion (self->style);
}

static double
relative_luminance (const GdkRGBA *color)
{
  return 0.2126 * color->red + 0.7152 * color->green + 0.0722 * color->blue;
}

static void
update_contrast_classes (AwraKeyCap *self)
{
  GtkWidget *widget = GTK_WIDGET (self);
  gboolean on_light = FALSE;
  gboolean on_dark = FALSE;

  if (self->tint_set && self->tint.alpha > 0.0) {
    AwraTokenSet *tokens = get_tokens (self);
    const GdkRGBA *backdrop = awra_token_set_get_background (tokens);
    double alpha = CLAMP (self->tint.alpha, 0.0, 1.0);
    GdkRGBA effective = {
      self->tint.red * alpha + backdrop->red * (1.0 - alpha),
      self->tint.green * alpha + backdrop->green * (1.0 - alpha),
      self->tint.blue * alpha + backdrop->blue * (1.0 - alpha),
      1.0,
    };

    if (relative_luminance (&effective) > 0.55)
      on_light = TRUE;
    else
      on_dark = TRUE;
  }

  if (on_light)
    gtk_widget_add_css_class (widget, "awra-key-cap-on-light");
  else
    gtk_widget_remove_css_class (widget, "awra-key-cap-on-light");
  if (on_dark)
    gtk_widget_add_css_class (widget, "awra-key-cap-on-dark");
  else
    gtk_widget_remove_css_class (widget, "awra-key-cap-on-dark");
}

static void
update_state_classes (AwraKeyCap *self)
{
  GtkWidget *widget = GTK_WIDGET (self);

  if (self->bound)
    gtk_widget_add_css_class (widget, "awra-key-cap-bound");
  else
    gtk_widget_remove_css_class (widget, "awra-key-cap-bound");
  if (self->selected)
    gtk_widget_add_css_class (widget, "awra-key-cap-selected");
  else
    gtk_widget_remove_css_class (widget, "awra-key-cap-selected");
  if (self->active)
    gtk_widget_add_css_class (widget, "awra-key-cap-active");
  else
    gtk_widget_remove_css_class (widget, "awra-key-cap-active");
}

static void
update_accessible (AwraKeyCap *self)
{
  const char *label = gtk_label_get_text (self->label);
  const char *secondary = gtk_label_get_text (self->secondary);
  g_autofree char *name = NULL;

  if (secondary != NULL && *secondary != '\0' && label != NULL && *label != '\0')
    name = g_strdup_printf ("%s, %s", label, secondary);
  else if (label != NULL && *label != '\0')
    name = g_strdup (label);
  else
    name = g_strdup (self->key_code != NULL ? self->key_code : "");

  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, name,
                                  -1);
  gtk_accessible_update_state (GTK_ACCESSIBLE (self),
                               GTK_ACCESSIBLE_STATE_SELECTED, self->selected,
                               GTK_ACCESSIBLE_STATE_DISABLED, self->dimmed,
                               -1);
}

static double
flash_depth (double progress)
{
  /* A short press followed by a longer spring back. */
  if (progress < 0.3)
    return awra_motion_ease_out_cubic (progress / 0.3);
  return 1.0 - awra_motion_ease_out_cubic ((progress - 0.3) / 0.7);
}

static gboolean
needs_tick (AwraKeyCap *self)
{
  return gtk_widget_get_mapped (GTK_WIDGET (self)) &&
         (self->animation != ANIMATION_NONE ||
          (self->active && !reduced_motion (self)));
}

static gboolean key_cap_tick_cb (GtkWidget     *widget,
                                 GdkFrameClock *clock,
                                 gpointer       data);

static void
update_tick (AwraKeyCap *self)
{
  if (needs_tick (self) && self->tick_id == 0) {
    self->tick_id = gtk_widget_add_tick_callback (GTK_WIDGET (self),
                                                  key_cap_tick_cb, self,
                                                  NULL);
  } else if (!needs_tick (self) && self->tick_id != 0) {
    gtk_widget_remove_tick_callback (GTK_WIDGET (self), self->tick_id);
    self->tick_id = 0;
  }
}

static void
stop_animation (AwraKeyCap *self)
{
  self->animation = ANIMATION_NONE;
  self->depth = self->pointer_pressed ? 1.0 : 0.0;
}

static gboolean
key_cap_tick_cb (GtkWidget     *widget,
                 GdkFrameClock *clock,
                 gpointer       data)
{
  AwraKeyCap *self = data;
  gint64 now = gdk_frame_clock_get_frame_time (clock);

  (void) widget;
  if (self->animation != ANIMATION_NONE) {
    double progress;

    if (self->animation_start == 0)
      self->animation_start = now;
    progress = self->animation_duration == 0
                 ? 1.0
                 : (double) (now - self->animation_start) /
                   ((double) self->animation_duration * 1000.0);
    if (progress >= 1.0) {
      stop_animation (self);
    } else if (self->animation == ANIMATION_FLASH) {
      self->depth = flash_depth (progress);
    } else {
      self->depth = self->release_from *
                    (1.0 - awra_motion_ease_out_cubic (progress));
    }
  }

  if (self->active && !reduced_motion (self))
    self->pulse = 0.5 + 0.5 * sin (2.0 * G_PI * (double) now / PULSE_PERIOD_US);
  else
    self->pulse = 0.5;

  gtk_widget_queue_draw (GTK_WIDGET (self));
  if (!needs_tick (self)) {
    self->tick_id = 0;
    return G_SOURCE_REMOVE;
  }
  return G_SOURCE_CONTINUE;
}

static void
start_animation (AwraKeyCap   *self,
                 AnimationKind kind)
{
  guint duration;

  if (self->style == NULL) {
    stop_animation (self);
    gtk_widget_queue_draw (GTK_WIDGET (self));
    return;
  }
  duration = awra_motion_get_duration (
    self->style,
    kind == ANIMATION_FLASH ? AWRA_MOTION_PRESET_NORMAL
                            : AWRA_MOTION_PRESET_FAST);
  if (duration == 0) {
    stop_animation (self);
    gtk_widget_queue_draw (GTK_WIDGET (self));
    return;
  }
  self->release_from = self->depth;
  self->animation = kind;
  self->animation_duration = duration;
  self->animation_start = 0;
  update_tick (self);
}

static void
style_changed_cb (AwraStyleManager *style,
                  GParamSpec       *pspec,
                  AwraKeyCap       *self)
{
  (void) style;
  (void) pspec;
  if (reduced_motion (self) && self->animation != ANIMATION_NONE)
    stop_animation (self);
  self->pulse = 0.5;
  update_contrast_classes (self);
  update_tick (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

static void
awra_key_cap_map (GtkWidget *widget)
{
  AwraKeyCap *self = AWRA_KEY_CAP (widget);
  AwraContext *context;

  GTK_WIDGET_CLASS (awra_key_cap_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style = awra_context_get_style_manager (context);
  self->token_handler = g_signal_connect (self->style, "notify::token-set",
                                          G_CALLBACK (style_changed_cb),
                                          self);
  self->motion_handler = g_signal_connect (self->style,
                                           "notify::reduced-motion",
                                           G_CALLBACK (style_changed_cb),
                                           self);
  update_contrast_classes (self);
  update_tick (self);
}

static void
disconnect_style (AwraKeyCap *self)
{
  if (self->style != NULL) {
    g_clear_signal_handler (&self->token_handler, self->style);
    g_clear_signal_handler (&self->motion_handler, self->style);
  }
  self->style = NULL;
}

static void
awra_key_cap_unmap (GtkWidget *widget)
{
  AwraKeyCap *self = AWRA_KEY_CAP (widget);

  if (self->tick_id != 0) {
    gtk_widget_remove_tick_callback (widget, self->tick_id);
    self->tick_id = 0;
  }
  stop_animation (self);
  disconnect_style (self);
  GTK_WIDGET_CLASS (awra_key_cap_parent_class)->unmap (widget);
}

static void
unparent_child (GtkWidget **child)
{
  if (*child != NULL) {
    gtk_widget_unparent (*child);
    *child = NULL;
  }
}

static void
awra_key_cap_dispose (GObject *object)
{
  AwraKeyCap *self = AWRA_KEY_CAP (object);

  disconnect_style (self);
  unparent_child ((GtkWidget **) (gpointer) &self->label);
  unparent_child ((GtkWidget **) (gpointer) &self->secondary);
  unparent_child ((GtkWidget **) (gpointer) &self->badge);
  G_OBJECT_CLASS (awra_key_cap_parent_class)->dispose (object);
}

static void
awra_key_cap_finalize (GObject *object)
{
  AwraKeyCap *self = AWRA_KEY_CAP (object);

  g_clear_pointer (&self->key_code, g_free);
  G_OBJECT_CLASS (awra_key_cap_parent_class)->finalize (object);
}

static int
content_inset (int height)
{
  return CLAMP (height / 8, 3, 8);
}

static void
awra_key_cap_measure (GtkWidget      *widget,
                      GtkOrientation  orientation,
                      int             for_size,
                      int            *minimum,
                      int            *natural,
                      int            *minimum_baseline,
                      int            *natural_baseline)
{
  AwraKeyCap *self = AWRA_KEY_CAP (widget);
  double units = orientation == GTK_ORIENTATION_HORIZONTAL
                   ? self->width_units : self->height_units;

  (void) for_size;
  *minimum = (int) ceil (KEY_UNIT_MINIMUM * units);
  *natural = (int) ceil (KEY_UNIT_NATURAL * units);
  *minimum_baseline = -1;
  *natural_baseline = -1;
}

/* Places the legend in @width × @height at (@x, @y). A legend wider than the
 * slot (French "Échap" on a narrow 1u key) is drawn at its natural width and
 * scaled down to fit, down to 65 %, rather than being cut by an ellipsis. */
static void
allocate_legend (GtkLabel *label,
                 int       x,
                 int       y,
                 int       width,
                 int       height,
                 float     xalign)
{
  int natural = 0;
  int ignored;
  float scale;
  float drawn_width;
  float offset;
  GskTransform *transform;

  gtk_widget_measure (GTK_WIDGET (label), GTK_ORIENTATION_HORIZONTAL, -1,
                      &ignored, &natural, NULL, NULL);
  if (natural <= width || width <= 0) {
    gtk_widget_allocate (GTK_WIDGET (label), MAX (width, 0), height, -1,
                         gsk_transform_translate (
                           NULL, &GRAPHENE_POINT_INIT ((float) x, (float) y)));
    return;
  }

  scale = MAX ((float) width / (float) natural, 0.65f);
  drawn_width = natural * scale;
  offset = MAX ((width - drawn_width) * xalign, 0.0f);
  transform = gsk_transform_translate (
    NULL,
    &GRAPHENE_POINT_INIT ((float) x + offset,
                          (float) y + height * (1.0f - scale) / 2.0f));
  transform = gsk_transform_scale (transform, scale, scale);
  gtk_widget_allocate (GTK_WIDGET (label), natural, height, -1, transform);
}

static void
awra_key_cap_size_allocate (GtkWidget *widget,
                            int        width,
                            int        height,
                            int        baseline)
{
  AwraKeyCap *self = AWRA_KEY_CAP (widget);
  gboolean rtl = gtk_widget_get_direction (widget) == GTK_TEXT_DIR_RTL;
  int inset = content_inset (height);
  int inner_width = MAX (width - 2 * inset, 0);
  int badge_width = 0;
  int badge_height = 0;
  int label_height = 0;
  int secondary_height = 0;
  int ignored;
  gboolean show_secondary;
  gboolean show_badge;

  (void) baseline;
  show_badge = gtk_widget_get_visible (GTK_WIDGET (self->badge));
  if (show_badge) {
    gtk_widget_measure (GTK_WIDGET (self->badge), GTK_ORIENTATION_HORIZONTAL,
                        -1, &ignored, &badge_width, NULL, NULL);
    gtk_widget_measure (GTK_WIDGET (self->badge), GTK_ORIENTATION_VERTICAL,
                        badge_width, &ignored, &badge_height, NULL, NULL);
    badge_width = MIN (MAX (badge_width, badge_height), MAX (width - 4, 0));
    gtk_widget_allocate (GTK_WIDGET (self->badge), badge_width, badge_height,
                         -1,
                         gsk_transform_translate (
                           NULL,
                           &GRAPHENE_POINT_INIT (
                             rtl ? 3.0f : (float) (width - badge_width - 3),
                             3.0f)));
  }

  gtk_widget_measure (GTK_WIDGET (self->label), GTK_ORIENTATION_VERTICAL,
                      inner_width, &ignored, &label_height, NULL, NULL);
  show_secondary = gtk_widget_get_visible (GTK_WIDGET (self->secondary));
  if (show_secondary) {
    gtk_widget_measure (GTK_WIDGET (self->secondary),
                        GTK_ORIENTATION_VERTICAL, inner_width, &ignored,
                        &secondary_height, NULL, NULL);
    show_secondary = label_height + secondary_height + 2 * inset <= height;
  }
  gtk_widget_set_child_visible (GTK_WIDGET (self->secondary), show_secondary);

  if (show_secondary) {
    int label_width = MAX (inner_width - (show_badge ? badge_width : 0), 0);

    gtk_label_set_xalign (self->label, 0.0f);
    gtk_label_set_xalign (self->secondary, 0.0f);
    allocate_legend (self->label,
                     rtl ? width - inset - label_width : inset,
                     inset, label_width, label_height, rtl ? 1.0f : 0.0f);
    gtk_widget_allocate (GTK_WIDGET (self->secondary), inner_width,
                         secondary_height, -1,
                         gsk_transform_translate (
                           NULL,
                           &GRAPHENE_POINT_INIT (
                             (float) inset,
                             (float) (height - inset - secondary_height))));
  } else {
    gtk_label_set_xalign (self->label, 0.5f);
    allocate_legend (self->label, inset, MAX ((height - label_height) / 2, 0),
                     inner_width, label_height, 0.5f);
  }
}

static void
append_rounded_fill (GtkSnapshot          *snapshot,
                     const GskRoundedRect *shape,
                     const GdkRGBA        *color)
{
  if (color->alpha <= 0.0)
    return;
  gtk_snapshot_push_rounded_clip (snapshot, shape);
  gtk_snapshot_append_color (snapshot, color, &shape->bounds);
  gtk_snapshot_pop (snapshot);
}

static void
append_ring (GtkSnapshot          *snapshot,
             const GskRoundedRect *shape,
             float                 width,
             const GdkRGBA        *color)
{
  const float widths[4] = { width, width, width, width };
  const GdkRGBA colors[4] = { *color, *color, *color, *color };

  if (color->alpha <= 0.0 || width <= 0.0f)
    return;
  gtk_snapshot_append_border (snapshot, shape, widths, colors);
}

static void
awra_key_cap_snapshot (GtkWidget   *widget,
                       GtkSnapshot *snapshot)
{
  AwraKeyCap *self = AWRA_KEY_CAP (widget);
  AwraTokenSet *tokens = get_tokens (self);
  float width = (float) gtk_widget_get_width (widget);
  float height = (float) gtk_widget_get_height (widget);
  GtkStateFlags flags = gtk_widget_get_state_flags (widget);
  gboolean hover = (flags & GTK_STATE_FLAG_PRELIGHT) != 0 && !self->dimmed;
  gboolean focus_visible = (flags & GTK_STATE_FLAG_FOCUS_VISIBLE) != 0;
  gboolean high_contrast = awra_token_set_get_high_contrast (tokens);
  double depth = CLAMP (self->depth, 0.0, 1.0);
  float travel = (float) (depth * PRESS_TRAVEL);
  float radius;
  graphene_rect_t bounds;
  GskRoundedRect face;
  GdkRGBA color;

  if (width <= 0.0f || height <= 0.0f)
    return;

  radius = (float) MIN (awra_token_set_get_radius_for_size (tokens,
                                                            AWRA_RADIUS_SMALL),
                        MIN (width, height) * 0.22);
  bounds = GRAPHENE_RECT_INIT (0.0f, 0.0f, width, height);

  if (self->dimmed)
    gtk_snapshot_push_opacity (snapshot, 0.38);

  /* The active glow sits outside the cap so its geometry never changes. */
  if (self->active) {
    GskRoundedRect glow;

    color = *awra_token_set_get_accent (tokens);
    color.alpha = 0.22 + 0.30 * self->pulse;
    gsk_rounded_rect_init_from_rect (&glow, &bounds, radius);
    /* Pulse opacity only. The Cairo renderer caches corner masks by exact
     * blur and corner radii; animating spread/blur adds a new mask each frame.
     * On Windows each mask owns GDI resources, eventually exhausting the
     * process handle limit during continuous playback. Keep the geometry at
     * the midpoint of the pulse so these masks can be reused. */
    gtk_snapshot_append_outset_shadow (snapshot, &glow, &color, 0.0f, 0.0f,
                                       2.0f, 8.0f);
  }

  /* Raised caps cast a short contact shadow that collapses while pressed. */
  if (self->bound && !self->dimmed) {
    GskRoundedRect contact;
    GdkRGBA shadow = { 0.0, 0.0, 0.0,
                       (awra_token_set_get_dark (tokens) ? 0.30 : 0.12) *
                       (1.0 - depth) };

    gsk_rounded_rect_init_from_rect (&contact, &bounds, radius);
    gtk_snapshot_append_outset_shadow (snapshot, &contact, &shadow,
                                       0.0f, 1.0f, 0.0f, 2.0f);
  }

  gtk_snapshot_save (snapshot);
  gtk_snapshot_translate (snapshot, &GRAPHENE_POINT_INIT (0.0f, travel));
  gsk_rounded_rect_init_from_rect (&face, &bounds, radius);

  /* Free keys recede as wells; bound keys sit on the plane as caps. */
  if (self->bound) {
    color = *(hover ? awra_token_set_get_control_cap_hover (tokens)
                    : awra_token_set_get_control_cap (tokens));
  } else {
    color = *awra_token_set_get_control_well (tokens);
  }
  append_rounded_fill (snapshot, &face, &color);
  if (!self->bound && hover) {
    color = *awra_token_set_get_control_hover (tokens);
    color.alpha *= 0.6;
    append_rounded_fill (snapshot, &face, &color);
  }
  if (self->tint_set) {
    color = self->tint;
    color.alpha = CLAMP (color.alpha, 0.0, 1.0) * (hover ? 0.92 : 1.0);
    append_rounded_fill (snapshot, &face, &color);
  }
  if (self->selected || self->drop_highlight) {
    color = *awra_token_set_get_accent_soft (tokens);
    if (self->drop_highlight)
      color.alpha = MIN (color.alpha * 2.0, 1.0);
    append_rounded_fill (snapshot, &face, &color);
  }
  if (depth > 0.0) {
    color = *awra_token_set_get_control_pressed (tokens);
    color.alpha *= depth;
    append_rounded_fill (snapshot, &face, &color);
  }

  if (self->edge_color_set) {
    graphene_rect_t edge = GRAPHENE_RECT_INIT (0.0f, height - 3.0f,
                                               width, 3.0f);

    gtk_snapshot_push_rounded_clip (snapshot, &face);
    gtk_snapshot_append_color (snapshot, &self->edge_color, &edge);
    gtk_snapshot_pop (snapshot);
  }

  if (self->bound && depth < 1.0) {
    color = *awra_token_set_get_rim_highlight (tokens);
    color.alpha *= 1.0 - depth;
    gtk_snapshot_append_inset_shadow (snapshot, &face, &color,
                                      0.0f, 1.0f, 0.0f, 0.0f);
  } else if (!self->bound) {
    GdkRGBA lip = { 0.0, 0.0, 0.0, awra_token_set_get_dark (tokens) ? 0.22 : 0.06 };

    gtk_snapshot_append_inset_shadow (snapshot, &face, &lip,
                                      0.0f, 1.0f, 1.0f, 0.0f);
  }

  if (high_contrast || !self->bound)
    append_ring (snapshot, &face, high_contrast ? 1.5f : 1.0f,
                 awra_token_set_get_outline (tokens));
  if (self->selected || self->drop_highlight) {
    append_ring (snapshot, &face, 2.0f, awra_token_set_get_accent (tokens));
  } else if (self->active) {
    color = *awra_token_set_get_accent (tokens);
    color.alpha = 0.55 + 0.35 * self->pulse;
    append_ring (snapshot, &face, 1.5f, &color);
  }

  gtk_snapshot_push_rounded_clip (snapshot, &face);
  gtk_widget_snapshot_child (widget, GTK_WIDGET (self->label), snapshot);
  if (gtk_widget_get_child_visible (GTK_WIDGET (self->secondary)))
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->secondary), snapshot);
  if (gtk_widget_get_visible (GTK_WIDGET (self->badge))) {
    graphene_rect_t badge_bounds;

    if (gtk_widget_compute_bounds (GTK_WIDGET (self->badge), widget,
                                   &badge_bounds)) {
      GskRoundedRect pill;

      gsk_rounded_rect_init_from_rect (&pill, &badge_bounds,
                                       badge_bounds.size.height / 2.0f);
      append_rounded_fill (snapshot, &pill,
                           awra_token_set_get_accent (tokens));
    }
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->badge), snapshot);
  }
  gtk_snapshot_pop (snapshot);
  gtk_snapshot_restore (snapshot);

  if (focus_visible) {
    GskRoundedRect ring;
    graphene_rect_t outer;

    graphene_rect_inset_r (&bounds, -3.0f, -3.0f, &outer);
    gsk_rounded_rect_init_from_rect (&ring, &outer, radius + 3.0f);
    append_ring (snapshot, &ring, 2.0f, awra_token_set_get_focus_ring (tokens));
  }

  if (self->dimmed)
    gtk_snapshot_pop (snapshot);
}

static void
click_pressed_cb (GtkGestureClick *gesture,
                  int              n_press,
                  double           x,
                  double           y,
                  AwraKeyCap      *self)
{
  (void) n_press;
  (void) x;
  (void) y;
  if (self->dimmed) {
    gtk_gesture_set_state (GTK_GESTURE (gesture), GTK_EVENT_SEQUENCE_DENIED);
    return;
  }
  if (gtk_widget_get_focus_on_click (GTK_WIDGET (self)))
    gtk_widget_grab_focus (GTK_WIDGET (self));
  self->pointer_pressed = TRUE;
  self->animation = ANIMATION_NONE;
  self->depth = 1.0;
  gtk_widget_set_state_flags (GTK_WIDGET (self), GTK_STATE_FLAG_ACTIVE, FALSE);
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

static void
release_pointer (AwraKeyCap *self)
{
  if (!self->pointer_pressed)
    return;
  self->pointer_pressed = FALSE;
  gtk_widget_unset_state_flags (GTK_WIDGET (self), GTK_STATE_FLAG_ACTIVE);
  start_animation (self, ANIMATION_RELEASE);
}

static void
click_released_cb (GtkGestureClick *gesture,
                   int              n_press,
                   double           x,
                   double           y,
                   AwraKeyCap      *self)
{
  GdkModifierType modifiers;
  gboolean was_pressed = self->pointer_pressed;

  (void) n_press;
  (void) x;
  (void) y;
  modifiers = gtk_event_controller_get_current_event_state (
    GTK_EVENT_CONTROLLER (gesture)) & gtk_accelerator_get_default_mod_mask ();
  release_pointer (self);
  if (was_pressed && !self->dimmed)
    g_signal_emit (self, signals[SIGNAL_ACTIVATED], 0, modifiers);
}

static void
click_stopped_cb (GtkGestureClick *gesture,
                  AwraKeyCap      *self)
{
  (void) gesture;
  release_pointer (self);
}

static gboolean
key_pressed_cb (GtkEventControllerKey *controller,
                guint                  keyval,
                guint                  keycode,
                GdkModifierType        state,
                AwraKeyCap            *self)
{
  (void) controller;
  (void) keycode;
  switch (keyval) {
  case GDK_KEY_Return:
  case GDK_KEY_KP_Enter:
  case GDK_KEY_ISO_Enter:
  case GDK_KEY_space:
  case GDK_KEY_KP_Space:
    if (self->dimmed)
      return TRUE;
    awra_key_cap_flash (self);
    g_signal_emit (self, signals[SIGNAL_ACTIVATED], 0,
                   state & gtk_accelerator_get_default_mod_mask ());
    return TRUE;
  default:
    return FALSE;
  }
}

static void
awra_key_cap_state_flags_changed (GtkWidget     *widget,
                                  GtkStateFlags  previous)
{
  GTK_WIDGET_CLASS (awra_key_cap_parent_class)->state_flags_changed (widget,
                                                                    previous);
  gtk_widget_queue_draw (widget);
}

static void
awra_key_cap_direction_changed (GtkWidget        *widget,
                                GtkTextDirection  previous)
{
  GTK_WIDGET_CLASS (awra_key_cap_parent_class)->direction_changed (widget,
                                                                  previous);
  gtk_widget_queue_allocate (widget);
}

static void
awra_key_cap_get_property (GObject    *object,
                           guint       property_id,
                           GValue     *value,
                           GParamSpec *pspec)
{
  AwraKeyCap *self = AWRA_KEY_CAP (object);

  switch (property_id) {
  case PROP_KEY_CODE:
    g_value_set_string (value, self->key_code);
    break;
  case PROP_LABEL:
    g_value_set_string (value, awra_key_cap_get_label (self));
    break;
  case PROP_SECONDARY_LABEL:
    g_value_set_string (value, awra_key_cap_get_secondary_label (self));
    break;
  case PROP_WIDTH_UNITS:
    g_value_set_double (value, self->width_units);
    break;
  case PROP_BOUND:
    g_value_set_boolean (value, self->bound);
    break;
  case PROP_ACTIVE:
    g_value_set_boolean (value, self->active);
    break;
  case PROP_SELECTED:
    g_value_set_boolean (value, self->selected);
    break;
  case PROP_DIMMED:
    g_value_set_boolean (value, self->dimmed);
    break;
  case PROP_TINT:
    g_value_set_boxed (value, awra_key_cap_get_tint (self));
    break;
  case PROP_EDGE_COLOR:
    g_value_set_boxed (value, awra_key_cap_get_edge_color (self));
    break;
  case PROP_BADGE:
    g_value_set_string (value, awra_key_cap_get_badge (self));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_key_cap_set_property (GObject      *object,
                           guint         property_id,
                           const GValue *value,
                           GParamSpec   *pspec)
{
  AwraKeyCap *self = AWRA_KEY_CAP (object);

  switch (property_id) {
  case PROP_KEY_CODE:
    awra_key_cap_set_key_code (self, g_value_get_string (value));
    break;
  case PROP_LABEL:
    awra_key_cap_set_label (self, g_value_get_string (value));
    break;
  case PROP_SECONDARY_LABEL:
    awra_key_cap_set_secondary_label (self, g_value_get_string (value));
    break;
  case PROP_WIDTH_UNITS:
    awra_key_cap_set_width_units (self, g_value_get_double (value));
    break;
  case PROP_BOUND:
    awra_key_cap_set_bound (self, g_value_get_boolean (value));
    break;
  case PROP_ACTIVE:
    awra_key_cap_set_active (self, g_value_get_boolean (value));
    break;
  case PROP_SELECTED:
    awra_key_cap_set_selected (self, g_value_get_boolean (value));
    break;
  case PROP_DIMMED:
    awra_key_cap_set_dimmed (self, g_value_get_boolean (value));
    break;
  case PROP_TINT:
    awra_key_cap_set_tint (self, g_value_get_boxed (value));
    break;
  case PROP_EDGE_COLOR:
    awra_key_cap_set_edge_color (self, g_value_get_boxed (value));
    break;
  case PROP_BADGE:
    awra_key_cap_set_badge (self, g_value_get_string (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_key_cap_class_init (AwraKeyCapClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  const GParamFlags flags = G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                            G_PARAM_STATIC_STRINGS;

  object_class->dispose = awra_key_cap_dispose;
  object_class->finalize = awra_key_cap_finalize;
  object_class->get_property = awra_key_cap_get_property;
  object_class->set_property = awra_key_cap_set_property;
  widget_class->map = awra_key_cap_map;
  widget_class->unmap = awra_key_cap_unmap;
  widget_class->measure = awra_key_cap_measure;
  widget_class->size_allocate = awra_key_cap_size_allocate;
  widget_class->snapshot = awra_key_cap_snapshot;
  widget_class->state_flags_changed = awra_key_cap_state_flags_changed;
  widget_class->direction_changed = awra_key_cap_direction_changed;

  properties[PROP_KEY_CODE] =
    g_param_spec_string ("key-code", NULL, NULL, NULL, flags);
  properties[PROP_LABEL] =
    g_param_spec_string ("label", NULL, NULL, "", flags);
  properties[PROP_SECONDARY_LABEL] =
    g_param_spec_string ("secondary-label", NULL, NULL, NULL, flags);
  properties[PROP_WIDTH_UNITS] =
    g_param_spec_double ("width-units", NULL, NULL, 0.25, 12.0, 1.0, flags);
  properties[PROP_BOUND] =
    g_param_spec_boolean ("bound", NULL, NULL, FALSE, flags);
  properties[PROP_ACTIVE] =
    g_param_spec_boolean ("active", NULL, NULL, FALSE, flags);
  properties[PROP_SELECTED] =
    g_param_spec_boolean ("selected", NULL, NULL, FALSE, flags);
  properties[PROP_DIMMED] =
    g_param_spec_boolean ("dimmed", NULL, NULL, FALSE, flags);
  properties[PROP_TINT] =
    g_param_spec_boxed ("tint", NULL, NULL, GDK_TYPE_RGBA, flags);
  properties[PROP_EDGE_COLOR] =
    g_param_spec_boxed ("edge-color", NULL, NULL, GDK_TYPE_RGBA, flags);
  properties[PROP_BADGE] =
    g_param_spec_string ("badge", NULL, NULL, NULL, flags);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraKeyCap::activated:
   * @self: the key cap
   * @modifiers: the keyboard modifiers held during the activation
   *
   * Emitted when the key is clicked or activated with Enter or Space.
   * Dimmed keys never emit this signal.
   */
  signals[SIGNAL_ACTIVATED] =
    g_signal_new ("activated", G_TYPE_FROM_CLASS (klass), G_SIGNAL_RUN_LAST,
                  0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  GDK_TYPE_MODIFIER_TYPE);

  gtk_widget_class_set_css_name (widget_class, "awrakeycap");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_BUTTON);
}

static GtkLabel *
make_label (AwraKeyCap *self,
            const char *css_class)
{
  GtkLabel *label = GTK_LABEL (gtk_label_new (NULL));

  gtk_label_set_ellipsize (label, PANGO_ELLIPSIZE_END);
  gtk_label_set_single_line_mode (label, TRUE);
  gtk_widget_add_css_class (GTK_WIDGET (label), css_class);
  gtk_widget_set_can_target (GTK_WIDGET (label), FALSE);
  gtk_accessible_update_state (GTK_ACCESSIBLE (label),
                               GTK_ACCESSIBLE_STATE_HIDDEN, TRUE, -1);
  gtk_widget_set_parent (GTK_WIDGET (label), GTK_WIDGET (self));
  return label;
}

static void
awra_key_cap_init (AwraKeyCap *self)
{
  GtkGesture *click;
  GtkEventController *keys;

  self->width_units = 1.0;
  self->height_units = 1.0;
  self->pulse = 0.5;
  self->label = make_label (self, "awra-key-cap-label");
  self->secondary = make_label (self, "awra-key-cap-secondary");
  self->badge = make_label (self, "awra-key-cap-badge");
  gtk_label_set_ellipsize (self->badge, PANGO_ELLIPSIZE_NONE);
  gtk_widget_set_visible (GTK_WIDGET (self->secondary), FALSE);
  gtk_widget_set_visible (GTK_WIDGET (self->badge), FALSE);
  gtk_widget_set_focusable (GTK_WIDGET (self), TRUE);
  gtk_widget_set_overflow (GTK_WIDGET (self), GTK_OVERFLOW_VISIBLE);

  click = gtk_gesture_click_new ();
  gtk_gesture_single_set_button (GTK_GESTURE_SINGLE (click), GDK_BUTTON_PRIMARY);
  g_signal_connect (click, "pressed", G_CALLBACK (click_pressed_cb), self);
  g_signal_connect (click, "released", G_CALLBACK (click_released_cb), self);
  g_signal_connect (click, "stopped", G_CALLBACK (click_stopped_cb), self);
  g_signal_connect_swapped (click, "cancel", G_CALLBACK (release_pointer),
                            self);
  gtk_widget_add_controller (GTK_WIDGET (self), GTK_EVENT_CONTROLLER (click));

  keys = gtk_event_controller_key_new ();
  g_signal_connect (keys, "key-pressed", G_CALLBACK (key_pressed_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), keys);

  update_accessible (self);
}

GtkWidget *
awra_key_cap_new (const char *key_code,
                  const char *label)
{
  return g_object_new (AWRA_TYPE_KEY_CAP,
                       "key-code", key_code,
                       "label", label,
                       NULL);
}

const char *
awra_key_cap_get_key_code (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), NULL);
  return self->key_code;
}

void
awra_key_cap_set_key_code (AwraKeyCap *self,
                           const char *key_code)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (!g_set_str (&self->key_code, key_code))
    return;
  update_accessible (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_KEY_CODE]);
}

const char *
awra_key_cap_get_label (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), NULL);
  return gtk_label_get_text (self->label);
}

void
awra_key_cap_set_label (AwraKeyCap *self,
                        const char *label)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (label == NULL)
    label = "";
  if (g_strcmp0 (gtk_label_get_text (self->label), label) == 0)
    return;
  gtk_label_set_text (self->label, label);
  update_accessible (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LABEL]);
}

const char *
awra_key_cap_get_secondary_label (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), NULL);
  return gtk_widget_get_visible (GTK_WIDGET (self->secondary))
           ? gtk_label_get_text (self->secondary) : NULL;
}

void
awra_key_cap_set_secondary_label (AwraKeyCap *self,
                                  const char *label)
{
  gboolean visible;

  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (label != NULL && *label == '\0')
    label = NULL;
  if (g_strcmp0 (awra_key_cap_get_secondary_label (self), label) == 0)
    return;
  visible = label != NULL;
  gtk_label_set_text (self->secondary, visible ? label : "");
  gtk_widget_set_visible (GTK_WIDGET (self->secondary), visible);
  gtk_widget_set_tooltip_text (GTK_WIDGET (self), label);
  update_accessible (self);
  gtk_widget_queue_allocate (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_SECONDARY_LABEL]);
}

double
awra_key_cap_get_width_units (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), 1.0);
  return self->width_units;
}

void
awra_key_cap_set_width_units (AwraKeyCap *self,
                              double      width_units)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  width_units = CLAMP (width_units, 0.25, 12.0);
  if (G_APPROX_VALUE (self->width_units, width_units, 1e-9))
    return;
  self->width_units = width_units;
  gtk_widget_queue_resize (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_WIDTH_UNITS]);
}

#define DEFINE_BOOLEAN_STATE(name, prop, extra)                             \
gboolean                                                                    \
awra_key_cap_get_##name (AwraKeyCap *self)                                  \
{                                                                           \
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), FALSE);                     \
  return self->name;                                                        \
}                                                                           \
                                                                            \
void                                                                        \
awra_key_cap_set_##name (AwraKeyCap *self,                                  \
                         gboolean    name)                                  \
{                                                                           \
  g_return_if_fail (AWRA_IS_KEY_CAP (self));                                \
  name = !!name;                                                            \
  if (self->name == name)                                                   \
    return;                                                                 \
  self->name = name;                                                        \
  extra;                                                                    \
  update_state_classes (self);                                              \
  update_accessible (self);                                                 \
  gtk_widget_queue_draw (GTK_WIDGET (self));                                \
  g_object_notify_by_pspec (G_OBJECT (self), properties[prop]);             \
}

DEFINE_BOOLEAN_STATE (bound, PROP_BOUND, (void) 0)
DEFINE_BOOLEAN_STATE (active, PROP_ACTIVE,
                      self->pulse = 0.5; update_tick (self))
DEFINE_BOOLEAN_STATE (selected, PROP_SELECTED, (void) 0)
DEFINE_BOOLEAN_STATE (dimmed, PROP_DIMMED,
                      if (dimmed) release_pointer (self))

#undef DEFINE_BOOLEAN_STATE

static gboolean
set_optional_color (GdkRGBA       *storage,
                    gboolean      *is_set,
                    const GdkRGBA *color)
{
  if ((color == NULL && !*is_set) ||
      (color != NULL && *is_set && gdk_rgba_equal (color, storage)))
    return FALSE;
  if (color != NULL)
    *storage = *color;
  *is_set = color != NULL;
  return TRUE;
}

const GdkRGBA *
awra_key_cap_get_tint (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), NULL);
  return self->tint_set ? &self->tint : NULL;
}

void
awra_key_cap_set_tint (AwraKeyCap    *self,
                       const GdkRGBA *tint)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (!set_optional_color (&self->tint, &self->tint_set, tint))
    return;
  update_contrast_classes (self);
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TINT]);
}

const GdkRGBA *
awra_key_cap_get_edge_color (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), NULL);
  return self->edge_color_set ? &self->edge_color : NULL;
}

void
awra_key_cap_set_edge_color (AwraKeyCap    *self,
                             const GdkRGBA *color)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (!set_optional_color (&self->edge_color, &self->edge_color_set, color))
    return;
  gtk_widget_queue_draw (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EDGE_COLOR]);
}

const char *
awra_key_cap_get_badge (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), NULL);
  return gtk_widget_get_visible (GTK_WIDGET (self->badge))
           ? gtk_label_get_text (self->badge) : NULL;
}

void
awra_key_cap_set_badge (AwraKeyCap *self,
                        const char *badge)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (badge != NULL && *badge == '\0')
    badge = NULL;
  if (g_strcmp0 (awra_key_cap_get_badge (self), badge) == 0)
    return;
  gtk_label_set_text (self->badge, badge != NULL ? badge : "");
  gtk_widget_set_visible (GTK_WIDGET (self->badge), badge != NULL);
  gtk_widget_queue_allocate (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_BADGE]);
}

/**
 * awra_key_cap_flash:
 * @self: an Awra key cap
 *
 * Plays a short press animation: the cap depresses, then springs back. Only
 * paint properties change. The animation is skipped when reduced motion is
 * enabled or the cap is not mapped.
 */
void
awra_key_cap_flash (AwraKeyCap *self)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  if (self->pointer_pressed || !gtk_widget_get_mapped (GTK_WIDGET (self)))
    return;
  self->depth = 0.0;
  start_animation (self, ANIMATION_FLASH);
}

void
awra_key_cap_set_drop_highlight (AwraKeyCap *self,
                                 gboolean    highlight)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  highlight = !!highlight;
  if (self->drop_highlight == highlight)
    return;
  self->drop_highlight = highlight;
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

gboolean
awra_key_cap_get_drop_highlight (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), FALSE);
  return self->drop_highlight;
}

void
awra_key_cap_set_height_units (AwraKeyCap *self,
                               double      height_units)
{
  g_return_if_fail (AWRA_IS_KEY_CAP (self));
  height_units = CLAMP (height_units, 0.25, 12.0);
  if (G_APPROX_VALUE (self->height_units, height_units, 1e-9))
    return;
  self->height_units = height_units;
  gtk_widget_queue_resize (GTK_WIDGET (self));
}

double
awra_key_cap_get_height_units (AwraKeyCap *self)
{
  g_return_val_if_fail (AWRA_IS_KEY_CAP (self), 1.0);
  return self->height_units;
}
