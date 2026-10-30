/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gdk/gdk.h>
G_BEGIN_DECLS
/**
 * AwraAspectPaintable:
 *
 * Since: 1.1
 */
#define AWRA_TYPE_ASPECT_PAINTABLE (awra_aspect_paintable_get_type ())
G_DECLARE_FINAL_TYPE (AwraAspectPaintable, awra_aspect_paintable, AWRA, ASPECT_PAINTABLE, GObject)
/**
 * awra_aspect_paintable_new:
 * @paintable: source image or dynamic paintable
 * @aspect_ratio: display width divided by display height, from 0.001 to 1000
 *
 * Adapts intrinsic dimensions without resampling or copying image memory.
 * Useful for non-square pixels and image/document previews. GtkPicture can
 * apply its normal contain/cover policy to the corrected display aspect.
 *
 * Returns: (transfer full): a new aspect-corrected paintable
 *
 * Since: 1.1
 */
AwraAspectPaintable *awra_aspect_paintable_new (GdkPaintable *paintable, double aspect_ratio);
/**
 * awra_aspect_paintable_get_paintable:
 * @self: an aspect paintable
 * Returns: (transfer none) (nullable): the source paintable
 *
 * Since: 1.1
 */
GdkPaintable *awra_aspect_paintable_get_paintable (AwraAspectPaintable *self);
/**
 * awra_aspect_paintable_get_aspect_ratio:
 *
 * Since: 1.1
 */
double awra_aspect_paintable_get_aspect_ratio (AwraAspectPaintable *self);
G_END_DECLS
