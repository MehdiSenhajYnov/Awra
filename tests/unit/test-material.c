/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>
#include <math.h>

#include "material/awra-material-resolver-private.h"
#include "tokens/awra-token-set-private.h"

static double
linear_channel (double value)
{
  return value <= 0.04045
           ? value / 12.92
           : pow ((value + 0.055) / 1.055, 2.4);
}

static double
luminance (const GdkRGBA *color)
{
  return 0.2126 * linear_channel (color->red) +
         0.7152 * linear_channel (color->green) +
         0.0722 * linear_channel (color->blue);
}

static double
contrast_ratio (const GdkRGBA *a,
                const GdkRGBA *b)
{
  double first = luminance (a);
  double second = luminance (b);

  return (MAX (first, second) + 0.05) / (MIN (first, second) + 0.05);
}

static GdkRGBA
composite (const GdkRGBA *foreground,
           const GdkRGBA *background)
{
  return (GdkRGBA) {
    foreground->red * foreground->alpha +
      background->red * (1.0 - foreground->alpha),
    foreground->green * foreground->alpha +
      background->green * (1.0 - foreground->alpha),
    foreground->blue * foreground->alpha +
      background->blue * (1.0 - foreground->alpha),
    1.0,
  };
}

static void
test_tokens (void)
{
  g_autoptr (AwraTokenSet) light = awra_token_set_new (FALSE, NULL, FALSE);
  g_autoptr (AwraTokenSet) dark = awra_token_set_new (TRUE, NULL, FALSE);
  g_autoptr (AwraTokenSet) contrast = awra_token_set_new (TRUE, NULL, TRUE);

  g_assert_false (awra_token_set_get_dark (light));
  g_assert_true (awra_token_set_get_dark (dark));
  g_assert_cmpfloat (awra_token_set_get_background (light)->red,
                     >,
                     awra_token_set_get_background (dark)->red);
  g_assert_cmpfloat (awra_token_set_get_border_width (contrast),
                     >,
                     awra_token_set_get_border_width (dark));
  g_assert_cmpfloat (awra_token_set_get_spacing (dark, AWRA_SPACING_XS),
                     <,
                     awra_token_set_get_spacing (dark, AWRA_SPACING_XXL));
  g_assert_cmpfloat (awra_token_set_get_spacing (dark, AWRA_SPACING_NONE),
                     ==, 0.0);
  g_assert_cmpfloat (awra_token_set_get_radius_for_size (
                       dark, AWRA_RADIUS_SMALL),
                     <,
                     awra_token_set_get_radius_for_size (
                       dark, AWRA_RADIUS_WINDOW));
  g_assert_cmpfloat (awra_token_set_get_surface_content (dark)->alpha,
                     ==,
                     0.0);
  g_assert_cmpfloat (awra_token_set_get_surface_chrome (dark)->alpha,
                     <,
                     awra_token_set_get_surface_canvas (dark)->alpha);
  g_assert_cmpfloat (awra_token_set_get_surface_layer (dark)->alpha,
                     <,
                     awra_token_set_get_surface_canvas (dark)->alpha);
  g_assert_cmpfloat_with_epsilon (
    awra_token_set_get_surface_floating (dark)->red,
    37.0 / 255.0, 0.000001);
  g_assert_cmpfloat_with_epsilon (
    awra_token_set_get_surface_floating (dark)->alpha,
    0.60, 0.000001);
  g_assert_cmpfloat_with_epsilon (
    awra_token_set_get_surface_canvas (dark)->red,
    35.0 / 255.0, 0.000001);
  g_assert_cmpfloat_with_epsilon (
    awra_token_set_get_surface_canvas (dark)->alpha,
    0.60, 0.000001);
  g_assert_cmpfloat (awra_token_set_get_grain_scale (dark), ==, 0.20);
}

