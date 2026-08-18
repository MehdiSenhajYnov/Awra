/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>
#include <awra/awra-material.h>
#include <awra/awra-token-set.h>

G_BEGIN_DECLS

#define AWRA_TYPE_STYLE_MANAGER (awra_style_manager_get_type ())
G_DECLARE_FINAL_TYPE (AwraStyleManager, awra_style_manager, AWRA, STYLE_MANAGER, GObject)

AwraAppearance awra_style_manager_get_appearance           (AwraStyleManager *self);
void           awra_style_manager_set_appearance           (AwraStyleManager *self,
                                                             AwraAppearance    appearance);
const GdkRGBA  *awra_style_manager_get_accent               (AwraStyleManager *self);
void           awra_style_manager_set_accent               (AwraStyleManager *self,
                                                             const GdkRGBA    *accent);
AwraAccentSource awra_style_manager_get_accent_source      (AwraStyleManager *self);
void             awra_style_manager_set_accent_source      (AwraStyleManager *self,
                                                             AwraAccentSource  source);
gboolean         awra_style_manager_get_system_accent_available (AwraStyleManager *self);
gboolean       awra_style_manager_get_high_contrast         (AwraStyleManager *self);
void           awra_style_manager_set_high_contrast         (AwraStyleManager *self,
                                                             gboolean          high_contrast);
gboolean       awra_style_manager_get_reduced_motion        (AwraStyleManager *self);
void           awra_style_manager_set_reduced_motion        (AwraStyleManager *self,
                                                             gboolean          reduced_motion);
gboolean       awra_style_manager_get_reduced_transparency  (AwraStyleManager *self);
void           awra_style_manager_set_reduced_transparency  (AwraStyleManager *self,
                                                             gboolean          reduced_transparency);
/**
 * awra_style_manager_get_canvas_tint:
 * @self: an Awra style manager
 *
 * Returns the effective Canvas tint. Its alpha is the amount of tint painted
 * over the compositor-provided background effect.
 *
 * Returns: (transfer none): the effective Canvas tint
 */
const GdkRGBA *awra_style_manager_get_canvas_tint          (AwraStyleManager *self);
void           awra_style_manager_set_canvas_tint          (AwraStyleManager *self,
                                                             const GdkRGBA    *tint);
double         awra_style_manager_get_grain_scale          (AwraStyleManager *self);
void           awra_style_manager_set_grain_scale          (AwraStyleManager *self,
                                                             double            scale);
gboolean       awra_style_manager_get_native_blur_enabled  (AwraStyleManager *self);
void           awra_style_manager_set_native_blur_enabled  (AwraStyleManager *self,
                                                             gboolean          enabled);
void           awra_style_manager_reset_material_tuning    (AwraStyleManager *self);
/**
 * awra_style_manager_get_material_tint:
 * @self: an Awra style manager
 * @material: a low-level material or semantic preset descriptor
 *
 * Returns: (transfer none): the effective global tint for @material
 */
const GdkRGBA *awra_style_manager_get_material_tint (
  AwraStyleManager *self,
  AwraMaterial     *material);
void awra_style_manager_set_material_tint (
  AwraStyleManager *self,
  AwraMaterial     *material,
  const GdkRGBA    *tint);
double awra_style_manager_get_material_radius (
  AwraStyleManager *self,
  AwraMaterial     *material);
void awra_style_manager_set_material_radius (
  AwraStyleManager *self,
  AwraMaterial     *material,
  double            radius);
double awra_style_manager_get_material_grain_scale (
  AwraStyleManager *self,
  AwraMaterial     *material);
void awra_style_manager_set_material_grain_scale (
  AwraStyleManager *self,
  AwraMaterial     *material,
  double            scale);
double awra_style_manager_get_material_outline_strength (
  AwraStyleManager *self,
  AwraMaterial     *material);
void awra_style_manager_set_material_outline_strength (
  AwraStyleManager *self,
  AwraMaterial     *material,
  double            strength);
double awra_style_manager_get_material_highlight_strength (
  AwraStyleManager *self,
  AwraMaterial     *material);
void awra_style_manager_set_material_highlight_strength (
  AwraStyleManager *self,
  AwraMaterial     *material,
  double            strength);
gboolean awra_style_manager_get_material_blur_enabled (
  AwraStyleManager *self,
  AwraMaterial     *material);
void awra_style_manager_set_material_blur_enabled (
  AwraStyleManager *self,
  AwraMaterial     *material,
  gboolean          enabled);
void awra_style_manager_reset_material_tuning_for_material (
  AwraStyleManager *self,
  AwraMaterial     *material);
/**
 * awra_style_manager_get_token_set:
 * @self: an Awra style manager
 *
 * Returns: (transfer none): the current immutable token snapshot
 */
AwraTokenSet  *awra_style_manager_get_token_set             (AwraStyleManager *self);

G_END_DECLS
