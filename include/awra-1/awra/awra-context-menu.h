/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-popover.h>

G_BEGIN_DECLS

/**
 * awra_widget_set_context_menu_model:
 * @widget: a GTK widget
 * @model: (nullable): the menu model, or %NULL to detach the context menu
 */
void          awra_widget_set_context_menu_model (GtkWidget  *widget,
                                                   GMenuModel *model);
/**
 * awra_widget_get_context_menu_model:
 * @widget: a GTK widget
 *
 * Returns: (transfer none) (nullable): the attached menu model
 */
GMenuModel   *awra_widget_get_context_menu_model (GtkWidget  *widget);
/**
 * awra_widget_get_context_menu_popover:
 * @widget: a GTK widget
 *
 * Returns: (transfer none) (nullable): the framework-owned context popover
 */
AwraPopover  *awra_widget_get_context_menu_popover (GtkWidget *widget);

G_END_DECLS
