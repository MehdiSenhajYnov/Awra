/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <math.h>

#include <awra/awra-button.h>
#include <awra/awra-context.h>
#include <awra/awra-layout.h>
#include <awra/awra-media-row.h>
#include <awra/awra-slider.h>
#include <awra/awra-volume-control.h>

#include "awra-i18n-private.h"
#include "widgets/awra-media-time-private.h"

#define LEADING_SIZE 36

struct _AwraMediaRow {
  GtkWidget parent_instance;

  GtkGrid *grid;
  GtkImage *leading;
  GtkLabel *title;
  GtkLabel *subtitle;
  GtkBox *end_box;
  GtkButton *play_button;
  GtkButton *stop_button;
  AwraVolumeControl *volume;
  GtkWidget *suffix;
  GtkLabel *elapsed;
  GtkRange *seek;
  GtkLabel *total;

  char *icon_name;
  GdkRGBA accent_color;
  gboolean accent_color_set;
  double position;
  double duration;
  gboolean playing;
  gboolean seekable;
  gboolean scrubbing;
  gboolean syncing;
};

enum {
  PROP_0,
  PROP_TITLE,
  PROP_SUBTITLE,
  PROP_POSITION,
  PROP_DURATION,
  PROP_PLAYING,
  PROP_SEEKABLE,
  PROP_VOLUME,
  PROP_SHOW_VOLUME,
  PROP_SHOW_PLAY_BUTTON,
  PROP_SHOW_STOP_BUTTON,
  PROP_ICON_NAME,
  PROP_ACCENT_COLOR,
  PROP_SUFFIX,
  N_PROPS,
};

enum {
  SIGNAL_SEEK_REQUESTED,
  SIGNAL_PLAY_TOGGLED,
  SIGNAL_STOP_REQUESTED,
  SIGNAL_VOLUME_CHANGED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraMediaRow, awra_media_row, GTK_TYPE_WIDGET)

static gboolean
is_idle (AwraMediaRow *self)
{
  return self->duration <= 0.0;
}

static void
update_times (AwraMediaRow *self)
{
  double shown = self->scrubbing ? gtk_range_get_value (self->seek)
                                 : self->position;
  g_autofree char *elapsed = awra_media_format_time (is_idle (self) ? 0.0
                                                                    : shown);
  g_autofree char *total = awra_media_format_time (self->duration);
  g_autofree char *value_text = g_strdup_printf (_("%s of %s"), elapsed,
                                                 total);

  gtk_label_set_text (self->elapsed, elapsed);
  gtk_label_set_text (self->total, total);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self->seek),
                                  GTK_ACCESSIBLE_PROPERTY_VALUE_TEXT,
                                  value_text, -1);
}

static void
sync_seek (AwraMediaRow *self)
{
  gboolean idle = is_idle (self);

  self->syncing = TRUE;
  gtk_range_set_range (self->seek, 0.0, MAX (self->duration, 1.0));
  if (!self->scrubbing)
    gtk_range_set_value (self->seek,
                         idle ? 0.0 : CLAMP (self->position, 0.0,
                                             self->duration));
  self->syncing = FALSE;
  gtk_widget_set_sensitive (GTK_WIDGET (self->seek),
                            !idle && self->seekable);
  if (idle)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-media-idle");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-media-idle");
  gtk_widget_set_sensitive (GTK_WIDGET (self->stop_button),
                            !idle || self->playing);
  update_times (self);
}

static void
update_play_button (AwraMediaRow *self)
{
  const char *label = self->playing ? _("Pause") : _("Play");

  gtk_button_set_icon_name (self->play_button,
                            self->playing ? "media-playback-pause-symbolic"
                                          : "media-playback-start-symbolic");
  gtk_widget_set_tooltip_text (GTK_WIDGET (self->play_button), label);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self->play_button),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, label, -1);
  if (self->playing)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-media-playing");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-media-playing");
}

