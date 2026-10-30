/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gdk/gdk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_TEXTURE_STREAM (awra_texture_stream_get_type ())
G_DECLARE_FINAL_TYPE (AwraTextureStream, awra_texture_stream, AWRA,
                      TEXTURE_STREAM, GObject)
/**
 * awra_texture_stream_new:
 *
 * A persistent GdkPaintable for live immutable textures. It invalidates
 * content on each frame, and size only when dimensions/display aspect actually
 * change, avoiding a GTK layout pass for every video/camera frame. It may feed
 * multiple widgets. Publish on the widgets' main context; producer textures
 * may be built on worker threads. get_current_image() returns an immutable
 * snapshot. Uses linear GPU sampling, avoiding per-frame CPU mipmap generation
 * when displaying large live textures at smaller sizes. Source pixels stay
 * intact.
 *
 * Returns: (transfer full): an empty live paintable
 */
AwraTextureStream *awra_texture_stream_new (void);
/**
 * awra_texture_stream_set_frame:
 * @self: a stream
 * @texture: (nullable): the next immutable frame, or NULL to clear
 * @aspect_ratio: display width / height (.001 to 1000), or 0 for pixel
 * dimensions
 */
void awra_texture_stream_set_frame (AwraTextureStream *self,
                                    GdkTexture *texture, double aspect_ratio);
/**
 * awra_texture_stream_get_texture:
 * @self: a stream
 * Returns: (transfer none) (nullable): the latest source texture
 */
GdkTexture *awra_texture_stream_get_texture (AwraTextureStream *self);
G_END_DECLS
