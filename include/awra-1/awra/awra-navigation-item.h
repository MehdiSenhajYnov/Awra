/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_NAVIGATION_ITEM (awra_navigation_item_get_type ())
G_DECLARE_FINAL_TYPE (AwraNavigationItem, awra_navigation_item,
                      AWRA, NAVIGATION_ITEM, GtkToggleButton)

GtkWidget  *awra_navigation_item_new           (void);
GtkWidget  *awra_navigation_item_new_with_label (const char *label);
const char *awra_navigation_item_get_label     (AwraNavigationItem *self);
void        awra_navigation_item_set_label     (AwraNavigationItem *self,
                                                 const char         *label);
const char *awra_navigation_item_get_icon_name (AwraNavigationItem *self);
void        awra_navigation_item_set_icon_name (AwraNavigationItem *self,
                                                 const char         *icon_name);
gboolean    awra_navigation_item_get_selected  (AwraNavigationItem *self);
void        awra_navigation_item_set_selected  (AwraNavigationItem *self,
                                                 gboolean            selected);
void        awra_navigation_item_set_group     (AwraNavigationItem *self,
                                                 AwraNavigationItem *group);

G_END_DECLS
