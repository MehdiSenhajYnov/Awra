/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_SLIDER (awra_slider_get_type ())
G_DECLARE_FINAL_TYPE (AwraSlider, awra_slider, AWRA, SLIDER, GtkScale)
GtkWidget *awra_slider_new_with_range (GtkOrientation orientation,
                                       double minimum,
                                       double maximum,
                                       double step);
G_END_DECLS

