/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

/**
 * AwraShortcutCapture:
 *
 * Since: 1.1
 */
#define AWRA_TYPE_SHORTCUT_CAPTURE (awra_shortcut_capture_get_type ())
G_DECLARE_FINAL_TYPE (AwraShortcutCapture, awra_shortcut_capture, AWRA, SHORTCUT_CAPTURE, GtkWidget)

/**
 * awra_shortcut_capture_new:
 *
 * Since: 1.1
 */
GtkWidget       *awra_shortcut_capture_new                (void);
/**
 * awra_shortcut_capture_start:
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_start              (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_cancel:
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_cancel             (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_clear:
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_clear              (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_get_listening:
 *
 * Since: 1.1
 */
gboolean         awra_shortcut_capture_get_listening      (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_get_allow_chords:
 *
 * Since: 1.1
 */
gboolean         awra_shortcut_capture_get_allow_chords   (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_set_allow_chords:
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_set_allow_chords   (AwraShortcutCapture *self,
                                                           gboolean             allow_chords);
/**
 * awra_shortcut_capture_get_placeholder:
 * @self: an Awra shortcut capture
 *
 * Returns: (transfer none) (nullable): the text shown without a shortcut
 *
 * Since: 1.1
 */
const char      *awra_shortcut_capture_get_placeholder    (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_set_placeholder:
 * @self: an Awra shortcut capture
 * @placeholder: (nullable): the text shown without a shortcut
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_set_placeholder    (AwraShortcutCapture *self,
                                                           const char          *placeholder);
/**
 * awra_shortcut_capture_get_keycodes:
 * @self: an Awra shortcut capture
 * @n_keycodes: (out): the number of keycodes
 *
 * Returns the GDK hardware keycodes of the captured combination, in the
 * order they were pressed. Modifier keys are included.
 *
 * Returns: (transfer none) (array length=n_keycodes) (nullable): keycodes
 *
 * Since: 1.1
 */
const guint     *awra_shortcut_capture_get_keycodes       (AwraShortcutCapture *self,
                                                           guint               *n_keycodes);
/**
 * awra_shortcut_capture_get_keyvals:
 * @self: an Awra shortcut capture
 * @n_keyvals: (out): the number of keyvals
 *
 * Returns the unshifted keyvals matching
 * awra_shortcut_capture_get_keycodes() for the layout active during capture.
 *
 * Returns: (transfer none) (array length=n_keyvals) (nullable): keyvals
 *
 * Since: 1.1
 */
const guint     *awra_shortcut_capture_get_keyvals        (AwraShortcutCapture *self,
                                                           guint               *n_keyvals);
/**
 * awra_shortcut_capture_get_codes:
 * @self: an Awra shortcut capture
 *
 * Returns the captured keys as `KeyboardEvent.code` style identifiers.
 * Unknown keys are reported as `Unidentified`.
 *
 * Returns: (transfer full) (array zero-terminated=1): key identifiers
 *
 * Since: 1.1
 */
char           **awra_shortcut_capture_get_codes          (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_get_modifiers:
 *
 * Since: 1.1
 */
GdkModifierType  awra_shortcut_capture_get_modifiers      (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_set_shortcut:
 * @self: an Awra shortcut capture
 * @keycodes: (array length=n_keycodes) (nullable): GDK hardware keycodes
 * @n_keycodes: the number of keycodes
 * @modifiers: the modifier mask implied by the shortcut
 *
 * Presents a previously stored combination without user interaction.
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_set_shortcut       (AwraShortcutCapture *self,
                                                           const guint         *keycodes,
                                                           guint                n_keycodes,
                                                           GdkModifierType      modifiers);
/**
 * awra_shortcut_capture_get_display_labels:
 * @self: an Awra shortcut capture
 *
 * Returns: (transfer none) (array zero-terminated=1) (nullable): the
 *   application-provided chip labels, or %NULL for Awra's own labels
 *
 * Since: 1.1
 */
const char * const *awra_shortcut_capture_get_display_labels (AwraShortcutCapture *self);
/**
 * awra_shortcut_capture_set_display_labels:
 * @self: an Awra shortcut capture
 * @labels: (array zero-terminated=1) (nullable): one label per chip, or %NULL
 *   to let Awra name the keys from the active layout
 *
 * Applications usually call this from #AwraShortcutCapture::captured to use
 * their own key vocabulary. A new capture resets the labels to %NULL.
 *
 * Since: 1.1
 */
void             awra_shortcut_capture_set_display_labels (AwraShortcutCapture *self,
                                                           const char * const  *labels);

G_END_DECLS
