/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static void
iterate_for (guint milliseconds)
{
  g_autoptr (GMainLoop) loop = g_main_loop_new (NULL, FALSE);

  g_timeout_add_once (milliseconds, (GSourceOnceFunc) g_main_loop_quit, loop);
  g_main_loop_run (loop);
}

static char *
snapshot_checksum (GtkWidget *widget)
{
  g_autoptr (GtkSnapshot) snapshot = gtk_snapshot_new ();
  g_autoptr (GskRenderNode) node = NULL;
  g_autoptr (GdkTexture) texture = NULL;
  g_autoptr (GdkTextureDownloader) downloader = NULL;
  g_autoptr (GBytes) bytes = NULL;
  g_autoptr (GChecksum) checksum = g_checksum_new (G_CHECKSUM_SHA256);
  graphene_rect_t bounds;
  GskRenderer *renderer;
  gsize stride;
  gsize size;
  const guchar *data;

  GTK_WIDGET_GET_CLASS (widget)->snapshot (widget, snapshot);
  node = gtk_snapshot_to_node (snapshot);
  g_assert_nonnull (node);
  gsk_render_node_get_bounds (node, &bounds);
  renderer = gtk_native_get_renderer (gtk_widget_get_native (widget));
  g_assert_nonnull (renderer);
  texture = gsk_renderer_render_texture (renderer, node, &bounds);
  downloader = gdk_texture_downloader_new (texture);
  gdk_texture_downloader_set_format (
    downloader, GDK_MEMORY_R8G8B8A8_PREMULTIPLIED);
  bytes = gdk_texture_downloader_download_bytes (downloader, &stride);
  data = g_bytes_get_data (bytes, &size);
  g_checksum_update (checksum, (const guchar *) &stride, sizeof stride);
  g_checksum_update (checksum, data, size);
  return g_strdup (g_checksum_get_string (checksum));
}

static void
assert_root_invariants (AwraContext  *context,
                        AwraMaterial *material,
                        gboolean      blur_capable)
{
  g_autoptr (AwraMaterialResolution) active = NULL;
  g_autoptr (AwraMaterialResolution) inactive = NULL;

  active = awra_context_resolve_material (context, material,
                                          AWRA_SURFACE_ROLE_WINDOW,
                                          TRUE, AWRA_ELEVATION_FLAT);
  inactive = awra_context_resolve_material (context, material,
                                            AWRA_SURFACE_ROLE_WINDOW,
                                            FALSE, AWRA_ELEVATION_FLAT);
  g_assert_true (gdk_rgba_equal (
    awra_material_resolution_get_fill (active),
    awra_material_resolution_get_fill (inactive)));
  g_assert_cmpfloat (awra_material_resolution_get_radius (active), ==,
                     awra_material_resolution_get_radius (inactive));
  g_assert_cmpint (awra_material_resolution_get_request_blur (active), ==,
                   awra_material_resolution_get_request_blur (inactive));
  g_assert_cmpint (awra_material_resolution_get_request_blur (active), ==,
                   blur_capable);
}

static GtkWidget *
make_page_composition (AwraSplitView **split_out)
{
  GtkWidget *split = awra_split_view_new ();
  GtkWidget *sidebar = awra_sidebar_new ();
  GtkWidget *sidebar_box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  GtkWidget *page = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  GtkWidget *filter = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0);
  GtkWidget *card = awra_card_new ();
  GtkWidget *card_box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  GtkWidget *title = gtk_label_new ("Page composition invariant");
  GtkWidget *subtitle = gtk_label_new (
    "Header, sidebar, filters and content remain one stable material system.");

  awra_box_apply_layout_preset (GTK_BOX (sidebar_box),
                                AWRA_LAYOUT_PRESET_COMPACT);
  for (guint i = 0; i < 4; i++) {
    static const char *labels[] = { "Overview", "Data", "Details", "Settings" };
    GtkWidget *item = awra_navigation_item_new_with_label (labels[i]);

    awra_navigation_item_set_selected (AWRA_NAVIGATION_ITEM (item), i == 1);
    gtk_box_append (GTK_BOX (sidebar_box), item);
  }
  awra_sidebar_set_child (AWRA_SIDEBAR (sidebar), sidebar_box);

  awra_widget_set_typography (title, AWRA_TYPOGRAPHY_TITLE_1);
  awra_widget_set_typography (subtitle, AWRA_TYPOGRAPHY_MUTED);
  gtk_label_set_xalign (GTK_LABEL (title), 0.0f);
  gtk_label_set_xalign (GTK_LABEL (subtitle), 0.0f);
  awra_box_apply_layout_preset (GTK_BOX (filter), AWRA_LAYOUT_PRESET_TOOLBAR);
  g_assert_true (awra_widget_add_style_role (filter, "filter-bar"));
  gtk_box_append (GTK_BOX (filter), awra_search_entry_new ());
  gtk_box_append (GTK_BOX (filter), awra_button_new_with_label ("Filter"));
  awra_box_apply_layout_preset (GTK_BOX (card_box), AWRA_LAYOUT_PRESET_CONTENT);
  gtk_box_append (GTK_BOX (card_box), awra_action_row_new (
    "Selected record", "A realistic master/detail row"));
  gtk_box_append (GTK_BOX (card_box), awra_slider_new_with_range (
    GTK_ORIENTATION_HORIZONTAL, 0, 100, 1));
  awra_card_set_child (AWRA_CARD (card), card_box);
  awra_box_apply_layout_preset (GTK_BOX (page), AWRA_LAYOUT_PRESET_PAGE);
  gtk_box_append (GTK_BOX (page), title);
  gtk_box_append (GTK_BOX (page), subtitle);
  gtk_box_append (GTK_BOX (page), filter);
  gtk_box_append (GTK_BOX (page), card);
  awra_split_view_set_sidebar (AWRA_SPLIT_VIEW (split), sidebar);
  awra_split_view_set_content (AWRA_SPLIT_VIEW (split), page);
  *split_out = AWRA_SPLIT_VIEW (split);
  return split;
}

