/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include <windows.h>

#include "platform/win32/awra-win32-private.h"
#include "platform/win32/awra-win32-util-private.h"

#define PERSONALIZE_KEY L"Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
#define ACCENT_KEY L"Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent"

/* GTK does not read these on Windows: they are read again whenever Windows
 * announces a settings change. Only a change of the system value is written
 * to GtkSettings, so an application that set one itself keeps it. */

typedef struct {
  GtkSettings *settings;
  AwraWin32AccentChanged accent_changed;
  gpointer user_data;
  GdkRGBA accent;
  gboolean have_accent;
  int color_scheme;
  int contrast;
  int reduced_motion;
} SystemWatch;

gboolean
awra_win32_read_accent (GdkRGBA *accent)
{
  DWORD abgr;

  if (!awra_win32_read_dword (ACCENT_KEY, L"AccentColorMenu", &abgr))
    return FALSE;
  /* Stored as 0xAABBGGRR. */
  accent->red = (abgr & 0xff) / 255.0f;
  accent->green = ((abgr >> 8) & 0xff) / 255.0f;
  accent->blue = ((abgr >> 16) & 0xff) / 255.0f;
  accent->alpha = 1.0f;
  return TRUE;
}

double
awra_win32_window_corner_radius (void)
{
  return awra_win32_build_number () >= AWRA_WIN32_BUILD_WINDOWS_11 ? 8.0 : 0.0;
}

double
awra_win32_popup_corner_radius (void)
{
  return awra_win32_build_number () >= AWRA_WIN32_BUILD_WINDOWS_11 ? 4.0 : 0.0;
}

/* Writes @value when the system's own value changed since last read. */
static void
follow_system (GtkSettings *settings,
               const char  *name,
               int         *last,
               int          value)
{
  int current = 0;

  if (*last == value)
    return;
  *last = value;
  g_object_get (settings, name, &current, NULL);
  if (current != value)
    g_object_set (settings, name, value, NULL);
}

static gboolean
read_system (gpointer data)
{
  SystemWatch *watch = data;
  DWORD light = 1;
  HIGHCONTRASTW contrast = { .cbSize = sizeof (contrast) };
  BOOL animations = TRUE;
  GdkRGBA accent;

  awra_win32_read_dword (PERSONALIZE_KEY, L"AppsUseLightTheme", &light);
  follow_system (watch->settings, "gtk-interface-color-scheme", &watch->color_scheme,
                 light ? GTK_INTERFACE_COLOR_SCHEME_LIGHT
                       : GTK_INTERFACE_COLOR_SCHEME_DARK);

  if (SystemParametersInfoW (SPI_GETHIGHCONTRAST, sizeof (contrast), &contrast, 0))
    follow_system (watch->settings, "gtk-interface-contrast", &watch->contrast,
                   (contrast.dwFlags & HCF_HIGHCONTRASTON)
                     ? GTK_INTERFACE_CONTRAST_MORE
                     : GTK_INTERFACE_CONTRAST_NO_PREFERENCE);

  if (SystemParametersInfoW (SPI_GETCLIENTAREAANIMATION, 0, &animations, 0))
    follow_system (watch->settings, "gtk-interface-reduced-motion", &watch->reduced_motion,
                   animations ? GTK_REDUCED_MOTION_NO_PREFERENCE
                              : GTK_REDUCED_MOTION_REDUCE);

  if (awra_win32_read_accent (&accent) &&
      (!watch->have_accent || !gdk_rgba_equal (&accent, &watch->accent))) {
    watch->accent = accent;
    watch->have_accent = TRUE;
    if (watch->accent_changed != NULL)
      watch->accent_changed (&accent, watch->user_data);
  }
  return G_SOURCE_CONTINUE;
}

guint
awra_win32_watch_system (GtkSettings           *settings,
                         AwraWin32AccentChanged accent_changed,
                         gpointer               user_data)
{
  SystemWatch *watch = g_new0 (SystemWatch, 1);

  watch->settings = settings;
  watch->accent_changed = accent_changed;
  watch->user_data = user_data;
  watch->have_accent = awra_win32_read_accent (&watch->accent);
  watch->color_scheme = watch->contrast = watch->reduced_motion = -1;
  read_system (watch);
  return awra_win32_watch_settings (read_system, watch, g_free);
}
