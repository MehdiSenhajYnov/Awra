/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-surface.h>
#include <awra/awra-toast-overlay.h>

struct _AwraToastOverlay {
  GtkWidget parent_instance;
  GtkOverlay *overlay;
  GtkWidget *child;
  GtkRevealer *revealer;
  GtkLabel *label;
  guint timeout_id;
};
enum { PROP_0, PROP_CHILD, PROP_REVEALED, N_PROPS };
static GParamSpec *properties[N_PROPS];
G_DEFINE_FINAL_TYPE (AwraToastOverlay, awra_toast_overlay, GTK_TYPE_WIDGET)

static gboolean hide_toast_cb (gpointer data) {
  AwraToastOverlay *self = data; self->timeout_id = 0; gtk_revealer_set_reveal_child (self->revealer, FALSE);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_REVEALED]); return G_SOURCE_REMOVE;
}
static void awra_toast_overlay_dispose (GObject *object) {
  AwraToastOverlay *self = AWRA_TOAST_OVERLAY (object);
  if (self->timeout_id != 0) { g_source_remove (self->timeout_id); self->timeout_id = 0; }
  if (self->overlay != NULL) { gtk_widget_unparent (GTK_WIDGET (self->overlay)); self->overlay = NULL; }
  self->child = NULL; self->revealer = NULL; self->label = NULL;
  G_OBJECT_CLASS (awra_toast_overlay_parent_class)->dispose (object);
}
static void awra_toast_overlay_snapshot (GtkWidget *widget, GtkSnapshot *snapshot) { gtk_widget_snapshot_child (widget, GTK_WIDGET (AWRA_TOAST_OVERLAY (widget)->overlay), snapshot); }
static void awra_toast_overlay_get_property (GObject *object, guint id, GValue *value, GParamSpec *pspec) {
  AwraToastOverlay *self = AWRA_TOAST_OVERLAY (object);
  if (id == PROP_CHILD) g_value_set_object (value, self->child);
  else if (id == PROP_REVEALED) g_value_set_boolean (value, awra_toast_overlay_get_revealed (self));
  else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
}
static void awra_toast_overlay_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec) {
  if (id == PROP_CHILD) awra_toast_overlay_set_child (AWRA_TOAST_OVERLAY (object), g_value_get_object (value));
  else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
}
static void awra_toast_overlay_class_init (AwraToastOverlayClass *klass) {
  GObjectClass *oc = G_OBJECT_CLASS (klass); GtkWidgetClass *wc = GTK_WIDGET_CLASS (klass);
  oc->dispose = awra_toast_overlay_dispose; oc->get_property = awra_toast_overlay_get_property; oc->set_property = awra_toast_overlay_set_property;
  wc->snapshot = awra_toast_overlay_snapshot;
  properties[PROP_CHILD] = g_param_spec_object ("child", NULL, NULL, GTK_TYPE_WIDGET, G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_REVEALED] = g_param_spec_boolean ("revealed", NULL, NULL, FALSE, G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (oc, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (wc, GTK_TYPE_BIN_LAYOUT); gtk_widget_class_set_css_name (wc, "awratoastoverlay");
}
static void awra_toast_overlay_init (AwraToastOverlay *self) {
  GtkWidget *surface; g_autoptr (AwraMaterial) material = awra_material_new_frosted ();
  self->overlay = GTK_OVERLAY (gtk_overlay_new ()); self->revealer = GTK_REVEALER (gtk_revealer_new ());
  surface = awra_surface_new_with_role (AWRA_SURFACE_ROLE_HUD); awra_surface_set_material (AWRA_SURFACE (surface), material); awra_surface_set_elevation (AWRA_SURFACE (surface), 8);
  self->label = GTK_LABEL (gtk_label_new (NULL)); gtk_widget_add_css_class (GTK_WIDGET (self->label), "awra-toast-label"); awra_surface_set_child (AWRA_SURFACE (surface), GTK_WIDGET (self->label));
  gtk_revealer_set_child (self->revealer, surface); gtk_revealer_set_transition_type (self->revealer, GTK_REVEALER_TRANSITION_TYPE_SLIDE_UP);
  gtk_widget_set_halign (GTK_WIDGET (self->revealer), GTK_ALIGN_CENTER); gtk_widget_set_valign (GTK_WIDGET (self->revealer), GTK_ALIGN_END);
  gtk_widget_set_margin_bottom (GTK_WIDGET (self->revealer), 24); gtk_overlay_add_overlay (self->overlay, GTK_WIDGET (self->revealer));
  gtk_widget_set_parent (GTK_WIDGET (self->overlay), GTK_WIDGET (self));
}
GtkWidget *awra_toast_overlay_new (void) { return g_object_new (AWRA_TYPE_TOAST_OVERLAY, NULL); }
GtkWidget *awra_toast_overlay_get_child (AwraToastOverlay *self) { g_return_val_if_fail (AWRA_IS_TOAST_OVERLAY (self), NULL); return self->child; }
void awra_toast_overlay_set_child (AwraToastOverlay *self, GtkWidget *child) { g_return_if_fail (AWRA_IS_TOAST_OVERLAY (self)); if (self->child == child) return; gtk_overlay_set_child (self->overlay, child); self->child = child; g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]); }
void awra_toast_overlay_show_message (AwraToastOverlay *self, const char *message, guint timeout_ms) { g_return_if_fail (AWRA_IS_TOAST_OVERLAY (self)); g_return_if_fail (message != NULL); if (self->timeout_id != 0) g_source_remove (self->timeout_id); gtk_label_set_text (self->label, message); gtk_revealer_set_reveal_child (self->revealer, TRUE); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_REVEALED]); self->timeout_id = timeout_ms > 0 ? g_timeout_add (timeout_ms, hide_toast_cb, self) : 0; }
gboolean awra_toast_overlay_get_revealed (AwraToastOverlay *self) { g_return_val_if_fail (AWRA_IS_TOAST_OVERLAY (self), FALSE); return gtk_revealer_get_reveal_child (self->revealer); }

