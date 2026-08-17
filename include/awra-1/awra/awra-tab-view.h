/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_TAB_VIEW (awra_tab_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraTabView, awra_tab_view, AWRA, TAB_VIEW, GtkWidget)

GtkWidget  *awra_tab_view_new               (void);
void        awra_tab_view_add               (AwraTabView *self,
                                             GtkWidget   *page,
                                             const char  *name,
                                             const char  *title);
const char *awra_tab_view_get_selected_name (AwraTabView *self);
void        awra_tab_view_set_selected_name (AwraTabView *self,
                                             const char  *name);
/**
 * awra_tab_view_get_stack:
 * @self: an Awra tab view
 *
 * Returns: (transfer none): the underlying GTK stack
 */
GtkStack   *awra_tab_view_get_stack         (AwraTabView *self);

G_END_DECLS
