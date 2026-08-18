/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_PAGE_HEADER (awra_page_header_get_type ())
G_DECLARE_FINAL_TYPE (AwraPageHeader, awra_page_header,
                      AWRA, PAGE_HEADER, GtkWidget)

GtkWidget  *awra_page_header_new                (void);
/**
 * awra_page_header_get_title:
 * @self: an Awra page header
 *
 * Returns: (transfer none) (nullable): the title
 */
const char *awra_page_header_get_title          (AwraPageHeader *self);
/**
 * awra_page_header_set_title:
 * @self: an Awra page header
 * @title: (nullable): the title, or %NULL
 */
void        awra_page_header_set_title          (AwraPageHeader *self,
                                                 const char     *title);
/**
 * awra_page_header_get_subtitle:
 * @self: an Awra page header
 *
 * Returns: (transfer none) (nullable): the subtitle
 */
const char *awra_page_header_get_subtitle       (AwraPageHeader *self);
/**
 * awra_page_header_set_subtitle:
 * @self: an Awra page header
 * @subtitle: (nullable): the subtitle, or %NULL
 */
void        awra_page_header_set_subtitle       (AwraPageHeader *self,
                                                 const char     *subtitle);
/**
 * awra_page_header_get_actions:
 * @self: an Awra page header
 *
 * Returns: (transfer none) (nullable): the contextual actions
 */
GtkWidget  *awra_page_header_get_actions        (AwraPageHeader *self);
/**
 * awra_page_header_set_actions:
 * @self: an Awra page header
 * @actions: (nullable): contextual actions, or %NULL
 */
void        awra_page_header_set_actions        (AwraPageHeader *self,
                                                 GtkWidget      *actions);
/**
 * awra_page_header_get_child:
 * @self: an Awra page header
 *
 * Returns: (transfer none) (nullable): supplementary header content
 */
GtkWidget  *awra_page_header_get_child          (AwraPageHeader *self);
/**
 * awra_page_header_set_child:
 * @self: an Awra page header
 * @child: (nullable): supplementary header content, or %NULL
 */
void        awra_page_header_set_child          (AwraPageHeader *self,
                                                 GtkWidget      *child);

G_END_DECLS
