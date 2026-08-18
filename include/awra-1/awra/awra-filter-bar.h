/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_FILTER_BAR (awra_filter_bar_get_type ())
G_DECLARE_FINAL_TYPE (AwraFilterBar, awra_filter_bar,
                      AWRA, FILTER_BAR, GtkWidget)

GtkWidget *awra_filter_bar_new              (void);
/**
 * awra_filter_bar_get_search:
 * @self: a filter bar
 *
 * Returns: (transfer none) (nullable): the search control
 */
GtkWidget *awra_filter_bar_get_search       (AwraFilterBar *self);
/**
 * awra_filter_bar_set_search:
 * @self: a filter bar
 * @search: (nullable): the search control, or %NULL
 */
void       awra_filter_bar_set_search       (AwraFilterBar *self,
                                             GtkWidget     *search);
void       awra_filter_bar_append_filter    (AwraFilterBar *self,
                                             GtkWidget     *filter);
void       awra_filter_bar_insert_filter    (AwraFilterBar *self,
                                             GtkWidget     *filter,
                                             guint          position);
void       awra_filter_bar_remove_filter    (AwraFilterBar *self,
                                             GtkWidget     *filter);
guint      awra_filter_bar_get_n_filters    (AwraFilterBar *self);
/**
 * awra_filter_bar_get_filter:
 * @self: a filter bar
 * @position: a filter index
 *
 * Returns: (transfer none) (nullable): the filter at @position
 */
GtkWidget *awra_filter_bar_get_filter       (AwraFilterBar *self,
                                             guint          position);
/**
 * awra_filter_bar_get_summary:
 * @self: a filter bar
 *
 * Returns: (transfer none) (nullable): the result summary
 */
GtkWidget *awra_filter_bar_get_summary      (AwraFilterBar *self);
/**
 * awra_filter_bar_set_summary:
 * @self: a filter bar
 * @summary: (nullable): the result summary, or %NULL
 */
void       awra_filter_bar_set_summary      (AwraFilterBar *self,
                                             GtkWidget     *summary);
/**
 * awra_filter_bar_get_reset_widget:
 * @self: a filter bar
 *
 * Returns: (transfer none) (nullable): the reset control
 */
GtkWidget *awra_filter_bar_get_reset_widget (AwraFilterBar *self);
/**
 * awra_filter_bar_set_reset_widget:
 * @self: a filter bar
 * @reset_widget: (nullable): the reset control, or %NULL
 */
void       awra_filter_bar_set_reset_widget (AwraFilterBar *self,
                                             GtkWidget     *reset_widget);
gboolean   awra_filter_bar_get_compact      (AwraFilterBar *self);

G_END_DECLS
