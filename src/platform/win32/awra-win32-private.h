/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

typedef void (*AwraWin32AccentChanged) (const GdkRGBA *accent,
                                        gpointer       user_data);

/* Windows' accent colour (Settings > Personalisation > Colours). */
gboolean awra_win32_read_accent          (GdkRGBA               *accent);

/* Mirror Windows preferences that GTK does not read on this platform (dark
 * mode, high contrast, animations) into @settings, and report accent colour
 * changes. Returns a GSource id to remove when done. */
guint    awra_win32_watch_system         (GtkSettings           *settings,
                                          AwraWin32AccentChanged accent_changed,
                                          gpointer               user_data);

/* Corner radius DWM gives windows on Windows 11, 0 on earlier versions. */
double   awra_win32_window_corner_radius (void);

/* Make @window's realized Win32 window exactly its visible area: no
 * client-side resize margin, native resize borders and DWM corners. */
void     awra_win32_window_attach        (GtkWindow             *window);

G_END_DECLS
