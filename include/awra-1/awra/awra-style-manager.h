/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>
#include <awra/awra-token-set.h>

G_BEGIN_DECLS

#define AWRA_TYPE_STYLE_MANAGER (awra_style_manager_get_type ())
G_DECLARE_FINAL_TYPE (AwraStyleManager, awra_style_manager, AWRA, STYLE_MANAGER, GObject)

AwraAppearance awra_style_manager_get_appearance           (AwraStyleManager *self);
void           awra_style_manager_set_appearance           (AwraStyleManager *self,
                                                             AwraAppearance    appearance);
const GdkRGBA  *awra_style_manager_get_accent               (AwraStyleManager *self);
void           awra_style_manager_set_accent               (AwraStyleManager *self,
                                                             const GdkRGBA    *accent);
gboolean       awra_style_manager_get_high_contrast         (AwraStyleManager *self);
void           awra_style_manager_set_high_contrast         (AwraStyleManager *self,
                                                             gboolean          high_contrast);
gboolean       awra_style_manager_get_reduced_motion        (AwraStyleManager *self);
void           awra_style_manager_set_reduced_motion        (AwraStyleManager *self,
                                                             gboolean          reduced_motion);
gboolean       awra_style_manager_get_reduced_transparency  (AwraStyleManager *self);
void           awra_style_manager_set_reduced_transparency  (AwraStyleManager *self,
                                                             gboolean          reduced_transparency);
/**
 * awra_style_manager_get_token_set:
 * @self: an Awra style manager
 *
 * Returns: (transfer none): the current immutable token snapshot
 */
AwraTokenSet  *awra_style_manager_get_token_set             (AwraStyleManager *self);

G_END_DECLS
