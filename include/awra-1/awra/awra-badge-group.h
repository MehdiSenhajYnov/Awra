/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <awra/awra-badge.h>
G_BEGIN_DECLS
#define AWRA_TYPE_BADGE_GROUP (awra_badge_group_get_type ())
G_DECLARE_FINAL_TYPE (AwraBadgeGroup, awra_badge_group, AWRA, BADGE_GROUP, GtkWidget)
GtkWidget *awra_badge_group_new         (void);
void       awra_badge_group_append      (AwraBadgeGroup *self, AwraBadge *badge);
void       awra_badge_group_remove      (AwraBadgeGroup *self, AwraBadge *badge);
guint      awra_badge_group_get_n_badges (AwraBadgeGroup *self);
/**
 * awra_badge_group_get_badge:
 * Returns: (transfer none) (nullable): the badge at @position
 */
AwraBadge *awra_badge_group_get_badge   (AwraBadgeGroup *self, guint position);
G_END_DECLS
