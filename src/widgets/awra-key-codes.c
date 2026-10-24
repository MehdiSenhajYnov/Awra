/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-keyboard-view.h>

#include "awra-i18n-private.h"
#include "widgets/awra-key-codes-private.h"

#ifdef G_OS_WIN32
#include <windows.h>
#endif

#define EVDEV_TO_HARDWARE 8

#define FIXED(code, evdev, label) { code, evdev, label, AWRA_KEY_LABEL_FIXED }
#define LAYOUT(code, evdev, label) { code, evdev, label, AWRA_KEY_LABEL_LAYOUT }

static const AwraKeyCodeInfo key_codes[] = {
  FIXED ("Escape", 1, N_("Esc")),
  LAYOUT ("Digit1", 2, "1"),
  LAYOUT ("Digit2", 3, "2"),
  LAYOUT ("Digit3", 4, "3"),
  LAYOUT ("Digit4", 5, "4"),
  LAYOUT ("Digit5", 6, "5"),
  LAYOUT ("Digit6", 7, "6"),
  LAYOUT ("Digit7", 8, "7"),
  LAYOUT ("Digit8", 9, "8"),
  LAYOUT ("Digit9", 10, "9"),
  LAYOUT ("Digit0", 11, "0"),
  LAYOUT ("Minus", 12, "-"),
  LAYOUT ("Equal", 13, "="),
  FIXED ("Backspace", 14, N_("Backspace")),
  FIXED ("Tab", 15, N_("Tab")),
  LAYOUT ("KeyQ", 16, "Q"),
  LAYOUT ("KeyW", 17, "W"),
  LAYOUT ("KeyE", 18, "E"),
  LAYOUT ("KeyR", 19, "R"),
  LAYOUT ("KeyT", 20, "T"),
  LAYOUT ("KeyY", 21, "Y"),
  LAYOUT ("KeyU", 22, "U"),
  LAYOUT ("KeyI", 23, "I"),
  LAYOUT ("KeyO", 24, "O"),
  LAYOUT ("KeyP", 25, "P"),
  LAYOUT ("BracketLeft", 26, "["),
  LAYOUT ("BracketRight", 27, "]"),
  FIXED ("Enter", 28, N_("Enter")),
  FIXED ("ControlLeft", 29, N_("Ctrl")),
  LAYOUT ("KeyA", 30, "A"),
  LAYOUT ("KeyS", 31, "S"),
  LAYOUT ("KeyD", 32, "D"),
  LAYOUT ("KeyF", 33, "F"),
  LAYOUT ("KeyG", 34, "G"),
  LAYOUT ("KeyH", 35, "H"),
  LAYOUT ("KeyJ", 36, "J"),
  LAYOUT ("KeyK", 37, "K"),
  LAYOUT ("KeyL", 38, "L"),
  LAYOUT ("Semicolon", 39, ";"),
  LAYOUT ("Quote", 40, "'"),
  LAYOUT ("Backquote", 41, "`"),
  FIXED ("ShiftLeft", 42, N_("Shift")),
  LAYOUT ("Backslash", 43, "\\"),
  LAYOUT ("KeyZ", 44, "Z"),
  LAYOUT ("KeyX", 45, "X"),
  LAYOUT ("KeyC", 46, "C"),
  LAYOUT ("KeyV", 47, "V"),
  LAYOUT ("KeyB", 48, "B"),
  LAYOUT ("KeyN", 49, "N"),
  LAYOUT ("KeyM", 50, "M"),
  LAYOUT ("Comma", 51, ","),
  LAYOUT ("Period", 52, "."),
  LAYOUT ("Slash", 53, "/"),
  FIXED ("ShiftRight", 54, N_("Shift")),
  FIXED ("NumpadMultiply", 55, "*"),
  FIXED ("AltLeft", 56, N_("Alt")),
  FIXED ("Space", 57, N_("Space")),
  FIXED ("CapsLock", 58, N_("Caps Lock")),
  FIXED ("F1", 59, "F1"),
  FIXED ("F2", 60, "F2"),
  FIXED ("F3", 61, "F3"),
  FIXED ("F4", 62, "F4"),
  FIXED ("F5", 63, "F5"),
  FIXED ("F6", 64, "F6"),
  FIXED ("F7", 65, "F7"),
  FIXED ("F8", 66, "F8"),
  FIXED ("F9", 67, "F9"),
  FIXED ("F10", 68, "F10"),
  FIXED ("NumLock", 69, N_("Num")),
  FIXED ("ScrollLock", 70, N_("ScrLk")),
  FIXED ("Numpad7", 71, "7"),
  FIXED ("Numpad8", 72, "8"),
  FIXED ("Numpad9", 73, "9"),
  FIXED ("NumpadSubtract", 74, "−"),
  FIXED ("Numpad4", 75, "4"),
  FIXED ("Numpad5", 76, "5"),
  FIXED ("Numpad6", 77, "6"),
  FIXED ("NumpadAdd", 78, "+"),
  FIXED ("Numpad1", 79, "1"),
  FIXED ("Numpad2", 80, "2"),
  FIXED ("Numpad3", 81, "3"),
  FIXED ("Numpad0", 82, "0"),
  FIXED ("NumpadDecimal", 83, "."),
  LAYOUT ("IntlBackslash", 86, "<"),
  FIXED ("F11", 87, "F11"),
  FIXED ("F12", 88, "F12"),
  FIXED ("NumpadEnter", 96, N_("Enter")),
  FIXED ("ControlRight", 97, N_("Ctrl")),
  FIXED ("NumpadDivide", 98, "/"),
  FIXED ("PrintScreen", 99, N_("PrtSc")),
  { "AltRight", 100, N_("Alt"), AWRA_KEY_LABEL_ALT_GRAPH },
  FIXED ("Home", 102, N_("Home")),
  FIXED ("ArrowUp", 103, "↑"),
  FIXED ("PageUp", 104, N_("PgUp")),
  FIXED ("ArrowLeft", 105, "←"),
  FIXED ("ArrowRight", 106, "→"),
  FIXED ("End", 107, N_("End")),
  FIXED ("ArrowDown", 108, "↓"),
  FIXED ("PageDown", 109, N_("PgDn")),
  FIXED ("Insert", 110, N_("Ins")),
  FIXED ("Delete", 111, N_("Del")),
  FIXED ("Pause", 119, N_("Pause")),
  FIXED ("MetaLeft", 125, N_("Super")),
  FIXED ("MetaRight", 126, N_("Super")),
  FIXED ("ContextMenu", 127, N_("Menu")),
};

