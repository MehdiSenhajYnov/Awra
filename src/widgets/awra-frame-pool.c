/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra-frame-pool.h>
#include <stdint.h>

typedef struct
{
  guint8 *data;
  gboolean busy;
} Slot;
struct _AwraFramePool
{
  GObject parent_instance;
  GMutex lock;
  guint width, height, capacity, n_planes;
  GdkMemoryFormat format;
  GdkColorState *color;
  gsize strides[3], offsets[3], total, allocated;
  guint lines[3];
  Slot slots[16];
};
struct _AwraFrame
{
  GObject parent_instance;
  AwraFramePool *pool;
  guint slot;
  gboolean sealed;
};
G_DEFINE_FINAL_TYPE (AwraFramePool, awra_frame_pool, G_TYPE_OBJECT)
G_DEFINE_FINAL_TYPE (AwraFrame, awra_frame, G_TYPE_OBJECT)

static void
pool_finalize (GObject *object)
{
  AwraFramePool *self = AWRA_FRAME_POOL (object);
  for (guint i = 0; i < self->capacity; i++)
    g_aligned_free (self->slots[i].data);
  g_clear_pointer (&self->color, gdk_color_state_unref);
  g_mutex_clear (&self->lock);
  G_OBJECT_CLASS (awra_frame_pool_parent_class)->finalize (object);
}
static void
frame_dispose (GObject *object)
{
  AwraFrame *self = AWRA_FRAME (object);
  if (self->pool)
    {
      g_mutex_lock (&self->pool->lock);
      self->pool->slots[self->slot].busy = FALSE;
      g_mutex_unlock (&self->pool->lock);
      g_clear_object (&self->pool);
    }
  G_OBJECT_CLASS (awra_frame_parent_class)->dispose (object);
}
static void
awra_frame_pool_class_init (AwraFramePoolClass *klass)
{
  G_OBJECT_CLASS (klass)->finalize = pool_finalize;
}
static void
awra_frame_pool_init (AwraFramePool *self)
{
  g_mutex_init (&self->lock);
}
static void
awra_frame_class_init (AwraFrameClass *klass)
{
  G_OBJECT_CLASS (klass)->dispose = frame_dispose;
}
static void
awra_frame_init (AwraFrame *self)
{
  (void)self;
}
static gsize
align32 (gsize value)
{
  return (value + 31) & ~(gsize)31;
}
AwraFramePool *
awra_frame_pool_new (guint width, guint height, GdkMemoryFormat format,
                     guint capacity, GdkColorState *color)
{
  g_return_val_if_fail (
      width > 0 && width <= 16384 && height > 0 && height <= 16384, NULL);
  g_return_val_if_fail (capacity >= 2 && capacity <= 16, NULL);
  g_return_val_if_fail (format == GDK_MEMORY_B8G8R8X8
                            || format == GDK_MEMORY_R8G8B8A8
                            || format == GDK_MEMORY_R8G8B8A8_PREMULTIPLIED
                            || format == GDK_MEMORY_G8_B8_R8_420
                            || format == GDK_MEMORY_G8_B8R8_420,
                        NULL);
  g_return_val_if_fail (
      (format != GDK_MEMORY_G8_B8_R8_420 && format != GDK_MEMORY_G8_B8R8_420)
          || color != NULL,
      NULL);
  g_return_val_if_fail (
      (format != GDK_MEMORY_G8_B8_R8_420 && format != GDK_MEMORY_G8_B8R8_420)
          || (width % 2 == 0 && height % 2 == 0),
      NULL);
  AwraFramePool *self = g_object_new (AWRA_TYPE_FRAME_POOL, NULL);
  self->width = width;
  self->height = height;
  self->capacity = capacity;
  self->format = format;
  self->color
      = gdk_color_state_ref (color ? color : gdk_color_state_get_srgb ());
  self->n_planes = format == GDK_MEMORY_G8_B8_R8_420  ? 3
                   : format == GDK_MEMORY_G8_B8R8_420 ? 2
                                                      : 1;
  for (guint i = 0; i < self->n_planes; i++)
    {
      self->strides[i]
          = align32 (i ? (width + 1) / 2 * (self->n_planes == 2 ? 2 : 1)
                       : width * (self->n_planes == 1 ? 4 : 1));
      self->lines[i] = align32 (i ? (height + 1) / 2 : height);
      self->offsets[i] = self->total;
      self->total += self->strides[i] * self->lines[i];
    }
  return self;
}
AwraFrame *
awra_frame_pool_acquire (AwraFramePool *self)
{
  g_return_val_if_fail (AWRA_IS_FRAME_POOL (self), NULL);
  AwraFrame *frame = NULL;
  g_mutex_lock (&self->lock);
  for (guint i = 0; i < self->capacity; i++)
    {
      if (self->slots[i].busy)
        continue;
      if (!self->slots[i].data)
        {
          self->slots[i].data = g_aligned_alloc0 (1, self->total, 32);
          self->allocated += self->total;
        }
      self->slots[i].busy = TRUE;
      frame = g_object_new (AWRA_TYPE_FRAME, NULL);
      frame->pool = g_object_ref (self);
      frame->slot = i;
      break;
    }
  g_mutex_unlock (&self->lock);
  return frame;
}
#define GET_UINT(name, field)                                                 \
  guint awra_frame_pool_get_##name (AwraFramePool *s)                         \
  {                                                                           \
    g_return_val_if_fail (AWRA_IS_FRAME_POOL (s), 0);                         \
    return s->field;                                                          \
  }
