/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "material/awra-material-resolver-private.h"

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
  double opacity;

  g_return_if_fail (AWRA_IS_MATERIAL (material));
  g_return_if_fail (AWRA_IS_TOKEN_SET (tokens));
  g_return_if_fail (resolved != NULL);

  kind = awra_material_get_kind (material);
  opacity = role == AWRA_SURFACE_ROLE_WINDOW
              ? awra_token_set_get_window_opacity (tokens)
              : awra_token_set_get_surface_opacity (tokens);

  resolved->fill = *awra_token_set_get_background (tokens);
  resolved->border = *awra_token_set_get_border (tokens);
  resolved->highlight = awra_token_set_get_dark (tokens)
                          ? (GdkRGBA) { 1.0, 1.0, 1.0, 0.12 }
                          : (GdkRGBA) { 1.0, 1.0, 1.0, 0.54 };
  resolved->shadow = (GdkRGBA) { 0.01, 0.01, 0.025,
                                 elevation > 0 ? 0.28 : 0.0 };
  resolved->radius = awra_token_set_get_radius (tokens);
  resolved->border_width = awra_token_set_get_border_width (tokens);
  resolved->request_blur = FALSE;
  resolved->fallback = FALSE;

  switch (kind) {
  case AWRA_MATERIAL_KIND_SOLID:
    resolved->fill.alpha = 1.0;
    break;
  case AWRA_MATERIAL_KIND_TRANSLUCENT:
    resolved->fill.alpha = reduced_transparency ? 1.0 : opacity;
    resolved->fallback = reduced_transparency;
    break;
  case AWRA_MATERIAL_KIND_FROSTED:
    if (blur_available && !reduced_transparency) {
      resolved->fill.alpha = opacity;
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

  if (!window_active) {
    resolved->highlight.alpha *= 0.55;
    resolved->border.alpha *= 0.82;
    resolved->shadow.alpha *= 0.72;
  }
}

