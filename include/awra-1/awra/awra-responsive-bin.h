/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-enums.h>

G_BEGIN_DECLS

#define AWRA_TYPE_RESPONSIVE_BIN (awra_responsive_bin_get_type ())
G_DECLARE_FINAL_TYPE (AwraResponsiveBin, awra_responsive_bin, AWRA, RESPONSIVE_BIN, GtkWidget)

GtkWidget      *awra_responsive_bin_new                (void);
/**
 * awra_responsive_bin_get_child:
 * @self: a responsive bin
 *
 * Returns: (transfer none) (nullable): the contained widget
 */
GtkWidget      *awra_responsive_bin_get_child          (AwraResponsiveBin *self);
/**
 * awra_responsive_bin_set_child:
 * @self: a responsive bin
 * @child: (nullable): the widget to observe and allocate
 */
void            awra_responsive_bin_set_child          (AwraResponsiveBin *self,
                                                         GtkWidget         *child);
AwraLayoutMode  awra_responsive_bin_get_layout_mode    (AwraResponsiveBin *self);
guint           awra_responsive_bin_get_compact_width  (AwraResponsiveBin *self);
void            awra_responsive_bin_set_compact_width  (AwraResponsiveBin *self,
                                                         guint              width);
guint           awra_responsive_bin_get_expanded_width (AwraResponsiveBin *self);
void            awra_responsive_bin_set_expanded_width (AwraResponsiveBin *self,
                                                         guint              width);

G_END_DECLS