static void
update_leading (AwraMediaRow *self)
{
  GtkWidget *leading = GTK_WIDGET (self->leading);
  gboolean visible = self->icon_name != NULL || self->accent_color_set;

  gtk_image_set_from_icon_name (self->leading, self->icon_name);
  gtk_widget_set_visible (leading, visible);
  gtk_widget_remove_css_class (leading, "awra-media-on-light");
  gtk_widget_remove_css_class (leading, "awra-media-on-dark");
  if (self->accent_color_set) {
    double luminance = 0.2126 * self->accent_color.red +
                       0.7152 * self->accent_color.green +
                       0.0722 * self->accent_color.blue;

    gtk_widget_add_css_class (leading, luminance > 0.55 ? "awra-media-on-light"
                                                         : "awra-media-on-dark");
  }
  gtk_widget_queue_draw (GTK_WIDGET (self));
}

static void
update_accessible (AwraMediaRow *self)
{
  const char *title = gtk_label_get_text (self->title);

  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  title != NULL && *title != '\0'
                                    ? title : _("Media"),
                                  -1);
}

static gboolean
seek_change_value_cb (GtkRange      *range,
                      GtkScrollType  scroll,
                      double         value,
                      AwraMediaRow  *self)
{
  (void) range;
  (void) scroll;
  if (self->syncing || is_idle (self) || !self->seekable)
    return TRUE;
  value = CLAMP (value, 0.0, self->duration);
  g_signal_emit (self, signals[SIGNAL_SEEK_REQUESTED], 0, value);
  return FALSE;
}

static void
seek_value_changed_cb (GtkRange     *range,
                       AwraMediaRow *self)
{
  (void) range;
  if (self->scrubbing)
    update_times (self);
}

static gboolean
seek_event_cb (GtkEventControllerLegacy *controller,
               GdkEvent                 *event,
               AwraMediaRow             *self)
{
  GdkEventType type = gdk_event_get_event_type (event);

  (void) controller;
  if (type == GDK_BUTTON_PRESS || type == GDK_TOUCH_BEGIN) {
    self->scrubbing = TRUE;
  } else if (type == GDK_BUTTON_RELEASE || type == GDK_TOUCH_END ||
             type == GDK_TOUCH_CANCEL) {
    self->scrubbing = FALSE;
    sync_seek (self);
  }
  return FALSE;
}

static void
play_clicked_cb (GtkButton    *button,
                 AwraMediaRow *self)
{
  (void) button;
  g_signal_emit (self, signals[SIGNAL_PLAY_TOGGLED], 0);
}

static void
stop_clicked_cb (GtkButton    *button,
                 AwraMediaRow *self)
{
  (void) button;
  g_signal_emit (self, signals[SIGNAL_STOP_REQUESTED], 0);
}

static void
volume_changed_cb (AwraVolumeControl *volume,
                   double             effective,
                   AwraMediaRow      *self)
{
  (void) volume;
  g_signal_emit (self, signals[SIGNAL_VOLUME_CHANGED], 0, effective);
}

static void
volume_notify_cb (AwraVolumeControl *volume,
                  GParamSpec        *pspec,
                  AwraMediaRow      *self)
{
  (void) volume;
  (void) pspec;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_VOLUME]);
}

static void
awra_media_row_snapshot (GtkWidget   *widget,
                         GtkSnapshot *snapshot)
{
  AwraMediaRow *self = AWRA_MEDIA_ROW (widget);
  graphene_rect_t bounds;

  if (gtk_widget_get_visible (GTK_WIDGET (self->leading)) &&
      gtk_widget_compute_bounds (GTK_WIDGET (self->leading), widget, &bounds)) {
    AwraTokenSet *tokens = awra_style_manager_get_token_set (
      awra_context_get_style_manager (awra_context_get_for_display (
        gtk_widget_get_display (widget))));
    GskRoundedRect tile;
    GdkRGBA fill = self->accent_color_set
                     ? self->accent_color
                     : *awra_token_set_get_control_cap (tokens);

    gsk_rounded_rect_init_from_rect (
      &tile, &bounds,
      (float) awra_token_set_get_radius_for_size (tokens, AWRA_RADIUS_MEDIUM));
    gtk_snapshot_push_rounded_clip (snapshot, &tile);
    gtk_snapshot_append_color (snapshot, &fill, &bounds);
    gtk_snapshot_pop (snapshot);
    if (!self->accent_color_set)
      gtk_snapshot_append_inset_shadow (
        snapshot, &tile, awra_token_set_get_rim_highlight (tokens),
        0.0f, 1.0f, 0.0f, 0.0f);
  }
  gtk_widget_snapshot_child (widget, GTK_WIDGET (self->grid), snapshot);
}

