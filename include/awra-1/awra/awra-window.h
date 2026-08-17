/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-surface.h>

G_BEGIN_DECLS

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
 * awra_window_get_root_surface:
 * @self: an Awra window
 *
 * Returns: (transfer none): the window's root surface
 */
AwraSurface *awra_window_get_root_surface (AwraWindow     *self);
gboolean     awra_window_get_active       (AwraWindow     *self);

G_END_DECLS
