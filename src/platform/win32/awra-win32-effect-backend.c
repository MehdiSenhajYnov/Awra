/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include "platform/awra-effect-backend-private.h"

#include <windows.h>
#include <dwmapi.h>
#include <gdk/win32/gdkwin32.h>

#include "platform/win32/awra-win32-private.h"
#include "platform/win32/awra-win32-util-private.h"

/* DWM attributes newer than some MinGW headers. */
#define AWRA_DWMWA_USE_IMMERSIVE_DARK_MODE 20
#define AWRA_DWMWA_WINDOW_CORNER_PREFERENCE 33
#define AWRA_DWMWA_SYSTEMBACKDROP_TYPE 38
#define AWRA_DWMWCP_ROUND 2
#define AWRA_DWMSBT_NONE 1
#define AWRA_DWMSBT_TRANSIENTWINDOW 3 /* Acrylic: blurs what is behind */

/* Windows 10 composition attribute (user32, undocumented but stable). */
#define AWRA_WCA_ACCENT_POLICY 19
#define AWRA_ACCENT_DISABLED 0
#define AWRA_ACCENT_ENABLE_BLURBEHIND 3

typedef struct {
  int accent_state;
  int accent_flags;
  DWORD gradient_color;
  int animation_id;
} AccentPolicy;

typedef struct {
  int attribute;
  void *data;
  SIZE_T size;
} CompositionAttribute;

typedef BOOL (WINAPI *SetWindowCompositionAttributeFunc) (HWND, CompositionAttribute *);

#define PERSONALIZE_KEY L"Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
#define POLL_SECONDS 2

typedef enum {
  MODE_NONE,
  MODE_SYSTEM_BACKDROP, /* Windows 11 22H2+ */
  MODE_ACCENT_BLUR,     /* Windows 10 1803+, early Windows 11 */
} Mode;

typedef struct {
  AwraEffectBackend parent;
  Mode mode;
  SetWindowCompositionAttributeFunc set_composition;
  guint poll_id;
} Win32Backend;

static gboolean
transparency_enabled (void)
{
  DWORD enabled = 1;

  /* Settings > Personalisation > Colours > Transparency effects. */
  awra_win32_read_dword (PERSONALIZE_KEY, L"EnableTransparency", &enabled);
  return enabled != 0;
}

static AwraEffectCapability
current_capabilities (Win32Backend *self)
{
  BOOL composition = FALSE;

  if (self->mode == MODE_NONE ||
      FAILED (DwmIsCompositionEnabled (&composition)) || !composition ||
      !transparency_enabled ())
    return AWRA_EFFECT_CAPABILITY_NONE;
  return AWRA_EFFECT_CAPABILITY_BLUR;
}

static gboolean
poll_capabilities (gpointer data)
{
  Win32Backend *self = data;
  AwraEffectCapability capabilities = current_capabilities (self);

  if (capabilities != self->parent.capabilities) {
    self->parent.capabilities = capabilities;
    if (self->parent.capabilities_changed != NULL)
      self->parent.capabilities_changed (&self->parent, capabilities,
                                         self->parent.capabilities_changed_data);
  }
  return G_SOURCE_CONTINUE;
}

/* The system refused the effect: stop offering it, so Awra settles on the
 * opaque look instead of retrying on every frame. */
static void
give_up (Win32Backend *self,
         const char   *reason,
         GError      **error)
{
  g_set_error_literal (error, G_IO_ERROR, G_IO_ERROR_NOT_SUPPORTED, reason);
  self->mode = MODE_NONE;
  self->parent.interface_announced = FALSE;
  if (self->parent.capabilities != AWRA_EFFECT_CAPABILITY_NONE) {
    self->parent.capabilities = AWRA_EFFECT_CAPABILITY_NONE;
    if (self->parent.capabilities_changed != NULL)
      self->parent.capabilities_changed (&self->parent, AWRA_EFFECT_CAPABILITY_NONE,
                                         self->parent.capabilities_changed_data);
  }
}

static gboolean
set_accent (Win32Backend *self,
            HWND          hwnd,
            int           state)
{
  AccentPolicy policy = { .accent_state = state, .accent_flags = 2 };
  CompositionAttribute attribute = {
    .attribute = AWRA_WCA_ACCENT_POLICY,
    .data = &policy,
    .size = sizeof (policy),
  };

  return self->set_composition != NULL && self->set_composition (hwnd, &attribute);
}

static HWND
surface_hwnd (GdkSurface *surface,
              GError    **error)
{
  HWND hwnd;

  if (!GDK_IS_WIN32_SURFACE (surface)) {
    g_set_error_literal (error, G_IO_ERROR, G_IO_ERROR_NOT_SUPPORTED,
                         "GdkSurface is not a Win32 surface");
    return NULL;
  }
  hwnd = gdk_win32_surface_get_handle (surface);
  if (hwnd == NULL)
    g_set_error_literal (error, G_IO_ERROR, G_IO_ERROR_NOT_INITIALIZED,
                         "GDK has not created the window yet");
  return hwnd;
}

