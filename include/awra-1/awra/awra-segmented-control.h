/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_SEGMENTED_CONTROL (awra_segmented_control_get_type ())
G_DECLARE_FINAL_TYPE (AwraSegmentedControl, awra_segmented_control, AWRA, SEGMENTED_CONTROL, GtkWidget)

GtkWidget *awra_segmented_control_new          (void);
guint      awra_segmented_control_append       (AwraSegmentedControl *self,
                                                const char           *label);
guint      awra_segmented_control_get_n_items  (AwraSegmentedControl *self);
guint      awra_segmented_control_get_selected (AwraSegmentedControl *self);
void       awra_segmented_control_set_selected (AwraSegmentedControl *self,
                                                guint                 selected);

G_END_DECLS
