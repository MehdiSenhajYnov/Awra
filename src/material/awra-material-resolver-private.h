/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-material.h>
#include <awra/awra-token-set.h>

typedef struct {
  GdkRGBA fill;
  GdkRGBA border;
  GdkRGBA highlight;
  GdkRGBA shadow;
  double radius;
  double border_width;
  AwraSurfaceEdge border_edges;
  AwraSurfaceEdge highlight_edges;
  double highlight_width;
  double grain_opacity;
  gboolean request_blur;
  gboolean fallback;
} AwraResolvedMaterial;

void awra_material_resolve (AwraMaterial         *material,
                            AwraTokenSet         *tokens,
                            AwraSurfaceRole       role,
                            gboolean              window_active,
                            gboolean              blur_available,
                            gboolean              reduced_transparency,
                            guint                 elevation,
                            AwraResolvedMaterial *resolved);
