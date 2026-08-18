/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gdk/gdk.h>
#include <awra/awra-enums.h>

G_BEGIN_DECLS

#define AWRA_TYPE_MATERIAL_RESOLUTION (awra_material_resolution_get_type ())
G_DECLARE_FINAL_TYPE (AwraMaterialResolution, awra_material_resolution,
                      AWRA, MATERIAL_RESOLUTION, GObject)

const GdkRGBA *awra_material_resolution_get_fill         (AwraMaterialResolution *self);
const GdkRGBA *awra_material_resolution_get_border       (AwraMaterialResolution *self);
const GdkRGBA *awra_material_resolution_get_highlight    (AwraMaterialResolution *self);
const GdkRGBA *awra_material_resolution_get_shadow       (AwraMaterialResolution *self);
double         awra_material_resolution_get_radius       (AwraMaterialResolution *self);
double         awra_material_resolution_get_border_width (AwraMaterialResolution *self);
AwraSurfaceEdge awra_material_resolution_get_border_edges (AwraMaterialResolution *self);
gboolean       awra_material_resolution_get_request_blur (AwraMaterialResolution *self);
gboolean       awra_material_resolution_get_fallback     (AwraMaterialResolution *self);

G_END_DECLS