GET_UINT (width, width)
GET_UINT (height, height)
GET_UINT (capacity, capacity)
GET_UINT (n_planes, n_planes)
#undef GET_UINT
guint
awra_frame_pool_get_available (AwraFramePool *self)
{
  g_return_val_if_fail (AWRA_IS_FRAME_POOL (self), 0);
  guint result = 0;
  g_mutex_lock (&self->lock);
  for (guint i = 0; i < self->capacity; i++)
    result += !self->slots[i].busy;
  g_mutex_unlock (&self->lock);
  return result;
}
gsize
awra_frame_pool_get_allocated_bytes (AwraFramePool *self)
{
  g_return_val_if_fail (AWRA_IS_FRAME_POOL (self), 0);
  g_mutex_lock (&self->lock);
  gsize value = self->allocated;
  g_mutex_unlock (&self->lock);
  return value;
}
gsize
awra_frame_pool_get_stride (AwraFramePool *self, guint plane)
{
  g_return_val_if_fail (AWRA_IS_FRAME_POOL (self) && plane < self->n_planes,
                        0);
  return self->strides[plane];
}
guint
awra_frame_pool_get_lines (AwraFramePool *self, guint plane)
{
  g_return_val_if_fail (AWRA_IS_FRAME_POOL (self) && plane < self->n_planes,
                        0);
  return self->lines[plane];
}
guint64
awra_frame_get_address (AwraFrame *self, guint plane)
{
  g_return_val_if_fail (AWRA_IS_FRAME (self), 0);
  if (!self->pool || self->sealed || plane >= self->pool->n_planes)
    return 0;
  return (guint64)(uintptr_t)(self->pool->slots[self->slot].data
                              + self->pool->offsets[plane]);
}
GdkTexture *
awra_frame_create_texture (AwraFrame *self)
{
  g_return_val_if_fail (AWRA_IS_FRAME (self), NULL);
  if (!self->pool)
    return NULL;
  self->sealed = TRUE;
  AwraFramePool *pool = self->pool;
  GdkMemoryTextureBuilder *builder = gdk_memory_texture_builder_new ();
  gdk_memory_texture_builder_set_width (builder, pool->width);
  gdk_memory_texture_builder_set_height (builder, pool->height);
  gdk_memory_texture_builder_set_format (builder, pool->format);
  gdk_memory_texture_builder_set_color_state (builder, pool->color);
  GBytes *bytes
      = g_bytes_new_with_free_func (pool->slots[self->slot].data, pool->total,
                                    g_object_unref, g_object_ref (self));
  gdk_memory_texture_builder_set_bytes (builder, bytes);
  g_bytes_unref (bytes);
  for (guint i = 0; i < pool->n_planes; i++)
    {
      gdk_memory_texture_builder_set_stride_for_plane (builder, i,
                                                       pool->strides[i]);
      gdk_memory_texture_builder_set_offset (builder, i, pool->offsets[i]);
    }
  GdkTexture *texture = gdk_memory_texture_builder_build (builder);
  g_object_unref (builder);
  return texture;
}

