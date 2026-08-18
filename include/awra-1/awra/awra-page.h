/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_PAGE (awra_page_get_type ())
G_DECLARE_FINAL_TYPE (AwraPage, awra_page, AWRA, PAGE, GtkWidget)

GtkWidget   *awra_page_new                   (void);
/**
 * awra_page_get_child:
 * @self: an Awra page
 *
 * Returns: (transfer none) (nullable): the page content
 */
GtkWidget   *awra_page_get_child             (AwraPage    *self);
/**
 * awra_page_set_child:
 * @self: an Awra page
 * @child: (nullable): page content, or %NULL
 */
void         awra_page_set_child             (AwraPage    *self,
                                               GtkWidget   *child);
guint        awra_page_get_max_content_width (AwraPage    *self);
void         awra_page_set_max_content_width (AwraPage    *self,
                                               guint        width);
AwraSpacing  awra_page_get_content_inset     (AwraPage    *self);
void         awra_page_set_content_inset     (AwraPage    *self,
                                               AwraSpacing  inset);
void         awra_page_scroll_to_top         (AwraPage    *self);

G_END_DECLS
