/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gdk/gdk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_FRAME_POOL (awra_frame_pool_get_type ())
G_DECLARE_FINAL_TYPE (AwraFramePool, awra_frame_pool, AWRA, FRAME_POOL,
                      GObject)
#define AWRA_TYPE_FRAME (awra_frame_get_type ())
G_DECLARE_FINAL_TYPE (AwraFrame, awra_frame, AWRA, FRAME, GObject)
/**
 * awra_frame_pool_new:
 * @width: visible width, 1 to 16384
 * @height: visible height, 1 to 16384
 * @format: B8G8R8X8, R8G8B8A8, R8G8B8A8_PREMULTIPLIED, G8_B8_R8_420 (I420),
 *   or G8_B8R8_420 (NV12)
 * @capacity: maximum simultaneously leased frames, 2 to 16
 * @color_state: (nullable): pixel color encoding; sRGB when absent for RGB;
 *   required, with the correct matrix and range, for planar YUV
 *
 * Allocates lazily, with 32-byte aligned planes, strides and padded rows.
 * YUV 4:2:0 formats require even visible width and height.
 * Producers write through an acquired frame's plane addresses and publish it
 * as an immutable GdkTexture. The pool never reuses storage until every frame
 * and texture reference is released. It is independent of decoders and GTK
 * widgets and can be used from producer threads. Acquire never blocks.
 *
 * Returns: (transfer full) (nullable): a new bounded pool, or NULL on invalid
 * input
 */
AwraFramePool *awra_frame_pool_new (guint width, guint height,
                                    GdkMemoryFormat format, guint capacity,
                                    GdkColorState *color_state);
/**
 * awra_frame_pool_acquire:
 * @self: a pool
 * Returns: (transfer full) (nullable): writable storage, or NULL when all
 * frames are retained
 */
AwraFrame *awra_frame_pool_acquire (AwraFramePool *self);
guint awra_frame_pool_get_width (AwraFramePool *self);
guint awra_frame_pool_get_height (AwraFramePool *self);
guint awra_frame_pool_get_capacity (AwraFramePool *self);
guint awra_frame_pool_get_available (AwraFramePool *self);
guint awra_frame_pool_get_n_planes (AwraFramePool *self);
gsize awra_frame_pool_get_stride (AwraFramePool *self, guint plane);
guint awra_frame_pool_get_lines (AwraFramePool *self, guint plane);
gsize awra_frame_pool_get_allocated_bytes (AwraFramePool *self);
/**
 * awra_frame_get_address:
 * @self: a writable frame
 * @plane: plane index
 *
 * Native producer interop. Write at most stride * lines bytes per plane.
 * Never retain or write through this address after publishing/releasing the
 * frame. The returned address is 0 after publishing. Rust consumers must use
 * an unsafe block to dereference the integer address.
 *
 * Returns: a 32-byte aligned address, or 0 when sealed
 */
guint64 awra_frame_get_address (AwraFrame *self, guint plane);
/**
 * awra_frame_create_texture:
 * @self: a completed frame
 *
 * Seals the frame against further producer access. The returned immutable
 * texture retains its plane storage without copying pixels. Repeated calls
 * create views of the same sealed content. Drop the producer frame reference
 * after publishing; textures keep the lease alive independently.
 *
 * Returns: (transfer full) (nullable): a texture, or NULL for an uninitialized
 * frame
 */
GdkTexture *awra_frame_create_texture (AwraFrame *self);
/**
 * awra_frame_copy_scaled:
 * @self: a sealed source frame
 * @destination: a writable destination lease
 *
 * Produces a smaller preview without downloading or converting the original
 * texture. Both pools must have the same format and color state. Bilinear
 * interpolation operates on encoded RGB or YUV planes. The source dimensions
 * must be at least the destination dimensions. The destination remains writable
 * until published. Use one producer per destination; never modify a sealed
 * destination. The original frame and its textures are unchanged.
 *
 * Returns: whether the preview was written
 */
gboolean awra_frame_copy_scaled (AwraFrame *self, AwraFrame *destination);
G_END_DECLS
