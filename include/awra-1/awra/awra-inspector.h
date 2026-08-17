/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_INSPECTOR (awra_inspector_get_type ())
G_DECLARE_FINAL_TYPE (AwraInspector, awra_inspector, AWRA, INSPECTOR, GtkWidget)

GtkWidget  *awra_inspector_new                       (void);
/**
 * awra_inspector_get_target:
 * @self: an Awra inspector
 *
 * Returns: (transfer full) (nullable): the inspected widget
 */
GtkWidget  *awra_inspector_get_target                (AwraInspector *self);
void        awra_inspector_set_target                (AwraInspector *self,
                                                      GtkWidget     *target);
const char *awra_inspector_get_details               (AwraInspector *self);
void        awra_inspector_refresh                   (AwraInspector *self);
gboolean    awra_inspector_get_effect_region_visible (AwraInspector *self);
void        awra_inspector_set_effect_region_visible (AwraInspector *self,
                                                      gboolean       visible);

G_END_DECLS