static void
awra_media_row_dispose (GObject *object)
{
  AwraMediaRow *self = AWRA_MEDIA_ROW (object);

  if (self->grid != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->grid));
    self->grid = NULL;
  }
  self->suffix = NULL;
  G_OBJECT_CLASS (awra_media_row_parent_class)->dispose (object);
}

static void
awra_media_row_finalize (GObject *object)
{
  g_clear_pointer (&AWRA_MEDIA_ROW (object)->icon_name, g_free);
  G_OBJECT_CLASS (awra_media_row_parent_class)->finalize (object);
}

static void
awra_media_row_get_property (GObject    *object,
                             guint       property_id,
                             GValue     *value,
                             GParamSpec *pspec)
{
  AwraMediaRow *self = AWRA_MEDIA_ROW (object);

  switch (property_id) {
  case PROP_TITLE:
    g_value_set_string (value, awra_media_row_get_title (self));
    break;
  case PROP_SUBTITLE:
    g_value_set_string (value, awra_media_row_get_subtitle (self));
    break;
  case PROP_POSITION:
    g_value_set_double (value, self->position);
    break;
  case PROP_DURATION:
    g_value_set_double (value, self->duration);
    break;
  case PROP_PLAYING:
    g_value_set_boolean (value, self->playing);
    break;
  case PROP_SEEKABLE:
    g_value_set_boolean (value, self->seekable);
    break;
  case PROP_VOLUME:
    g_value_set_double (value, awra_media_row_get_volume (self));
    break;
  case PROP_SHOW_VOLUME:
    g_value_set_boolean (value, awra_media_row_get_show_volume (self));
    break;
  case PROP_SHOW_PLAY_BUTTON:
    g_value_set_boolean (value, awra_media_row_get_show_play_button (self));
    break;
  case PROP_SHOW_STOP_BUTTON:
    g_value_set_boolean (value, awra_media_row_get_show_stop_button (self));
    break;
  case PROP_ICON_NAME:
    g_value_set_string (value, self->icon_name);
    break;
  case PROP_ACCENT_COLOR:
    g_value_set_boxed (value, awra_media_row_get_accent_color (self));
    break;
  case PROP_SUFFIX:
    g_value_set_object (value, self->suffix);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_media_row_set_property (GObject      *object,
                             guint         property_id,
                             const GValue *value,
                             GParamSpec   *pspec)
{
  AwraMediaRow *self = AWRA_MEDIA_ROW (object);

  switch (property_id) {
  case PROP_TITLE:
    awra_media_row_set_title (self, g_value_get_string (value));
    break;
  case PROP_SUBTITLE:
    awra_media_row_set_subtitle (self, g_value_get_string (value));
    break;
  case PROP_POSITION:
    awra_media_row_set_position (self, g_value_get_double (value));
    break;
  case PROP_DURATION:
    awra_media_row_set_duration (self, g_value_get_double (value));
    break;
  case PROP_PLAYING:
    awra_media_row_set_playing (self, g_value_get_boolean (value));
    break;
  case PROP_SEEKABLE:
    awra_media_row_set_seekable (self, g_value_get_boolean (value));
    break;
  case PROP_VOLUME:
    awra_media_row_set_volume (self, g_value_get_double (value));
    break;
  case PROP_SHOW_VOLUME:
    awra_media_row_set_show_volume (self, g_value_get_boolean (value));
    break;
  case PROP_SHOW_PLAY_BUTTON:
    awra_media_row_set_show_play_button (self, g_value_get_boolean (value));
    break;
  case PROP_SHOW_STOP_BUTTON:
    awra_media_row_set_show_stop_button (self, g_value_get_boolean (value));
    break;
  case PROP_ICON_NAME:
    awra_media_row_set_icon_name (self, g_value_get_string (value));
    break;
  case PROP_ACCENT_COLOR:
    awra_media_row_set_accent_color (self, g_value_get_boxed (value));
    break;
  case PROP_SUFFIX:
    awra_media_row_set_suffix (self, g_value_get_object (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_media_row_class_init (AwraMediaRowClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  const GParamFlags flags = G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                            G_PARAM_STATIC_STRINGS;

  object_class->dispose = awra_media_row_dispose;
  object_class->finalize = awra_media_row_finalize;
  object_class->get_property = awra_media_row_get_property;
  object_class->set_property = awra_media_row_set_property;
  widget_class->snapshot = awra_media_row_snapshot;

  properties[PROP_TITLE] =
    g_param_spec_string ("title", NULL, NULL, NULL, flags);
  properties[PROP_SUBTITLE] =
    g_param_spec_string ("subtitle", NULL, NULL, NULL, flags);
  properties[PROP_POSITION] =
    g_param_spec_double ("position", NULL, NULL, 0.0, G_MAXDOUBLE, 0.0, flags);
  properties[PROP_DURATION] =
    g_param_spec_double ("duration", NULL, NULL, 0.0, G_MAXDOUBLE, 0.0, flags);
  properties[PROP_PLAYING] =
    g_param_spec_boolean ("playing", NULL, NULL, FALSE, flags);
  properties[PROP_SEEKABLE] =
    g_param_spec_boolean ("seekable", NULL, NULL, TRUE, flags);
  properties[PROP_VOLUME] =
    g_param_spec_double ("volume", NULL, NULL, 0.0, 1.0, 1.0, flags);
  properties[PROP_SHOW_VOLUME] =
    g_param_spec_boolean ("show-volume", NULL, NULL, FALSE, flags);
  properties[PROP_SHOW_PLAY_BUTTON] =
    g_param_spec_boolean ("show-play-button", NULL, NULL, TRUE, flags);
  properties[PROP_SHOW_STOP_BUTTON] =
    g_param_spec_boolean ("show-stop-button", NULL, NULL, TRUE, flags);
  properties[PROP_ICON_NAME] =
    g_param_spec_string ("icon-name", NULL, NULL, NULL, flags);
  properties[PROP_ACCENT_COLOR] =
    g_param_spec_boxed ("accent-color", NULL, NULL, GDK_TYPE_RGBA, flags);
  properties[PROP_SUFFIX] =
    g_param_spec_object ("suffix", NULL, NULL, GTK_TYPE_WIDGET, flags);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraMediaRow::seek-requested:
   * @self: the media row
   * @position: the requested position in seconds
   *
   * Emitted while the user scrubs the seek slider. The row keeps showing the
   * scrubbed value until the pointer is released, then follows
   * #AwraMediaRow:position again.
   */
  signals[SIGNAL_SEEK_REQUESTED] =
    g_signal_new ("seek-requested", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  G_TYPE_DOUBLE);
  /**
   * AwraMediaRow::play-toggled:
   * @self: the media row
   *
   * Emitted when the play/pause button is activated. The application owns
   * #AwraMediaRow:playing.
   */
  signals[SIGNAL_PLAY_TOGGLED] =
    g_signal_new ("play-toggled", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 0);
  /**
   * AwraMediaRow::stop-requested:
   * @self: the media row
   */
  signals[SIGNAL_STOP_REQUESTED] =
    g_signal_new ("stop-requested", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 0);
  /**
   * AwraMediaRow::volume-changed:
   * @self: the media row
   * @effective_volume: the audible level, 0 while muted
   *
   * Emitted for user changes of the inline volume control.
   */
  signals[SIGNAL_VOLUME_CHANGED] =
    g_signal_new ("volume-changed", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  G_TYPE_DOUBLE);

  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awramediarow");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static GtkButton *
make_icon_button (const char *icon_name,
                  const char *label)
{
  GtkWidget *button = awra_button_new_from_icon_name (icon_name);

  awra_button_set_appearance (AWRA_BUTTON (button),
                              AWRA_BUTTON_APPEARANCE_TOOLBAR);
  gtk_widget_add_css_class (button, "awra-media-button");
  gtk_widget_set_valign (button, GTK_ALIGN_CENTER);
  gtk_widget_set_tooltip_text (button, label);
  gtk_accessible_update_property (GTK_ACCESSIBLE (button),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, label, -1);
  return GTK_BUTTON (button);
}

static GtkLabel *
make_time_label (void)
{
  GtkLabel *label = GTK_LABEL (gtk_label_new ("0:00"));

  gtk_widget_add_css_class (GTK_WIDGET (label), "awra-media-time");
  gtk_label_set_width_chars (label, 4);
  gtk_accessible_update_state (GTK_ACCESSIBLE (label),
                               GTK_ACCESSIBLE_STATE_HIDDEN, TRUE, -1);
  return label;
}

static void
awra_media_row_init (AwraMediaRow *self)
{
  GtkWidget *text = gtk_box_new (GTK_ORIENTATION_VERTICAL, 1);
  GtkWidget *seek_box = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0);
  GtkWidget *seek;
  GtkEventController *legacy;

  self->seekable = TRUE;
  self->grid = GTK_GRID (gtk_grid_new ());
  awra_grid_set_spacing (self->grid, AWRA_SPACING_XS, AWRA_SPACING_MD);
  awra_box_set_spacing (GTK_BOX (seek_box), AWRA_SPACING_SM);

  self->leading = GTK_IMAGE (gtk_image_new ());
  gtk_widget_add_css_class (GTK_WIDGET (self->leading), "awra-media-leading");
  gtk_widget_set_size_request (GTK_WIDGET (self->leading), LEADING_SIZE,
                               LEADING_SIZE);
  gtk_widget_set_valign (GTK_WIDGET (self->leading), GTK_ALIGN_CENTER);
  gtk_widget_set_visible (GTK_WIDGET (self->leading), FALSE);
  gtk_accessible_update_state (GTK_ACCESSIBLE (self->leading),
                               GTK_ACCESSIBLE_STATE_HIDDEN, TRUE, -1);

  self->title = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->title), "awra-media-title");
  gtk_label_set_xalign (self->title, 0.0f);
  gtk_label_set_ellipsize (self->title, PANGO_ELLIPSIZE_END);
  self->subtitle = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->subtitle), "awra-media-subtitle");
  gtk_label_set_xalign (self->subtitle, 0.0f);
  gtk_label_set_ellipsize (self->subtitle, PANGO_ELLIPSIZE_END);
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle), FALSE);
  gtk_box_append (GTK_BOX (text), GTK_WIDGET (self->title));
  gtk_box_append (GTK_BOX (text), GTK_WIDGET (self->subtitle));
  gtk_widget_set_hexpand (text, TRUE);
  gtk_widget_set_valign (text, GTK_ALIGN_CENTER);

  self->end_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  awra_box_set_spacing (self->end_box, AWRA_SPACING_XS);
  gtk_widget_set_valign (GTK_WIDGET (self->end_box), GTK_ALIGN_CENTER);
  self->play_button = make_icon_button ("media-playback-start-symbolic",
                                        _("Play"));
  self->stop_button = make_icon_button ("media-playback-stop-symbolic",
                                        _("Stop"));
  self->volume = AWRA_VOLUME_CONTROL (awra_volume_control_new ());
  gtk_widget_set_visible (GTK_WIDGET (self->volume), FALSE);
  gtk_widget_set_size_request (GTK_WIDGET (self->volume), 120, -1);
  gtk_box_append (self->end_box, GTK_WIDGET (self->play_button));
  gtk_box_append (self->end_box, GTK_WIDGET (self->stop_button));
  gtk_box_append (self->end_box, GTK_WIDGET (self->volume));

  self->elapsed = make_time_label ();
  gtk_label_set_xalign (self->elapsed, 1.0f);
  self->total = make_time_label ();
  gtk_label_set_xalign (self->total, 0.0f);
  seek = awra_slider_new_with_range (GTK_ORIENTATION_HORIZONTAL, 0.0, 1.0,
                                     1.0);
  self->seek = GTK_RANGE (seek);
  gtk_widget_add_css_class (seek, "awra-media-seek");
  gtk_widget_set_hexpand (seek, TRUE);
  gtk_widget_set_valign (seek, GTK_ALIGN_CENTER);
  gtk_accessible_update_property (GTK_ACCESSIBLE (seek),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, _("Seek"),
                                  -1);
  gtk_box_append (GTK_BOX (seek_box), GTK_WIDGET (self->elapsed));
  gtk_box_append (GTK_BOX (seek_box), seek);
  gtk_box_append (GTK_BOX (seek_box), GTK_WIDGET (self->total));

  gtk_grid_attach (self->grid, GTK_WIDGET (self->leading), 0, 0, 1, 2);
  gtk_grid_attach (self->grid, text, 1, 0, 1, 1);
  gtk_grid_attach (self->grid, GTK_WIDGET (self->end_box), 2, 0, 1, 1);
  gtk_grid_attach (self->grid, seek_box, 1, 1, 2, 1);
  gtk_widget_set_parent (GTK_WIDGET (self->grid), GTK_WIDGET (self));

  g_signal_connect (self->seek, "change-value",
                    G_CALLBACK (seek_change_value_cb), self);
  g_signal_connect (self->seek, "value-changed",
                    G_CALLBACK (seek_value_changed_cb), self);
  legacy = gtk_event_controller_legacy_new ();
  gtk_event_controller_set_propagation_phase (legacy, GTK_PHASE_CAPTURE);
  g_signal_connect (legacy, "event", G_CALLBACK (seek_event_cb), self);
  gtk_widget_add_controller (seek, legacy);
  g_signal_connect (self->play_button, "clicked",
                    G_CALLBACK (play_clicked_cb), self);
  g_signal_connect (self->stop_button, "clicked",
                    G_CALLBACK (stop_clicked_cb), self);
  g_signal_connect (self->volume, "volume-changed",
                    G_CALLBACK (volume_changed_cb), self);
  g_signal_connect (self->volume, "notify::volume",
                    G_CALLBACK (volume_notify_cb), self);

  update_play_button (self);
  sync_seek (self);
  update_accessible (self);
}

