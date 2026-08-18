/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-surface.h>

G_BEGIN_DECLS

#define AWRA_TYPE_CARD (awra_card_get_type ())
G_DECLARE_FINAL_TYPE (AwraCard, awra_card, AWRA, CARD, GtkWidget)

GtkWidget   *awra_card_new         (void);
AwraCardAppearance awra_card_get_appearance (AwraCard *self);
void         awra_card_set_appearance (AwraCard           *self,
                                       AwraCardAppearance  appearance);
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
 * awra_card_get_content_inset:
 * @self: an Awra card
 *
 * Returns: the semantic inset applied around the card content
 */
AwraSpacing  awra_card_get_content_inset (AwraCard    *self);
/**
 * awra_card_set_content_inset:
 * @self: an Awra card
 * @inset: the semantic inset, including %AWRA_SPACING_NONE
 *
 * Cards own their content breathing room so applications do not need to set
 * margins on the child. The default is %AWRA_SPACING_LG.
 */
void         awra_card_set_content_inset (AwraCard    *self,
                                           AwraSpacing  inset);
/**
 * awra_card_get_surface:
 * @self: an Awra card
 *
 * Returns: (transfer none): the card surface
 */
AwraSurface *awra_card_get_surface (AwraCard *self);

G_END_DECLS
