/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_DROPDOWN (awra_dropdown_get_type ())
G_DECLARE_FINAL_TYPE (AwraDropdown, awra_dropdown, AWRA, DROPDOWN, GtkWidget)
GtkWidget   *awra_dropdown_new             (GListModel   *model,
                                            GtkExpression *expression);
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
 * Returns: (transfer none): the underlying GTK dropdown
 */
GtkDropDown *awra_dropdown_get_delegate    (AwraDropdown *self);
G_END_DECLS
