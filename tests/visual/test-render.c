/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static gboolean
quit_loop_cb (gpointer data)
{
  g_main_loop_quit (data);
  return G_SOURCE_REMOVE;
}

static char *
snapshot_checksum (GtkWidget *widget)
{
  g_autoptr (GtkSnapshot) snapshot = gtk_snapshot_new ();
  g_autoptr (GskRenderNode) node = NULL;
  g_autoptr (GBytes) bytes = NULL;
  graphene_rect_t bounds;

  GTK_WIDGET_GET_CLASS (widget)->snapshot (widget, snapshot);
  node = gtk_snapshot_to_node (snapshot);
  g_assert_nonnull (node);
  gsk_render_node_get_bounds (node, &bounds);
  g_assert_cmpfloat (bounds.size.width, >, 0.0f);
  g_assert_cmpfloat (bounds.size.height, >, 0.0f);
  bytes = gsk_render_node_serialize (node);
  return g_compute_checksum_for_bytes (G_CHECKSUM_SHA256, bytes);
}

static void
test_deterministic_scene (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestVisual",
    G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  g_autoptr (AwraMaterial) material = awra_material_new_frosted ();
  g_autoptr (GMainLoop) loop = g_main_loop_new (NULL, FALSE);
  g_autofree char *light_a = NULL;
  g_autofree char *light_b = NULL;
  g_autofree char *dark = NULL;
  GtkWidget *window;
  GtkWidget *surface;
  GtkWidget *box;
  AwraStyleManager *manager;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  window = awra_window_new (app);
  gtk_window_set_default_size (GTK_WINDOW (window), 360, 240);
  surface = awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD);
  awra_surface_set_material (AWRA_SURFACE (surface), material);
  awra_surface_set_radius (AWRA_SURFACE (surface), 24.0);
  awra_surface_set_elevation (AWRA_SURFACE (surface), 3);
  box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 8);
  gtk_widget_set_margin_top (box, 24);
  gtk_widget_set_margin_bottom (box, 24);
  gtk_widget_set_margin_start (box, 24);
  gtk_widget_set_margin_end (box, 24);
  gtk_box_append (GTK_BOX (box), gtk_label_new ("Deterministic Awra scene"));
  gtk_box_append (GTK_BOX (box), awra_badge_new ("0.1"));
  awra_surface_set_child (AWRA_SURFACE (surface), box);
  awra_window_set_content (AWRA_WINDOW (window), surface);
  gtk_window_present (GTK_WINDOW (window));
  g_timeout_add (80, quit_loop_cb, loop);
  g_main_loop_run (loop);

  manager = awra_context_get_style_manager (
    awra_context_get_for_display (gtk_widget_get_display (window)));
  awra_style_manager_set_appearance (manager, AWRA_APPEARANCE_LIGHT);
  light_a = snapshot_checksum (surface);
  light_b = snapshot_checksum (surface);
  g_assert_cmpstr (light_a, ==, light_b);

  awra_style_manager_set_appearance (manager, AWRA_APPEARANCE_DARK);
  dark = snapshot_checksum (surface);
  g_assert_cmpstr (light_a, !=, dark);
  awra_style_manager_set_appearance (manager, AWRA_APPEARANCE_SYSTEM);
  gtk_window_destroy (GTK_WINDOW (window));
}

int
main (int   argc,
      char *argv[])
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) {
    g_test_message ("No display available; skipping visual tests");
    return 77;
  }
  g_test_add_func ("/awra/visual/deterministic-scene",
                   test_deterministic_scene);
  return g_test_run ();
}
