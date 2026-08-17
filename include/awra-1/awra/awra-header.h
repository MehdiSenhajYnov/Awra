/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_HEADER (awra_header_get_type ())
G_DECLARE_FINAL_TYPE (AwraHeader, awra_header, AWRA, HEADER, GtkWidget)

GtkWidget  *awra_header_new            (void);
const char *awra_header_get_title      (AwraHeader *self);
void        awra_header_set_title      (AwraHeader *self,
                                        const char *title);
const char *awra_header_get_subtitle   (AwraHeader *self);
void        awra_header_set_subtitle   (AwraHeader *self,
                                        const char *subtitle);
/**
 * awra_header_get_start_widget:
 * @self: an Awra header
 *
 * Returns: (transfer none) (nullable): the leading widget
 */
GtkWidget  *awra_header_get_start_widget (AwraHeader *self);
/**
 * awra_header_set_start_widget:
 * @self: an Awra header
 * @widget: (nullable): the leading widget, or %NULL
 */
void        awra_header_set_start_widget (AwraHeader *self,
                                          GtkWidget  *widget);
/**
 * awra_header_get_end_widget:
 * @self: an Awra header
 *
 * Returns: (transfer none) (nullable): the trailing widget
 */
GtkWidget  *awra_header_get_end_widget (AwraHeader *self);
/**
 * awra_header_set_end_widget:
 * @self: an Awra header
 * @widget: (nullable): the trailing widget, or %NULL
 */
void        awra_header_set_end_widget (AwraHeader *self,
                                        GtkWidget  *widget);

G_END_DECLS