static void
test_light_contrast_and_states (void)
{
  g_autoptr (AwraTokenSet) light = awra_token_set_new (FALSE, NULL, FALSE);
  g_autoptr (AwraTokenSet) contrast = awra_token_set_new (FALSE, NULL, TRUE);
  const GdkRGBA *background = awra_token_set_get_background (light);
  const GdkRGBA *foreground = awra_token_set_get_foreground (light);
  GdkRGBA control = composite (
    awra_token_set_get_control_background (light), background);
  GdkRGBA hover = composite (awra_token_set_get_control_hover (light), background);
  GdkRGBA pressed = composite (awra_token_set_get_control_pressed (light), background);
  GdkRGBA selected = composite (awra_token_set_get_selection (light), background);
  GdkRGBA disabled = composite (
    awra_token_set_get_disabled_foreground (light), &control);
  GdkRGBA focus = composite (awra_token_set_get_focus_ring (light), background);

  g_assert_cmpfloat (contrast_ratio (foreground, background), >=, 12.0);
  g_assert_cmpfloat (contrast_ratio (
                       awra_token_set_get_muted_foreground (light), background),
                     >=, 4.5);
  g_assert_cmpfloat (contrast_ratio (foreground, &control), >=, 12.0);
  g_assert_cmpfloat (contrast_ratio (foreground, &hover), >=, 12.0);
  g_assert_cmpfloat (contrast_ratio (foreground, &pressed), >=, 7.0);
  g_assert_cmpfloat (contrast_ratio (foreground, &selected), >=, 7.0);
  g_assert_cmpfloat (contrast_ratio (&disabled, &control), >=, 3.0);
  g_assert_cmpfloat (contrast_ratio (&focus, background), >=, 3.0);
  g_assert_cmpfloat (awra_token_set_get_outline (light)->alpha, >=, 0.16);
  g_assert_cmpfloat (awra_token_set_get_separator (light)->alpha,
                     <,
                     awra_token_set_get_outline (light)->alpha);
  g_assert_cmpfloat (awra_token_set_get_disabled_foreground (light)->alpha,
                     >=, 0.50);
  g_assert_cmpfloat (awra_token_set_get_window_opacity (light), >=, 0.85);
  g_assert_cmpfloat (awra_token_set_get_surface_opacity (light), >=, 0.90);
  g_assert_cmpfloat (awra_token_set_get_control_well (light)->alpha, >, 0.08);
  g_assert_cmpfloat (awra_token_set_get_control_thumb (light)->alpha, ==, 1.0);
  g_assert_cmpfloat (contrast_ratio (
                       awra_token_set_get_accent_content (light), background),
                     >=, 3.0);
  g_assert_cmpfloat (awra_token_set_get_border (contrast)->alpha,
                     >, awra_token_set_get_border (light)->alpha);
  g_assert_cmpfloat (awra_token_set_get_border_width (contrast),
                     >, awra_token_set_get_border_width (light));
}

static void
test_semantic_presets (void)
{
  g_autoptr (AwraTokenSet) tokens = awra_token_set_new (TRUE, NULL, FALSE);
  g_autoptr (AwraMaterial) canvas = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_CANVAS);
  g_autoptr (AwraMaterial) content = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_CONTENT);
  g_autoptr (AwraMaterial) chrome = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_CHROME);
  g_autoptr (AwraMaterial) layer = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_LAYER);
  g_autoptr (AwraMaterial) floating = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_FLOATING);
  g_autoptr (AwraMaterial) opaque = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_OPAQUE);
  AwraResolvedMaterial result;

  g_assert_cmpint (awra_material_get_preset (canvas), ==,
                   AWRA_MATERIAL_PRESET_CANVAS);
  g_assert_cmpstr (awra_material_get_name (canvas), ==, "canvas");
  g_assert_cmpint (awra_material_get_kind (canvas), ==,
                   AWRA_MATERIAL_KIND_FROSTED);
  awra_material_resolve (canvas, tokens, AWRA_SURFACE_ROLE_WINDOW,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLAT, &result);
  g_assert_true (result.request_blur);
  g_assert_cmpfloat (result.fill.alpha, ==,
                     awra_token_set_get_surface_canvas (tokens)->alpha);
  g_assert_cmpint (result.border_edges, ==, AWRA_SURFACE_EDGE_ALL);

  awra_material_resolve (content, tokens, AWRA_SURFACE_ROLE_CONTENT,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLAT, &result);
  g_assert_cmpfloat (result.fill.alpha, ==, 0.0);
  g_assert_cmpint (result.border_edges, ==, AWRA_SURFACE_EDGE_NONE);

  awra_material_resolve (chrome, tokens, AWRA_SURFACE_ROLE_SIDEBAR,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLAT, &result);
  g_assert_cmpint (result.border_edges, ==, AWRA_SURFACE_EDGE_END);
  g_assert_cmpfloat (result.radius, >, 0.0);
  g_assert_false (result.request_blur);

  awra_material_resolve (layer, tokens, AWRA_SURFACE_ROLE_CARD,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLAT, &result);
  g_assert_cmpint (result.border_edges, ==, AWRA_SURFACE_EDGE_NONE);
  g_assert_cmpfloat (result.fill.alpha, <,
                     awra_token_set_get_surface_canvas (tokens)->alpha);

  awra_material_resolve (floating, tokens, AWRA_SURFACE_ROLE_POPOVER,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLOATING, &result);
  g_assert_true (result.request_blur);
  g_assert_cmpint (result.border_edges, ==, AWRA_SURFACE_EDGE_ALL);

  awra_material_resolve (opaque, tokens, AWRA_SURFACE_ROLE_CARD,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLAT, &result);
  g_assert_cmpfloat (result.fill.alpha, ==, 1.0);
  g_assert_false (result.request_blur);
}

