/* SPDX-License-Identifier: LGPL-2.1-or-later */
#include <awra/awra.h>
#include <glib/gstdio.h>

static void
settle (guint ms)
{
  GMainLoop *loop = g_main_loop_new (NULL, FALSE);
  g_timeout_add_once (ms, (GSourceOnceFunc)g_main_loop_quit, loop);
  g_main_loop_run (loop);
  g_main_loop_unref (loop);
}
static gboolean
wait_state (GtkWindow *window, gboolean maximized, gboolean fullscreen)
{
  gint64 end = g_get_monotonic_time () + 2000000;
  while ((gtk_window_is_maximized (window) != maximized
          || gtk_window_is_fullscreen (window) != fullscreen)
         && g_get_monotonic_time () < end)
    settle (20);
  settle (100);
  return gtk_window_is_maximized (window) == maximized
         && gtk_window_is_fullscreen (window) == fullscreen;
}
static AwraSurface *
first_surface (GtkWidget *widget)
{
  if (AWRA_IS_SURFACE (widget))
    return AWRA_SURFACE (widget);
  for (GtkWidget *child = gtk_widget_get_first_child (widget); child;
       child = gtk_widget_get_next_sibling (child))
    {
      AwraSurface *result = first_surface (child);
      if (result)
        return result;
    }
  return NULL;
}
static GdkTexture *
render (GdkPaintable *paintable, GtkWidget *widget)
{
  for (guint attempt = 0; attempt < 10; attempt++)
    {
      GtkSnapshot *snapshot = gtk_snapshot_new ();
      int width = gtk_widget_get_width (widget),
          height = gtk_widget_get_height (widget);
      gdk_paintable_snapshot (paintable, GDK_SNAPSHOT (snapshot), width,
                              height);
      GskRenderNode *node = gtk_snapshot_free_to_node (snapshot);
      if (node)
        {
          graphene_rect_t bounds = GRAPHENE_RECT_INIT (0, 0, width, height);
          GdkTexture *texture = gsk_renderer_render_texture (
              gtk_native_get_renderer (gtk_widget_get_native (widget)), node,
              &bounds);
          gsk_render_node_unref (node);
          return texture;
        }
      gtk_widget_queue_draw (widget);
      settle (40);
    }
  g_assert_not_reached ();
}
static void
corners (GdkPaintable *paintable, GtkWidget *widget, gboolean rounded,
         const char *name)
{
  g_autoptr (GdkTexture) texture = render (paintable, widget);
  int width = gdk_texture_get_width (texture),
      height = gdk_texture_get_height (texture);
  gsize stride = width * 4;
  g_autofree guint8 *pixels = g_malloc (stride * height);
  gdk_texture_download (texture, pixels, stride);
#if G_BYTE_ORDER == G_LITTLE_ENDIAN
  const guint alpha = 3;
#else
  const guint alpha = 0;
#endif
  gsize offsets[]
      = { alpha, (width - 1) * 4 + alpha, (height - 1) * stride + alpha,
          (height - 1) * stride + (width - 1) * 4 + alpha };
  g_test_message ("%s: %dx%d, corner alpha %u/%u/%u/%u", name, width, height,
                  pixels[offsets[0]], pixels[offsets[1]], pixels[offsets[2]],
                  pixels[offsets[3]]);
  const char *directory = g_getenv ("AWRA_WINDOW_STATE_OUTPUT_DIR");
  if (directory)
    {
      g_mkdir_with_parents (directory, 0755);
      g_autofree char *path = g_strdup_printf ("%s/%s.png", directory, name);
      g_assert_true (gdk_texture_save_to_png (texture, path));
    }
  for (guint i = 0; i < 4; i++)
    {
      if (rounded)
        g_assert_cmpuint (pixels[offsets[i]], <, 30);
      else
        g_assert_cmpuint (pixels[offsets[i]], ==, 255);
    }
}
static void
solid (GtkDrawingArea *area, cairo_t *cr, int w, int h, gpointer data)
{
  (void)area;
  (void)w;
  (void)h;
  (void)data;
  cairo_set_source_rgb (cr, .12, .42, .62);
  cairo_paint (cr);
}
static void
notified (GObject *object, GParamSpec *spec, guint *count)
{
  (void)object;
  (void)spec;
  (*count)++;
}
int
main (int argc, char **argv)
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ())
    return 77;
  awra_init ();
  g_autoptr (GtkApplication) app = gtk_application_new (
      "org.awra.TestWindowFrame", G_APPLICATION_NON_UNIQUE);
  g_application_register (G_APPLICATION (app), NULL, NULL);
  for (guint overlay = 0; overlay < 2; overlay++)
    {
      GtkWidget *widget = awra_window_new (app);
      AwraWindow *window = AWRA_WINDOW (widget);
      GtkWindow *toplevel = GTK_WINDOW (widget);
      AwraSurface *root = awra_window_get_root_surface (window);
      g_autoptr (AwraMaterial) opaque
          = awra_material_new_for_preset (AWRA_MATERIAL_PRESET_OPAQUE);
      guint notifications = 0;
      g_assert_false (awra_window_get_keep_rounded_corners (window));
      g_signal_connect (window, "notify::keep-rounded-corners",
                        G_CALLBACK (notified), &notifications);
      g_object_set (window, "keep-rounded-corners", TRUE, NULL);
      awra_window_set_keep_rounded_corners (window, TRUE);
      g_assert_cmpuint (notifications, ==, 1);
      awra_window_set_keep_rounded_corners (window, FALSE);
      awra_surface_set_material (root, opaque);
      awra_surface_set_radius (root, 32);
      AwraSurface *header = first_surface (awra_window_get_chrome (window));
      g_assert_nonnull (header);
      awra_surface_set_radius (header, 32);
      GtkWidget *canvas = gtk_drawing_area_new ();
      gtk_drawing_area_set_draw_func (GTK_DRAWING_AREA (canvas), solid, NULL,
                                      NULL);
      GtkWidget *content = gtk_overlay_new ();
      gtk_overlay_set_child (GTK_OVERLAY (content), canvas);
      GtkWidget *floating
          = awra_surface_new_with_role (AWRA_SURFACE_ROLE_FLOATING);
      awra_surface_set_material (AWRA_SURFACE (floating), opaque);
      awra_surface_set_radius (AWRA_SURFACE (floating), 19);
      awra_surface_set_elevation_level (AWRA_SURFACE (floating),
                                        AWRA_ELEVATION_FLAT);
      gtk_widget_set_size_request (floating, 100, 80);
      gtk_widget_set_halign (floating, GTK_ALIGN_CENTER);
      gtk_widget_set_valign (floating, GTK_ALIGN_CENTER);
      gtk_overlay_add_overlay (GTK_OVERLAY (content), floating);
      awra_window_set_content (window, content);
      if (overlay)
        awra_window_set_overlay_chrome (window, TRUE);
      AwraSurfaceCorner configured = awra_surface_get_corner_mask (root);
      AwraSurfaceEdge configured_edges = awra_surface_get_edge_mask (root);
      g_autoptr (GdkPaintable) picture = gtk_widget_paintable_new (widget);
      g_autoptr (GdkPaintable) floating_picture
          = gtk_widget_paintable_new (floating);
      gtk_window_set_default_size (toplevel, 640, 480);
      gtk_window_present (toplevel);
      settle (180);
      corners (picture, widget, TRUE,
               overlay ? "overlay-normal" : "docked-normal");
      gtk_window_maximize (toplevel);
      if (!wait_state (toplevel, TRUE, FALSE))
        {
          gtk_window_destroy (toplevel);
          g_test_message (
              "No maximizing window manager; native frame checks skipped");
          return 77;
        }
      GdkSurface *surface = gtk_native_get_surface (GTK_NATIVE (window));
      g_assert_cmpint (gtk_widget_get_width (widget), ==,
                       gdk_surface_get_width (surface));
      g_assert_cmpint (gtk_widget_get_height (widget), ==,
                       gdk_surface_get_height (surface));
      corners (picture, widget, FALSE,
               overlay ? "overlay-maximized" : "docked-maximized");
      corners (floating_picture, floating, TRUE, "floating-control");
      awra_window_set_keep_rounded_corners (window, TRUE);
      settle (100);
      corners (picture, widget, TRUE, "maximized-opt-in");
      awra_window_set_keep_rounded_corners (window, FALSE);
      settle (100);
      corners (picture, widget, FALSE, "maximized-default-restored");
      gtk_window_unmaximize (toplevel);
      g_assert_true (wait_state (toplevel, FALSE, FALSE));
      corners (picture, widget, TRUE, "normal-restored");
      gtk_window_fullscreen (toplevel);
      g_assert_true (wait_state (toplevel, FALSE, TRUE));
      corners (picture, widget, FALSE, "fullscreen-default");
      awra_window_set_keep_rounded_corners (window, TRUE);
      settle (100);
      corners (picture, widget, TRUE, "fullscreen-opt-in");
      gtk_window_unfullscreen (toplevel);
      g_assert_true (wait_state (toplevel, FALSE, FALSE));
      corners (picture, widget, TRUE, "fullscreen-normal-restored");
      g_assert_cmpfloat (awra_surface_get_radius (root), ==, 32);
      g_assert_cmpint (awra_surface_get_corner_mask (root), ==, configured);
      g_assert_cmpint (awra_surface_get_edge_mask (root), ==,
                       configured_edges);
      gtk_window_destroy (toplevel);
    }
  g_print ("Window frame default/opt-in, docked/overlay and restore checks "
           "passed\n");
  return 0;
}
