/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <awra/awra-surface.h>
G_BEGIN_DECLS
#define AWRA_TYPE_OVERLAY_BAR (awra_overlay_bar_get_type())
G_DECLARE_FINAL_TYPE(AwraOverlayBar, awra_overlay_bar, AWRA, OVERLAY_BAR,
                     GtkWidget)
GtkWidget *awra_overlay_bar_new(void);
/**
 * awra_overlay_bar_get_content:
 * @self: an overlay bar
 * Returns: (transfer none) (nullable): the full-size content
 */
GtkWidget *awra_overlay_bar_get_content(AwraOverlayBar *self);
/**
 * awra_overlay_bar_set_content:
 * @self: an overlay bar
 * @content: (nullable): the canvas; its allocation never depends on bar
 * visibility
 */
void awra_overlay_bar_set_content(AwraOverlayBar *self, GtkWidget *content);
/**
 * awra_overlay_bar_get_bar:
 * @self: an overlay bar
 * Returns: (transfer none) (nullable): the floating bar content
 */
GtkWidget *awra_overlay_bar_get_bar(AwraOverlayBar *self);
/**
 * awra_overlay_bar_set_bar:
 * @self: an overlay bar
 * @bar: (nullable): controls; the component owns their inset and surface
 */
void awra_overlay_bar_set_bar(AwraOverlayBar *self, GtkWidget *bar);
/**
 * awra_overlay_bar_get_surface:
 * @self: an overlay bar
 * Returns: (transfer none): the floating surface
 */
AwraSurface *awra_overlay_bar_get_surface(AwraOverlayBar *self);
gboolean awra_overlay_bar_get_revealed(AwraOverlayBar *self);
void awra_overlay_bar_set_revealed(AwraOverlayBar *self, gboolean revealed);
gboolean awra_overlay_bar_get_auto_hide(AwraOverlayBar *self);
void awra_overlay_bar_set_auto_hide(AwraOverlayBar *self, gboolean auto_hide);
gboolean awra_overlay_bar_get_inhibit_auto_hide(AwraOverlayBar *self);
void awra_overlay_bar_set_inhibit_auto_hide(AwraOverlayBar *self,
                                            gboolean inhibit);
guint awra_overlay_bar_get_hide_delay(AwraOverlayBar *self);
void awra_overlay_bar_set_hide_delay(AwraOverlayBar *self, guint milliseconds);
guint awra_overlay_bar_get_max_width(AwraOverlayBar *self);
void awra_overlay_bar_set_max_width(AwraOverlayBar *self, guint pixels);
AwraSpacing awra_overlay_bar_get_inset(AwraOverlayBar *self);
void awra_overlay_bar_set_inset(AwraOverlayBar *self, AwraSpacing inset);
/**
 * awra_overlay_bar_reveal:
 * @self: an overlay bar
 *
 * Shows the bar and restarts its idle delay. Motion and keys in the content do
 * this automatically. Pointer hover, keyboard focus within the bar, and
 * inhibit-auto-hide keep controls reachable. Timers stop when unmapped.
 */
void awra_overlay_bar_reveal(AwraOverlayBar *self);
G_END_DECLS
