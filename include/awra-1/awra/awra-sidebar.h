/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-surface.h>

G_BEGIN_DECLS

#define AWRA_TYPE_SIDEBAR (awra_sidebar_get_type ())
G_DECLARE_FINAL_TYPE (AwraSidebar, awra_sidebar, AWRA, SIDEBAR, GtkWidget)

GtkWidget   *awra_sidebar_new         (void);
/**
 * awra_sidebar_get_child:
 * @self: an Awra sidebar
 *
 * Returns: (transfer none) (nullable): the sidebar content
 */
GtkWidget   *awra_sidebar_get_child   (AwraSidebar *self);
/**
 * awra_sidebar_set_child:
 * @self: an Awra sidebar
 * @child: (nullable): the sidebar content, or %NULL
 */
void         awra_sidebar_set_child   (AwraSidebar *self,
                                       GtkWidget   *child);
/**
 * awra_sidebar_get_surface:
 * @self: an Awra sidebar
 *
 * Returns: (transfer none): the sidebar surface
 */
AwraSurface *awra_sidebar_get_surface (AwraSidebar *self);

G_END_DECLS
