/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-key-cap.h>

G_BEGIN_DECLS

/* Drag-and-drop hover feedback owned by AwraKeyboardView. */
void     awra_key_cap_set_drop_highlight (AwraKeyCap *self,
                                          gboolean    highlight);
gboolean awra_key_cap_get_drop_highlight (AwraKeyCap *self);
/* Geometric metadata in keyboard units, owned by AwraKeyboardView. */
void     awra_key_cap_set_height_units   (AwraKeyCap *self,
                                          double      height_units);
double   awra_key_cap_get_height_units   (AwraKeyCap *self);

G_END_DECLS
