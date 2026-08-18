/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_DATA_COLUMN (awra_data_column_get_type ())
G_DECLARE_FINAL_TYPE (AwraDataColumn, awra_data_column,
                      AWRA, DATA_COLUMN, GObject)

/**
 * awra_data_column_new:
 * @title: (nullable): the column title
 * @factory: (nullable): the virtualized cell factory
 */
AwraDataColumn      *awra_data_column_new             (const char         *title,
                                                       GtkListItemFactory *factory);
const char          *awra_data_column_get_title       (AwraDataColumn     *self);
void                 awra_data_column_set_title       (AwraDataColumn     *self,
                                                       const char         *title);
/**
 * awra_data_column_get_factory:
 * Returns: (transfer none) (nullable): the cell factory
 */
GtkListItemFactory  *awra_data_column_get_factory     (AwraDataColumn     *self);
/**
 * awra_data_column_set_factory:
 * @factory: (nullable): the virtualized cell factory
 */
void                 awra_data_column_set_factory     (AwraDataColumn     *self,
                                                       GtkListItemFactory *factory);
/**
 * awra_data_column_get_sorter:
 * Returns: (transfer none) (nullable): the column sorter
 */
GtkSorter           *awra_data_column_get_sorter      (AwraDataColumn     *self);
/**
 * awra_data_column_set_sorter:
 * @sorter: (nullable): the column sorter
 */
void                 awra_data_column_set_sorter      (AwraDataColumn     *self,
                                                       GtkSorter          *sorter);
GtkAlign             awra_data_column_get_alignment   (AwraDataColumn     *self);
void                 awra_data_column_set_alignment   (AwraDataColumn     *self,
                                                       GtkAlign            alignment);
int                  awra_data_column_get_fixed_width (AwraDataColumn     *self);
void                 awra_data_column_set_fixed_width (AwraDataColumn     *self,
                                                       int                 width);
gboolean             awra_data_column_get_expand      (AwraDataColumn     *self);
void                 awra_data_column_set_expand      (AwraDataColumn     *self,
                                                       gboolean            expand);
gboolean             awra_data_column_get_resizable   (AwraDataColumn     *self);
void                 awra_data_column_set_resizable   (AwraDataColumn     *self,
                                                       gboolean            resizable);
void                 awra_data_column_apply_alignment (AwraDataColumn     *self,
                                                       GtkWidget          *cell);
/**
 * awra_data_column_get_delegate:
 * @self: a data column
 *
 * Returns: (transfer none): the underlying GTK column
 */
GtkColumnViewColumn *awra_data_column_get_delegate    (AwraDataColumn     *self);

G_END_DECLS
