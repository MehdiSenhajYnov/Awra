/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-edge-panel.h>
#include <awra/awra-layout.h>
#include <awra/awra-motion.h>

#include "awra-i18n-private.h"

struct _AwraEdgePanel {
  GtkWidget parent_instance;
  GtkOverlay *overlay;
  GtkRevealer *revealer;
  AwraSurface *surface;
  GtkWidget *trigger;
  GtkWidget *content;
  GtkWidget *panel;
  AwraStyleManager *style_manager;
  gulong style_handler;
  guint hide_source;
  AwraPanelEdge edge;
  gboolean revealed;
  gboolean auto_hide;
  guint panel_width;
  guint reveal_width;
  guint hide_delay;
};

enum {
  PROP_0,
  PROP_CONTENT,
  PROP_PANEL,
  PROP_SURFACE,
  PROP_EDGE,
  PROP_REVEALED,
  PROP_AUTO_HIDE,
  PROP_PANEL_WIDTH,
  PROP_REVEAL_WIDTH,
  PROP_HIDE_DELAY,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraEdgePanel, awra_edge_panel, GTK_TYPE_WIDGET)

static void
cancel_hide (AwraEdgePanel *self)
{
  if (self->hide_source != 0) {
    g_source_remove (self->hide_source);
    self->hide_source = 0;
  }
}

static gboolean
hide_timeout_cb (gpointer user_data)
{
  AwraEdgePanel *self = user_data;

  self->hide_source = 0;
  if (self->auto_hide)
    awra_edge_panel_set_revealed (self, FALSE);
  return G_SOURCE_REMOVE;
}

static void
schedule_hide (AwraEdgePanel *self,
               guint          extra_delay)
{
  cancel_hide (self);
  if (self->auto_hide)
    self->hide_source = g_timeout_add (self->hide_delay + extra_delay,
                                       hide_timeout_cb,
                                       self);
}

static gboolean
edge_is_left (AwraEdgePanel *self)
{
  gboolean rtl = gtk_widget_get_direction (GTK_WIDGET (self)) == GTK_TEXT_DIR_RTL;

  return self->edge == AWRA_PANEL_EDGE_START ? !rtl : rtl;
}

static void
update_edge_layout (AwraEdgePanel *self)
{
  GtkAlign align = edge_is_left (self) ? GTK_ALIGN_START : GTK_ALIGN_END;
  int inset = awra_spacing_resolve (GTK_WIDGET (self), AWRA_SPACING_MD);

  gtk_widget_set_halign (GTK_WIDGET (self->revealer), align);
  gtk_widget_set_halign (self->trigger, align);
  gtk_revealer_set_transition_type (
    self->revealer,
    edge_is_left (self)
      ? GTK_REVEALER_TRANSITION_TYPE_SLIDE_RIGHT
      : GTK_REVEALER_TRANSITION_TYPE_SLIDE_LEFT);
  gtk_widget_set_margin_start (GTK_WIDGET (self->revealer),
                               edge_is_left (self) ? inset : 0);
  gtk_widget_set_margin_end (GTK_WIDGET (self->revealer),
                             edge_is_left (self) ? 0 : inset);
}

static void
update_reveal_state (AwraEdgePanel *self)
{
  gtk_revealer_set_reveal_child (self->revealer, self->revealed);
  gtk_widget_set_visible (self->trigger,
                          self->auto_hide && !self->revealed);
}

static void
update_motion (AwraEdgePanel *self)
{
  guint duration = 180;

  if (self->style_manager != NULL)
    duration = awra_motion_get_duration (self->style_manager,
                                         AWRA_MOTION_PRESET_NORMAL);
  gtk_revealer_set_transition_duration (self->revealer, duration);
}

static void
style_changed_cb (AwraStyleManager *manager,
                  GParamSpec       *pspec,
                  AwraEdgePanel    *self)
{
  (void) manager;
  (void) pspec;
  update_motion (self);
}

static void
trigger_enter_cb (GtkEventControllerMotion *motion,
                  double                    x,
                  double                    y,
                  AwraEdgePanel            *self)
{
  (void) motion;
  (void) x;
  (void) y;
  cancel_hide (self);
  awra_edge_panel_set_revealed (self, TRUE);
  schedule_hide (self, 700);
}

static void
panel_enter_cb (GtkEventControllerMotion *motion,
                double                    x,
                double                    y,
                AwraEdgePanel            *self)
{
  (void) motion;
  (void) x;
  (void) y;
  cancel_hide (self);
}

