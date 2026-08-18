/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-enums.h>

G_BEGIN_DECLS

/**
 * awra_spacing_resolve:
 * @widget: a widget on the target display
 * @spacing: a semantic spacing token
 *
 * Resolves a semantic spacing token to logical pixels for @widget's Awra
 * context. Scaling remains owned by GTK/GDK.
 *
 * Returns: the resolved spacing in logical pixels
 */
int  awra_spacing_resolve                 (GtkWidget        *widget,
                                           AwraSpacing       spacing);
void awra_widget_set_margin               (GtkWidget        *widget,
                                           AwraSpacing       spacing);
void awra_widget_set_horizontal_margin    (GtkWidget        *widget,
                                           AwraSpacing       spacing);
void awra_widget_set_vertical_margin      (GtkWidget        *widget,
                                           AwraSpacing       spacing);
void awra_box_set_spacing                 (GtkBox           *box,
                                           AwraSpacing       spacing);
void awra_grid_set_spacing                (GtkGrid          *grid,
                                           AwraSpacing       row_spacing,
                                           AwraSpacing       column_spacing);
void awra_box_apply_layout_preset         (GtkBox           *box,
                                           AwraLayoutPreset  preset);
void awra_grid_apply_layout_preset        (GtkGrid          *grid,
                                           AwraLayoutPreset  preset);

G_END_DECLS
