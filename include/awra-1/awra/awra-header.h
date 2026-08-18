/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-material.h>

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
/**
 * awra_header_get_center_widget:
 * @self: an Awra header
 *
 * Returns: (transfer none) (nullable): the centered widget
 */
GtkWidget  *awra_header_get_center_widget (AwraHeader *self);
void        awra_header_set_center_widget (AwraHeader *self,
                                           GtkWidget  *widget);
gboolean    awra_header_get_show_window_controls (AwraHeader *self);
void        awra_header_set_show_window_controls (AwraHeader *self,
                                                  gboolean    show_controls);
gboolean    awra_header_get_drag_enabled (AwraHeader *self);
void        awra_header_set_drag_enabled (AwraHeader *self,
                                          gboolean    drag_enabled);
/**
 * awra_header_get_material:
 * @self: an Awra header
 *
 * Returns: (transfer none): the header material
 */
AwraMaterial *awra_header_get_material (AwraHeader *self);
void          awra_header_set_material (AwraHeader   *self,
                                        AwraMaterial *material);
gboolean      awra_header_get_blend_with_window (AwraHeader *self);
void          awra_header_set_blend_with_window (AwraHeader *self,
                                                  gboolean    blend);

G_END_DECLS
