/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_MASTER_DETAIL (awra_master_detail_get_type ())
G_DECLARE_FINAL_TYPE (AwraMasterDetail, awra_master_detail,
                      AWRA, MASTER_DETAIL, GtkWidget)

GtkWidget            *awra_master_detail_new              (void);
/**
 * awra_master_detail_get_master:
 * @self: a master/detail view
 *
 * Returns: (transfer none) (nullable): the master widget
 */
GtkWidget            *awra_master_detail_get_master       (AwraMasterDetail    *self);
/**
 * awra_master_detail_set_master:
 * @self: a master/detail view
 * @master: (nullable): the master widget, or %NULL
 */
void                  awra_master_detail_set_master       (AwraMasterDetail    *self,
                                                           GtkWidget           *master);
/**
 * awra_master_detail_get_detail:
 * @self: a master/detail view
 *
 * Returns: (transfer none) (nullable): the detail widget
 */
GtkWidget            *awra_master_detail_get_detail       (AwraMasterDetail    *self);
/**
 * awra_master_detail_set_detail:
 * @self: a master/detail view
 * @detail: (nullable): the detail widget, or %NULL
 */
void                  awra_master_detail_set_detail       (AwraMasterDetail    *self,
                                                           GtkWidget           *detail);
guint                 awra_master_detail_get_master_width (AwraMasterDetail    *self);
void                  awra_master_detail_set_master_width (AwraMasterDetail    *self,
                                                           guint                width);
AwraLayoutMode        awra_master_detail_get_layout_mode  (AwraMasterDetail    *self);
AwraMasterDetailPane  awra_master_detail_get_visible_pane (AwraMasterDetail    *self);
void                  awra_master_detail_set_visible_pane (AwraMasterDetail    *self,
                                                           AwraMasterDetailPane pane);
void                  awra_master_detail_show_master      (AwraMasterDetail    *self);
void                  awra_master_detail_show_detail      (AwraMasterDetail    *self);

G_END_DECLS
