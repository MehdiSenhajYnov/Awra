/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_NAVIGATION_VIEW (awra_navigation_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraNavigationView, awra_navigation_view, AWRA, NAVIGATION_VIEW, GtkWidget)
GtkWidget  *awra_navigation_view_new                   (void);
void        awra_navigation_view_add                   (AwraNavigationView *self,
                                                        GtkWidget          *page,
                                                        const char         *name);
gboolean    awra_navigation_view_push                  (AwraNavigationView *self,
                                                        const char         *name);
gboolean    awra_navigation_view_pop                   (AwraNavigationView *self);
gboolean    awra_navigation_view_replace               (AwraNavigationView *self,
                                                        const char         *name);
gboolean    awra_navigation_view_get_can_pop           (AwraNavigationView *self);
const char *awra_navigation_view_get_visible_page_name (AwraNavigationView *self);
/**
 * awra_navigation_view_get_stack:
 * @self: an Awra navigation view
 *
 * Returns: (transfer none): the underlying GTK stack
 */
GtkStack   *awra_navigation_view_get_stack             (AwraNavigationView *self);
G_END_DECLS