static void
sample_rgba (const guint8 *a, const guint8 *b, const guint8 *c,
             const guint8 *d, guint fx, guint fy, guint8 *output)
{
  const guint8 *pixels[] = { a, b, c, d };
  guint64 weights[]
      = { (guint64)(65536 - fx) * (65536 - fy), (guint64)fx * (65536 - fy),
          (guint64)(65536 - fx) * fy, (guint64)fx * fy };
  guint64 alpha = 0;
  for (guint i = 0; i < 4; i++)
    alpha += pixels[i][3] * weights[i];
  output[3] = (alpha + ((guint64)1 << 31)) >> 32;
  for (guint channel = 0; channel < 3; channel++)
    {
      guint64 color = 0;
      for (guint i = 0; i < 4; i++)
        color += (guint64)pixels[i][channel] * pixels[i][3] * weights[i];
      output[channel] = alpha ? (color + alpha / 2) / alpha : 0;
    }
}

gboolean
awra_frame_copy_scaled (AwraFrame *self, AwraFrame *destination)
{
  g_return_val_if_fail (AWRA_IS_FRAME (self), FALSE);
  g_return_val_if_fail (AWRA_IS_FRAME (destination), FALSE);
  if (!self->pool || !self->sealed || !destination->pool
      || destination->sealed)
    return FALSE;
  AwraFramePool *src = self->pool, *dst = destination->pool;
  if (src->format != dst->format || src->width < dst->width
      || src->height < dst->height
      || !gdk_color_state_equal (src->color, dst->color))
    return FALSE;
  typedef struct
  {
    guint x0, x1, weight;
  } Sample;
  for (guint plane = 0; plane < src->n_planes; plane++)
    {
      guint sw = plane ? (src->width + 1) / 2 : src->width;
      guint sh = plane ? (src->height + 1) / 2 : src->height;
      guint dw = plane ? (dst->width + 1) / 2 : dst->width;
      guint dh = plane ? (dst->height + 1) / 2 : dst->height;
      guint channels = src->n_planes == 1
                           ? 4
                           : (src->n_planes == 2 && plane == 1 ? 2 : 1);
      Sample *samples = g_new (Sample, dw);
      for (guint x = 0; x < dw; x++)
        {
          guint64 position = (guint64)(2 * x + 1) * sw * 32768 / dw - 32768;
          samples[x]
              = (Sample){ position >> 16, MIN ((position >> 16) + 1, sw - 1),
                          position & 65535 };
        }
      const guint8 *input = src->slots[self->slot].data + src->offsets[plane];
      guint8 *output
          = dst->slots[destination->slot].data + dst->offsets[plane];
      for (guint y = 0; y < dh; y++)
        {
          guint64 position = (guint64)(2 * y + 1) * sh * 32768 / dh - 32768;
          guint y0 = position >> 16, y1 = MIN (y0 + 1, sh - 1),
                fy = position & 65535;
          const guint8 *upper = input + y0 * src->strides[plane];
          const guint8 *lower = input + y1 * src->strides[plane];
          guint8 *row = output + y * dst->strides[plane];
          for (guint x = 0; x < dw; x++)
            {
              Sample sample = samples[x];
              if (src->format == GDK_MEMORY_R8G8B8A8)
                {
                  sample_rgba (upper + sample.x0 * 4, upper + sample.x1 * 4,
                               lower + sample.x0 * 4, lower + sample.x1 * 4,
                               sample.weight, fy, row + x * 4);
                  continue;
                }
              for (guint channel = 0; channel < channels; channel++)
                {
                  guint x0 = sample.x0 * channels + channel,
                        x1 = sample.x1 * channels + channel;
                  guint top = upper[x0] * (65536 - sample.weight)
                              + upper[x1] * sample.weight;
                  guint bottom = lower[x0] * (65536 - sample.weight)
                                 + lower[x1] * sample.weight;
                  row[x * channels + channel]
                      = ((guint64)top * (65536 - fy) + (guint64)bottom * fy
                         + ((guint64)1 << 31))
                        >> 32;
                }
            }
        }
      g_free (samples);
    }
  return TRUE;
}
