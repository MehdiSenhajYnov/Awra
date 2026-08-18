/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <glib-object.h>

G_BEGIN_DECLS

#define AWRA_TYPE_BREADCRUMB_ITEM (awra_breadcrumb_item_get_type ())
G_DECLARE_FINAL_TYPE (AwraBreadcrumbItem, awra_breadcrumb_item,
                      AWRA, BREADCRUMB_ITEM, GObject)

AwraBreadcrumbItem *awra_breadcrumb_item_new       (const char         *label,
                                                     const char         *name);
const char         *awra_breadcrumb_item_get_label (AwraBreadcrumbItem *self);
void                awra_breadcrumb_item_set_label (AwraBreadcrumbItem *self,
                                                     const char         *label);
const char         *awra_breadcrumb_item_get_name  (AwraBreadcrumbItem *self);
void                awra_breadcrumb_item_set_name  (AwraBreadcrumbItem *self,
                                                     const char         *name);

G_END_DECLS
