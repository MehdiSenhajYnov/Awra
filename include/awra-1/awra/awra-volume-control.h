/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

/**
 * AwraVolumeControl:
 *
 * Since: 1.1
 */
#define AWRA_TYPE_VOLUME_CONTROL (awra_volume_control_get_type ())
G_DECLARE_FINAL_TYPE (AwraVolumeControl, awra_volume_control, AWRA, VOLUME_CONTROL, GtkWidget)

/**
 * awra_volume_control_new:
 *
 * Since: 1.1
 */
GtkWidget *awra_volume_control_new                  (void);
/**
 * awra_volume_control_get_volume:
 *
 * Since: 1.1
 */
double     awra_volume_control_get_volume           (AwraVolumeControl *self);
/**
 * awra_volume_control_set_volume:
 *
 * Since: 1.1
 */
void       awra_volume_control_set_volume           (AwraVolumeControl *self,
                                                     double             volume);
/**
 * awra_volume_control_get_muted:
 *
 * Since: 1.1
 */
gboolean   awra_volume_control_get_muted            (AwraVolumeControl *self);
/**
 * awra_volume_control_set_muted:
 *
 * Since: 1.1
 */
void       awra_volume_control_set_muted            (AwraVolumeControl *self,
                                                     gboolean           muted);
/**
 * awra_volume_control_get_effective_volume:
 *
 * Since: 1.1
 */
double     awra_volume_control_get_effective_volume (AwraVolumeControl *self);
/**
 * awra_volume_control_get_slider:
 * @self: an Awra volume control
 *
 * Returns: (transfer none): the GTK range used for the level
 *
 * Since: 1.1
 */
GtkRange  *awra_volume_control_get_slider           (AwraVolumeControl *self);

G_END_DECLS
