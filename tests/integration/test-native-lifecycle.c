/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static void
quit_loop (gpointer data)
{
  g_main_loop_quit (data);
}

static void
iterate_for (guint milliseconds)
{
  g_autoptr (GMainLoop) loop = g_main_loop_new (NULL, FALSE);

  g_timeout_add_once (milliseconds, quit_loop, loop);
  g_main_loop_run (loop);
}

int
main (int   argc,
      char *argv[])
{
  g_autoptr (GtkApplication) app = NULL;
  g_autoptr (GError) error = NULL;
  GtkWidget *window;
  GtkWidget *menu_button;
  GtkWidget *popover;
  AwraDiagnostics *diagnostics;
  gboolean blur;

  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) {
    g_test_message ("No display available; skipping native lifecycle test");
    return 77;
  }

  app = gtk_application_new ("org.awra.TestNativeLifecycle",
                             G_APPLICATION_NON_UNIQUE);
  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);

  window = awra_window_new (app);
  menu_button = awra_menu_button_new ();
  popover = awra_popover_new ();
  awra_popover_set_child (AWRA_POPOVER (popover), gtk_label_new ("Native popup"));
  awra_menu_button_set_label (AWRA_MENU_BUTTON (menu_button), "Open");
  awra_menu_button_set_popover (AWRA_MENU_BUTTON (menu_button),
                                AWRA_POPOVER (popover));
  awra_window_set_content (AWRA_WINDOW (window), menu_button);
  gtk_window_present (GTK_WINDOW (window));
  gtk_test_widget_wait_for_draw (window);

  diagnostics = awra_context_get_diagnostics (
    awra_context_get_for_display (gtk_widget_get_display (window)));
  blur = (awra_diagnostics_get_capabilities (diagnostics) &
          AWRA_EFFECT_CAPABILITY_BLUR) != 0;
  g_assert_cmpuint (awra_diagnostics_get_native_surfaces (diagnostics), ==, 1);
  g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics),
                    ==,
                    blur ? 1 : 0);

  for (guint i = 0; i < 3; i++) {
    awra_menu_button_popup (AWRA_MENU_BUTTON (menu_button));
    iterate_for (80);
    g_assert_true (gtk_widget_get_mapped (popover));
    g_assert_cmpuint (awra_diagnostics_get_native_surfaces (diagnostics), ==, 2);
    g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics),
                      ==,
                      blur ? 2 : 0);

    awra_menu_button_popdown (AWRA_MENU_BUTTON (menu_button));
    iterate_for (80);
    g_assert_false (gtk_widget_get_mapped (popover));
    g_assert_cmpuint (awra_diagnostics_get_native_surfaces (diagnostics), ==, 1);
    g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics),
                      ==,
                      blur ? 1 : 0);
  }

  gtk_window_destroy (GTK_WINDOW (window));
  iterate_for (20);
  g_assert_cmpuint (awra_diagnostics_get_native_surfaces (diagnostics), ==, 0);
  g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics), ==, 0);
  return 0;
}
