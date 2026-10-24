/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-enums.h>
#include <awra/awra-key-cap.h>

G_BEGIN_DECLS

#define AWRA_TYPE_KEYBOARD_VIEW (awra_keyboard_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraKeyboardView, awra_keyboard_view, AWRA, KEYBOARD_VIEW, GtkWidget)

GtkWidget  *awra_keyboard_view_new                       (void);
AwraKeyboardPhysicalLayout
            awra_keyboard_view_get_physical_layout        (AwraKeyboardView           *self);
void        awra_keyboard_view_set_physical_layout        (AwraKeyboardView           *self,
                                                           AwraKeyboardPhysicalLayout  layout);
gboolean    awra_keyboard_view_get_show_function_row      (AwraKeyboardView           *self);
void        awra_keyboard_view_set_show_function_row      (AwraKeyboardView           *self,
                                                           gboolean                    show);
gboolean    awra_keyboard_view_get_show_navigation_cluster (AwraKeyboardView          *self);
void        awra_keyboard_view_set_show_navigation_cluster (AwraKeyboardView          *self,
                                                            gboolean                   show);
gboolean    awra_keyboard_view_get_show_numpad            (AwraKeyboardView           *self);
void        awra_keyboard_view_set_show_numpad            (AwraKeyboardView           *self,
                                                           gboolean                    show);
/**
 * awra_keyboard_view_get_key_cap:
 * @self: an Awra keyboard view
 * @code: a physical key identifier such as `KeyA`
 *
 * Returns: (transfer none) (nullable): the cap currently presenting @code
 */
AwraKeyCap *awra_keyboard_view_get_key_cap               (AwraKeyboardView           *self,
                                                           const char                 *code);
/**
 * awra_keyboard_view_get_codes:
 * @self: an Awra keyboard view
 *
 * Lists the physical keys currently presented, in visual reading order.
 *
 * Returns: (transfer full) (array zero-terminated=1): key identifiers
 */
char      **awra_keyboard_view_get_codes                  (AwraKeyboardView           *self);
/**
 * awra_keyboard_view_set_key_label:
 * @self: an Awra keyboard view
 * @code: a physical key identifier
 * @label: (nullable): an application legend, or %NULL to follow the active
 *   keyboard layout again
 */
void        awra_keyboard_view_set_key_label              (AwraKeyboardView           *self,
                                                           const char                 *code,
                                                           const char                 *label);
GtkSelectionMode
            awra_keyboard_view_get_selection_mode         (AwraKeyboardView           *self);
void        awra_keyboard_view_set_selection_mode         (AwraKeyboardView           *self,
                                                           GtkSelectionMode            mode);
/**
 * awra_keyboard_view_get_selected_codes:
 * @self: an Awra keyboard view
 *
 * Returns: (transfer full) (array zero-terminated=1): the selected key
 *   identifiers in visual reading order
 */
char      **awra_keyboard_view_get_selected_codes         (AwraKeyboardView           *self);
/**
 * awra_keyboard_view_set_selected_codes:
 * @self: an Awra keyboard view
 * @codes: (nullable) (array zero-terminated=1): key identifiers to select,
 *   or %NULL to clear the selection
 *
 * Replaces the selection. Unknown and dimmed keys are ignored; in single
 * selection mode only the first valid key is kept.
 */
void        awra_keyboard_view_set_selected_codes         (AwraKeyboardView           *self,
                                                           const char * const         *codes);
void        awra_keyboard_view_select_all                 (AwraKeyboardView           *self);
void        awra_keyboard_view_unselect_all               (AwraKeyboardView           *self);
gboolean    awra_keyboard_view_get_accepts_file_drops     (AwraKeyboardView           *self);
void        awra_keyboard_view_set_accepts_file_drops     (AwraKeyboardView           *self,
                                                           gboolean                    accepts);

/**
 * awra_keyboard_code_from_hardware_keycode:
 * @keycode: a GDK hardware keycode (the evdev code plus 8 on Linux, the
 *   virtual key on Windows)
 *
 * Returns: (transfer none) (nullable): the matching `KeyboardEvent.code`
 *   style identifier, or %NULL when Awra does not know the key
 */
const char *awra_keyboard_code_from_hardware_keycode     (guint                       keycode);
/**
 * awra_keyboard_code_to_hardware_keycode:
 * @code: a physical key identifier such as `KeyA`
 *
 * Returns: the GDK hardware keycode (evdev code plus 8 on Linux, the
 *   virtual key of the current layout on Windows), or 0
 */
guint       awra_keyboard_code_to_hardware_keycode       (const char                 *code);
/**
 * awra_keyboard_code_get_label:
 * @display: (nullable): a display whose active keyboard layout is used, or
 *   %NULL for layout-independent fallback legends
 * @code: a physical key identifier such as `KeyA`
 *
 * Returns: (transfer full) (nullable): the legend for @code in the active
 *   layout, or %NULL when Awra does not know the key
 */
char       *awra_keyboard_code_get_label                 (GdkDisplay                 *display,
                                                           const char                 *code);

G_END_DECLS