static void
panel_leave_cb (GtkEventControllerMotion *motion,
                AwraEdgePanel            *self)
{
  (void) motion;
  schedule_hide (self, 0);
}

static void
trigger_clicked_cb (GtkButton     *button,
                    AwraEdgePanel *self)
{
  (void) button;
  cancel_hide (self);
  awra_edge_panel_set_revealed (self, TRUE);
  gtk_widget_child_focus (GTK_WIDGET (self->surface),
                          GTK_DIR_TAB_FORWARD);
}

static gboolean
panel_key_pressed_cb (GtkEventControllerKey *controller,
                      guint                  keyval,
                      guint                  keycode,
                      GdkModifierType        state,
                      AwraEdgePanel         *self)
{
  (void) controller;
  (void) keycode;
  (void) state;
  if (self->auto_hide && keyval == GDK_KEY_Escape) {
    awra_edge_panel_set_revealed (self, FALSE);
    return GDK_EVENT_STOP;
  }
  return GDK_EVENT_PROPAGATE;
}

static void
awra_edge_panel_direction_changed (GtkWidget        *widget,
                                   GtkTextDirection  previous_direction)
{
  GTK_WIDGET_CLASS (awra_edge_panel_parent_class)->direction_changed (
    widget, previous_direction);
  update_edge_layout (AWRA_EDGE_PANEL (widget));
}

static void
awra_edge_panel_map (GtkWidget *widget)
{
  AwraEdgePanel *self = AWRA_EDGE_PANEL (widget);
  AwraContext *context;

  GTK_WIDGET_CLASS (awra_edge_panel_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style_manager = awra_context_get_style_manager (context);
  update_motion (self);
  self->style_handler = g_signal_connect (
    self->style_manager,
    "notify::reduced-motion",
    G_CALLBACK (style_changed_cb),
    self);
}

static void
awra_edge_panel_unmap (GtkWidget *widget)
{
  AwraEdgePanel *self = AWRA_EDGE_PANEL (widget);

  cancel_hide (self);
  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
    self->style_manager = NULL;
  }
  GTK_WIDGET_CLASS (awra_edge_panel_parent_class)->unmap (widget);
}

static void
awra_edge_panel_snapshot (GtkWidget   *widget,
                          GtkSnapshot *snapshot)
{
  AwraEdgePanel *self = AWRA_EDGE_PANEL (widget);

  gtk_widget_snapshot_child (widget, GTK_WIDGET (self->overlay), snapshot);
}

static void
awra_edge_panel_dispose (GObject *object)
{
  AwraEdgePanel *self = AWRA_EDGE_PANEL (object);

  cancel_hide (self);
  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
  }
  if (self->overlay != NULL) {
    gtk_overlay_set_child (self->overlay, NULL);
    gtk_revealer_set_child (self->revealer, NULL);
    gtk_widget_unparent (GTK_WIDGET (self->overlay));
  }
  self->overlay = NULL;
  self->revealer = NULL;
  self->surface = NULL;
  self->trigger = NULL;
  self->content = NULL;
  self->panel = NULL;
  self->style_manager = NULL;
  G_OBJECT_CLASS (awra_edge_panel_parent_class)->dispose (object);
}

