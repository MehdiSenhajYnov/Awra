/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-dialog.h>

struct _AwraDialog { AwraWindow parent_instance; };
G_DEFINE_FINAL_TYPE (AwraDialog, awra_dialog, AWRA_TYPE_WINDOW)
static void awra_dialog_class_init (AwraDialogClass *klass) { (void) klass; }
static void awra_dialog_init (AwraDialog *self) {
  AwraSurface *surface = awra_window_get_root_surface (AWRA_WINDOW (self));
  g_autoptr (AwraMaterial) material = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_FLOATING);
  awra_surface_set_role (surface, AWRA_SURFACE_ROLE_DIALOG);
  awra_surface_set_material (surface, material);
  awra_surface_set_elevation_level (surface, AWRA_ELEVATION_MODAL);
  gtk_window_set_modal (GTK_WINDOW (self), TRUE);
  gtk_window_set_default_size (GTK_WINDOW (self), 440, 250);
  gtk_window_set_resizable (GTK_WINDOW (self), FALSE);
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-dialog");
}
GtkWidget *awra_dialog_new (GtkWindow *parent) {
  AwraDialog *self; g_return_val_if_fail (parent == NULL || GTK_IS_WINDOW (parent), NULL);
  self = g_object_new (AWRA_TYPE_DIALOG, NULL);
  if (parent != NULL) gtk_window_set_transient_for (GTK_WINDOW (self), parent);
  return GTK_WIDGET (self);
}