static void
test_material_tuning_tokens (void)
{
  const GdkRGBA tint = { 0.12, 0.18, 0.25, 0.37 };
  g_autoptr (AwraTokenSet) tokens = awra_token_set_new_with_tuning (
    TRUE, NULL, FALSE, &tint, 2.0);
  g_autoptr (AwraMaterial) canvas = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_CANVAS);
  AwraResolvedMaterial resolved;

  g_assert_true (gdk_rgba_equal (
    awra_token_set_get_surface_canvas (tokens), &tint));
  g_assert_cmpfloat_with_epsilon (
    awra_token_set_get_window_opacity (tokens), 0.37, 0.000001);
  g_assert_cmpfloat (awra_token_set_get_grain_scale (tokens), ==, 2.0);
  awra_material_resolve (canvas, tokens, AWRA_SURFACE_ROLE_WINDOW,
                         TRUE, TRUE, FALSE, AWRA_ELEVATION_FLAT, &resolved);
  g_assert_cmpfloat (resolved.grain_opacity, ==, 0.032);
  g_assert_true (resolved.request_blur);

  awra_material_resolve (canvas, tokens, AWRA_SURFACE_ROLE_WINDOW,
                         TRUE, FALSE, FALSE, AWRA_ELEVATION_FLAT, &resolved);
  g_assert_false (resolved.request_blur);
  g_assert_true (resolved.fallback);
  g_assert_cmpfloat (resolved.fill.red, ==, tint.red);
  g_assert_cmpfloat (resolved.fill.green, ==, tint.green);
  g_assert_cmpfloat (resolved.fill.blue, ==, tint.blue);
  g_assert_cmpfloat (resolved.fill.alpha, ==, 1.0);
}

static void
test_solid_and_translucent (void)
{
  g_autoptr (AwraTokenSet) tokens = awra_token_set_new (TRUE, NULL, FALSE);
  g_autoptr (AwraMaterial) solid = awra_material_new_solid ();
  g_autoptr (AwraMaterial) translucent = awra_material_new_translucent ();
  AwraResolvedMaterial result;

  awra_material_resolve (solid,
                         tokens,
                         AWRA_SURFACE_ROLE_CARD,
                         TRUE,
                         TRUE,
                         FALSE,
                         0,
                         &result);
  g_assert_cmpfloat (result.fill.alpha, ==, 1.0);
  g_assert_false (result.request_blur);
  g_assert_false (result.fallback);

  awra_material_resolve (translucent,
                         tokens,
                         AWRA_SURFACE_ROLE_CARD,
                         TRUE,
                         TRUE,
                         FALSE,
                         0,
                         &result);
  g_assert_cmpfloat (result.fill.alpha, <, 1.0);
  g_assert_false (result.request_blur);
}

