/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-popover.h>

G_BEGIN_DECLS

#define AWRA_TYPE_MENU_BUTTON (awra_menu_button_get_type ())
G_DECLARE_FINAL_TYPE (AwraMenuButton, awra_menu_button, AWRA, MENU_BUTTON, GtkWidget)

GtkWidget    *awra_menu_button_new         (void);
const char   *awra_menu_button_get_label   (AwraMenuButton *self);
void          awra_menu_button_set_label   (AwraMenuButton *self,
                                             const char     *label);
/**
 * awra_menu_button_get_popover:
 * @self: an Awra menu button
 *
 * Returns: (transfer none) (nullable): the anchored Awra popover
 */
AwraPopover  *awra_menu_button_get_popover (AwraMenuButton *self);
/**
 * awra_menu_button_set_popover:
 * @self: an Awra menu button
 * @popover: (nullable): the anchored popover, or %NULL
 */
void          awra_menu_button_set_popover (AwraMenuButton *self,
                                             AwraPopover    *popover);
void          awra_menu_button_popup       (AwraMenuButton *self);
void          awra_menu_button_popdown     (AwraMenuButton *self);
/**
 * awra_menu_button_set_menu_model:
 * @self: an Awra menu button
 * @model: (nullable): a menu model, or %NULL
 */
void          awra_menu_button_set_menu_model (AwraMenuButton *self,
                                                GMenuModel     *model);

G_END_DECLS
