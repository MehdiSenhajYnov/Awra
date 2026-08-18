/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "material/awra-material-resolver-private.h"
#include "tokens/awra-token-set-private.h"

void
awra_material_resolve (AwraMaterial         *material,
                       AwraTokenSet         *tokens,
                       AwraSurfaceRole       role,
                       gboolean              window_active,
                       gboolean              blur_available,
                       gboolean              reduced_transparency,
                       guint                 elevation,
                       AwraResolvedMaterial *resolved)
{
  AwraMaterialKind kind;
  AwraMaterialPreset preset;
  double shadow_alpha;
  double outline_strength;
  double highlight_strength;
  double grain_scale;
  gboolean profile_blur_enabled;

  g_return_if_fail (AWRA_IS_MATERIAL (material));
  g_return_if_fail (AWRA_IS_TOKEN_SET (tokens));
  g_return_if_fail (resolved != NULL);

  /* Kept in the resolver contract so diagnostics can compare both states.
   * Material paint is deliberately focus-invariant; component interaction
   * states, rather than native-window activation, communicate emphasis. */
  (void) window_active;

  kind = awra_material_get_kind (material);
  preset = awra_material_get_preset (material);
  shadow_alpha = elevation == AWRA_ELEVATION_RAISED ? 0.08
                 : elevation == AWRA_ELEVATION_FLOATING ? 0.16
                 : elevation >= AWRA_ELEVATION_MODAL ? 0.22
                 : 0.0;

  outline_strength = awra_token_set_get_material_outline_strength_internal (
    tokens, material);
  highlight_strength =
    awra_token_set_get_material_highlight_strength_internal (tokens,
                                                              material);
  grain_scale = awra_token_set_get_material_grain_scale_internal (tokens,
                                                                   material);
  profile_blur_enabled =
    awra_token_set_get_material_blur_enabled_internal (tokens, material);
  resolved->fill = *awra_token_set_get_material_tint_internal (tokens,
                                                                material);
  resolved->border = *awra_token_set_get_outline (tokens);
  resolved->highlight = *awra_token_set_get_rim_highlight (tokens);
  resolved->shadow = (GdkRGBA) { 0.008, 0.007, 0.012, shadow_alpha };
  resolved->radius = awra_token_set_get_material_radius_internal (tokens,
                                                                   material);
  resolved->border_width = awra_token_set_get_border_width (tokens);
  resolved->border_edges = AWRA_SURFACE_EDGE_NONE;
  resolved->highlight_edges = AWRA_SURFACE_EDGE_NONE;
  resolved->highlight_width = 0.75;
  resolved->grain_opacity = 0.0;
  resolved->request_blur = FALSE;
  resolved->fallback = FALSE;

  if (preset != AWRA_MATERIAL_PRESET_NONE) {
    switch (preset) {
    case AWRA_MATERIAL_PRESET_CANVAS:
      resolved->border_edges = AWRA_SURFACE_EDGE_ALL;
      resolved->highlight_edges = AWRA_SURFACE_EDGE_TOP |
                                  AWRA_SURFACE_EDGE_START;
      resolved->grain_opacity = 0.016 * grain_scale;
      break;
    case AWRA_MATERIAL_PRESET_CONTENT:
      break;
    case AWRA_MATERIAL_PRESET_CHROME:
      resolved->border = *awra_token_set_get_separator (tokens);
      resolved->border_edges = role == AWRA_SURFACE_ROLE_SIDEBAR
                                 ? AWRA_SURFACE_EDGE_END
                                 : AWRA_SURFACE_EDGE_BOTTOM;
      resolved->highlight.alpha *= 0.34;
      resolved->highlight_edges = AWRA_SURFACE_EDGE_TOP;
      break;
    case AWRA_MATERIAL_PRESET_LAYER:
      if (awra_token_set_get_high_contrast (tokens))
        resolved->border_edges = AWRA_SURFACE_EDGE_ALL;
      resolved->highlight.alpha *= 0.30;
      resolved->highlight_edges = AWRA_SURFACE_EDGE_TOP;
      break;
    case AWRA_MATERIAL_PRESET_FLOATING:
      resolved->border_edges = AWRA_SURFACE_EDGE_ALL;
      resolved->highlight_edges = AWRA_SURFACE_EDGE_TOP |
                                  AWRA_SURFACE_EDGE_START;
      resolved->highlight_width = 1.0;
      resolved->grain_opacity = 0.010 * grain_scale;
      break;
    case AWRA_MATERIAL_PRESET_OPAQUE:
      resolved->fill.alpha = 1.0;
      resolved->border_edges = role == AWRA_SURFACE_ROLE_CONTENT
                                 ? AWRA_SURFACE_EDGE_NONE
                                 : AWRA_SURFACE_EDGE_ALL;
      break;
    case AWRA_MATERIAL_PRESET_NONE:
    default:
      g_assert_not_reached ();
    }

    if (preset == AWRA_MATERIAL_PRESET_CANVAS ||
        preset == AWRA_MATERIAL_PRESET_FLOATING) {
      if (profile_blur_enabled && blur_available && !reduced_transparency) {
        resolved->request_blur = TRUE;
      } else {
        resolved->fill.alpha = 1.0;
        resolved->fallback = TRUE;
      }
    } else if (reduced_transparency &&
               preset != AWRA_MATERIAL_PRESET_CONTENT &&
               preset != AWRA_MATERIAL_PRESET_OPAQUE) {
      resolved->fill.alpha = 1.0;
      resolved->fallback = TRUE;
    }
  } else {
    resolved->border_edges = AWRA_SURFACE_EDGE_ALL;
    resolved->highlight_edges = kind == AWRA_MATERIAL_KIND_FROSTED
                                  ? AWRA_SURFACE_EDGE_TOP |
                                    AWRA_SURFACE_EDGE_START
                                  : AWRA_SURFACE_EDGE_NONE;
    resolved->grain_opacity = kind == AWRA_MATERIAL_KIND_FROSTED
                                ? 0.014 * grain_scale
                                : 0.0;
    switch (kind) {
  case AWRA_MATERIAL_KIND_SOLID:
    resolved->fill.alpha = 1.0;
    break;
  case AWRA_MATERIAL_KIND_TRANSLUCENT:
    resolved->fill.alpha = reduced_transparency
                             ? 1.0 : resolved->fill.alpha;
    resolved->fallback = reduced_transparency;
    break;
  case AWRA_MATERIAL_KIND_FROSTED:
    if (profile_blur_enabled && blur_available && !reduced_transparency) {
      resolved->request_blur = TRUE;
    } else {
      resolved->fill.alpha = 1.0;
      resolved->border.alpha = MAX (resolved->border.alpha, 0.48);
      resolved->fallback = TRUE;
    }
    break;
  case AWRA_MATERIAL_KIND_LIQUID:
  default:
    resolved->fill.alpha = 1.0;
    resolved->fallback = TRUE;
    break;
    }
  }

  if (awra_token_set_get_high_contrast (tokens))
    outline_strength = MAX (outline_strength, 1.0);
  resolved->border.alpha = MIN (1.0,
                                resolved->border.alpha * outline_strength);
  resolved->highlight.alpha = MIN (
    1.0, resolved->highlight.alpha * highlight_strength);

}
