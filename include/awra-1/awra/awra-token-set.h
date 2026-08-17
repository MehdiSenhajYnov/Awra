/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gdk/gdk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_TOKEN_SET (awra_token_set_get_type ())
G_DECLARE_FINAL_TYPE (AwraTokenSet, awra_token_set, AWRA, TOKEN_SET, GObject)

/**
 * awra_token_set_new:
 * @dark: whether to create the dark profile
 * @accent: (nullable): an accent color, or %NULL for Awra purple
 * @high_contrast: whether to strengthen contrast and borders
 *
 * Returns: (transfer full): a new immutable token snapshot
 */
AwraTokenSet *awra_token_set_new                 (gboolean       dark,
                                                  const GdkRGBA *accent,
                                                  gboolean       high_contrast);
gboolean      awra_token_set_get_dark            (AwraTokenSet  *self);
const GdkRGBA *awra_token_set_get_background     (AwraTokenSet  *self);
const GdkRGBA *awra_token_set_get_foreground     (AwraTokenSet  *self);
const GdkRGBA *awra_token_set_get_accent         (AwraTokenSet  *self);
const GdkRGBA *awra_token_set_get_border         (AwraTokenSet  *self);
double        awra_token_set_get_window_opacity  (AwraTokenSet  *self);
double        awra_token_set_get_surface_opacity (AwraTokenSet  *self);
double        awra_token_set_get_radius          (AwraTokenSet  *self);
double        awra_token_set_get_border_width    (AwraTokenSet  *self);

G_END_DECLS
