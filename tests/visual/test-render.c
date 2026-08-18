/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>
#include <glib/gstdio.h>

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

static GdkTexture *
render_texture (GtkWidget *widget)
{
  g_autoptr (GtkSnapshot) snapshot = gtk_snapshot_new ();
  g_autoptr (GskRenderNode) node = NULL;
  graphene_rect_t bounds;
  GskRenderer *renderer;

  GTK_WIDGET_GET_CLASS (widget)->snapshot (widget, snapshot);
  node = gtk_snapshot_to_node (snapshot);
  g_assert_nonnull (node);
  gsk_render_node_get_bounds (node, &bounds);
  renderer = gtk_native_get_renderer (gtk_widget_get_native (widget));
  g_assert_nonnull (renderer);
  return gsk_renderer_render_texture (renderer, node, &bounds);
}

static void
analyze_and_maybe_save_grayscale (GdkTexture *texture)
{
  g_autoptr (GdkTextureDownloader) downloader =
    gdk_texture_downloader_new (texture);
  g_autoptr (GBytes) source = NULL;
  g_autoptr (GBytes) grayscale_bytes = NULL;
  g_autoptr (GdkTexture) grayscale = NULL;
  g_autofree guchar *pixels = NULL;
  gsize stride;
  gsize size;
  const guchar *data;
  int width = gdk_texture_get_width (texture);
  int height = gdk_texture_get_height (texture);
  double sum = 0.0;
  double sum_squared = 0.0;
  double edge_sum = 0.0;
  gsize samples = 0;
  const char *output_dir = g_getenv ("AWRA_VISUAL_OUTPUT_DIR");

  gdk_texture_downloader_set_format (
    downloader, GDK_MEMORY_R8G8B8A8_PREMULTIPLIED);
  source = gdk_texture_downloader_download_bytes (downloader, &stride);
  data = g_bytes_get_data (source, &size);
  pixels = g_memdup2 (data, size);
  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      gsize offset = (gsize) y * stride + (gsize) x * 4;
      guchar value = (guchar) ((54 * data[offset] +
                                183 * data[offset + 1] +
                                19 * data[offset + 2]) >> 8);
      double normalized = value / 255.0;

      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      sum += normalized;
      sum_squared += normalized * normalized;
      if (x > 0) {
        gsize previous = offset - 4;
        guchar previous_value = (guchar) ((54 * data[previous] +
                                           183 * data[previous + 1] +
                                           19 * data[previous + 2]) >> 8);
        edge_sum += ABS ((int) value - (int) previous_value) / 255.0;
      }
      samples++;
    }
  }
  g_assert_cmpfloat (sum_squared / samples -
                     (sum / samples) * (sum / samples), >, 0.002);
  g_assert_cmpfloat (edge_sum / MAX ((gsize) 1, samples - height), >, 0.003);

  grayscale_bytes = g_bytes_new_take (g_steal_pointer (&pixels), size);
  grayscale = gdk_memory_texture_new (
    width, height, GDK_MEMORY_R8G8B8A8_PREMULTIPLIED,
    grayscale_bytes, stride);
  if (output_dir != NULL) {
    g_autofree char *blue_path = NULL;
    g_autofree char *gray_path = NULL;

    g_assert_cmpint (g_mkdir_with_parents (output_dir, 0755), ==, 0);
    blue_path = g_build_filename (output_dir, "awra-blue.png", NULL);
    gray_path = g_build_filename (output_dir, "awra-blue-grayscale.png", NULL);
    g_assert_true (gdk_texture_save_to_png (texture, blue_path));
    g_assert_true (gdk_texture_save_to_png (grayscale, gray_path));
  }
}

