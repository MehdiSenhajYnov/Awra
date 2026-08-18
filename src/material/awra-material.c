/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-material.h>

struct _AwraMaterial {
  GObject parent_instance;
  AwraMaterialKind kind;
  AwraMaterialPreset preset;
};

enum {
  PROP_0,
  PROP_KIND,
  PROP_PRESET,
  PROP_NAME,
  PROP_REQUESTS_BLUR,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraMaterial, awra_material, G_TYPE_OBJECT)

static const char *
kind_name (AwraMaterialKind kind)
{
  switch (kind) {
  case AWRA_MATERIAL_KIND_SOLID:
    return "solid";
  case AWRA_MATERIAL_KIND_TRANSLUCENT:
    return "translucent";
  case AWRA_MATERIAL_KIND_FROSTED:
    return "frosted";
  case AWRA_MATERIAL_KIND_LIQUID:
    return "liquid";
  default:
    return "unknown";
  }
}

static const char *
preset_name (AwraMaterialPreset preset)
{
  switch (preset) {
  case AWRA_MATERIAL_PRESET_CANVAS:
    return "canvas";
  case AWRA_MATERIAL_PRESET_CONTENT:
    return "content";
  case AWRA_MATERIAL_PRESET_CHROME:
    return "chrome";
  case AWRA_MATERIAL_PRESET_LAYER:
    return "layer";
  case AWRA_MATERIAL_PRESET_FLOATING:
    return "floating";
  case AWRA_MATERIAL_PRESET_OPAQUE:
    return "opaque";
  case AWRA_MATERIAL_PRESET_NONE:
  default:
    return NULL;
  }
}

static void
awra_material_get_property (GObject    *object,
                            guint       property_id,
                            GValue     *value,
                            GParamSpec *pspec)
{
  AwraMaterial *self = AWRA_MATERIAL (object);

  switch (property_id) {
  case PROP_KIND:
    g_value_set_enum (value, self->kind);
    break;
  case PROP_PRESET:
    g_value_set_enum (value, self->preset);
    break;
  case PROP_NAME:
    g_value_set_static_string (value,
                               self->preset == AWRA_MATERIAL_PRESET_NONE
                                 ? kind_name (self->kind)
                                 : preset_name (self->preset));
    break;
  case PROP_REQUESTS_BLUR:
    g_value_set_boolean (value, self->kind == AWRA_MATERIAL_KIND_FROSTED);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_material_class_init (AwraMaterialClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = awra_material_get_property;

  properties[PROP_KIND] =
    g_param_spec_enum ("kind", NULL, NULL, AWRA_TYPE_MATERIAL_KIND,
                       AWRA_MATERIAL_KIND_SOLID,
                       G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_PRESET] =
    g_param_spec_enum ("preset", NULL, NULL, AWRA_TYPE_MATERIAL_PRESET,
                       AWRA_MATERIAL_PRESET_NONE,
                       G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_NAME] =
    g_param_spec_string ("name", NULL, NULL, "solid",
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_REQUESTS_BLUR] =
    g_param_spec_boolean ("requests-blur", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);

  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_material_init (AwraMaterial *self)
{
  self->kind = AWRA_MATERIAL_KIND_SOLID;
  self->preset = AWRA_MATERIAL_PRESET_NONE;
}

static AwraMaterial *
new_for_kind (AwraMaterialKind kind)
{
  AwraMaterial *self = g_object_new (AWRA_TYPE_MATERIAL, NULL);
  self->kind = kind;
  return self;
}

static AwraMaterialKind
kind_for_preset (AwraMaterialPreset preset)
{
  switch (preset) {
  case AWRA_MATERIAL_PRESET_CANVAS:
  case AWRA_MATERIAL_PRESET_FLOATING:
    return AWRA_MATERIAL_KIND_FROSTED;
  case AWRA_MATERIAL_PRESET_CONTENT:
  case AWRA_MATERIAL_PRESET_CHROME:
  case AWRA_MATERIAL_PRESET_LAYER:
    return AWRA_MATERIAL_KIND_TRANSLUCENT;
  case AWRA_MATERIAL_PRESET_OPAQUE:
  case AWRA_MATERIAL_PRESET_NONE:
  default:
    return AWRA_MATERIAL_KIND_SOLID;
  }
}

AwraMaterial *
awra_material_new_solid (void)
{
  return new_for_kind (AWRA_MATERIAL_KIND_SOLID);
}

AwraMaterial *
awra_material_new_translucent (void)
{
  return new_for_kind (AWRA_MATERIAL_KIND_TRANSLUCENT);
}

AwraMaterial *
awra_material_new_frosted (void)
{
  return new_for_kind (AWRA_MATERIAL_KIND_FROSTED);
}

AwraMaterial *
awra_material_new_for_preset (AwraMaterialPreset preset)
{
  AwraMaterial *self;

  g_return_val_if_fail (preset >= AWRA_MATERIAL_PRESET_CANVAS &&
                        preset <= AWRA_MATERIAL_PRESET_OPAQUE, NULL);
  self = new_for_kind (kind_for_preset (preset));
  self->preset = preset;
  return self;
}

AwraMaterialKind
awra_material_get_kind (AwraMaterial *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL (self), AWRA_MATERIAL_KIND_SOLID);
  return self->kind;
}

AwraMaterialPreset
awra_material_get_preset (AwraMaterial *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL (self), AWRA_MATERIAL_PRESET_NONE);
  return self->preset;
}

const char *
awra_material_get_name (AwraMaterial *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL (self), NULL);
  return self->preset == AWRA_MATERIAL_PRESET_NONE
           ? kind_name (self->kind)
           : preset_name (self->preset);
}

gboolean
awra_material_requests_blur (AwraMaterial *self)
{
  g_return_val_if_fail (AWRA_IS_MATERIAL (self), FALSE);
  return self->kind == AWRA_MATERIAL_KIND_FROSTED;
}
