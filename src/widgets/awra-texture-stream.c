/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra-aspect-paintable.h>
#include <awra/awra-texture-stream.h>
#include <gtk/gtk.h>
#include <math.h>
struct _AwraTextureStream
{
  GObject parent_instance;
  GdkTexture *texture;
  double aspect;
};
static void paintable_init (GdkPaintableInterface *iface);
G_DEFINE_FINAL_TYPE_WITH_CODE (AwraTextureStream, awra_texture_stream,
                               G_TYPE_OBJECT,
                               G_IMPLEMENT_INTERFACE (GDK_TYPE_PAINTABLE,
                                                      paintable_init))
static double
ratio (GdkPaintable *paintable)
{
  AwraTextureStream *self = AWRA_TEXTURE_STREAM (paintable);
  return self->texture ? (self->aspect > 0
                              ? self->aspect
                              : (double)gdk_texture_get_width (self->texture)
                                    / gdk_texture_get_height (self->texture))
                       : 0;
}
static int
height (GdkPaintable *paintable)
{
  AwraTextureStream *self = AWRA_TEXTURE_STREAM (paintable);
  return self->texture ? gdk_texture_get_height (self->texture) : 0;
}
static int
width (GdkPaintable *paintable)
{
  return MAX (
      0, (int)MIN (G_MAXINT, round (height (paintable) * ratio (paintable))));
}
static void
snapshot (GdkPaintable *paintable, GdkSnapshot *snapshot, double width,
          double height)
{
  AwraTextureStream *self = AWRA_TEXTURE_STREAM (paintable);
  /* Static textures request trilinear filtering by default. Its CPU-generated
   * mip levels are particularly expensive for a new planar frame every 16 ms.
   * Live frames use the GPU's bilinear sampler without any pixel resampling.
   */
  if (self->texture)
    gtk_snapshot_append_scaled_texture (
        GTK_SNAPSHOT (snapshot), self->texture, GSK_SCALING_FILTER_LINEAR,
        &GRAPHENE_RECT_INIT (0, 0, width, height));
}
static GdkPaintable *
current_image (GdkPaintable *paintable)
{
  AwraTextureStream *self = AWRA_TEXTURE_STREAM (paintable);
  if (!self->texture)
    return gdk_paintable_new_empty (0, 0);
  if (self->aspect > 0
      && fabs (self->aspect
               - gdk_paintable_get_intrinsic_aspect_ratio (
                   GDK_PAINTABLE (self->texture)))
             > .001)
    return GDK_PAINTABLE (awra_aspect_paintable_new (
        GDK_PAINTABLE (self->texture), self->aspect));
  return g_object_ref (GDK_PAINTABLE (self->texture));
}
static void
paintable_init (GdkPaintableInterface *iface)
{
  iface->snapshot = snapshot;
  iface->get_intrinsic_width = width;
  iface->get_intrinsic_height = height;
  iface->get_intrinsic_aspect_ratio = ratio;
  iface->get_current_image = current_image;
}
static void
dispose (GObject *object)
{
  g_clear_object (&AWRA_TEXTURE_STREAM (object)->texture);
  G_OBJECT_CLASS (awra_texture_stream_parent_class)->dispose (object);
}
static void
awra_texture_stream_class_init (AwraTextureStreamClass *klass)
{
  G_OBJECT_CLASS (klass)->dispose = dispose;
}
static void
awra_texture_stream_init (AwraTextureStream *self)
{
  (void)self;
}
AwraTextureStream *
awra_texture_stream_new (void)
{
  return g_object_new (AWRA_TYPE_TEXTURE_STREAM, NULL);
}
void
awra_texture_stream_set_frame (AwraTextureStream *self, GdkTexture *texture,
                               double aspect)
{
  g_return_if_fail (AWRA_IS_TEXTURE_STREAM (self));
  g_return_if_fail (texture == NULL || GDK_IS_TEXTURE (texture));
  g_return_if_fail (isfinite (aspect)
                    && (aspect == 0 || (aspect >= .001 && aspect <= 1000)));
  if (self->texture == texture && self->aspect == aspect)
    return;
  GdkPaintable *paintable = GDK_PAINTABLE (self);
  int old_width = width (paintable), old_height = height (paintable);
  double old_ratio = ratio (paintable);
  g_set_object (&self->texture, texture);
  self->aspect = aspect;
  if (old_width != width (paintable) || old_height != height (paintable)
      || old_ratio != ratio (paintable))
    gdk_paintable_invalidate_size (paintable);
  gdk_paintable_invalidate_contents (paintable);
}
GdkTexture *
awra_texture_stream_get_texture (AwraTextureStream *self)
{
  g_return_val_if_fail (AWRA_IS_TEXTURE_STREAM (self), NULL);
  return self->texture;
}
