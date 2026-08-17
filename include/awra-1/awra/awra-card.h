/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-surface.h>

G_BEGIN_DECLS

#define AWRA_TYPE_CARD (awra_card_get_type ())
G_DECLARE_FINAL_TYPE (AwraCard, awra_card, AWRA, CARD, GtkWidget)

GtkWidget   *awra_card_new         (void);
/**
 * awra_card_get_child:
 * @self: an Awra card
 *
 * Returns: (transfer none) (nullable): the card content
 */
GtkWidget   *awra_card_get_child   (AwraCard *self);
/**
 * awra_card_set_child:
 * @self: an Awra card
 * @child: (nullable): the card content, or %NULL
 */
void         awra_card_set_child   (AwraCard *self,
                                    GtkWidget *child);
/**
 * awra_card_get_surface:
 * @self: an Awra card
 *
 * Returns: (transfer none): the card surface
 */
AwraSurface *awra_card_get_surface (AwraCard *self);

G_END_DECLS
