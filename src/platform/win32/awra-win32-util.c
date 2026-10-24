/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include "platform/win32/awra-win32-util-private.h"

typedef LONG (WINAPI *RtlGetVersionFunc) (OSVERSIONINFOW *info);

DWORD
awra_win32_build_number (void)
{
  static DWORD build;
  HMODULE ntdll;

  if (build != 0)
    return build;
  ntdll = GetModuleHandleW (L"ntdll.dll");
  if (ntdll != NULL) {
    RtlGetVersionFunc rtl_get_version =
      (RtlGetVersionFunc) (void (*) (void)) GetProcAddress (ntdll, "RtlGetVersion");
    OSVERSIONINFOW info = { .dwOSVersionInfoSize = sizeof (info) };

    if (rtl_get_version != NULL && rtl_get_version (&info) == 0)
      build = info.dwBuildNumber;
  }
  return build;
}

gboolean
awra_win32_read_dword (const wchar_t *key,
                       const wchar_t *name,
                       DWORD         *value)
{
  DWORD size = sizeof (*value);

  return RegGetValueW (HKEY_CURRENT_USER, key, name, RRF_RT_REG_DWORD,
                       NULL, value, &size) == ERROR_SUCCESS;
}
