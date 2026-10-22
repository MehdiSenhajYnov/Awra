/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <math.h>

#include <awra/awra-button.h>
#include <awra/awra-slider.h>
#include <awra/awra-volume-control.h>

#include "awra-i18n-private.h"

#define SCROLL_STEP 0.05

struct _AwraVolumeControl {
  GtkWidget parent_instance;

  GtkBox *box;
  GtkButton *mute_button;
  GtkRange *slider;
  double volume;
  gboolean muted;
  gboolean syncing;
};

enum {
  PROP_0,
  PROP_VOLUME,
  PROP_MUTED,
  N_PROPS,
};

enum {
  SIGNAL_VOLUME_CHANGED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraVolumeControl, awra_volume_control, GTK_TYPE_WIDGET)

static const char *
icon_for_level (double effective)
{
  if (effective <= 0.0)
    return "audio-volume-muted-symbolic";
  if (effective < 0.34)
    return "audio-volume-low-symbolic";
  if (effective < 0.67)
    return "audio-volume-medium-symbolic";
  return "audio-volume-high-symbolic";
}

static void
update_presentation (AwraVolumeControl *self)
{
  double effective = awra_volume_control_get_effective_volume (self);
  g_autofree char *percent = g_strdup_printf (_("%d %%"),
                                              (int) round (self->volume * 100.0));

  gtk_button_set_icon_name (self->mute_button, icon_for_level (effective));
  gtk_widget_set_tooltip_text (GTK_WIDGET (self->slider), percent);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self->slider),
                                  GTK_ACCESSIBLE_PROPERTY_VALUE_TEXT, percent,
                                  -1);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self->mute_button),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  self->muted ? _("Unmute") : _("Mute"),
                                  -1);
  gtk_widget_set_tooltip_text (GTK_WIDGET (self->mute_button),
                               self->muted ? _("Unmute") : _("Mute"));
  gtk_accessible_update_state (GTK_ACCESSIBLE (self->mute_button),
                               GTK_ACCESSIBLE_STATE_PRESSED, self->muted, -1);
  if (self->muted)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-volume-muted");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-volume-muted");
}

static void
emit_changed (AwraVolumeControl *self)
{
  g_signal_emit (self, signals[SIGNAL_VOLUME_CHANGED], 0,
                 awra_volume_control_get_effective_volume (self));
}

/* Applies a user-originated level change. */
static void
apply_user_volume (AwraVolumeControl *self,
                   double             volume)
{
  gboolean was_muted = self->muted;

  volume = CLAMP (volume, 0.0, 1.0);
  if (fabs (self->volume - volume) < 1e-9 && !(was_muted && volume > 0.0))
    return;
  awra_volume_control_set_volume (self, volume);
  if (was_muted && volume > 0.0)
    awra_volume_control_set_muted (self, FALSE);
  emit_changed (self);
}

static void
slider_value_changed_cb (GtkRange          *range,
                         AwraVolumeControl *self)
{
  if (self->syncing)
    return;
  apply_user_volume (self, gtk_range_get_value (range));
}

static void
mute_clicked_cb (GtkButton         *button,
                 AwraVolumeControl *self)
{
  (void) button;
  awra_volume_control_set_muted (self, !self->muted);
  emit_changed (self);
}

static gboolean
scroll_cb (GtkEventControllerScroll *controller,
           double                    dx,
           double                    dy,
           AwraVolumeControl        *self)
{
  double delta = fabs (dy) >= fabs (dx) ? -dy : dx;

  (void) controller;
  if (delta == 0.0)
    return FALSE;
  if (gtk_widget_get_direction (GTK_WIDGET (self)) == GTK_TEXT_DIR_RTL &&
      fabs (dx) > fabs (dy))
    delta = -delta;
  apply_user_volume (self, self->volume + (delta > 0.0 ? SCROLL_STEP
                                                       : -SCROLL_STEP));
  return TRUE;
}

static void
awra_volume_control_dispose (GObject *object)
{
  AwraVolumeControl *self = AWRA_VOLUME_CONTROL (object);

  if (self->box != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->box));
    self->box = NULL;
    self->mute_button = NULL;
    self->slider = NULL;
  }
  G_OBJECT_CLASS (awra_volume_control_parent_class)->dispose (object);
}

