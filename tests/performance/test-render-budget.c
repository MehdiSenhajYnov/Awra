/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static GtkWidget *
make_scene (void)
{
  GtkWidget *page = awra_page_new ();
  GtkWidget *box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  GtkWidget *header = awra_page_header_new ();

  awra_page_header_set_title (AWRA_PAGE_HEADER (header),
                              "Rendering budget reference scene");
  awra_page_header_set_subtitle (AWRA_PAGE_HEADER (header),
                                 "Layer, typography, controls and grain");
  awra_box_apply_layout_preset (GTK_BOX (box), AWRA_LAYOUT_PRESET_PAGE);
  gtk_box_append (GTK_BOX (box), header);
  for (guint i = 0; i < 18; i++) {
    GtkWidget *card = awra_card_new ();
    GtkWidget *row = awra_action_row_new (
      i % 2 == 0 ? "Virtualized data row" : "Material detail",
      "A repeatable workload for CPU snapshot construction");

    awra_card_set_appearance (AWRA_CARD (card),
                              i % 4 == 0
                                ? AWRA_CARD_APPEARANCE_RAISED
                                : AWRA_CARD_APPEARANCE_TINTED);
    awra_card_set_child (AWRA_CARD (card), row);
    gtk_box_append (GTK_BOX (box), card);
  }
  awra_page_set_child (AWRA_PAGE (page), box);
  return page;
}

static double
measure_snapshot_ms (GtkWidget *widget,
                     guint      iterations)
{
  gint64 start = g_get_monotonic_time ();

  for (guint i = 0; i < iterations; i++) {
    g_autoptr (GtkSnapshot) snapshot = gtk_snapshot_new ();
    g_autoptr (GskRenderNode) node = NULL;

    GTK_WIDGET_GET_CLASS (widget)->snapshot (widget, snapshot);
    node = gtk_snapshot_to_node (snapshot);
    g_assert_nonnull (node);
  }
  return (g_get_monotonic_time () - start) / 1000.0 / iterations;
}

static void
test_snapshot_budget (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestRenderBudget", G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  GtkWidget *window;
  GtkWidget *scene;
  double average_ms;
  double ceiling_ms = g_getenv ("AWRA_PERFORMANCE_STRICT") != NULL
                        ? 16.7 : 100.0;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  window = awra_window_new (app);
  scene = make_scene ();
  awra_window_set_content (AWRA_WINDOW (window), scene);
  gtk_window_set_default_size (GTK_WINDOW (window), 1920, 1080);
  gtk_window_present (GTK_WINDOW (window));
  gtk_test_widget_wait_for_draw (window);

  /* Warm caches, including the one process-wide grain texture. */
  (void) measure_snapshot_ms (scene, 4);
  average_ms = measure_snapshot_ms (scene, 60);
  g_test_message ("average CPU snapshot: %.3f ms (ceiling %.1f ms)",
                  average_ms, ceiling_ms);
  g_assert_cmpfloat (average_ms, <, ceiling_ms);

  gtk_window_destroy (GTK_WINDOW (window));
}

int
main (int argc, char **argv)
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ())
    return 77;
  g_test_add_func ("/awra/performance/snapshot-budget", test_snapshot_budget);
  return g_test_run ();
}
