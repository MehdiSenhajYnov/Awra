/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_ERROR_STATE (awra_error_state_get_type ())
G_DECLARE_FINAL_TYPE (AwraErrorState, awra_error_state,
                      AWRA, ERROR_STATE, GtkWidget)

GtkWidget  *awra_error_state_new             (void);
/**
 * awra_error_state_get_title:
 * @self: an error state
 *
 * Returns: (transfer none) (nullable): the title
 */
const char *awra_error_state_get_title       (AwraErrorState *self);
/**
 * awra_error_state_set_title:
 * @self: an error state
 * @title: (nullable): the title, or %NULL
 */
void        awra_error_state_set_title       (AwraErrorState *self,
                                              const char     *title);
/**
 * awra_error_state_get_description:
 * @self: an error state
 *
 * Returns: (transfer none) (nullable): the description
 */
const char *awra_error_state_get_description (AwraErrorState *self);
/**
 * awra_error_state_set_description:
 * @self: an error state
 * @description: (nullable): the description, or %NULL
 */
void        awra_error_state_set_description (AwraErrorState *self,
                                              const char     *description);
/**
 * awra_error_state_get_action:
 * @self: an error state
 *
 * Returns: (transfer none) (nullable): the recovery action
 */
GtkWidget  *awra_error_state_get_action      (AwraErrorState *self);
/**
 * awra_error_state_set_action:
 * @self: an error state
 * @action: (nullable): the recovery action, or %NULL
 */
void        awra_error_state_set_action      (AwraErrorState *self,
                                              GtkWidget      *action);

G_END_DECLS