static gpointer
win32_apply (AwraEffectBackend *backend,
             GdkSurface        *surface,
             int                width,
             int                height,
             int                radius,
             GError           **error)
{
  Win32Backend *self = (Win32Backend *) backend;
  HWND hwnd = surface_hwnd (surface, error);

  (void) width;
  (void) height;
  (void) radius;

  if (hwnd == NULL)
    return NULL;

  if (self->mode == MODE_SYSTEM_BACKDROP) {
    /* The whole client area becomes "glass" DWM fills with the backdrop
     * wherever GTK draws translucent pixels; DWM also rounds the corners
     * and draws the native shadow. */
    MARGINS margins = { -1, -1, -1, -1 };
    int corner = AWRA_DWMWCP_ROUND;
    int backdrop = AWRA_DWMSBT_TRANSIENTWINDOW;

    if (FAILED (DwmExtendFrameIntoClientArea (hwnd, &margins)) ||
        FAILED (DwmSetWindowAttribute (hwnd, AWRA_DWMWA_SYSTEMBACKDROP_TYPE,
                                       &backdrop, sizeof (backdrop)))) {
      give_up (self, "DWM refused the system backdrop", error);
      return NULL;
    }
    DwmSetWindowAttribute (hwnd, AWRA_DWMWA_WINDOW_CORNER_PREFERENCE,
                           &corner, sizeof (corner));
    awra_win32_style_frame (hwnd, GDK_IS_POPUP (surface));
  } else if (self->mode != MODE_ACCENT_BLUR ||
             !set_accent (self, hwnd, AWRA_ACCENT_ENABLE_BLURBEHIND)) {
    give_up (self, "SetWindowCompositionAttribute is unavailable", error);
    return NULL;
  }
  return hwnd;
}

static gboolean
win32_update (AwraEffectBackend *backend,
              gpointer           handle,
              GdkSurface        *surface,
              int                width,
              int                height,
              int                radius,
              GError           **error)
{
  (void) backend;
  (void) handle;
  (void) surface;
  (void) width;
  (void) height;
  (void) radius;
  (void) error;
  /* DWM follows the window's size and shape by itself. */
  return TRUE;
}

static void
win32_set_dark (AwraEffectBackend *backend,
                gpointer           handle,
                GdkSurface        *surface,
                gboolean           dark)
{
  BOOL value = dark;

  (void) backend;
  (void) surface;
  /* Tints the Acrylic backdrop and the native frame for the appearance. */
  DwmSetWindowAttribute ((HWND) handle, AWRA_DWMWA_USE_IMMERSIVE_DARK_MODE,
                         &value, sizeof (value));
}

static void
win32_clear (AwraEffectBackend *backend,
             gpointer           handle,
             GdkSurface        *surface)
{
  Win32Backend *self = (Win32Backend *) backend;
  HWND hwnd = handle;

  (void) surface;

  if (hwnd == NULL || !IsWindow (hwnd))
    return;
  if (self->mode == MODE_SYSTEM_BACKDROP) {
    MARGINS margins = { 0, 0, 0, 0 };
    int backdrop = AWRA_DWMSBT_NONE;

    DwmSetWindowAttribute (hwnd, AWRA_DWMWA_SYSTEMBACKDROP_TYPE,
                           &backdrop, sizeof (backdrop));
    DwmExtendFrameIntoClientArea (hwnd, &margins);
  } else {
    set_accent (self, hwnd, AWRA_ACCENT_DISABLED);
  }
}

static void
win32_destroy (AwraEffectBackend *backend)
{
  Win32Backend *self = (Win32Backend *) backend;

  if (self->poll_id != 0)
    g_source_remove (self->poll_id);
  g_free (self);
}

AwraEffectBackend *
awra_win32_effect_backend_new (GdkDisplay *display)
{
  Win32Backend *self;
  DWORD build = awra_win32_build_number ();
  HMODULE user32 = GetModuleHandleW (L"user32.dll");

  if (!GDK_IS_WIN32_DISPLAY (display))
    return NULL;

  self = g_new0 (Win32Backend, 1);
  self->parent.name = "win32-dwm";
  self->parent.apply = win32_apply;
  self->parent.update = win32_update;
  self->parent.set_dark = win32_set_dark;
  self->parent.clear = win32_clear;
  self->parent.destroy = win32_destroy;
  if (user32 != NULL)
    self->set_composition = (SetWindowCompositionAttributeFunc) (void (*) (void))
      GetProcAddress (user32, "SetWindowCompositionAttribute");

  if (build >= AWRA_WIN32_BUILD_WINDOWS_11_22H2)
    self->mode = MODE_SYSTEM_BACKDROP;
  else if (build >= AWRA_WIN32_BUILD_WINDOWS_10_1803 && self->set_composition != NULL)
    self->mode = MODE_ACCENT_BLUR;

  self->parent.interface_announced = self->mode != MODE_NONE;
  self->parent.capabilities = current_capabilities (self);
  /* Follow the "Transparency effects" switch and DWM restarts. */
  self->poll_id = g_timeout_add_seconds (POLL_SECONDS, poll_capabilities, self);
  return &self->parent;
}
