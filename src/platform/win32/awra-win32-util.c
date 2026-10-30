/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include "platform/win32/awra-win32-util-private.h"

#include <dwmapi.h>

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

/* Settings changes --------------------------------------------------------
 *
 * Windows broadcasts them to top-level windows only (message-only windows
 * miss them), so each watch owns a hidden one. GDK's event source already
 * dispatches the messages of every window of the thread. */

#define WATCH_CLASS L"AwraSettingsWatch"
/* A change comes as several messages, and the registry may lag behind. */
#define SETTLE_MS 250

typedef struct {
  GSource source;
  HWND hwnd;
  guint pending;
  GSourceFunc changed;
  gpointer user_data;
  GDestroyNotify destroy;
} SettingsWatch;

static gboolean
settings_settled (gpointer data)
{
  SettingsWatch *watch = data;

  watch->pending = 0;
  watch->changed (watch->user_data);
  return G_SOURCE_REMOVE;
}

static LRESULT CALLBACK
watch_window_proc (HWND   hwnd,
                   UINT   message,
                   WPARAM wparam,
                   LPARAM lparam)
{
  SettingsWatch *watch = (SettingsWatch *) GetWindowLongPtrW (hwnd, GWLP_USERDATA);

  switch (message) {
  case WM_SETTINGCHANGE:
  case WM_SYSCOLORCHANGE:
  case WM_THEMECHANGED:
  case WM_DWMCOLORIZATIONCOLORCHANGED:
  case WM_DWMCOMPOSITIONCHANGED:
    if (watch != NULL && watch->pending == 0)
      watch->pending = g_timeout_add (SETTLE_MS, settings_settled, watch);
    break;
  default:
    break;
  }
  return DefWindowProcW (hwnd, message, wparam, lparam);
}

static gboolean
watch_prepare (GSource *source,
               int     *timeout)
{
  (void) source;
  *timeout = -1;
  return FALSE;
}

static gboolean
watch_dispatch (GSource    *source,
                GSourceFunc callback,
                gpointer    user_data)
{
  (void) source;
  (void) callback;
  (void) user_data;
  return G_SOURCE_CONTINUE;
}

static void
watch_finalize (GSource *source)
{
  SettingsWatch *watch = (SettingsWatch *) source;

  g_clear_handle_id (&watch->pending, g_source_remove);
  if (watch->hwnd != NULL)
    DestroyWindow (watch->hwnd);
  if (watch->destroy != NULL)
    watch->destroy (watch->user_data);
}

static GSourceFuncs watch_funcs = {
  .prepare = watch_prepare,
  .dispatch = watch_dispatch,
  .finalize = watch_finalize,
};

guint
awra_win32_watch_settings (GSourceFunc    changed,
                           gpointer       user_data,
                           GDestroyNotify destroy)
{
  static gsize registered;
  HINSTANCE instance = GetModuleHandleW (NULL);
  SettingsWatch *watch;
  guint id;

  if (g_once_init_enter (&registered)) {
    WNDCLASSEXW window_class = {
      .cbSize = sizeof (window_class),
      .lpfnWndProc = watch_window_proc,
      .hInstance = instance,
      .lpszClassName = WATCH_CLASS,
    };

    RegisterClassExW (&window_class);
    g_once_init_leave (&registered, 1);
  }
  watch = (SettingsWatch *) g_source_new (&watch_funcs, sizeof (SettingsWatch));
  watch->changed = changed;
  watch->user_data = user_data;
  watch->destroy = destroy;
  /* Top-level but never shown: broadcasts reach it, nothing else does. */
  watch->hwnd = CreateWindowExW (WS_EX_TOOLWINDOW, WATCH_CLASS, L"", WS_POPUP,
                                 0, 0, 0, 0, NULL, NULL, instance, NULL);
  if (watch->hwnd != NULL)
    SetWindowLongPtrW (watch->hwnd, GWLP_USERDATA, (LONG_PTR) watch);
  g_source_set_static_name (&watch->source, "[awra] Windows settings watch");
  id = g_source_attach (&watch->source, NULL);
  g_source_unref (&watch->source);
  return id;
}
