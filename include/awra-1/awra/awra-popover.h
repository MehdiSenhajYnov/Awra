/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-surface.h>

G_BEGIN_DECLS

#define AWRA_TYPE_POPOVER (awra_popover_get_type ())
G_DECLARE_FINAL_TYPE (AwraPopover, awra_popover, AWRA, POPOVER, GtkPopover)

GtkWidget   *awra_popover_new         (void);
/**
 * awra_popover_get_child:
 * @self: an Awra popover
 *
 * Returns: (transfer none) (nullable): the popover content
 */
GtkWidget   *awra_popover_get_child   (AwraPopover *self);
/**
 * awra_popover_set_child:
 * @self: an Awra popover
 * @child: (nullable): popover content, or %NULL
 */
void         awra_popover_set_child   (AwraPopover *self,
                                       GtkWidget    *child);
/**
 * awra_popover_get_surface:
 * @self: an Awra popover
 *
 * Returns: (transfer none): the popover surface
 */
AwraSurface *awra_popover_get_surface (AwraPopover *self);
/**
 * awra_popover_get_menu_model:
 * @self: an Awra popover
 *
 * Returns: (transfer none) (nullable): the menu model
 */
GMenuModel  *awra_popover_get_menu_model (AwraPopover *self);
/**
 * awra_popover_set_menu_model:
 * @self: an Awra popover
 * @model: (nullable): a menu model, or %NULL
 */
void         awra_popover_set_menu_model (AwraPopover *self,
                                          GMenuModel   *model);

G_END_DECLS
