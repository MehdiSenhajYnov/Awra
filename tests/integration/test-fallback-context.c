/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

int
main (int   argc,
      char *argv[])
{
  AwraContext *context;
  AwraDiagnostics *diagnostics;
  g_autofree char *report = NULL;

  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) {
    g_test_message ("No display available; skipping context integration test");
    return 77;
  }

  context = awra_context_get_for_display (gdk_display_get_default ());
  diagnostics = awra_context_get_diagnostics (context);
  g_assert_cmpstr (awra_diagnostics_get_effect_backend (diagnostics),
                   ==,
                   "generic-fallback");
  g_assert_cmpint (awra_diagnostics_get_capabilities (diagnostics),
                   ==,
                   AWRA_EFFECT_CAPABILITY_NONE);
  g_assert_nonnull (awra_diagnostics_get_fallback_reason (diagnostics));
  report = awra_diagnostics_dup_report (diagnostics);
  g_assert_nonnull (strstr (report, "effect-backend: generic-fallback"));
  g_assert_nonnull (strstr (report, "effect-regions:"));
  return 0;
}
