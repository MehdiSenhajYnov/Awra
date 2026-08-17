/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-enums.h>

G_BEGIN_DECLS

#define AWRA_TYPE_SPLIT_VIEW (awra_split_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraSplitView, awra_split_view, AWRA, SPLIT_VIEW, GtkWidget)

GtkWidget      *awra_split_view_new              (void);
/**
 * awra_split_view_get_sidebar:
 * @self: an Awra split view
 *
 * Returns: (transfer none) (nullable): the sidebar
 */
GtkWidget      *awra_split_view_get_sidebar      (AwraSplitView *self);
/**
 * awra_split_view_set_sidebar:
 * @self: an Awra split view
 * @sidebar: (nullable): the sidebar, or %NULL
 */
void            awra_split_view_set_sidebar      (AwraSplitView *self,
                                                   GtkWidget     *sidebar);
/**
 * awra_split_view_get_content:
 * @self: an Awra split view
 *
 * Returns: (transfer none) (nullable): the main content
 */
GtkWidget      *awra_split_view_get_content      (AwraSplitView *self);
/**
 * awra_split_view_set_content:
 * @self: an Awra split view
 * @content: (nullable): the main content, or %NULL
 */
void            awra_split_view_set_content      (AwraSplitView *self,
                                                   GtkWidget     *content);
gboolean        awra_split_view_get_show_sidebar (AwraSplitView *self);
void            awra_split_view_set_show_sidebar (AwraSplitView *self,
                                                   gboolean       show_sidebar);
AwraLayoutMode  awra_split_view_get_layout_mode  (AwraSplitView *self);
guint           awra_split_view_get_compact_width (AwraSplitView *self);
void            awra_split_view_set_compact_width (AwraSplitView *self,
                                                    guint          width);
guint           awra_split_view_get_expanded_width (AwraSplitView *self);
void            awra_split_view_set_expanded_width (AwraSplitView *self,
                                                     guint          width);

G_END_DECLS
