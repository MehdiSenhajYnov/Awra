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
/**
 * awra_toast_overlay_show_with_action:
 * @self: an Awra toast overlay
 * @message: the message
 * @button_label: the label of the action button, for example "Undo"
 * @detailed_action_name: (nullable): a detailed #GAction name resolved from
 *   the overlay's widget hierarchy, such as `win.undo`, or %NULL for a
 *   button that only dismisses the toast
 * @timeout_ms: the delay before the toast hides, or 0 to keep it visible
 *
 * Shows a toast with one action button, replacing any visible toast.
 * Activating the button runs the action, then dismisses the toast.
 *
 * Returns: a non-zero identifier for awra_toast_overlay_dismiss()
 *
 * Since: 1.1
 */
guint      awra_toast_overlay_show_with_action (AwraToastOverlay *self,
                                                const char       *message,
                                                const char       *button_label,
                                                const char       *detailed_action_name,
                                                guint             timeout_ms);
/**
 * awra_toast_overlay_dismiss:
 * @self: an Awra toast overlay
 * @toast_id: an identifier returned by awra_toast_overlay_show_with_action()
 *
 * Hides the toast if it is still the visible one; stale identifiers are
 * ignored.
 *
 * Since: 1.1
 */
void       awra_toast_overlay_dismiss      (AwraToastOverlay *self,
                                            guint             toast_id);
/**
 * awra_toast_overlay_get_current_toast_id:
 * @self: an Awra toast overlay
 *
 * Returns: the identifier of the visible toast, or 0
 *
 * Since: 1.1
 */
guint      awra_toast_overlay_get_current_toast_id (AwraToastOverlay *self);
gboolean   awra_toast_overlay_get_revealed (AwraToastOverlay *self);
G_END_DECLS