static void
awra_volume_control_get_property (GObject    *object,
                                  guint       property_id,
                                  GValue     *value,
                                  GParamSpec *pspec)
{
  AwraVolumeControl *self = AWRA_VOLUME_CONTROL (object);

  switch (property_id) {
  case PROP_VOLUME:
    g_value_set_double (value, self->volume);
    break;
  case PROP_MUTED:
    g_value_set_boolean (value, self->muted);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_volume_control_set_property (GObject      *object,
                                  guint         property_id,
                                  const GValue *value,
                                  GParamSpec   *pspec)
{
  AwraVolumeControl *self = AWRA_VOLUME_CONTROL (object);

  switch (property_id) {
  case PROP_VOLUME:
    awra_volume_control_set_volume (self, g_value_get_double (value));
    break;
  case PROP_MUTED:
    awra_volume_control_set_muted (self, g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_volume_control_class_init (AwraVolumeControlClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_volume_control_dispose;
  object_class->get_property = awra_volume_control_get_property;
  object_class->set_property = awra_volume_control_set_property;

  properties[PROP_VOLUME] =
    g_param_spec_double ("volume", NULL, NULL, 0.0, 1.0, 1.0,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_MUTED] =
    g_param_spec_boolean ("muted", NULL, NULL, FALSE,
                          G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                          G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraVolumeControl::volume-changed:
   * @self: the volume control
   * @effective_volume: the audible level, 0 while muted
   *
   * Emitted for user changes only: dragging, keyboard, scrolling and the
   * mute toggle. Programmatic property changes only notify.
   */
  signals[SIGNAL_VOLUME_CHANGED] =
    g_signal_new ("volume-changed", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  G_TYPE_DOUBLE);

  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awravolumecontrol");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_volume_control_init (AwraVolumeControl *self)
{
  GtkEventController *scroll;
  GtkWidget *slider;

  self->volume = 1.0;
  self->box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 2));
  self->mute_button = GTK_BUTTON (
    awra_button_new_from_icon_name ("audio-volume-high-symbolic"));
  awra_button_set_appearance (AWRA_BUTTON (self->mute_button),
                              AWRA_BUTTON_APPEARANCE_TOOLBAR);
  gtk_widget_add_css_class (GTK_WIDGET (self->mute_button),
                            "awra-volume-button");
  gtk_widget_set_valign (GTK_WIDGET (self->mute_button), GTK_ALIGN_CENTER);
  slider = awra_slider_new_with_range (GTK_ORIENTATION_HORIZONTAL, 0.0, 1.0,
                                       0.01);
  self->slider = GTK_RANGE (slider);
  gtk_range_set_increments (self->slider, SCROLL_STEP, 0.1);
  gtk_range_set_value (self->slider, 1.0);
  gtk_widget_set_size_request (slider, 88, -1);
  gtk_widget_set_hexpand (slider, TRUE);
  gtk_widget_set_valign (slider, GTK_ALIGN_CENTER);
  gtk_widget_add_css_class (slider, "awra-volume-slider");
  gtk_accessible_update_property (GTK_ACCESSIBLE (slider),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, _("Volume"),
                                  -1);
  gtk_box_append (self->box, GTK_WIDGET (self->mute_button));
  gtk_box_append (self->box, slider);
  gtk_widget_set_parent (GTK_WIDGET (self->box), GTK_WIDGET (self));
  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, _("Volume"),
                                  -1);

  g_signal_connect (self->slider, "value-changed",
                    G_CALLBACK (slider_value_changed_cb), self);
  g_signal_connect (self->mute_button, "clicked",
                    G_CALLBACK (mute_clicked_cb), self);

  /* Capture keeps one consistent step for the icon and the slider. */
  scroll = gtk_event_controller_scroll_new (
    GTK_EVENT_CONTROLLER_SCROLL_BOTH_AXES |
    GTK_EVENT_CONTROLLER_SCROLL_DISCRETE);
  gtk_event_controller_set_propagation_phase (scroll, GTK_PHASE_CAPTURE);
  g_signal_connect (scroll, "scroll", G_CALLBACK (scroll_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), scroll);

  update_presentation (self);
}

GtkWidget *
awra_volume_control_new (void)
{
  return g_object_new (AWRA_TYPE_VOLUME_CONTROL, NULL);
}

double
awra_volume_control_get_volume (AwraVolumeControl *self)
{
  g_return_val_if_fail (AWRA_IS_VOLUME_CONTROL (self), 0.0);
  return self->volume;
}

/**
 * awra_volume_control_set_volume:
 * @self: an Awra volume control
 * @volume: the level between 0 and 1
 *
 * Sets the level without emitting #AwraVolumeControl::volume-changed.
 */
void
awra_volume_control_set_volume (AwraVolumeControl *self,
                                double             volume)
{
  g_return_if_fail (AWRA_IS_VOLUME_CONTROL (self));
  volume = isfinite (volume) ? CLAMP (volume, 0.0, 1.0) : 0.0;
  if (fabs (self->volume - volume) < 1e-9)
    return;
  self->volume = volume;
  self->syncing = TRUE;
  gtk_range_set_value (self->slider, volume);
  self->syncing = FALSE;
  update_presentation (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_VOLUME]);
}

gboolean
awra_volume_control_get_muted (AwraVolumeControl *self)
{
  g_return_val_if_fail (AWRA_IS_VOLUME_CONTROL (self), FALSE);
  return self->muted;
}

void
awra_volume_control_set_muted (AwraVolumeControl *self,
                               gboolean           muted)
{
  g_return_if_fail (AWRA_IS_VOLUME_CONTROL (self));
  muted = !!muted;
  if (self->muted == muted)
    return;
  self->muted = muted;
  update_presentation (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MUTED]);
}

double
awra_volume_control_get_effective_volume (AwraVolumeControl *self)
{
  g_return_val_if_fail (AWRA_IS_VOLUME_CONTROL (self), 0.0);
  return self->muted ? 0.0 : self->volume;
}

GtkRange *
awra_volume_control_get_slider (AwraVolumeControl *self)
{
  g_return_val_if_fail (AWRA_IS_VOLUME_CONTROL (self), NULL);
  return self->slider;
}
