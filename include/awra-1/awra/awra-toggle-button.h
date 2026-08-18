/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
#include <awra/awra-enums.h>
G_BEGIN_DECLS
#define AWRA_TYPE_TOGGLE_BUTTON (awra_toggle_button_get_type ())
G_DECLARE_FINAL_TYPE (AwraToggleButton, awra_toggle_button, AWRA, TOGGLE_BUTTON, GtkToggleButton)
GtkWidget *awra_toggle_button_new (void);
GtkWidget *awra_toggle_button_new_with_label (const char *label);
AwraButtonAppearance awra_toggle_button_get_appearance (AwraToggleButton *self);
void awra_toggle_button_set_appearance (AwraToggleButton      *self,
                                        AwraButtonAppearance   appearance);
G_END_DECLS
