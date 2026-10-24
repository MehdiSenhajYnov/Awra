/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <windows.h>
#include <glib.h>

/* First builds with each composition feature Awra uses. */
#define AWRA_WIN32_BUILD_WINDOWS_10_1803 17134 /* accent-policy blur */
#define AWRA_WIN32_BUILD_WINDOWS_11      22000 /* rounded corners */
#define AWRA_WIN32_BUILD_WINDOWS_11_22H2 22621 /* system backdrops */

/* Real build number (GetVersionEx lies to unmanifested processes). */
DWORD    awra_win32_build_number (void);
gboolean awra_win32_read_dword   (const wchar_t *key,
                                  const wchar_t *name,
                                  DWORD         *value);
