/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-data-column.h>
#include <awra/awra-enums.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_DATA_VIEW (awra_data_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraDataView, awra_data_view,
                      AWRA, DATA_VIEW, GtkWidget)

/**
 * awra_data_view_new:
 * @model: (nullable): the GTK selection model
 */
GtkWidget         *awra_data_view_new                 (GtkSelectionModel *model);
/**
 * awra_data_view_get_model:
 * Returns: (transfer none) (nullable): the GTK selection model
 */
GtkSelectionModel *awra_data_view_get_model           (AwraDataView      *self);
/**
 * awra_data_view_set_model:
 * @model: (nullable): the GTK selection model
 */
void               awra_data_view_set_model           (AwraDataView      *self,
                                                       GtkSelectionModel *model);
void               awra_data_view_append_column       (AwraDataView      *self,
                                                       AwraDataColumn    *column);
void               awra_data_view_insert_column       (AwraDataView      *self,
                                                       AwraDataColumn    *column,
                                                       guint              position);
void               awra_data_view_remove_column       (AwraDataView      *self,
                                                       AwraDataColumn    *column);
guint              awra_data_view_get_n_columns       (AwraDataView      *self);
/**
 * awra_data_view_get_column:
 * @self: a data view
 * @position: a column index
 *
 * Returns: (transfer none) (nullable): the column at @position
 */
AwraDataColumn    *awra_data_view_get_column          (AwraDataView      *self,
                                                       guint              position);
AwraDataViewState  awra_data_view_get_state           (AwraDataView      *self);
void               awra_data_view_set_state           (AwraDataView      *self,
                                                       AwraDataViewState  state);
/**
 * awra_data_view_get_empty_widget:
 * Returns: (transfer none) (nullable): the empty-state widget
 */
GtkWidget         *awra_data_view_get_empty_widget    (AwraDataView      *self);
/**
 * awra_data_view_set_empty_widget:
 * @widget: (nullable): replacement empty state, or %NULL
 */
void               awra_data_view_set_empty_widget    (AwraDataView      *self,
                                                       GtkWidget         *widget);
/**
 * awra_data_view_get_loading_widget:
 * Returns: (transfer none) (nullable): the loading-state widget
 */
GtkWidget         *awra_data_view_get_loading_widget  (AwraDataView      *self);
/**
 * awra_data_view_set_loading_widget:
 * @widget: (nullable): replacement loading state, or %NULL
 */
void               awra_data_view_set_loading_widget  (AwraDataView      *self,
                                                       GtkWidget         *widget);
/**
 * awra_data_view_get_error_widget:
 * Returns: (transfer none) (nullable): the error-state widget
 */
GtkWidget         *awra_data_view_get_error_widget    (AwraDataView      *self);
/**
 * awra_data_view_set_error_widget:
 * @widget: (nullable): replacement error state, or %NULL
 */
void               awra_data_view_set_error_widget    (AwraDataView      *self,
                                                       GtkWidget         *widget);
gboolean           awra_data_view_get_loading_more    (AwraDataView      *self);
void               awra_data_view_set_loading_more    (AwraDataView      *self,
                                                       gboolean           loading_more);
/**
 * awra_data_view_get_delegate:
 * Returns: (transfer none): the underlying virtualized GTK column view
 */
GtkColumnView     *awra_data_view_get_delegate        (AwraDataView      *self);

G_END_DECLS