#undef FIXED
#undef LAYOUT

#ifdef G_OS_WIN32
/* evdev numbers the main block like AT set-1 scan codes; the keys below are
 * E0-prefixed ("extended") scan codes on Windows. */
static const struct {
  guint evdev;
  guint scan;
} extended_keys[] = {
  { 96, 0x1C }, { 97, 0x1D }, { 98, 0x35 }, { 99, 0x37 }, { 100, 0x38 },
  { 102, 0x47 }, { 103, 0x48 }, { 104, 0x49 }, { 105, 0x4B }, { 106, 0x4D },
  { 107, 0x4F }, { 108, 0x50 }, { 109, 0x51 }, { 110, 0x52 }, { 111, 0x53 },
  { 125, 0x5B }, { 126, 0x5C }, { 127, 0x5D },
};

static guint
evdev_to_scan (guint evdev)
{
  for (guint i = 0; i < G_N_ELEMENTS (extended_keys); i++) {
    if (extended_keys[i].evdev == evdev)
      return 0xE000 | extended_keys[i].scan;
  }
  return evdev < 0x59 ? evdev : 0;
}

static guint
scan_to_evdev (guint scan)
{
  if ((scan & 0xFF00) == 0xE000) {
    for (guint i = 0; i < G_N_ELEMENTS (extended_keys); i++) {
      if (extended_keys[i].scan == (scan & 0xFF))
        return extended_keys[i].evdev;
    }
    return 0;
  }
  return scan;
}
#endif

