/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-material-resolution.h>

#include "material/awra-material-resolution-private.h"

struct _AwraMaterialResolution {
  GObject parent_instance;
  GdkRGBA fill;
  GdkRGBA border;
  GdkRGBA highlight;
  GdkRGBA shadow;
  double radius;
  double border_width;
  AwraSurfaceEdge border_edges;
  gboolean request_blur;
  gboolean fallback;
};

enum {
  PROP_0,
  PROP_FILL,
  PROP_BORDER,
  PROP_HIGHLIGHT,
  PROP_SHADOW,
  PROP_RADIUS,
  PROP_BORDER_WIDTH,
  PROP_BORDER_EDGES,
  PROP_REQUEST_BLUR,
  PROP_FALLBACK,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraMaterialResolution, awra_material_resolution,
                     G_TYPE_OBJECT)

static void
awra_material_resolution_get_property (GObject    *object,
                                       guint       property_id,
                                       GValue     *value,
                                       GParamSpec *pspec)
{
  AwraMaterialResolution *self = AWRA_MATERIAL_RESOLUTION (object);

  switch (property_id) {
  case PROP_FILL:
    g_value_set_boxed (value, &self->fill);
    break;
  case PROP_BORDER:
    g_value_set_boxed (value, &self->border);
    break;
  case PROP_HIGHLIGHT:
    g_value_set_boxed (value, &self->highlight);
    break;
  case PROP_SHADOW:
    g_value_set_boxed (value, &self->shadow);
    break;
  case PROP_RADIUS:
    g_value_set_double (value, self->radius);
    break;
  case PROP_BORDER_WIDTH:
    g_value_set_double (value, self->border_width);
    break;
  case PROP_BORDER_EDGES:
    g_value_set_flags (value, self->border_edges);
    break;
  case PROP_REQUEST_BLUR:
    g_value_set_boolean (value, self->request_blur);
    break;
  case PROP_FALLBACK:
    g_value_set_boolean (value, self->fallback);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_material_resolution_class_init (AwraMaterialResolutionClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = awra_material_resolution_get_property;
  properties[PROP_FILL] =
    g_param_spec_boxed ("fill", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_BORDER] =
    g_param_spec_boxed ("border", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_HIGHLIGHT] =
    g_param_spec_boxed ("highlight", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_SHADOW] =
    g_param_spec_boxed ("shadow", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_RADIUS] =
    g_param_spec_double ("radius", NULL, NULL, 0.0, G_MAXDOUBLE, 0.0,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_BORDER_WIDTH] =
    g_param_spec_double ("border-width", NULL, NULL, 0.0, G_MAXDOUBLE, 0.0,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_BORDER_EDGES] =
    g_param_spec_flags ("border-edges", NULL, NULL, AWRA_TYPE_SURFACE_EDGE,
                        AWRA_SURFACE_EDGE_NONE,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_REQUEST_BLUR] =
    g_param_spec_boolean ("request-blur", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_FALLBACK] =
    g_param_spec_boolean ("fallback", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_material_resolution_init (AwraMaterialResolution *self)
{
  (void) self;
}

AwraMaterialResolution *
awra_material_resolution_new (const AwraResolvedMaterial *resolved)
{
  AwraMaterialResolution *self;

  g_return_val_if_fail (resolved != NULL, NULL);
  self = g_object_new (AWRA_TYPE_MATERIAL_RESOLUTION, NULL);
  self->fill = resolved->fill;
  self->border = resolved->border;
  self->highlight = resolved->highlight;
  self->shadow = resolved->shadow;
  self->radius = resolved->radius;
  self->border_width = resolved->border_width;
  self->border_edges = resolved->border_edges;
  self->request_blur = resolved->request_blur;
  self->fallback = resolved->fallback;
  return self;
}

#define DEFINE_COLOR_GETTER(name) \
  const GdkRGBA * \
  awra_material_resolution_get_##name (AwraMaterialResolution *self) \
  { \
    g_return_val_if_fail (AWRA_IS_MATERIAL_RESOLUTION (self), NULL); \
    return &self->name; \
  }

DEFINE_COLOR_GETTER (fill)
DEFINE_COLOR_GETTER (border)
DEFINE_COLOR_GETTER (highlight)
DEFINE_COLOR_GETTER (shadow)

double
awra_material_resolution_get_radius (AwraMaterialResolution *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL_RESOLUTION (self), 0.0);
  return self->radius;
}

double
awra_material_resolution_get_border_width (AwraMaterialResolution *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL_RESOLUTION (self), 0.0);
  return self->border_width;
}

AwraSurfaceEdge
awra_material_resolution_get_border_edges (AwraMaterialResolution *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL_RESOLUTION (self),
                        AWRA_SURFACE_EDGE_NONE);
  return self->border_edges;
}

gboolean
awra_material_resolution_get_request_blur (AwraMaterialResolution *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL_RESOLUTION (self), FALSE);
  return self->request_blur;
}

gboolean
awra_material_resolution_get_fallback (AwraMaterialResolution *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL_RESOLUTION (self), FALSE);
  return self->fallback;
}
