/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_EMPTY_STATE (awra_empty_state_get_type ())
G_DECLARE_FINAL_TYPE (AwraEmptyState, awra_empty_state,
                      AWRA, EMPTY_STATE, GtkWidget)

GtkWidget  *awra_empty_state_new             (void);
/**
 * awra_empty_state_get_icon_name:
 * @self: an empty state
 *
 * Returns: (transfer none): the effective icon name
 */
const char *awra_empty_state_get_icon_name   (AwraEmptyState *self);
/**
 * awra_empty_state_set_icon_name:
 * @self: an empty state
 * @icon_name: (nullable): an icon name, or %NULL for the default
 */
void        awra_empty_state_set_icon_name   (AwraEmptyState *self,
                                              const char     *icon_name);
/**
 * awra_empty_state_get_title:
 * @self: an empty state
 *
 * Returns: (transfer none) (nullable): the title
 */
const char *awra_empty_state_get_title       (AwraEmptyState *self);
/**
 * awra_empty_state_set_title:
 * @self: an empty state
 * @title: (nullable): the title, or %NULL
 */
void        awra_empty_state_set_title       (AwraEmptyState *self,
                                              const char     *title);
/**
 * awra_empty_state_get_description:
 * @self: an empty state
 *
 * Returns: (transfer none) (nullable): the description
 */
const char *awra_empty_state_get_description (AwraEmptyState *self);
/**
 * awra_empty_state_set_description:
 * @self: an empty state
 * @description: (nullable): the description, or %NULL
 */
void        awra_empty_state_set_description (AwraEmptyState *self,
                                              const char     *description);
/**
 * awra_empty_state_get_action:
 * @self: an empty state
 *
 * Returns: (transfer none) (nullable): the primary action
 */
GtkWidget  *awra_empty_state_get_action      (AwraEmptyState *self);
/**
 * awra_empty_state_set_action:
 * @self: an empty state
 * @action: (nullable): the primary action, or %NULL
 */
void        awra_empty_state_set_action      (AwraEmptyState *self,
                                              GtkWidget      *action);

G_END_DECLS
