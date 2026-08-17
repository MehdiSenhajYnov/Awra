/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

#include "material/awra-material-resolver-private.h"

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
  g_assert_cmpfloat (active.highlight.alpha, >, inactive.highlight.alpha);

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
  g_test_add_func ("/awra/material/basic", test_solid_and_translucent);
  g_test_add_func ("/awra/material/frosted-matrix", test_frosted_matrix);
  return g_test_run ();
}

