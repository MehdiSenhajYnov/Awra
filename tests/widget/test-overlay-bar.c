/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra.h>

static void settle(guint ms) {
  GMainLoop *loop = g_main_loop_new(NULL, FALSE);
  g_timeout_add_once(ms, (GSourceOnceFunc)g_main_loop_quit, loop);
  g_main_loop_run(loop);
  g_main_loop_unref(loop);
}
static void test_geometry_and_idle(void) {
  GtkWidget *window = gtk_window_new();
  AwraOverlayBar *bar = AWRA_OVERLAY_BAR(awra_overlay_bar_new());
  GtkWidget *canvas = gtk_drawing_area_new();
  GtkWidget *button = awra_button_new_with_label("Play");
  awra_overlay_bar_set_content(bar, canvas);
  awra_overlay_bar_set_bar(bar, button);
  awra_overlay_bar_set_inset(bar, AWRA_SPACING_MD);
  gtk_window_set_child(GTK_WINDOW(window), GTK_WIDGET(bar));
  gtk_window_set_default_size(GTK_WINDOW(window), 600, 400);
  gtk_window_present(GTK_WINDOW(window));
  gtk_window_set_focus(GTK_WINDOW(window), NULL);
  settle(180);
  int width = gtk_widget_get_width(canvas),
      height = gtk_widget_get_height(canvas);
  g_assert_cmpint(width, ==, gtk_widget_get_width(GTK_WIDGET(bar)));
  g_assert_cmpint(height, ==, gtk_widget_get_height(GTK_WIDGET(bar)));
  awra_overlay_bar_set_hide_delay(bar, 100);
  awra_overlay_bar_set_auto_hide(bar, TRUE);
  settle(300);
  g_assert_false(awra_overlay_bar_get_revealed(bar));
  g_assert_cmpint(gtk_widget_get_width(canvas), ==, width);
  g_assert_cmpint(gtk_widget_get_height(canvas), ==, height);
  awra_overlay_bar_set_inhibit_auto_hide(bar, TRUE);
  awra_overlay_bar_reveal(bar);
  settle(300);
  g_assert_true(awra_overlay_bar_get_revealed(bar));
  GtkWidget *entry = awra_entry_new();
  awra_overlay_bar_set_bar(bar, entry);
  gtk_widget_grab_focus(entry);
  awra_overlay_bar_set_inhibit_auto_hide(bar, FALSE);
  settle(300);
  g_assert_true(awra_overlay_bar_get_revealed(bar));
  gtk_window_set_focus(GTK_WINDOW(window), NULL);
  settle(300);
  g_assert_false(awra_overlay_bar_get_revealed(bar));
  awra_overlay_bar_set_bar(bar, NULL);
  awra_overlay_bar_set_content(bar, NULL);
  gtk_window_destroy(GTK_WINDOW(window));
}
static void test_window_composition(void) {
  GtkApplication *app =
      gtk_application_new("org.awra.Test.Overlay", G_APPLICATION_NON_UNIQUE);
  g_application_register(G_APPLICATION(app), NULL, NULL);
  AwraWindow *w = AWRA_WINDOW(awra_window_new(app));
  GtkWidget *header = awra_window_get_chrome(w);
  g_assert_true(gtk_window_get_titlebar(GTK_WINDOW(w)) == header);
  GtkWidget *canvas = gtk_drawing_area_new();
  awra_window_set_content(w, canvas);
  gtk_window_set_default_size(GTK_WINDOW(w), 600, 400);
  awra_window_set_overlay_chrome(w, TRUE);
  awra_window_set_overlay_chrome(w, FALSE);
  gtk_window_present(GTK_WINDOW(w));
  settle(180);
  GdkSurface *native = gtk_native_get_surface(GTK_NATIVE(w));
  int docked = gtk_widget_get_height(canvas);
  for (int n = 0; n < 3; n++) {
    awra_window_set_overlay_chrome(w, TRUE);
    settle(180);
    g_assert_true(native == gtk_native_get_surface(GTK_NATIVE(w)));
    g_assert_true(awra_window_get_chrome(w) == header);
    g_assert_cmpint(gtk_widget_get_height(canvas), >, docked);
    int full = gtk_widget_get_height(canvas);
    gtk_widget_set_visible(header, FALSE);
    settle(100);
    g_assert_cmpint(gtk_widget_get_height(canvas), ==, full);
    gtk_widget_set_visible(header, TRUE);
    awra_window_set_overlay_chrome(w, FALSE);
    settle(180);
    g_assert_cmpint(gtk_widget_get_height(canvas), ==, docked);
  }
  awra_window_set_chrome(w, awra_header_new());
  awra_window_set_chrome(w, NULL);
  g_assert_true(awra_window_get_chrome(w) == header);
  gtk_window_destroy(GTK_WINDOW(w));
  g_object_unref(app);
}
static void test_properties(void) {
  g_autoptr(GtkWidget) bar = g_object_ref_sink(awra_overlay_bar_new());
  g_object_set(bar, "auto-hide", TRUE, "hide-delay", 700u, "max-width", 700u,
               "inset", AWRA_SPACING_NONE, NULL);
  g_assert_cmpint(awra_overlay_bar_get_inset(AWRA_OVERLAY_BAR(bar)), ==,
                  AWRA_SPACING_NONE);
  g_assert_cmpuint(awra_overlay_bar_get_hide_delay(AWRA_OVERLAY_BAR(bar)), ==,
                   700);
  g_autoptr(GtkWidget) toast = g_object_ref_sink(awra_toast_overlay_new());
  g_assert_cmpuint(
      awra_toast_overlay_get_bottom_inset(AWRA_TOAST_OVERLAY(toast)), ==, 24);
  awra_toast_overlay_set_bottom_inset(AWRA_TOAST_OVERLAY(toast), 140);
  g_assert_cmpuint(
      awra_toast_overlay_get_bottom_inset(AWRA_TOAST_OVERLAY(toast)), ==, 140);
}
static void test_toplevel_lifetime(void) {
  GtkApplication *app = gtk_application_new("org.awra.Test.Lifetime", G_APPLICATION_NON_UNIQUE);
  g_application_register(G_APPLICATION(app), NULL, NULL);
  GtkWidget *window = awra_window_new(app);
  g_object_ref(window);
  GtkWidget *dialog = awra_dialog_new(GTK_WINDOW(window));
  GtkWidget *palette = awra_command_palette_new(GTK_WINDOW(window));
  GWeakRef weak;
  g_weak_ref_init(&weak, dialog);
  gtk_window_destroy(GTK_WINDOW(dialog));
  GObject *alive = g_weak_ref_get(&weak);
  g_assert_nonnull(alive);
  g_object_unref(alive);
  g_object_unref(dialog);
  g_assert_null(g_weak_ref_get(&weak));
  g_weak_ref_clear(&weak);
  gtk_window_destroy(GTK_WINDOW(palette));
  g_object_unref(palette);
  gtk_window_destroy(GTK_WINDOW(window));
  g_assert_true(G_IS_OBJECT(window));
  g_object_unref(window);
  g_object_unref(app);
}
static void test_focus_delegation(void) {
  GtkWidget *win = gtk_window_new();
  GtkWidget *box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
  GtkWidget *controls[] = {awra_search_entry_new(),
                           awra_spin_button_new_with_range(0, 10, 1),
                           awra_switch_new(), awra_password_entry_new()};
  gtk_window_set_child(GTK_WINDOW(win), box);
  for (guint n = 0; n < G_N_ELEMENTS(controls); n++)
    gtk_box_append(GTK_BOX(box), controls[n]);
  gtk_window_present(GTK_WINDOW(win));
  settle(100);
  for (guint n = 0; n < G_N_ELEMENTS(controls); n++) {
    g_assert_true(gtk_widget_grab_focus(controls[n]));
    GtkWidget *focus = gtk_root_get_focus(GTK_ROOT(win));
    g_assert_true(focus != NULL && gtk_widget_is_ancestor(focus, controls[n]));
  }
  gtk_window_destroy(GTK_WINDOW(win));
}
static void test_aspect_paintable(void) {
  guint8 pixels[6] = {255, 0, 0, 0, 255, 0};
  GBytes *bytes = g_bytes_new(pixels, sizeof pixels);
  GdkTexture *texture = gdk_memory_texture_new(2, 1, GDK_MEMORY_R8G8B8, bytes, 6);
  AwraAspectPaintable *aspect = awra_aspect_paintable_new(GDK_PAINTABLE(texture), 1.0);
  g_bytes_unref(bytes);
  g_assert_true(awra_aspect_paintable_get_paintable(aspect) == GDK_PAINTABLE(texture));
  g_object_unref(texture);
  g_assert_cmpfloat(gdk_paintable_get_intrinsic_aspect_ratio(GDK_PAINTABLE(aspect)), ==, 1.0);
  g_assert_cmpint(gdk_paintable_get_intrinsic_width(GDK_PAINTABLE(aspect)), ==, 1);
  GtkSnapshot *snapshot = gtk_snapshot_new();
  gdk_paintable_snapshot(GDK_PAINTABLE(aspect), GDK_SNAPSHOT(snapshot), 100, 100);
  GskRenderNode *node = gtk_snapshot_free_to_node(snapshot);
  g_assert_nonnull(node);
  gsk_render_node_unref(node);
  GdkPaintable *current = gdk_paintable_get_current_image(GDK_PAINTABLE(aspect));
  g_assert_cmpfloat(gdk_paintable_get_intrinsic_aspect_ratio(current), ==, 1.0);
  g_object_unref(current);
  g_object_unref(aspect);
}
int main(int argc, char **argv) {
  gtk_test_init(&argc, &argv, NULL);
  awra_init();
  g_test_add_func("/overlay-bar/geometry-idle-focus", test_geometry_and_idle);
  g_test_add_func("/overlay-bar/window-composition", test_window_composition);
  g_test_add_func("/overlay-bar/properties", test_properties);
  g_test_add_func("/controls/focus-delegation", test_focus_delegation);
  g_test_add_func("/window/toplevel-lifetime", test_toplevel_lifetime);
  g_test_add_func("/media/aspect-paintable", test_aspect_paintable);
  return g_test_run();
}
