/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_LIST_VIEW (awra_list_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraListView, awra_list_view, AWRA, LIST_VIEW, GtkWidget)

GtkWidget         *awra_list_view_new          (GtkSelectionModel *model,
                                                GtkListItemFactory *factory);
/**
 * awra_list_view_get_model:
 * @self: an Awra list view
 *
 * Returns: (transfer none) (nullable): the selection model
 */
GtkSelectionModel *awra_list_view_get_model    (AwraListView *self);
void               awra_list_view_set_model    (AwraListView       *self,
                                                GtkSelectionModel  *model);
/**
 * awra_list_view_get_factory:
 * @self: an Awra list view
 *
 * Returns: (transfer none) (nullable): the item factory
 */
GtkListItemFactory *awra_list_view_get_factory (AwraListView *self);
void                awra_list_view_set_factory (AwraListView       *self,
                                                GtkListItemFactory *factory);
/**
 * awra_list_view_get_delegate:
 * @self: an Awra list view
 *
 * Returns: (transfer none): the underlying GTK list view
 */
GtkListView        *awra_list_view_get_delegate (AwraListView *self);

G_END_DECLS