/* GDK's hardware keycode for a physical key: evdev + 8 on Linux (X11 and
 * Wayland numbering), the layout's virtual key on Windows. */
static guint
hardware_keycode_for (const AwraKeyCodeInfo *info)
{
#ifdef G_OS_WIN32
  guint scan = evdev_to_scan (info->evdev);

  return scan != 0 ? MapVirtualKeyW (scan, MAPVK_VSC_TO_VK_EX) : 0;
#else
  return info->evdev + EVDEV_TO_HARDWARE;
#endif
}

static guint
evdev_for_hardware_keycode (guint keycode)
{
#ifdef G_OS_WIN32
  return scan_to_evdev (MapVirtualKeyW (keycode, MAPVK_VK_TO_VSC_EX));
#else
  return keycode >= EVDEV_TO_HARDWARE ? keycode - EVDEV_TO_HARDWARE : 0;
#endif
}

const AwraKeyCodeInfo *
awra_key_code_info_lookup (const char *code)
{
  if (code == NULL)
    return NULL;
  for (guint i = 0; i < G_N_ELEMENTS (key_codes); i++) {
    if (g_str_equal (key_codes[i].code, code))
      return &key_codes[i];
  }
  return NULL;
}

const AwraKeyCodeInfo *
awra_key_code_info_lookup_keycode (guint hardware_keycode)
{
  guint evdev = evdev_for_hardware_keycode (hardware_keycode);

  if (evdev == 0)
    return NULL;
  for (guint i = 0; i < G_N_ELEMENTS (key_codes); i++) {
    if (key_codes[i].evdev == evdev)
      return &key_codes[i];
  }
  return NULL;
}

const AwraKeyCodeInfo *
awra_key_code_info_get_all (guint *n_infos)
{
  *n_infos = G_N_ELEMENTS (key_codes);
  return key_codes;
}

int
awra_key_codes_get_layout_index (GdkDisplay *display)
{
  GdkSeat *seat;
  GdkDevice *keyboard;
  int index;

  if (display == NULL)
    return 0;
  seat = gdk_display_get_default_seat (display);
  keyboard = seat != NULL ? gdk_seat_get_keyboard (seat) : NULL;
  if (keyboard == NULL)
    return 0;
  index = gdk_device_get_active_layout_index (keyboard);
  return MAX (index, 0);
}

static const char *
dead_key_label (guint keyval)
{
  switch (keyval) {
  case GDK_KEY_dead_grave: return "`";
  case GDK_KEY_dead_acute: return "´";
  case GDK_KEY_dead_circumflex: return "^";
  case GDK_KEY_dead_tilde: return "~";
  case GDK_KEY_dead_diaeresis: return "¨";
  case GDK_KEY_dead_cedilla: return "¸";
  case GDK_KEY_dead_abovering: return "°";
  case GDK_KEY_dead_caron: return "ˇ";
  case GDK_KEY_dead_macron: return "¯";
  default: return NULL;
  }
}

