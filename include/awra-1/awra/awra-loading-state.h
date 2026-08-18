/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_LOADING_STATE (awra_loading_state_get_type ())
G_DECLARE_FINAL_TYPE (AwraLoadingState, awra_loading_state,
                      AWRA, LOADING_STATE, GtkWidget)

GtkWidget  *awra_loading_state_new             (void);
/**
 * awra_loading_state_get_title:
 * @self: a loading state
 *
 * Returns: (transfer none) (nullable): the title
 */
const char *awra_loading_state_get_title       (AwraLoadingState *self);
/**
 * awra_loading_state_set_title:
 * @self: a loading state
 * @title: (nullable): the title, or %NULL
 */
void        awra_loading_state_set_title       (AwraLoadingState *self,
                                                const char       *title);
/**
 * awra_loading_state_get_description:
 * @self: a loading state
 *
 * Returns: (transfer none) (nullable): the description
 */
const char *awra_loading_state_get_description (AwraLoadingState *self);
/**
 * awra_loading_state_set_description:
 * @self: a loading state
 * @description: (nullable): the description, or %NULL
 */
void        awra_loading_state_set_description (AwraLoadingState *self,
                                                const char       *description);
gboolean    awra_loading_state_get_active      (AwraLoadingState *self);
void        awra_loading_state_set_active      (AwraLoadingState *self,
                                                gboolean          active);

G_END_DECLS
