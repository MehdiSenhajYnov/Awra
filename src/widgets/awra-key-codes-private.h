/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

/* Physical key vocabulary shared by AwraKeyboardView and
 * AwraShortcutCapture. Codes follow the W3C UI Events KeyboardEvent.code
 * names; hardware keycodes are GDK/XKB keycodes (Linux evdev + 8). */

typedef enum {
  AWRA_KEY_LABEL_FIXED,     /* label never depends on the logical layout */
  AWRA_KEY_LABEL_LAYOUT,    /* printable key labelled from the active layout */
  AWRA_KEY_LABEL_ALT_GRAPH, /* Alt on the right, AltGr when the layout says so */
} AwraKeyLabelKind;

typedef struct {
  const char *code;
  guint evdev;
  const char *fallback_label; /* N_()-marked, translated at use */
  AwraKeyLabelKind kind;
} AwraKeyCodeInfo;

const AwraKeyCodeInfo *awra_key_code_info_lookup         (const char *code);
const AwraKeyCodeInfo *awra_key_code_info_lookup_keycode (guint       hardware_keycode);
char                  *awra_key_code_info_dup_label      (const AwraKeyCodeInfo *info,
                                                          GdkDisplay            *display,
                                                          int                    layout_index);
int                    awra_key_codes_get_layout_index   (GdkDisplay *display);
const AwraKeyCodeInfo *awra_key_code_info_get_all        (guint      *n_infos);
char                  *awra_key_keyval_dup_label         (guint keyval);

G_END_DECLS
