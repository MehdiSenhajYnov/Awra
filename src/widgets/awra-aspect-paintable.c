/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra-aspect-paintable.h>
#include <math.h>
struct _AwraAspectPaintable {
  GObject parent_instance;
  GdkPaintable *source;
  double ratio;
};
static void paintable_init (GdkPaintableInterface *iface);
G_DEFINE_FINAL_TYPE_WITH_CODE (AwraAspectPaintable, awra_aspect_paintable, G_TYPE_OBJECT,
  G_IMPLEMENT_INTERFACE (GDK_TYPE_PAINTABLE, paintable_init))
enum { P_0, P_PAINTABLE, P_ASPECT_RATIO, N_PROPS };
static GParamSpec *props[N_PROPS];
static void contents_changed (GdkPaintable *source, AwraAspectPaintable *self) {
  (void)source;
  gdk_paintable_invalidate_contents (GDK_PAINTABLE (self));
}
static void size_changed (GdkPaintable *source, AwraAspectPaintable *self) {
  (void)source;
  gdk_paintable_invalidate_size (GDK_PAINTABLE (self));
}
static void snapshot (GdkPaintable *paintable, GdkSnapshot *snapshot, double width, double height) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (paintable);
  if (self->source) gdk_paintable_snapshot (self->source, snapshot, width, height);
}
static int intrinsic_height (GdkPaintable *paintable) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (paintable);
  return self->source ? MAX (1, gdk_paintable_get_intrinsic_height (self->source)) : 1;
}
static int intrinsic_width (GdkPaintable *paintable) {
  return MAX (1, (int) MIN (G_MAXINT, round (intrinsic_height (paintable) * AWRA_ASPECT_PAINTABLE (paintable)->ratio)));
}
static double intrinsic_ratio (GdkPaintable *paintable) { return AWRA_ASPECT_PAINTABLE (paintable)->ratio; }
static GdkPaintableFlags flags (GdkPaintable *paintable) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (paintable);
  return self->source ? gdk_paintable_get_flags (self->source) : GDK_PAINTABLE_STATIC_SIZE | GDK_PAINTABLE_STATIC_CONTENTS;
}
static GdkPaintable *current_image (GdkPaintable *paintable) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (paintable);
  if (!self->source) return gdk_paintable_new_empty (1, 1);
  GdkPaintable *source = gdk_paintable_get_current_image (self->source);
  GdkPaintable *image = GDK_PAINTABLE (awra_aspect_paintable_new (source, self->ratio));
  g_object_unref (source);
  return image;
}
static void paintable_init (GdkPaintableInterface *iface) {
  iface->snapshot = snapshot;
  iface->get_intrinsic_width = intrinsic_width;
  iface->get_intrinsic_height = intrinsic_height;
  iface->get_intrinsic_aspect_ratio = intrinsic_ratio;
  iface->get_flags = flags;
  iface->get_current_image = current_image;
}
static void dispose (GObject *object) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (object);
  if (self->source) g_signal_handlers_disconnect_by_data (self->source, self);
  g_clear_object (&self->source);
  G_OBJECT_CLASS (awra_aspect_paintable_parent_class)->dispose (object);
}
static void get_property (GObject *object, guint id, GValue *value, GParamSpec *spec) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (object);
  if (id == P_PAINTABLE) g_value_set_object (value, self->source);
  else if (id == P_ASPECT_RATIO) g_value_set_double (value, self->ratio);
  else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, spec);
}
static void set_property (GObject *object, guint id, const GValue *value, GParamSpec *spec) {
  AwraAspectPaintable *self = AWRA_ASPECT_PAINTABLE (object);
  if (id == P_PAINTABLE) {
    self->source = g_value_dup_object (value);
    if (self->source) {
      g_signal_connect (self->source, "invalidate-contents", G_CALLBACK (contents_changed), self);
      g_signal_connect (self->source, "invalidate-size", G_CALLBACK (size_changed), self);
    }
  } else if (id == P_ASPECT_RATIO) self->ratio = g_value_get_double (value);
  else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, spec);
}
static void awra_aspect_paintable_class_init (AwraAspectPaintableClass *klass) {
  GObjectClass *object = G_OBJECT_CLASS (klass);
  object->dispose = dispose;
  object->get_property = get_property;
  object->set_property = set_property;
  GParamFlags f = G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY | G_PARAM_STATIC_STRINGS;
  props[P_PAINTABLE] = g_param_spec_object ("paintable", NULL, NULL, GDK_TYPE_PAINTABLE, f);
  props[P_ASPECT_RATIO] = g_param_spec_double ("aspect-ratio", NULL, NULL, .001, 1000, 1, f);
  g_object_class_install_properties (object, N_PROPS, props);
}
static void awra_aspect_paintable_init (AwraAspectPaintable *self) { self->ratio = 1; }
AwraAspectPaintable *awra_aspect_paintable_new (GdkPaintable *source, double ratio) {
  g_return_val_if_fail (GDK_IS_PAINTABLE (source), NULL);
  g_return_val_if_fail (isfinite (ratio) && ratio >= .001 && ratio <= 1000, NULL);
  return g_object_new (AWRA_TYPE_ASPECT_PAINTABLE, "paintable", source, "aspect-ratio", ratio, NULL);
}
GdkPaintable *awra_aspect_paintable_get_paintable (AwraAspectPaintable *self) {
  g_return_val_if_fail (AWRA_IS_ASPECT_PAINTABLE (self), NULL); return self->source;
}
double awra_aspect_paintable_get_aspect_ratio (AwraAspectPaintable *self) {
  g_return_val_if_fail (AWRA_IS_ASPECT_PAINTABLE (self), 1); return self->ratio;
}
