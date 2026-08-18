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
/**
 * awra_tab_view_append:
 * @self: an Awra tab view
 * @page: the page to append
 * @title: the visible tab title
 * @pinned: whether the page is permanent and has no close affordance
 *
 * Appends a dynamic page. Non-pinned pages expose an Awra-owned close
 * affordance. Applications can veto a request through the #AwraTabView::close-page
 * signal.
 *
 * Returns: (transfer none): @page
 */
GtkWidget  *awra_tab_view_append            (AwraTabView *self,
                                             GtkWidget   *page,
                                             const char  *title,
                                             gboolean     pinned);
void        awra_tab_view_remove            (AwraTabView *self,
                                             GtkWidget   *page);
/**
 * awra_tab_view_close_page:
 * @self: an Awra tab view
 * @page: a page contained by @self
 *
 * Requests that @page be closed. The page is removed unless a
 * #AwraTabView::close-page handler returns %TRUE.
 */
void        awra_tab_view_close_page        (AwraTabView *self,
                                             GtkWidget   *page);
/**
 * awra_tab_view_get_selected_page:
 * @self: an Awra tab view
 *
 * Returns: (transfer none) (nullable): the selected page
 */
GtkWidget  *awra_tab_view_get_selected_page (AwraTabView *self);
void        awra_tab_view_set_selected_page (AwraTabView *self,
                                             GtkWidget   *page);
void        awra_tab_view_set_page_title    (AwraTabView *self,
                                             GtkWidget   *page,
                                             const char  *title);
void        awra_tab_view_set_page_tooltip  (AwraTabView *self,
                                             GtkWidget   *page,
                                             const char  *tooltip);
/**
 * awra_tab_view_get_tab_bar:
 * @self: an Awra tab view
 *
 * Returns: (transfer none): the Awra-owned tab bar
 */
GtkWidget  *awra_tab_view_get_tab_bar       (AwraTabView *self);
gboolean    awra_tab_view_get_content_visible (AwraTabView *self);
void        awra_tab_view_set_content_visible (AwraTabView *self,
                                               gboolean     visible);
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