char *
awra_key_keyval_dup_label (guint keyval)
{
  gunichar character;
  const char *dead;
  const char *name;

  switch (keyval) {
  case GDK_KEY_Shift_L:
  case GDK_KEY_Shift_R:
    return g_strdup (_("Shift"));
  case GDK_KEY_Control_L:
  case GDK_KEY_Control_R:
    return g_strdup (_("Ctrl"));
  case GDK_KEY_Alt_L:
  case GDK_KEY_Alt_R:
  case GDK_KEY_Meta_L:
  case GDK_KEY_Meta_R:
    return g_strdup (_("Alt"));
  case GDK_KEY_ISO_Level3_Shift:
    return g_strdup (_("AltGr"));
  case GDK_KEY_Super_L:
  case GDK_KEY_Super_R:
    return g_strdup (_("Super"));
  case GDK_KEY_space:
    return g_strdup (_("Space"));
  case GDK_KEY_Return:
  case GDK_KEY_KP_Enter:
    return g_strdup (_("Enter"));
  case GDK_KEY_Escape:
    return g_strdup (_("Esc"));
  case GDK_KEY_Tab:
  case GDK_KEY_ISO_Left_Tab:
    return g_strdup (_("Tab"));
  case GDK_KEY_BackSpace:
    return g_strdup (_("Backspace"));
  default:
    break;
  }

  dead = dead_key_label (keyval);
  if (dead != NULL)
    return g_strdup (dead);

  character = gdk_keyval_to_unicode (keyval);
  if (character != 0 && g_unichar_isgraph (character)) {
    char buffer[8] = { 0 };

    character = g_unichar_toupper (character);
    g_unichar_to_utf8 (character, buffer);
    return g_strdup (buffer);
  }

  name = gdk_keyval_name (keyval);
  return g_strdup (name != NULL ? name : "");
}

char *
awra_key_code_info_dup_label (const AwraKeyCodeInfo *info,
                              GdkDisplay            *display,
                              int                    layout_index)
{
  guint keyval = 0;

  g_return_val_if_fail (info != NULL, NULL);

  if (info->kind == AWRA_KEY_LABEL_FIXED || display == NULL)
    return g_strdup (_(info->fallback_label));

  if (!gdk_display_translate_key (display,
                                  hardware_keycode_for (info),
                                  0, layout_index,
                                  &keyval, NULL, NULL, NULL) ||
      keyval == 0 || keyval == GDK_KEY_VoidSymbol) {
    return g_strdup (_(info->fallback_label));
  }

  if (info->kind == AWRA_KEY_LABEL_ALT_GRAPH) {
    return g_strdup (keyval == GDK_KEY_ISO_Level3_Shift ||
                     keyval == GDK_KEY_Mode_switch
                       ? _("AltGr") : _(info->fallback_label));
  }

  /* Some backends (Broadway, nested or remote sessions) map hardware keycodes
   * to unrelated keyvals. A layout key that does not produce a printable
   * character or a dead key keeps its physical legend instead of a raw
   * keyval name such as "0xa". */
  if (info->kind == AWRA_KEY_LABEL_LAYOUT) {
    gunichar character = gdk_keyval_to_unicode (keyval);

    if ((character == 0 || !g_unichar_isgraph (character)) &&
        dead_key_label (keyval) == NULL)
      return g_strdup (_(info->fallback_label));
  }

  return awra_key_keyval_dup_label (keyval);
}

const char *
awra_keyboard_code_from_hardware_keycode (guint keycode)
{
  const AwraKeyCodeInfo *info = awra_key_code_info_lookup_keycode (keycode);

  return info != NULL ? info->code : NULL;
}

guint
awra_keyboard_code_to_hardware_keycode (const char *code)
{
  const AwraKeyCodeInfo *info;

  g_return_val_if_fail (code != NULL, 0);
  info = awra_key_code_info_lookup (code);
  return info != NULL ? hardware_keycode_for (info) : 0;
}

char *
awra_keyboard_code_get_label (GdkDisplay *display,
                              const char *code)
{
  const AwraKeyCodeInfo *info;

  g_return_val_if_fail (display == NULL || GDK_IS_DISPLAY (display), NULL);
  g_return_val_if_fail (code != NULL, NULL);

  info = awra_key_code_info_lookup (code);
  if (info == NULL)
    return NULL;
  return awra_key_code_info_dup_label (
    info, display, awra_key_codes_get_layout_index (display));
}
