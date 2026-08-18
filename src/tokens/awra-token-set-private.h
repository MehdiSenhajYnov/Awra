/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-material.h>
#include <awra/awra-token-set.h>

#define AWRA_DEFAULT_GRAIN_SCALE 0.20

typedef enum {
  AWRA_MATERIAL_PROFILE_SOLID,
  AWRA_MATERIAL_PROFILE_TRANSLUCENT,
  AWRA_MATERIAL_PROFILE_FROSTED,
  AWRA_MATERIAL_PROFILE_CANVAS,
  AWRA_MATERIAL_PROFILE_CONTENT,
  AWRA_MATERIAL_PROFILE_CHROME,
  AWRA_MATERIAL_PROFILE_LAYER,
  AWRA_MATERIAL_PROFILE_FLOATING,
  AWRA_MATERIAL_PROFILE_OPAQUE,
  AWRA_MATERIAL_PROFILE_COUNT,
} AwraMaterialProfileId;

typedef struct {
  gboolean tint_set;
  GdkRGBA tint;
  gboolean radius_set;
  double radius;
  gboolean grain_scale_set;
  double grain_scale;
  gboolean outline_strength_set;
  double outline_strength;
  gboolean highlight_strength_set;
  double highlight_strength;
  gboolean blur_enabled_set;
  gboolean blur_enabled;
} AwraMaterialProfileOverride;

AwraTokenSet *awra_token_set_new_with_tuning (
  gboolean       dark,
  const GdkRGBA *accent,
  gboolean       high_contrast,
  const GdkRGBA *canvas_tint,
  double         grain_scale);

AwraMaterialProfileId awra_material_profile_id_from_material (
  AwraMaterial *material);
void awra_token_set_apply_material_profile_override (
  AwraTokenSet                     *self,
  AwraMaterialProfileId             profile,
  const AwraMaterialProfileOverride *override);
const GdkRGBA *awra_token_set_get_material_tint_internal (
  AwraTokenSet *self,
  AwraMaterial *material);
double awra_token_set_get_material_radius_internal (
  AwraTokenSet *self,
  AwraMaterial *material);
double awra_token_set_get_material_grain_scale_internal (
  AwraTokenSet *self,
  AwraMaterial *material);
double awra_token_set_get_material_outline_strength_internal (
  AwraTokenSet *self,
  AwraMaterial *material);
double awra_token_set_get_material_highlight_strength_internal (
  AwraTokenSet *self,
  AwraMaterial *material);
gboolean awra_token_set_get_material_blur_enabled_internal (
  AwraTokenSet *self,
  AwraMaterial *material);
