/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_TOOLBAR (awra_toolbar_get_type ())
G_DECLARE_FINAL_TYPE (AwraToolbar, awra_toolbar, AWRA, TOOLBAR, GtkWidget)

GtkWidget *awra_toolbar_new               (void);
/**
 * awra_toolbar_get_start_widget:
 * @self: an Awra toolbar
 *
 * Returns: (transfer none) (nullable): the leading group
 */
GtkWidget *awra_toolbar_get_start_widget  (AwraToolbar *self);
/**
 * awra_toolbar_set_start_widget:
 * @self: an Awra toolbar
 * @widget: (nullable): the leading group, or %NULL
 */
void       awra_toolbar_set_start_widget  (AwraToolbar *self,
                                           GtkWidget   *widget);
/**
 * awra_toolbar_get_center_widget:
 * @self: an Awra toolbar
 *
 * Returns: (transfer none) (nullable): the centered group
 */
GtkWidget *awra_toolbar_get_center_widget (AwraToolbar *self);
/**
 * awra_toolbar_set_center_widget:
 * @self: an Awra toolbar
 * @widget: (nullable): the centered group, or %NULL
 */
void       awra_toolbar_set_center_widget (AwraToolbar *self,
                                           GtkWidget   *widget);
/**
 * awra_toolbar_get_end_widget:
 * @self: an Awra toolbar
 *
 * Returns: (transfer none) (nullable): the trailing group
 */
GtkWidget *awra_toolbar_get_end_widget    (AwraToolbar *self);
/**
 * awra_toolbar_set_end_widget:
 * @self: an Awra toolbar
 * @widget: (nullable): the trailing group, or %NULL
 */
void       awra_toolbar_set_end_widget    (AwraToolbar *self,
                                           GtkWidget   *widget);
gboolean   awra_toolbar_get_compact       (AwraToolbar *self);
void       awra_toolbar_set_compact       (AwraToolbar *self,
                                           gboolean     compact);

G_END_DECLS
