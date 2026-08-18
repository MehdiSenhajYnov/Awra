/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
#include <awra/awra-popover.h>
G_BEGIN_DECLS
#define AWRA_TYPE_DROPDOWN (awra_dropdown_get_type ())
G_DECLARE_FINAL_TYPE (AwraDropdown, awra_dropdown, AWRA, DROPDOWN, GtkWidget)
/**
 * awra_dropdown_new:
 * @model: (nullable): the list model, or %NULL
 * @expression: (nullable): an expression used to obtain display text
 *
 * Returns: (transfer none): a new floating-reference Awra dropdown
 */
GtkWidget   *awra_dropdown_new             (GListModel   *model,
                                            GtkExpression *expression);
/**
 * awra_dropdown_new_from_strings:
 * @strings: (array zero-terminated=1): a %NULL-terminated string array
 *
 * Returns: (transfer none): a new floating-reference Awra dropdown
 */
GtkWidget   *awra_dropdown_new_from_strings (const char *const *strings);
/**
 * awra_dropdown_get_model:
 * @self: an Awra dropdown
 *
 * Returns: (transfer none) (nullable): the dropdown model
 */
GListModel  *awra_dropdown_get_model       (AwraDropdown *self);
/**
 * awra_dropdown_set_model:
 * @self: an Awra dropdown
 * @model: (nullable): a list model, or %NULL
 */
void         awra_dropdown_set_model       (AwraDropdown *self,
                                            GListModel   *model);
guint        awra_dropdown_get_selected    (AwraDropdown *self);
void         awra_dropdown_set_selected    (AwraDropdown *self,
                                            guint         position);
/**
 * awra_dropdown_get_delegate:
 * @self: an Awra dropdown
 *
 * Returns the compatibility GTK selection delegate. The delegate is not
 * rendered; Awra owns the visible button and its Floating popup.
 *
 * Returns: (transfer none): the non-rendered GTK selection delegate
 */
GtkDropDown *awra_dropdown_get_delegate    (AwraDropdown *self);
/**
 * awra_dropdown_get_popover:
 * @self: an Awra dropdown
 *
 * Returns: (transfer none): the Floating Awra popup
 */
AwraPopover *awra_dropdown_get_popover     (AwraDropdown *self);
void         awra_dropdown_popup           (AwraDropdown *self);
void         awra_dropdown_popdown         (AwraDropdown *self);
G_END_DECLS