static void
awra_edge_panel_get_property (GObject    *object,
                              guint       property_id,
                              GValue     *value,
                              GParamSpec *pspec)
{
  AwraEdgePanel *self = AWRA_EDGE_PANEL (object);

  switch (property_id) {
  case PROP_CONTENT: g_value_set_object (value, self->content); break;
  case PROP_PANEL: g_value_set_object (value, self->panel); break;
  case PROP_SURFACE: g_value_set_object (value, self->surface); break;
  case PROP_EDGE: g_value_set_enum (value, self->edge); break;
  case PROP_REVEALED: g_value_set_boolean (value, self->revealed); break;
  case PROP_AUTO_HIDE: g_value_set_boolean (value, self->auto_hide); break;
  case PROP_PANEL_WIDTH: g_value_set_uint (value, self->panel_width); break;
  case PROP_REVEAL_WIDTH: g_value_set_uint (value, self->reveal_width); break;
  case PROP_HIDE_DELAY: g_value_set_uint (value, self->hide_delay); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_edge_panel_set_property (GObject      *object,
                              guint         property_id,
                              const GValue *value,
                              GParamSpec   *pspec)
{
  AwraEdgePanel *self = AWRA_EDGE_PANEL (object);

  switch (property_id) {
  case PROP_CONTENT: awra_edge_panel_set_content (self, g_value_get_object (value)); break;
  case PROP_PANEL: awra_edge_panel_set_panel (self, g_value_get_object (value)); break;
  case PROP_EDGE: awra_edge_panel_set_edge (self, g_value_get_enum (value)); break;
  case PROP_REVEALED: awra_edge_panel_set_revealed (self, g_value_get_boolean (value)); break;
  case PROP_AUTO_HIDE: awra_edge_panel_set_auto_hide (self, g_value_get_boolean (value)); break;
  case PROP_PANEL_WIDTH: awra_edge_panel_set_panel_width (self, g_value_get_uint (value)); break;
  case PROP_REVEAL_WIDTH: awra_edge_panel_set_reveal_width (self, g_value_get_uint (value)); break;
  case PROP_HIDE_DELAY: awra_edge_panel_set_hide_delay (self, g_value_get_uint (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_edge_panel_class_init (AwraEdgePanelClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_edge_panel_dispose;
  object_class->get_property = awra_edge_panel_get_property;
  object_class->set_property = awra_edge_panel_set_property;
  widget_class->map = awra_edge_panel_map;
  widget_class->unmap = awra_edge_panel_unmap;
  widget_class->snapshot = awra_edge_panel_snapshot;
  widget_class->direction_changed = awra_edge_panel_direction_changed;
  properties[PROP_CONTENT] = g_param_spec_object (
    "content", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_PANEL] = g_param_spec_object (
    "panel", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SURFACE] = g_param_spec_object (
    "surface", NULL, NULL, AWRA_TYPE_SURFACE,
    G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_EDGE] = g_param_spec_enum (
    "edge", NULL, NULL, AWRA_TYPE_PANEL_EDGE, AWRA_PANEL_EDGE_END,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_REVEALED] = g_param_spec_boolean (
    "revealed", NULL, NULL, TRUE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_AUTO_HIDE] = g_param_spec_boolean (
    "auto-hide", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_PANEL_WIDTH] = g_param_spec_uint (
    "panel-width", NULL, NULL, 160, 720, 300,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_REVEAL_WIDTH] = g_param_spec_uint (
    "reveal-width", NULL, NULL, 6, 64, 12,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_HIDE_DELAY] = g_param_spec_uint (
    "hide-delay", NULL, NULL, 0, 5000, 320,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awraedgepanel");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_edge_panel_init (AwraEdgePanel *self)
{
  GtkEventController *trigger_motion = gtk_event_controller_motion_new ();
  GtkEventController *panel_motion = gtk_event_controller_motion_new ();
  GtkEventController *panel_keys = gtk_event_controller_key_new ();

  self->edge = AWRA_PANEL_EDGE_END;
  self->revealed = TRUE;
  self->panel_width = 300;
  self->reveal_width = 12;
  self->hide_delay = 320;
  self->overlay = GTK_OVERLAY (gtk_overlay_new ());
  self->revealer = GTK_REVEALER (gtk_revealer_new ());
  self->surface = AWRA_SURFACE (
    awra_surface_new_with_role (AWRA_SURFACE_ROLE_FLOATING));
  self->trigger = gtk_button_new ();
  gtk_widget_add_css_class (self->trigger, "awra-edge-trigger");
  gtk_accessible_update_property (
    GTK_ACCESSIBLE (self->trigger),
    GTK_ACCESSIBLE_PROPERTY_LABEL, _("Reveal side panel"), -1);
  awra_surface_set_elevation_level (self->surface,
                                    AWRA_ELEVATION_FLOATING);
  gtk_widget_set_size_request (GTK_WIDGET (self->surface),
                               (int) self->panel_width, -1);
  gtk_widget_set_size_request (self->trigger, (int) self->reveal_width, -1);
  gtk_widget_set_valign (GTK_WIDGET (self->revealer), GTK_ALIGN_FILL);
  gtk_widget_set_valign (self->trigger, GTK_ALIGN_FILL);
  awra_widget_set_vertical_margin (GTK_WIDGET (self->revealer),
                                   AWRA_SPACING_MD);
  gtk_revealer_set_child (self->revealer, GTK_WIDGET (self->surface));
  gtk_overlay_add_overlay (self->overlay, GTK_WIDGET (self->revealer));
  gtk_overlay_add_overlay (self->overlay, self->trigger);
  gtk_widget_set_parent (GTK_WIDGET (self->overlay), GTK_WIDGET (self));
  g_signal_connect (trigger_motion, "enter",
                    G_CALLBACK (trigger_enter_cb), self);
  g_signal_connect (panel_motion, "enter",
                    G_CALLBACK (panel_enter_cb), self);
  g_signal_connect (panel_motion, "leave",
                    G_CALLBACK (panel_leave_cb), self);
  g_signal_connect (panel_keys, "key-pressed",
                    G_CALLBACK (panel_key_pressed_cb), self);
  g_signal_connect (self->trigger, "clicked",
                    G_CALLBACK (trigger_clicked_cb), self);
  gtk_widget_add_controller (self->trigger, trigger_motion);
  gtk_widget_add_controller (GTK_WIDGET (self->surface), panel_motion);
  gtk_widget_add_controller (GTK_WIDGET (self->surface), panel_keys);
  update_edge_layout (self);
  update_reveal_state (self);
  update_motion (self);
}

GtkWidget *awra_edge_panel_new (void) { return g_object_new (AWRA_TYPE_EDGE_PANEL, NULL); }
GtkWidget *awra_edge_panel_get_content (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), NULL); return self->content; }
void awra_edge_panel_set_content (AwraEdgePanel *self, GtkWidget *content) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); g_return_if_fail (content == NULL || GTK_IS_WIDGET (content)); if (self->content == content) return; gtk_overlay_set_child (self->overlay, content); self->content = content; g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CONTENT]); }
GtkWidget *awra_edge_panel_get_panel (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), NULL); return self->panel; }
void awra_edge_panel_set_panel (AwraEdgePanel *self, GtkWidget *panel) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); g_return_if_fail (panel == NULL || GTK_IS_WIDGET (panel)); if (self->panel == panel) return; awra_surface_set_child (self->surface, panel); self->panel = panel; g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_PANEL]); }
AwraSurface *awra_edge_panel_get_surface (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), NULL); return self->surface; }
AwraPanelEdge awra_edge_panel_get_edge (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), AWRA_PANEL_EDGE_END); return self->edge; }
void awra_edge_panel_set_edge (AwraEdgePanel *self, AwraPanelEdge edge) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); g_return_if_fail (edge >= AWRA_PANEL_EDGE_START && edge <= AWRA_PANEL_EDGE_END); if (self->edge == edge) return; self->edge = edge; update_edge_layout (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EDGE]); }
gboolean awra_edge_panel_get_revealed (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), FALSE); return self->revealed; }
void awra_edge_panel_set_revealed (AwraEdgePanel *self, gboolean revealed) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); revealed = !!revealed; if (self->revealed == revealed) return; self->revealed = revealed; update_reveal_state (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_REVEALED]); }
gboolean awra_edge_panel_get_auto_hide (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), FALSE); return self->auto_hide; }
void awra_edge_panel_set_auto_hide (AwraEdgePanel *self, gboolean auto_hide) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); auto_hide = !!auto_hide; if (self->auto_hide == auto_hide) return; self->auto_hide = auto_hide; if (!auto_hide) cancel_hide (self); update_reveal_state (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_AUTO_HIDE]); }
guint awra_edge_panel_get_panel_width (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), 0); return self->panel_width; }
void awra_edge_panel_set_panel_width (AwraEdgePanel *self, guint width) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); g_return_if_fail (width >= 160 && width <= 720); if (self->panel_width == width) return; self->panel_width = width; gtk_widget_set_size_request (GTK_WIDGET (self->surface), (int) width, -1); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_PANEL_WIDTH]); }
guint awra_edge_panel_get_reveal_width (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), 0); return self->reveal_width; }
void awra_edge_panel_set_reveal_width (AwraEdgePanel *self, guint width) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); g_return_if_fail (width >= 6 && width <= 64); if (self->reveal_width == width) return; self->reveal_width = width; gtk_widget_set_size_request (self->trigger, (int) width, -1); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_REVEAL_WIDTH]); }
guint awra_edge_panel_get_hide_delay (AwraEdgePanel *self) { g_return_val_if_fail (AWRA_IS_EDGE_PANEL (self), 0); return self->hide_delay; }
void awra_edge_panel_set_hide_delay (AwraEdgePanel *self, guint delay_ms) { g_return_if_fail (AWRA_IS_EDGE_PANEL (self)); g_return_if_fail (delay_ms <= 5000); if (self->hide_delay == delay_ms) return; self->hide_delay = delay_ms; g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_HIDE_DELAY]); }