static void
test_page_focus_and_material_invariants (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestPageInvariants", G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  GtkWidget *window;
  GtkWidget *composition;
  AwraSplitView *split;
  AwraContext *context;
  AwraDiagnostics *diagnostics;
  AwraStyleManager *style;
  AwraSurface *root;
  AwraMaterial *material;
  gboolean blur_capable;
  guint effects_before;
  int width_before;
  int height_before;
  g_autofree char *active = NULL;
  g_autofree char *inactive = NULL;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  window = awra_window_new (app);
  gtk_window_set_default_size (GTK_WINDOW (window), 900, 620);
  composition = make_page_composition (&split);
  awra_window_set_content (AWRA_WINDOW (window), composition);
  gtk_window_present (GTK_WINDOW (window));
  gtk_test_widget_wait_for_draw (window);

  context = awra_context_get_for_display (gtk_widget_get_display (window));
  diagnostics = awra_context_get_diagnostics (context);
  style = awra_context_get_style_manager (context);
  awra_style_manager_set_appearance (style, AWRA_APPEARANCE_DARK);
  root = awra_window_get_root_surface (AWRA_WINDOW (window));
  material = awra_surface_get_material (root);
  blur_capable =
    (awra_diagnostics_get_capabilities (diagnostics) &
     AWRA_EFFECT_CAPABILITY_BLUR) != 0 &&
    awra_style_manager_get_native_blur_enabled (style);
  effects_before = awra_diagnostics_get_effects_applied (diagnostics);
  assert_root_invariants (context, material, blur_capable);

  width_before = gtk_widget_get_width (composition);
  height_before = gtk_widget_get_height (composition);
  active = snapshot_checksum (composition);
  gtk_widget_set_state_flags (window, GTK_STATE_FLAG_BACKDROP, FALSE);
  iterate_for (10);
  inactive = snapshot_checksum (composition);
  g_assert_cmpint (gtk_widget_get_width (composition), ==, width_before);
  g_assert_cmpint (gtk_widget_get_height (composition), ==, height_before);
  g_assert_cmpstr (active, ==, inactive);
  g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics), ==,
                    effects_before);
  gtk_widget_unset_state_flags (window, GTK_STATE_FLAG_BACKDROP);

  awra_split_view_set_show_sidebar (split, FALSE);
  iterate_for (10);
  assert_root_invariants (context, material, blur_capable);
  g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics), ==,
                    effects_before);
  awra_split_view_set_show_sidebar (split, TRUE);
  iterate_for (10);
  g_assert_cmpint (gtk_widget_get_width (composition), ==, width_before);
  g_assert_cmpint (gtk_widget_get_height (composition), ==, height_before);
  assert_root_invariants (context, material, blur_capable);

  awra_style_manager_set_reduced_transparency (style, TRUE);
  iterate_for (5);
  g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics), ==, 0);
  awra_style_manager_set_reduced_transparency (style, FALSE);
  iterate_for (5);
  g_assert_cmpuint (awra_diagnostics_get_effects_applied (diagnostics), ==,
                    effects_before);
  gtk_window_destroy (GTK_WINDOW (window));
}

int
main (int   argc,
      char *argv[])
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) {
    g_test_message ("No display available; skipping page invariant tests");
    return 77;
  }
  g_test_add_func ("/awra/visual/page-focus-and-material-invariants",
                   test_page_focus_and_material_invariants);
  return g_test_run ();
}