GtkWidget *
awra_media_row_new (const char *title)
{
  return g_object_new (AWRA_TYPE_MEDIA_ROW, "title", title, NULL);
}

const char *
awra_media_row_get_title (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), NULL);
  return gtk_label_get_text (self->title);
}

void
awra_media_row_set_title (AwraMediaRow *self,
                          const char   *title)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  if (title == NULL)
    title = "";
  if (g_strcmp0 (gtk_label_get_text (self->title), title) == 0)
    return;
  gtk_label_set_text (self->title, title);
  gtk_widget_set_tooltip_text (GTK_WIDGET (self->title),
                               *title != '\0' ? title : NULL);
  update_accessible (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TITLE]);
}

const char *
awra_media_row_get_subtitle (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), NULL);
  return gtk_widget_get_visible (GTK_WIDGET (self->subtitle))
           ? gtk_label_get_text (self->subtitle) : NULL;
}

void
awra_media_row_set_subtitle (AwraMediaRow *self,
                             const char   *subtitle)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  if (subtitle != NULL && *subtitle == '\0')
    subtitle = NULL;
  if (g_strcmp0 (awra_media_row_get_subtitle (self), subtitle) == 0)
    return;
  gtk_label_set_text (self->subtitle, subtitle != NULL ? subtitle : "");
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle), subtitle != NULL);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_DESCRIPTION,
                                  subtitle != NULL ? subtitle : "", -1);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SUBTITLE]);
}

