/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_SWITCH (awra_switch_get_type ())
G_DECLARE_FINAL_TYPE (AwraSwitch, awra_switch, AWRA, SWITCH, GtkWidget)
GtkWidget *awra_switch_new          (void);
gboolean   awra_switch_get_active   (AwraSwitch *self);
void       awra_switch_set_active   (AwraSwitch *self, gboolean active);
/**
 * awra_switch_get_delegate:
 * @self: an Awra switch
 *
 * Returns: (transfer none): the underlying GTK switch
 */
GtkSwitch *awra_switch_get_delegate (AwraSwitch *self);
G_END_DECLS