static void
test_frosted_matrix (void)
{
  g_autoptr (AwraTokenSet) tokens = awra_token_set_new (TRUE, NULL, FALSE);
  g_autoptr (AwraMaterial) frosted = awra_material_new_frosted ();
  AwraResolvedMaterial active;
  AwraResolvedMaterial inactive;
  AwraResolvedMaterial unavailable;
  AwraResolvedMaterial reduced;

  awra_material_resolve (frosted,
                         tokens,
                         AWRA_SURFACE_ROLE_WINDOW,
                         TRUE,
                         TRUE,
                         FALSE,
                         4,
                         &active);
  awra_material_resolve (frosted,
                         tokens,
                         AWRA_SURFACE_ROLE_WINDOW,
                         FALSE,
                         TRUE,
                         FALSE,
                         4,
                         &inactive);
  g_assert_true (active.request_blur);
  g_assert_true (inactive.request_blur);
  g_assert_cmpfloat (active.fill.alpha, ==, inactive.fill.alpha);
  g_assert_cmpfloat (active.fill.red, ==, inactive.fill.red);
  g_assert_cmpfloat (active.fill.green, ==, inactive.fill.green);
  g_assert_cmpfloat (active.fill.blue, ==, inactive.fill.blue);
  g_assert_cmpfloat (active.border.red, ==, inactive.border.red);
  g_assert_cmpfloat (active.border.green, ==, inactive.border.green);
  g_assert_cmpfloat (active.border.blue, ==, inactive.border.blue);
  g_assert_cmpfloat (active.highlight.alpha, ==, inactive.highlight.alpha);
  g_assert_cmpfloat (active.border.alpha, ==, inactive.border.alpha);
  g_assert_cmpfloat (active.shadow.alpha, ==, inactive.shadow.alpha);

  /* Floating surfaces are equally stable. Native-window focus must not alter
   * a material recipe, even at the decorative outline/shadow layer. */
  awra_material_resolve (frosted,
                         tokens,
                         AWRA_SURFACE_ROLE_FLOATING,
                         FALSE,
                         TRUE,
                         FALSE,
                         4,
                         &inactive);
  g_assert_cmpfloat (active.fill.alpha, ==, inactive.fill.alpha);
  g_assert_true (inactive.request_blur);
  g_assert_cmpfloat (active.border.alpha, ==, inactive.border.alpha);
  g_assert_cmpfloat (active.highlight.alpha, ==, inactive.highlight.alpha);
  g_assert_cmpfloat (active.shadow.alpha, ==, inactive.shadow.alpha);

  awra_material_resolve (frosted,
                         tokens,
                         AWRA_SURFACE_ROLE_WINDOW,
                         TRUE,
                         FALSE,
                         FALSE,
                         4,
                         &unavailable);
  g_assert_false (unavailable.request_blur);
  g_assert_true (unavailable.fallback);
  g_assert_cmpfloat (unavailable.fill.alpha, ==, 1.0);

  awra_material_resolve (frosted,
                         tokens,
                         AWRA_SURFACE_ROLE_WINDOW,
                         TRUE,
                         TRUE,
                         TRUE,
                         4,
                         &reduced);
  g_assert_false (reduced.request_blur);
  g_assert_true (reduced.fallback);
  g_assert_cmpfloat (reduced.fill.alpha, ==, 1.0);
}

int
main (int   argc,
      char *argv[])
{
  g_test_init (&argc, &argv, NULL);
  g_test_add_func ("/awra/tokens/profiles", test_tokens);
  g_test_add_func ("/awra/tokens/light-contrast-states",
                   test_light_contrast_and_states);
  g_test_add_func ("/awra/material/basic", test_solid_and_translucent);
  g_test_add_func ("/awra/material/semantic-presets", test_semantic_presets);
  g_test_add_func ("/awra/material/tuning-tokens",
                   test_material_tuning_tokens);
  g_test_add_func ("/awra/material/frosted-matrix", test_frosted_matrix);
  return g_test_run ();
}