double
awra_media_row_get_position (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), 0.0);
  return self->position;
}

void
awra_media_row_set_position (AwraMediaRow *self,
                             double        position)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  if (!isfinite (position) || position < 0.0)
    position = 0.0;
  if (self->position == position)
    return;
  self->position = position;
  sync_seek (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_POSITION]);
}

double
awra_media_row_get_duration (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), 0.0);
  return self->duration;
}

/**
 * awra_media_row_set_duration:
 * @self: an Awra media row
 * @duration: the media length in seconds; 0 presents the idle state
 */
void
awra_media_row_set_duration (AwraMediaRow *self,
                             double        duration)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  if (!isfinite (duration) || duration < 0.0)
    duration = 0.0;
  if (self->duration == duration)
    return;
  self->duration = duration;
  sync_seek (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DURATION]);
}

gboolean
awra_media_row_get_playing (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), FALSE);
  return self->playing;
}

void
awra_media_row_set_playing (AwraMediaRow *self,
                            gboolean      playing)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  playing = !!playing;
  if (self->playing == playing)
    return;
  self->playing = playing;
  update_play_button (self);
  sync_seek (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_PLAYING]);
}

gboolean
awra_media_row_get_seekable (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), FALSE);
  return self->seekable;
}

void
awra_media_row_set_seekable (AwraMediaRow *self,
                             gboolean      seekable)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  seekable = !!seekable;
  if (self->seekable == seekable)
    return;
  self->seekable = seekable;
  sync_seek (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SEEKABLE]);
}

