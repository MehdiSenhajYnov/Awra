/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_CHECK_BUTTON (awra_check_button_get_type ())
G_DECLARE_FINAL_TYPE (AwraCheckButton, awra_check_button, AWRA, CHECK_BUTTON, GtkCheckButton)
GtkWidget *awra_check_button_new            (void);
GtkWidget *awra_check_button_new_with_label (const char *label);
void       awra_check_button_set_group      (AwraCheckButton *self,
                                             AwraCheckButton *group);
G_END_DECLS

