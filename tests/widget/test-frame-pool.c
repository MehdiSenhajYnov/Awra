/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra.h>
#include <stdint.h>
#include <string.h>
static void
fill_rgb (AwraFrame *frame, AwraFramePool *pool, guint8 red)
{
  guint8 *pixels = (guint8 *)(uintptr_t)awra_frame_get_address (frame, 0);
  g_assert_cmpuint ((uintptr_t)pixels % 32, ==, 0);
  for (guint y = 0; y < awra_frame_pool_get_height (pool); y++)
    for (guint x = 0; x < awra_frame_pool_get_width (pool); x++)
      {
        guint8 *p = pixels + y * awra_frame_pool_get_stride (pool, 0) + x * 4;
        p[0] = red;
        p[1] = 20;
        p[2] = 30;
        p[3] = 255;
      }
}
static void
assert_red (GdkTexture *texture, guint8 red)
{
  guint8 result[4 * 4 * 2];
  gdk_texture_download (texture, result, 16);
#if G_BYTE_ORDER == G_LITTLE_ENDIAN
  g_assert_cmpuint (result[2], ==, red);
#else
  g_assert_cmpuint (result[1], ==, red);
#endif
}
static void
test_leases (void)
{
  AwraFramePool *pool
      = awra_frame_pool_new (4, 2, GDK_MEMORY_R8G8B8A8, 2, NULL);
  g_assert_cmpuint (awra_frame_pool_get_available (pool), ==, 2);
  AwraFrame *a = awra_frame_pool_acquire (pool),
            *b = awra_frame_pool_acquire (pool);
  g_assert_null (awra_frame_pool_acquire (pool));
  fill_rgb (a, pool, 100);
  fill_rgb (b, pool, 200);
  GdkTexture *ta = awra_frame_create_texture (a),
             *tb = awra_frame_create_texture (b);
  g_assert_cmpuint (awra_frame_get_address (a, 0), ==, 0);
  g_object_unref (a);
  g_object_unref (b);
  g_assert_cmpuint (awra_frame_pool_get_available (pool), ==, 0);
  assert_red (ta, 100);
  assert_red (tb, 200);
  g_object_unref (ta);
  g_assert_cmpuint (awra_frame_pool_get_available (pool), ==, 1);
  AwraFrame *c = awra_frame_pool_acquire (pool);
  fill_rgb (c, pool, 50);
  assert_red (tb, 200);
  g_object_unref (c);
  GWeakRef weak;
  g_weak_ref_init (&weak, pool);
  g_object_unref (pool);
  assert_red (tb,
              200); /* texture survives its producer and external pool owner */
  g_object_unref (tb);
  g_assert_null (g_weak_ref_get (&weak));
  g_weak_ref_clear (&weak);
}
typedef struct
{
  AwraFramePool *pool;
  GAsyncQueue *queue;
} Producer;
static gpointer
produce (gpointer data)
{
  Producer *p = data;
  for (guint n = 0; n < 200; n++)
    {
      AwraFrame *frame;
      while (!(frame = awra_frame_pool_acquire (p->pool)))
        g_thread_yield ();
      fill_rgb (frame, p->pool, n);
      GdkTexture *texture = awra_frame_create_texture (frame);
      g_object_unref (frame);
      g_async_queue_push (p->queue, texture);
    }
  return NULL;
}
static void
test_threads (void)
{
  Producer p = { awra_frame_pool_new (4, 2, GDK_MEMORY_R8G8B8A8, 2, NULL),
                 g_async_queue_new () };
  GThread *thread = g_thread_new ("frame-producer", produce, &p);
  for (guint n = 0; n < 200; n++)
    {
      GdkTexture *texture = g_async_queue_pop (p.queue);
      assert_red (texture, n);
      g_object_unref (texture);
    }
  g_thread_join (thread);
  g_assert_cmpuint (awra_frame_pool_get_available (p.pool), ==, 2);
  g_assert_cmpuint (awra_frame_pool_get_allocated_bytes (p.pool), <=,
                    2 * 32 * 32);
  g_object_unref (p.pool);
  g_async_queue_unref (p.queue);
}
static void
test_yuv_format (GdkMemoryFormat format)
{
  GdkCicpParams *params = gdk_cicp_params_new ();
  gdk_cicp_params_set_color_primaries (params, 1);
  gdk_cicp_params_set_transfer_function (params, 1);
  gdk_cicp_params_set_matrix_coefficients (params, 1);
  gdk_cicp_params_set_range (params, GDK_CICP_RANGE_NARROW);
  GError *error = NULL;
  GdkColorState *color = gdk_cicp_params_build_color_state (params, &error);
  g_assert_no_error (error);
  AwraFramePool *pool = awra_frame_pool_new (4, 4, format, 2, color);
  for (guint sample = 0; sample < 3; sample++)
    {
      guint8 values[3] = { sample == 0   ? 16
                           : sample == 1 ? 235
                                         : 63,
                           sample == 2 ? 102 : 128, sample == 2 ? 240 : 128 };
      AwraFrame *frame = awra_frame_pool_acquire (pool);
      for (guint plane = 0; plane < awra_frame_pool_get_n_planes (pool);
           plane++)
        {
          g_assert_cmpuint (awra_frame_get_address (frame, plane) % 32, ==, 0);
          guint8 *data
              = (guint8 *)(uintptr_t)awra_frame_get_address (frame, plane);
          gsize bytes = awra_frame_pool_get_stride (pool, plane)
                        * awra_frame_pool_get_lines (pool, plane);
          for (gsize i = 0; i < bytes; i++)
            data[i] = format == GDK_MEMORY_G8_B8R8_420 && plane == 1
                          ? values[1 + (i % 2)]
                          : values[plane];
        }
      GdkTexture *texture = awra_frame_create_texture (frame);
      AwraFramePool *small_pool = awra_frame_pool_new (2, 2, format, 2, color);
      AwraFrame *small = awra_frame_pool_acquire (small_pool);
      g_assert_true (awra_frame_copy_scaled (frame, small));
      GdkTexture *small_texture = awra_frame_create_texture (small);
      guint8 reduced[16];
      gdk_texture_download (small_texture, reduced, 8);
      guint8 pixel[64];
      gdk_texture_download (texture, pixel, 16);
      for (guint channel = 0; channel < 4; channel++)
        g_assert_cmpint (abs ((int)pixel[channel] - reduced[channel]), <=, 1);
      g_assert_false (awra_frame_copy_scaled (frame, small));
      g_object_unref (small_texture);
      g_object_unref (small);
      g_object_unref (small_pool);
#if G_BYTE_ORDER == G_LITTLE_ENDIAN
      guint8 red = pixel[2], green = pixel[1], blue = pixel[0];
#else
      guint8 red = pixel[1], green = pixel[2], blue = pixel[3];
#endif
      if (sample == 0)
        {
          g_assert_cmpuint (red, <=, 2);
          g_assert_cmpuint (green, <=, 2);
        }
      if (sample == 1)
        {
          g_assert_cmpuint (red, >=, 250);
          g_assert_cmpuint (green, >=, 250);
        }
      if (sample == 2)
        {
          g_assert_cmpuint (red, >=, 245);
          g_assert_cmpuint (green, <=, 12);
          g_assert_cmpuint (blue, <=, 12);
        }
      g_object_unref (frame);
      g_object_unref (texture);
    }
  g_object_unref (pool);
  gdk_color_state_unref (color);
  g_object_unref (params);
}
static void
test_yuv (void)
{
  test_yuv_format (GDK_MEMORY_G8_B8_R8_420);
  test_yuv_format (GDK_MEMORY_G8_B8R8_420);
}
static void
invalidated (GdkPaintable *paintable, guint *count)
{
  (void)paintable;
  (*count)++;
}
static void
test_scaled_rgb (void)
{
  AwraFramePool *src
      = awra_frame_pool_new (4, 2, GDK_MEMORY_R8G8B8A8, 2, NULL);
  AwraFramePool *dst
      = awra_frame_pool_new (2, 1, GDK_MEMORY_R8G8B8A8, 2, NULL);
  AwraFrame *a = awra_frame_pool_acquire (src),
            *b = awra_frame_pool_acquire (dst);
  fill_rgb (a, src, 0);
  guint8 *data = (guint8 *)(uintptr_t)awra_frame_get_address (a, 0);
  for (guint y = 0; y < 2; y++)
    for (guint x = 0; x < 4; x++)
      data[y * awra_frame_pool_get_stride (src, 0) + 4 * x] = x * 80;
  g_assert_false (awra_frame_copy_scaled (a, b)); /* source must be sealed */
  GdkTexture *original = awra_frame_create_texture (a);
  g_assert_true (awra_frame_copy_scaled (a, b));
  GdkTexture *preview = awra_frame_create_texture (b);
  guint8 pixels[8];
  gdk_texture_download (preview, pixels, 8);
#if G_BYTE_ORDER == G_LITTLE_ENDIAN
  g_assert_cmpuint (pixels[2], ==, 40);
  g_assert_cmpuint (pixels[6], ==, 200);
#else
  g_assert_cmpuint (pixels[1], ==, 40);
  g_assert_cmpuint (pixels[5], ==, 200);
#endif
  assert_red (original, 0);
  g_object_unref (original);
  g_object_unref (preview);
  g_object_unref (a);
  g_object_unref (b);
  g_object_unref (src);
  g_object_unref (dst);
}
static void
test_stream (void)
{
  AwraFramePool *pool
      = awra_frame_pool_new (4, 2, GDK_MEMORY_R8G8B8A8, 2, NULL);
  AwraTextureStream *stream = awra_texture_stream_new ();
  GdkPaintable *paintable = GDK_PAINTABLE (stream);
  guint contents = 0, size = 0;
  g_signal_connect (stream, "invalidate-contents", G_CALLBACK (invalidated),
                    &contents);
  g_signal_connect (stream, "invalidate-size", G_CALLBACK (invalidated),
                    &size);
  AwraFrame *a = awra_frame_pool_acquire (pool);
  fill_rgb (a, pool, 100);
  GdkTexture *ta = awra_frame_create_texture (a);
  g_object_unref (a);
  awra_texture_stream_set_frame (stream, ta, 0);
  GdkPaintable *frozen = gdk_paintable_get_current_image (paintable);
  g_assert_true (gdk_paintable_get_flags (frozen)
                 & GDK_PAINTABLE_STATIC_CONTENTS);
  AwraFrame *b = awra_frame_pool_acquire (pool);
  fill_rgb (b, pool, 200);
  GdkTexture *tb = awra_frame_create_texture (b);
  g_object_unref (b);
  awra_texture_stream_set_frame (stream, tb, 0);
  g_assert_cmpuint (contents, ==, 2);
  g_assert_cmpuint (size, ==, 1); /* no layout invalidation at frame cadence */
  assert_red (GDK_TEXTURE (frozen), 100);
  assert_red (awra_texture_stream_get_texture (stream), 200);
  GtkSnapshot *snapshot = gtk_snapshot_new ();
  gdk_paintable_snapshot (paintable, GDK_SNAPSHOT (snapshot), 2, 1);
  GskRenderNode *node = gtk_snapshot_free_to_node (snapshot);
  g_assert_cmpuint (gsk_render_node_get_node_type (node), ==,
                    GSK_TEXTURE_SCALE_NODE);
  g_assert_cmpuint (gsk_texture_scale_node_get_filter (node), ==,
                    GSK_SCALING_FILTER_LINEAR);
  gsk_render_node_unref (node);
  awra_texture_stream_set_frame (stream, tb, 16.0 / 9);
  g_assert_cmpuint (size, ==, 2);
  GdkPaintable *aspect = gdk_paintable_get_current_image (paintable);
  awra_texture_stream_set_frame (stream, NULL, 0);
  g_assert_null (awra_texture_stream_get_texture (stream));
  g_assert_cmpfloat_with_epsilon (
      gdk_paintable_get_intrinsic_aspect_ratio (aspect), 16.0 / 9, .0001);
  g_assert_cmpint (gdk_paintable_get_intrinsic_height (paintable), ==, 0);
  g_object_unref (aspect);
  g_object_unref (frozen);
  g_object_unref (ta);
  g_object_unref (tb);
  g_object_unref (stream);
  g_assert_cmpuint (awra_frame_pool_get_available (pool), ==, 2);
  g_object_unref (pool);
}
static void
test_scaled_alpha (void)
{
  AwraFramePool *src
      = awra_frame_pool_new (4, 2, GDK_MEMORY_R8G8B8A8, 2, NULL);
  AwraFramePool *dst
      = awra_frame_pool_new (2, 1, GDK_MEMORY_R8G8B8A8, 2, NULL);
  AwraFrame *a = awra_frame_pool_acquire (src),
            *b = awra_frame_pool_acquire (dst);
  guint8 *pixels = (guint8 *)(uintptr_t)awra_frame_get_address (a, 0);
  const guint8 row[16]
      = { 255, 0, 0, 0, 0, 0, 255, 255, 0, 255, 0, 255, 0, 255, 0, 255 };
  memcpy (pixels, row, sizeof row);
  memcpy (pixels + awra_frame_pool_get_stride (src, 0), row, sizeof row);
  GdkTexture *original = awra_frame_create_texture (a);
  g_assert_true (awra_frame_copy_scaled (a, b));
  GdkTexture *preview = awra_frame_create_texture (b);
  guint8 result[8];
  gdk_texture_download (preview, result, 8);
#if G_BYTE_ORDER == G_LITTLE_ENDIAN
  g_assert_cmpuint (result[0], ==, 128);
  g_assert_cmpuint (result[2], ==, 0);
  g_assert_cmpuint (result[3], ==, 128);
  g_assert_cmpuint (result[5], ==, 255);
#else
  g_assert_cmpuint (result[3], ==, 128);
  g_assert_cmpuint (result[1], ==, 0);
  g_assert_cmpuint (result[0], ==, 128);
  g_assert_cmpuint (result[6], ==, 255);
#endif
  g_object_unref (original);
  g_object_unref (preview);
  g_object_unref (a);
  g_object_unref (b);
  g_object_unref (src);
  g_object_unref (dst);
}
int
main (int argc, char **argv)
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ())
    return 77;
  awra_init ();
  g_test_add_func ("/frames/lease-lifetime-immutability", test_leases);
  g_test_add_func ("/frames/threaded-bounded-reuse", test_threads);
  g_test_add_func ("/frames/yuv709-color", test_yuv);
  g_test_add_func ("/frames/scaled-rgb-preview", test_scaled_rgb);
  g_test_add_func ("/frames/scaled-alpha-preview", test_scaled_alpha);
  g_test_add_func ("/frames/stream-invalidation-and-snapshot", test_stream);
  return g_test_run ();
}
