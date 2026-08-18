/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-enums.h>

G_BEGIN_DECLS

#define AWRA_TYPE_BADGE (awra_badge_get_type ())
G_DECLARE_FINAL_TYPE (AwraBadge, awra_badge, AWRA, BADGE, GtkWidget)

GtkWidget  *awra_badge_new       (const char *text);
const char *awra_badge_get_text  (AwraBadge  *self);
void        awra_badge_set_text  (AwraBadge  *self,
                                  const char *text);
AwraBadgeAppearance awra_badge_get_appearance (AwraBadge           *self);
void                awra_badge_set_appearance (AwraBadge           *self,
                                                AwraBadgeAppearance  appearance);
/**
 * awra_badge_get_custom_color:
 * @self: an Awra badge
 *
 * Returns: (transfer none) (nullable): the application category color, or
 *   %NULL when the semantic appearance palette is active
 */
const GdkRGBA       *awra_badge_get_custom_color (AwraBadge     *self);
void                 awra_badge_set_custom_color (AwraBadge     *self,
                                                   const GdkRGBA *color);

G_END_DECLS
