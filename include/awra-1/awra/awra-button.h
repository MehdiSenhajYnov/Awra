/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_BUTTON (awra_button_get_type ())
G_DECLARE_FINAL_TYPE (AwraButton, awra_button, AWRA, BUTTON, GtkButton)

GtkWidget *awra_button_new             (void);
GtkWidget *awra_button_new_with_label  (const char *label);
GtkWidget *awra_button_new_from_icon_name (const char *icon_name);

G_END_DECLS