double
awra_media_row_get_volume (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), 0.0);
  return awra_volume_control_get_volume (self->volume);
}

void
awra_media_row_set_volume (AwraMediaRow *self,
                           double        volume)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  awra_volume_control_set_volume (self->volume, volume);
}

#define DEFINE_VISIBILITY(name, widget, prop)                               \
gboolean                                                                    \
awra_media_row_get_##name (AwraMediaRow *self)                              \
{                                                                           \
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), FALSE);                   \
  return gtk_widget_get_visible (GTK_WIDGET (self->widget));                \
}                                                                           \
                                                                            \
void                                                                        \
awra_media_row_set_##name (AwraMediaRow *self,                              \
                           gboolean      show)                              \
{                                                                           \
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));                              \
  show = !!show;                                                            \
  if (gtk_widget_get_visible (GTK_WIDGET (self->widget)) == show)           \
    return;                                                                 \
  gtk_widget_set_visible (GTK_WIDGET (self->widget), show);                 \
  g_object_notify_by_pspec (G_OBJECT (self), properties[prop]);             \
}

DEFINE_VISIBILITY (show_volume, volume, PROP_SHOW_VOLUME)
DEFINE_VISIBILITY (show_play_button, play_button, PROP_SHOW_PLAY_BUTTON)
DEFINE_VISIBILITY (show_stop_button, stop_button, PROP_SHOW_STOP_BUTTON)

