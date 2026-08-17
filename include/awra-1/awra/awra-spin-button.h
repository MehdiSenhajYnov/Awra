/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_SPIN_BUTTON (awra_spin_button_get_type ())
G_DECLARE_FINAL_TYPE (AwraSpinButton, awra_spin_button, AWRA, SPIN_BUTTON, GtkWidget)
GtkWidget     *awra_spin_button_new_with_range (double minimum,
                                                double maximum,
                                                double step);
double         awra_spin_button_get_value      (AwraSpinButton *self);
void           awra_spin_button_set_value      (AwraSpinButton *self,
                                                double value);
/**
 * awra_spin_button_get_delegate:
 * @self: an Awra spin button
 *
 * Returns: (transfer none): the underlying GTK spin button
 */
GtkSpinButton *awra_spin_button_get_delegate   (AwraSpinButton *self);
G_END_DECLS
