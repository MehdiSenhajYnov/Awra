/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-surface.h>

G_BEGIN_DECLS

/**
 * AwraWindow:overlay-chrome:
 *
 * Place chrome above the full content allocation.
 *
 * Since: 1.1
 */
/**
 * AwraWindow:keep-rounded-corners:
 *
 * Retain configured frame rounding when maximized or fullscreen.
 *
 * Since: 1.1
 */

#define AWRA_TYPE_WINDOW (awra_window_get_type ())
G_DECLARE_DERIVABLE_TYPE (AwraWindow, awra_window, AWRA, WINDOW, GtkApplicationWindow)

struct _AwraWindowClass {
  GtkApplicationWindowClass parent_class;
  gpointer padding[8];
};

GtkWidget   *awra_window_new              (GtkApplication *application);
/**
 * awra_window_get_content:
 * @self: an Awra window
 *
 * Returns: (transfer none) (nullable): the application content
 */
GtkWidget   *awra_window_get_content      (AwraWindow     *self);
/**
 * awra_window_set_content:
 * @self: an Awra window
 * @content: (nullable): application content, or %NULL
 */
void         awra_window_set_content      (AwraWindow     *self,
                                           GtkWidget      *content);
/**
 * awra_window_get_chrome:
 * @self: an Awra window
 *
 * Returns: (transfer none): the current titlebar/chrome widget
 */
GtkWidget   *awra_window_get_chrome       (AwraWindow     *self);
/**
 * awra_window_set_chrome:
 * @self: an Awra window
 * @chrome: (nullable): a custom titlebar, or %NULL to restore Awra's default
 *
 * Installs application-defined window chrome without imposing a content or
 * sidebar composition. An #AwraHeader can be used here with drag enabled, but
 * any suitable GTK widget is accepted.
 */
void         awra_window_set_chrome       (AwraWindow     *self,
                                           GtkWidget      *chrome);
/**
 * awra_window_get_root_surface:
 * @self: an Awra window
 *
 * Returns: (transfer none): the window's root surface
 */
AwraSurface *awra_window_get_root_surface (AwraWindow     *self);
/**
 * awra_window_set_overlay_chrome:
 * @self: an Awra window
 * @overlaid: whether chrome floats above the full content allocation
 *
 * Opts into embedded chrome composition. Call before presenting the window
 * the first time. Subsequent docked/overlaid transitions reparent only owned
 * widgets, preserving the native CSD surface, resize handles and drag region.
 * The application controls chrome visibility independently. Use get_chrome()
 * rather than GtkWindow:titlebar after opting into this composition.
 *
 * Since: 1.1
 */
void awra_window_set_overlay_chrome (AwraWindow *self, gboolean overlaid);
/**
 * awra_window_get_overlay_chrome:
 *
 * Since: 1.1
 */
gboolean awra_window_get_overlay_chrome (AwraWindow *self);
/**
 * awra_window_set_keep_rounded_corners:
 * @self: an Awra window
 * @keep: whether to retain frame rounding when maximized or fullscreen
 *
 * By default the outer frame becomes square and undecorated when maximized
 * or fullscreen. Set this to TRUE to retain its configured rounded geometry.
 * Restoring the window always restores its configured radius and corner/edge
 * masks. Floating controls, cards and overlay chrome keep their own geometry.
 * This does not change the compositor's maximized/fullscreen allocation.
 *
 * Since: 1.1
 */
void awra_window_set_keep_rounded_corners (AwraWindow *self, gboolean keep);
/**
 * awra_window_get_keep_rounded_corners:
 *
 * Since: 1.1
 */
gboolean awra_window_get_keep_rounded_corners (AwraWindow *self);
gboolean     awra_window_get_active       (AwraWindow     *self);

G_END_DECLS
