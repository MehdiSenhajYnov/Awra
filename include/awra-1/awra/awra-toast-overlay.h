/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_TOAST_OVERLAY (awra_toast_overlay_get_type ())
G_DECLARE_FINAL_TYPE (AwraToastOverlay, awra_toast_overlay, AWRA, TOAST_OVERLAY, GtkWidget)
GtkWidget *awra_toast_overlay_new          (void);
/**
 * awra_toast_overlay_get_child:
 * @self: an Awra toast overlay
 *
 * Returns: (transfer none) (nullable): the main content
 */
GtkWidget *awra_toast_overlay_get_child    (AwraToastOverlay *self);
/**
 * awra_toast_overlay_set_child:
 * @self: an Awra toast overlay
 * @child: (nullable): the main content, or %NULL
 */
void       awra_toast_overlay_set_child    (AwraToastOverlay *self,
                                            GtkWidget        *child);
void       awra_toast_overlay_show_message (AwraToastOverlay *self,
                                            const char       *message,
                                            guint             timeout_ms);
gboolean   awra_toast_overlay_get_revealed (AwraToastOverlay *self);
G_END_DECLS
