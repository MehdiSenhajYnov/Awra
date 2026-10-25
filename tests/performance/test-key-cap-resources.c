/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

#ifdef G_OS_WIN32
#include <windows.h>

typedef struct {
  GMainLoop *loop;
  AwraKeyCap *caps[24];
  guint samples;
  DWORD warm_gdi;
  DWORD final_gdi;
} AnimationRun;

static gboolean
sample_animation (gpointer data)
{
  AnimationRun *run = data;

  for (guint i = 0; i < G_N_ELEMENTS (run->caps); i++)
    awra_key_cap_flash (run->caps[i]);

  run->samples++;
  if (run->samples == 10)
    run->warm_gdi = GetGuiResources (GetCurrentProcess (), GR_GDIOBJECTS);
  if (run->samples == 60) {
    run->final_gdi = GetGuiResources (GetCurrentProcess (), GR_GDIOBJECTS);
    g_main_loop_quit (run->loop);
    return G_SOURCE_REMOVE;
  }
  return G_SOURCE_CONTINUE;
}
#endif

static void
test_key_cap_gdi_budget (void)
{
#ifdef G_OS_WIN32
  GtkWidget *window = gtk_window_new ();
  GtkWidget *grid = gtk_grid_new ();
  AnimationRun run = { 0 };

  run.loop = g_main_loop_new (NULL, FALSE);
  gtk_window_set_title (GTK_WINDOW (window), "Awra key animation resource test");
  gtk_window_set_child (GTK_WINDOW (window), grid);
  gtk_grid_set_row_spacing (GTK_GRID (grid), 6);
  gtk_grid_set_column_spacing (GTK_GRID (grid), 6);
  for (guint i = 0; i < G_N_ELEMENTS (run.caps); i++) {
    run.caps[i] = AWRA_KEY_CAP (awra_key_cap_new ("KeyA", "A"));
    awra_key_cap_set_bound (run.caps[i], TRUE);
    awra_key_cap_set_active (run.caps[i], TRUE);
    gtk_grid_attach (GTK_GRID (grid), GTK_WIDGET (run.caps[i]),
                     i % 8, i / 8, 1, 1);
  }
  gtk_window_present (GTK_WINDOW (window));
  g_timeout_add (100, sample_animation, &run);
  g_main_loop_run (run.loop);
  gtk_window_destroy (GTK_WINDOW (window));
  g_main_loop_unref (run.loop);

  /* Warm font and shadow caches first. Continuous playback must then have a
   * bounded GDI footprint, even with repeated key presses. Windows kills the
   * app when the process reaches its GDI handle limit (normally 10,000). */
  g_test_message ("GDI handles after warmup: %lu; after animation: %lu",
                  (unsigned long) run.warm_gdi, (unsigned long) run.final_gdi);
  g_assert_cmpuint (run.warm_gdi, >, 0);
  g_assert_cmpuint (run.final_gdi, <=, run.warm_gdi + 64);
#else
  g_test_skip ("Windows GDI resource regression");
#endif
}

int
main (int argc, char **argv)
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ())
    return 77;
  awra_init ();
  g_test_add_func ("/awra/performance/key-cap-gdi-budget", test_key_cap_gdi_budget);
  return g_test_run ();
}