#undef DEFINE_VISIBILITY

const char *
awra_media_row_get_icon_name (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), NULL);
  return self->icon_name;
}

void
awra_media_row_set_icon_name (AwraMediaRow *self,
                              const char   *icon_name)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  if (!g_set_str (&self->icon_name, icon_name))
    return;
  update_leading (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ICON_NAME]);
}

const GdkRGBA *
awra_media_row_get_accent_color (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), NULL);
  return self->accent_color_set ? &self->accent_color : NULL;
}

void
awra_media_row_set_accent_color (AwraMediaRow  *self,
                                 const GdkRGBA *color)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  if ((color == NULL && !self->accent_color_set) ||
      (color != NULL && self->accent_color_set &&
       gdk_rgba_equal (color, &self->accent_color)))
    return;
  if (color != NULL)
    self->accent_color = *color;
  self->accent_color_set = color != NULL;
  update_leading (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ACCENT_COLOR]);
}

GtkWidget *
awra_media_row_get_suffix (AwraMediaRow *self)
{
  g_return_val_if_fail (AWRA_IS_MEDIA_ROW (self), NULL);
  return self->suffix;
}

void
awra_media_row_set_suffix (AwraMediaRow *self,
                           GtkWidget    *suffix)
{
  g_return_if_fail (AWRA_IS_MEDIA_ROW (self));
  g_return_if_fail (suffix == NULL || GTK_IS_WIDGET (suffix));
  g_return_if_fail (suffix == NULL || gtk_widget_get_parent (suffix) == NULL);
  if (self->suffix == suffix)
    return;
  if (self->suffix != NULL)
    gtk_box_remove (self->end_box, self->suffix);
  self->suffix = suffix;
  if (suffix != NULL) {
    gtk_widget_set_valign (suffix, GTK_ALIGN_CENTER);
    gtk_box_append (self->end_box, suffix);
  }
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SUFFIX]);
}
