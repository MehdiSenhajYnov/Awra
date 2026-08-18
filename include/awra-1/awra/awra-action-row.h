/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_ACTION_ROW (awra_action_row_get_type ())
G_DECLARE_FINAL_TYPE (AwraActionRow, awra_action_row, AWRA, ACTION_ROW, GtkButton)

GtkWidget  *awra_action_row_new           (const char    *title,
                                            const char    *subtitle);
const char *awra_action_row_get_title     (AwraActionRow *self);
void        awra_action_row_set_title     (AwraActionRow *self,
                                            const char    *title);
const char *awra_action_row_get_subtitle  (AwraActionRow *self);
void        awra_action_row_set_subtitle  (AwraActionRow *self,
                                            const char    *subtitle);
const char *awra_action_row_get_icon_name (AwraActionRow *self);
void        awra_action_row_set_icon_name (AwraActionRow *self,
                                            const char    *icon_name);
/**
 * awra_action_row_get_suffix:
 * @self: an Awra action row
 *
 * Returns: (transfer none) (nullable): the decorative suffix widget
 */
GtkWidget  *awra_action_row_get_suffix    (AwraActionRow *self);
/**
 * awra_action_row_set_suffix:
 * @self: an Awra action row
 * @suffix: (nullable): a decorative suffix, or %NULL
 */
void        awra_action_row_set_suffix    (AwraActionRow *self,
                                            GtkWidget     *suffix);

G_END_DECLS
