/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_KEY_CAP (awra_key_cap_get_type ())
G_DECLARE_FINAL_TYPE (AwraKeyCap, awra_key_cap, AWRA, KEY_CAP, GtkWidget)

/**
 * awra_key_cap_new:
 * @key_code: (nullable): a physical key identifier such as `KeyA`
 * @label: (nullable): the visible key legend
 *
 * Returns: (transfer floating): a new key cap
 */
GtkWidget     *awra_key_cap_new                 (const char    *key_code,
                                                 const char    *label);
/**
 * awra_key_cap_get_key_code:
 * @self: an Awra key cap
 *
 * Returns: (transfer none) (nullable): the physical key identifier
 */
const char    *awra_key_cap_get_key_code        (AwraKeyCap    *self);
/**
 * awra_key_cap_set_key_code:
 * @self: an Awra key cap
 * @key_code: (nullable): a physical key identifier such as `KeyA`
 */
void           awra_key_cap_set_key_code        (AwraKeyCap    *self,
                                                 const char    *key_code);
/**
 * awra_key_cap_get_label:
 * @self: an Awra key cap
 *
 * Returns: (transfer none): the visible key legend
 */
const char    *awra_key_cap_get_label           (AwraKeyCap    *self);
/**
 * awra_key_cap_set_label:
 * @self: an Awra key cap
 * @label: (nullable): the visible key legend
 */
void           awra_key_cap_set_label           (AwraKeyCap    *self,
                                                 const char    *label);
/**
 * awra_key_cap_get_secondary_label:
 * @self: an Awra key cap
 *
 * Returns: (transfer none) (nullable): the small secondary legend
 */
const char    *awra_key_cap_get_secondary_label (AwraKeyCap    *self);
/**
 * awra_key_cap_set_secondary_label:
 * @self: an Awra key cap
 * @label: (nullable): a small secondary legend, for example the name of the
 *   content bound to the key, or %NULL
 */
void           awra_key_cap_set_secondary_label (AwraKeyCap    *self,
                                                 const char    *label);
double         awra_key_cap_get_width_units     (AwraKeyCap    *self);
void           awra_key_cap_set_width_units     (AwraKeyCap    *self,
                                                 double         width_units);
gboolean       awra_key_cap_get_bound           (AwraKeyCap    *self);
void           awra_key_cap_set_bound           (AwraKeyCap    *self,
                                                 gboolean       bound);
gboolean       awra_key_cap_get_active          (AwraKeyCap    *self);
void           awra_key_cap_set_active          (AwraKeyCap    *self,
                                                 gboolean       active);
gboolean       awra_key_cap_get_selected        (AwraKeyCap    *self);
void           awra_key_cap_set_selected        (AwraKeyCap    *self,
                                                 gboolean       selected);
gboolean       awra_key_cap_get_dimmed          (AwraKeyCap    *self);
void           awra_key_cap_set_dimmed          (AwraKeyCap    *self,
                                                 gboolean       dimmed);
/**
 * awra_key_cap_get_tint:
 * @self: an Awra key cap
 *
 * Returns: (transfer none) (nullable): the domain fill color, or %NULL
 */
const GdkRGBA *awra_key_cap_get_tint            (AwraKeyCap    *self);
/**
 * awra_key_cap_set_tint:
 * @self: an Awra key cap
 * @tint: (nullable): a domain fill color, or %NULL for the neutral cap
 *
 * Awra selects a light or dark legend color for the effective fill so the
 * labels keep their contrast.
 */
void           awra_key_cap_set_tint            (AwraKeyCap    *self,
                                                 const GdkRGBA *tint);
/**
 * awra_key_cap_get_edge_color:
 * @self: an Awra key cap
 *
 * Returns: (transfer none) (nullable): the thin accent edge color, or %NULL
 */
const GdkRGBA *awra_key_cap_get_edge_color      (AwraKeyCap    *self);
/**
 * awra_key_cap_set_edge_color:
 * @self: an Awra key cap
 * @color: (nullable): a thin edge color painted along the bottom of the cap,
 *   or %NULL
 */
void           awra_key_cap_set_edge_color      (AwraKeyCap    *self,
                                                 const GdkRGBA *color);
/**
 * awra_key_cap_get_badge:
 * @self: an Awra key cap
 *
 * Returns: (transfer none) (nullable): the tiny corner badge text
 */
const char    *awra_key_cap_get_badge           (AwraKeyCap    *self);
/**
 * awra_key_cap_set_badge:
 * @self: an Awra key cap
 * @badge: (nullable): a tiny corner badge such as a count, or %NULL
 */
void           awra_key_cap_set_badge           (AwraKeyCap    *self,
                                                 const char    *badge);
void           awra_key_cap_flash               (AwraKeyCap    *self);

G_END_DECLS