static void
test_deterministic_scene (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestVisual",
    G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  g_autoptr (AwraMaterial) material = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_FLOATING);
  g_autoptr (AwraTokenSet) default_tokens = NULL;
  g_autoptr (GdkTexture) blue_texture = NULL;
  g_autoptr (GMainLoop) loop = g_main_loop_new (NULL, FALSE);
  g_autofree char *light_a = NULL;
  g_autofree char *light_b = NULL;
  g_autofree char *dark = NULL;
  g_autofree char *default_dark = NULL;
  g_autofree char *blue_dark = NULL;
  GtkWidget *window;
  GtkWidget *surface;
  GtkWidget *box;
  AwraStyleManager *manager;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  window = awra_window_new (app);
  gtk_window_set_default_size (GTK_WINDOW (window), 420, 340);
  surface = awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD);
  awra_surface_set_material (AWRA_SURFACE (surface), material);
  awra_surface_set_radius (AWRA_SURFACE (surface), 24.0);
  awra_surface_set_elevation (AWRA_SURFACE (surface), 3);
  box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  awra_box_set_spacing (GTK_BOX (box), AWRA_SPACING_SM);
  awra_widget_set_margin (box, AWRA_SPACING_XL);
  {
    GtkWidget *title = gtk_label_new ("Deterministic Awra scene");
    GtkWidget *button = awra_button_new_with_label ("Continue");
    GtkWidget *segments = awra_segmented_control_new ();
    GtkWidget *entry = awra_entry_new ();
    GtkWidget *switcher = awra_switch_new ();
    GtkWidget *slider = awra_slider_new_with_range (
      GTK_ORIENTATION_HORIZONTAL, 0, 100, 1);
    GtkWidget *row = awra_action_row_new (
      "Selected layer", "Floating material · 72%");

    awra_widget_set_typography (title, AWRA_TYPOGRAPHY_TITLE_2);
    awra_button_set_appearance (AWRA_BUTTON (button),
                                AWRA_BUTTON_APPEARANCE_PRIMARY);
    awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Canvas");
    awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Details");
    awra_segmented_control_set_selected (AWRA_SEGMENTED_CONTROL (segments), 1);
    gtk_editable_set_text (GTK_EDITABLE (entry), "Material and restraint");
    awra_switch_set_active (AWRA_SWITCH (switcher), TRUE);
    gtk_range_set_value (GTK_RANGE (slider), 72);
    awra_action_row_set_icon_name (AWRA_ACTION_ROW (row),
                                   "applications-graphics-symbolic");
    awra_action_row_set_suffix (AWRA_ACTION_ROW (row),
                                awra_badge_new ("ACTIVE"));
    gtk_box_append (GTK_BOX (box), title);
    gtk_box_append (GTK_BOX (box), entry);
    gtk_box_append (GTK_BOX (box), segments);
    gtk_box_append (GTK_BOX (box), slider);
    gtk_box_append (GTK_BOX (box), switcher);
    gtk_box_append (GTK_BOX (box), row);
    gtk_box_append (GTK_BOX (box), button);
  }
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
  awra_style_manager_set_accent_source (manager, AWRA_ACCENT_SOURCE_DEFAULT);
  default_dark = snapshot_checksum (surface);
  default_tokens = awra_token_set_new (TRUE, NULL, FALSE);
  g_assert_true (gdk_rgba_equal (awra_style_manager_get_accent (manager),
                                 awra_token_set_get_accent (default_tokens)));

  awra_style_manager_set_accent_source (manager, AWRA_ACCENT_SOURCE_SYSTEM);
  if (!awra_style_manager_get_system_accent_available (manager))
    g_assert_true (gdk_rgba_equal (awra_style_manager_get_accent (manager),
                                   awra_token_set_get_accent (default_tokens)));
  {
    const GdkRGBA blue = { 0.19, 0.36, 0.94, 1.0 };

    awra_style_manager_set_accent (manager, &blue);
  }
  g_timeout_add (140, quit_loop_cb, loop);
  g_main_loop_run (loop);
  g_assert_cmpint (awra_style_manager_get_accent_source (manager), ==,
                   AWRA_ACCENT_SOURCE_CUSTOM);
  blue_dark = snapshot_checksum (surface);
  g_assert_cmpstr (default_dark, !=, blue_dark);
  blue_texture = render_texture (surface);
  analyze_and_maybe_save_grayscale (blue_texture);
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
