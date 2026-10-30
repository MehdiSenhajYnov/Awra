/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra.h>

static guint setups;
static void setup (GtkSignalListItemFactory *factory, GtkListItem *item, gpointer data)
{
  (void) factory; (void) data;
  setups++;
  gtk_list_item_set_child (item, gtk_label_new ("Collection item"));
}

static void spin (void)
{
  gint64 end = g_get_monotonic_time () + 300 * G_TIME_SPAN_MILLISECOND;
  while (g_get_monotonic_time () < end) {
    while (g_main_context_iteration (NULL, FALSE));
    g_usleep (1000);
  }
}

static void grid_contract (void)
{
  g_autoptr (GtkStringList) items = gtk_string_list_new (NULL);
  g_autoptr (GtkMultiSelection) selection = NULL;
  g_autoptr (GtkListItemFactory) factory = gtk_signal_list_item_factory_new ();
  GtkWidget *window = gtk_window_new ();
  GtkWidget *grid;
  for (guint i = 0; i < 20000; i++)
    gtk_string_list_append (items, "Item");
  selection = gtk_multi_selection_new (G_LIST_MODEL (g_object_ref (items)));
  g_signal_connect (factory, "setup", G_CALLBACK (setup), NULL);
  grid = awra_grid_view_new (GTK_SELECTION_MODEL (selection), factory);
  g_assert_true (awra_grid_view_get_model (AWRA_GRID_VIEW (grid)) == GTK_SELECTION_MODEL (selection));
  g_assert_true (awra_grid_view_get_factory (AWRA_GRID_VIEW (grid)) == factory);
  g_assert_true (gtk_grid_view_get_enable_rubberband (awra_grid_view_get_delegate (AWRA_GRID_VIEW (grid))));
  gtk_window_set_default_size (GTK_WINDOW (window), 640, 480);
  gtk_window_set_child (GTK_WINDOW (window), grid);
  gtk_window_present (GTK_WINDOW (window));
  spin ();
  g_assert_cmpuint (setups, >, 0);
  g_assert_cmpuint (setups, <, 2000); /* GTK recycles a bounded viewport. */
  gtk_selection_model_select_item (GTK_SELECTION_MODEL (selection), 19999, FALSE);
  g_assert_true (gtk_selection_model_is_selected (GTK_SELECTION_MODEL (selection), 19999));
  awra_grid_view_set_model (AWRA_GRID_VIEW (grid), NULL);
  g_assert_null (awra_grid_view_get_model (AWRA_GRID_VIEW (grid)));
  awra_grid_view_set_factory (AWRA_GRID_VIEW (grid), NULL);
  g_assert_null (awra_grid_view_get_factory (AWRA_GRID_VIEW (grid)));
  gtk_window_destroy (GTK_WINDOW (window));
  spin ();
}

static void breadcrumb_overflow (void)
{
  g_autoptr (GListStore) model = g_list_store_new (AWRA_TYPE_BREADCRUMB_ITEM);
  GtkWidget *window = gtk_window_new ();
  GtkWidget *bar = awra_breadcrumb_bar_new ();
  for (guint i = 0; i < 30; i++) {
    g_autoptr (AwraBreadcrumbItem) item = awra_breadcrumb_item_new ("A long directory name", "directory");
    g_list_store_append (model, item);
  }
  awra_breadcrumb_bar_set_model (AWRA_BREADCRUMB_BAR (bar), G_LIST_MODEL (model));
  gtk_window_set_default_size (GTK_WINDOW (window), 320, 100);
  gtk_window_set_child (GTK_WINDOW (window), bar);
  gtk_window_present (GTK_WINDOW (window));
  spin ();
  g_assert_cmpint (gtk_widget_get_width (bar), <=, 320);
  GtkScrolledWindow *scroller = GTK_SCROLLED_WINDOW (gtk_widget_get_first_child (bar));
  GtkAdjustment *adjustment = gtk_scrolled_window_get_hadjustment (scroller);
  g_assert_cmpfloat (gtk_adjustment_get_value (adjustment), >, 0);
  gtk_widget_set_direction (bar, GTK_TEXT_DIR_RTL);
  g_signal_emit_by_name (adjustment, "changed");
  g_assert_cmpfloat (gtk_adjustment_get_value (adjustment), ==, gtk_adjustment_get_lower (adjustment));
  gtk_window_destroy (GTK_WINDOW (window));
  spin ();
}

int main (int argc, char **argv)
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) return 77;
  awra_init ();
  g_test_add_func ("/awra/grid/virtualization-model-lifecycle", grid_contract);
  g_test_add_func ("/awra/breadcrumb/overflow", breadcrumb_overflow);
  return g_test_run ();
}
