/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_VOLUME_CONTROL (awra_volume_control_get_type ())
G_DECLARE_FINAL_TYPE (AwraVolumeControl, awra_volume_control, AWRA, VOLUME_CONTROL, GtkWidget)

GtkWidget *awra_volume_control_new                  (void);
double     awra_volume_control_get_volume           (AwraVolumeControl *self);
void       awra_volume_control_set_volume           (AwraVolumeControl *self,
                                                     double             volume);
gboolean   awra_volume_control_get_muted            (AwraVolumeControl *self);
void       awra_volume_control_set_muted            (AwraVolumeControl *self,
                                                     gboolean           muted);
double     awra_volume_control_get_effective_volume (AwraVolumeControl *self);
/**
 * awra_volume_control_get_slider:
 * @self: an Awra volume control
 *
 * Returns: (transfer none): the GTK range used for the level
 */
GtkRange  *awra_volume_control_get_slider           (AwraVolumeControl *self);

G_END_DECLS
