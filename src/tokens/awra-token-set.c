/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-token-set.h>

struct _AwraTokenSet {
  GObject parent_instance;
  gboolean dark;
  GdkRGBA background;
  GdkRGBA foreground;
  GdkRGBA accent;
  GdkRGBA border;
  double window_opacity;
  double surface_opacity;
  double radius;
  double border_width;
};

enum {
  PROP_0,
  PROP_DARK,
  PROP_BACKGROUND,
  PROP_FOREGROUND,
  PROP_ACCENT,
  PROP_BORDER,
  PROP_WINDOW_OPACITY,
  PROP_SURFACE_OPACITY,
  PROP_RADIUS,
  PROP_BORDER_WIDTH,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraTokenSet, awra_token_set, G_TYPE_OBJECT)

static void
awra_token_set_get_property (GObject    *object,
                             guint       property_id,
                             GValue     *value,
                             GParamSpec *pspec)
{
  AwraTokenSet *self = AWRA_TOKEN_SET (object);

  switch (property_id) {
  case PROP_DARK:
    g_value_set_boolean (value, self->dark);
    break;
  case PROP_BACKGROUND:
    g_value_set_boxed (value, &self->background);
    break;
  case PROP_FOREGROUND:
    g_value_set_boxed (value, &self->foreground);
    break;
  case PROP_ACCENT:
    g_value_set_boxed (value, &self->accent);
    break;
  case PROP_BORDER:
    g_value_set_boxed (value, &self->border);
    break;
  case PROP_WINDOW_OPACITY:
    g_value_set_double (value, self->window_opacity);
    break;
  case PROP_SURFACE_OPACITY:
    g_value_set_double (value, self->surface_opacity);
    break;
  case PROP_RADIUS:
    g_value_set_double (value, self->radius);
    break;
  case PROP_BORDER_WIDTH:
    g_value_set_double (value, self->border_width);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_token_set_class_init (AwraTokenSetClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = awra_token_set_get_property;

  properties[PROP_DARK] =
    g_param_spec_boolean ("dark", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_BACKGROUND] =
    g_param_spec_boxed ("background", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_FOREGROUND] =
    g_param_spec_boxed ("foreground", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_ACCENT] =
    g_param_spec_boxed ("accent", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_BORDER] =
    g_param_spec_boxed ("border", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_WINDOW_OPACITY] =
    g_param_spec_double ("window-opacity", NULL, NULL, 0.0, 1.0, 1.0,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_SURFACE_OPACITY] =
    g_param_spec_double ("surface-opacity", NULL, NULL, 0.0, 1.0, 1.0,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_RADIUS] =
    g_param_spec_double ("radius", NULL, NULL, 0.0, 128.0, 16.0,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_BORDER_WIDTH] =
    g_param_spec_double ("border-width", NULL, NULL, 0.0, 8.0, 1.0,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);

  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_token_set_init (AwraTokenSet *self)
{
  (void) self;
}

AwraTokenSet *
awra_token_set_new (gboolean       dark,
                    const GdkRGBA *accent,
                    gboolean       high_contrast)
{
  static const GdkRGBA default_accent = { 0.49, 0.31, 0.95, 1.0 };
  AwraTokenSet *self = g_object_new (AWRA_TYPE_TOKEN_SET, NULL);

  self->dark = dark;
  self->accent = accent != NULL ? *accent : default_accent;
  self->radius = 18.0;
  self->border_width = high_contrast ? 2.0 : 1.0;
  self->window_opacity = dark ? 0.70 : 0.76;
  self->surface_opacity = dark ? 0.66 : 0.72;

  if (dark) {
    self->background = (GdkRGBA) { 0.055, 0.060, 0.085, 1.0 };
    self->foreground = (GdkRGBA) { 0.965, 0.970, 0.985, 1.0 };
    self->border = (GdkRGBA) { 0.88, 0.90, 1.0, high_contrast ? 0.72 : 0.26 };
  } else {
    self->background = (GdkRGBA) { 0.955, 0.960, 0.985, 1.0 };
    self->foreground = (GdkRGBA) { 0.075, 0.075, 0.11, 1.0 };
    self->border = (GdkRGBA) { 0.18, 0.16, 0.28, high_contrast ? 0.70 : 0.20 };
  }

  return self;
}

gboolean
awra_token_set_get_dark (AwraTokenSet *self)
{
  g_return_val_if_fail (AWRA_IS_TOKEN_SET (self), FALSE);
  return self->dark;
}

#define DEFINE_COLOR_GETTER(name, field) \
  const GdkRGBA * \
  awra_token_set_get_##name (AwraTokenSet *self) \
  { \
    g_return_val_if_fail (AWRA_IS_TOKEN_SET (self), NULL); \
    return &self->field; \
  }

DEFINE_COLOR_GETTER (background, background)
DEFINE_COLOR_GETTER (foreground, foreground)
DEFINE_COLOR_GETTER (accent, accent)
DEFINE_COLOR_GETTER (border, border)

#define DEFINE_DOUBLE_GETTER(name, field) \
  double \
  awra_token_set_get_##name (AwraTokenSet *self) \
  { \
    g_return_val_if_fail (AWRA_IS_TOKEN_SET (self), 0.0); \
    return self->field; \
  }

DEFINE_DOUBLE_GETTER (window_opacity, window_opacity)
DEFINE_DOUBLE_GETTER (surface_opacity, surface_opacity)
DEFINE_DOUBLE_GETTER (radius, radius)
DEFINE_DOUBLE_GETTER (border_width, border_width)

