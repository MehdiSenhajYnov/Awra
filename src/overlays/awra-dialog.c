/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-dialog.h>

struct _AwraDialog { AwraWindow parent_instance; };
G_DEFINE_FINAL_TYPE (AwraDialog, awra_dialog, AWRA_TYPE_WINDOW)
static gboolean dialog_key_pressed (GtkEventControllerKey *controller, guint keyval, guint keycode, GdkModifierType state, gpointer data) {
  (void)controller; (void)keycode; (void)state;
  if (keyval != GDK_KEY_Escape) return FALSE;
  GtkWidget *focus = gtk_root_get_focus (GTK_ROOT (data));
  if (focus && gtk_widget_get_ancestor (focus, GTK_TYPE_POPOVER)) return FALSE;
  gtk_window_close (GTK_WINDOW (data));
  return TRUE;
}
static void awra_dialog_class_init (AwraDialogClass *klass) { (void) klass; }
static void awra_dialog_init (AwraDialog *self) {
  AwraSurface *surface = awra_window_get_root_surface (AWRA_WINDOW (self));
  g_autoptr (AwraMaterial) material = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_FLOATING);
  awra_surface_set_role (surface, AWRA_SURFACE_ROLE_DIALOG);
  awra_surface_set_material (surface, material);
  awra_surface_set_elevation_level (surface, AWRA_ELEVATION_MODAL);
  gtk_window_set_modal (GTK_WINDOW (self), TRUE);
  GtkEventController *keys = gtk_event_controller_key_new ();
  gtk_event_controller_set_propagation_phase (keys, GTK_PHASE_CAPTURE);
  g_signal_connect (keys, "key-pressed", G_CALLBACK (dialog_key_pressed), self);
  gtk_widget_add_controller (GTK_WIDGET (self), keys);
  /* Dialog width benefits from a calm default measure, but height must remain
   * content-driven.  A fixed default height leaves short forms with a large
   * dead band below their actions and forces every application to compensate. */
  gtk_window_set_default_size (GTK_WINDOW (self), 440, -1);
  gtk_window_set_resizable (GTK_WINDOW (self), FALSE);
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-dialog");
}
GtkWidget *awra_dialog_new (GtkWindow *parent) {
  AwraDialog *self; g_return_val_if_fail (parent == NULL || GTK_IS_WINDOW (parent), NULL);
  self = g_object_new (AWRA_TYPE_DIALOG, NULL);
  if (parent != NULL) { gtk_window_set_transient_for (GTK_WINDOW (self), parent); gtk_window_set_application (GTK_WINDOW (self), gtk_window_get_application (parent)); }
  return g_object_ref (GTK_WIDGET (self));
}
