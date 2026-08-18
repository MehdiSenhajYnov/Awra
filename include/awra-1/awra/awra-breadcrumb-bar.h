/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-breadcrumb-item.h>

G_BEGIN_DECLS

#define AWRA_TYPE_BREADCRUMB_BAR (awra_breadcrumb_bar_get_type ())
G_DECLARE_FINAL_TYPE (AwraBreadcrumbBar, awra_breadcrumb_bar,
                      AWRA, BREADCRUMB_BAR, GtkWidget)

GtkWidget  *awra_breadcrumb_bar_new       (void);
/**
 * awra_breadcrumb_bar_get_model:
 * @self: a breadcrumb bar
 *
 * Returns: (transfer none) (nullable): the breadcrumb item model
 */
GListModel *awra_breadcrumb_bar_get_model (AwraBreadcrumbBar *self);
/**
 * awra_breadcrumb_bar_set_model:
 * @self: a breadcrumb bar
 * @model: (nullable): a model containing #AwraBreadcrumbItem objects
 */
void        awra_breadcrumb_bar_set_model (AwraBreadcrumbBar *self,
                                            GListModel        *model);

G_END_DECLS
