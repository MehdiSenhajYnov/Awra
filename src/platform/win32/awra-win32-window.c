/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include "platform/win32/awra-win32-private.h"
#include "platform/win32/awra-win32-util-private.h"

#include <windows.h>
#include <windowsx.h>
#include <commctrl.h>
#include <dwmapi.h>
#include <gdk/win32/gdkwin32.h>

/* DWM attributes newer than some MinGW headers. */
#define AWRA_DWMWA_WINDOW_CORNER_PREFERENCE 33
#define AWRA_DWMWA_BORDER_COLOR 34
#define AWRA_DWMWCP_ROUND 2
#define AWRA_DWMWCP_ROUNDSMALL 3
#define AWRA_DWMWA_COLOR_NONE 0xFFFFFFFEu

#define SUBCLASS_ID 0x41575241 /* "AWRA" */

/* awra.css cancels the margin GTK keeps around client-decorated windows for
 * its resize handles, so the Win32 window is exactly the visible one: DWM
 * then rounds, shadows and fills the backdrop of that window only. Resizing
 * goes through a native border band inside the edges instead. */

static gboolean
can_resize (GtkWindow *window,
            HWND       hwnd)
{
  GdkSurface *surface = gtk_native_get_surface (GTK_NATIVE (window));

  return surface != NULL && gtk_window_get_resizable (window) && !IsZoomed (hwnd) &&
         !(gdk_toplevel_get_state (GDK_TOPLEVEL (surface)) & GDK_TOPLEVEL_STATE_FULLSCREEN);
}

static LRESULT
resize_hit_test (GtkWindow *window,
                 HWND       hwnd,
                 LPARAM     lparam)
{
  POINT point = { GET_X_LPARAM (lparam), GET_Y_LPARAM (lparam) };
  UINT dpi = GetDpiForWindow (hwnd);
  int border = GetSystemMetricsForDpi (SM_CXSIZEFRAME, dpi) +
               GetSystemMetricsForDpi (SM_CXPADDEDBORDER, dpi);
  RECT rect;
  gboolean left, right, top, bottom;

  if (!can_resize (window, hwnd) || !GetWindowRect (hwnd, &rect))
    return HTNOWHERE;

  left = point.x < rect.left + border;
  right = point.x >= rect.right - border;
  top = point.y < rect.top + border;
  bottom = point.y >= rect.bottom - border;

  if (top)
    return left ? HTTOPLEFT : right ? HTTOPRIGHT : HTTOP;
  if (bottom)
    return left ? HTBOTTOMLEFT : right ? HTBOTTOMRIGHT : HTBOTTOM;
  if (left)
    return HTLEFT;
  if (right)
    return HTRIGHT;
  return HTNOWHERE;
}

static gboolean
edge_for_hit (WPARAM          hit,
              GdkSurfaceEdge *edge)
{
  switch (hit) {
  case HTTOPLEFT: *edge = GDK_SURFACE_EDGE_NORTH_WEST; return TRUE;
  case HTTOP: *edge = GDK_SURFACE_EDGE_NORTH; return TRUE;
  case HTTOPRIGHT: *edge = GDK_SURFACE_EDGE_NORTH_EAST; return TRUE;
  case HTLEFT: *edge = GDK_SURFACE_EDGE_WEST; return TRUE;
  case HTRIGHT: *edge = GDK_SURFACE_EDGE_EAST; return TRUE;
  case HTBOTTOMLEFT: *edge = GDK_SURFACE_EDGE_SOUTH_WEST; return TRUE;
  case HTBOTTOM: *edge = GDK_SURFACE_EDGE_SOUTH; return TRUE;
  case HTBOTTOMRIGHT: *edge = GDK_SURFACE_EDGE_SOUTH_EAST; return TRUE;
  default: return FALSE;
  }
}

/* The window has no native frame, so Windows will not size it: hand the drag
 * to GDK, as GTK does from its own resize handles. */
static gboolean
begin_resize (GtkWindow *window,
              HWND       hwnd,
              WPARAM     hit,
              LPARAM     lparam)
{
  GdkSurface *surface = gtk_native_get_surface (GTK_NATIVE (window));
  POINT point = { GET_X_LPARAM (lparam), GET_Y_LPARAM (lparam) };
  GdkSurfaceEdge edge;
  GdkDevice *pointer;
  double scale;

  if (surface == NULL || !edge_for_hit (hit, &edge) || !ScreenToClient (hwnd, &point))
    return FALSE;

  pointer = gdk_seat_get_pointer (gdk_display_get_default_seat (gdk_surface_get_display (surface)));
  scale = gdk_surface_get_scale (surface);
  gdk_toplevel_begin_resize (GDK_TOPLEVEL (surface), edge, pointer, GDK_BUTTON_PRIMARY,
                             point.x / scale, point.y / scale, GetMessageTime ());
  return TRUE;
}

static LRESULT CALLBACK
window_proc (HWND      hwnd,
             UINT      message,
             WPARAM    wparam,
             LPARAM    lparam,
             UINT_PTR  id,
             DWORD_PTR data)
{
  GtkWindow *window = (GtkWindow *) data;
  LRESULT hit;

  switch (message) {
  case WM_NCHITTEST:
    hit = resize_hit_test (window, hwnd, lparam);
    if (hit != HTNOWHERE)
      return hit;
    break;
  case WM_NCLBUTTONDOWN:
    if (begin_resize (window, hwnd, wparam, lparam))
      return 0;
    break;
  case WM_NCDESTROY:
    RemoveWindowSubclass (hwnd, window_proc, id);
    break;
  default:
    break;
  }
  return DefSubclassProc (hwnd, message, wparam, lparam);
}

/* GTK announces its resize-handle margin to GDK as a shadow. There is none
 * left, so GDK must place, snap and maximize the window by its real edges. */
static void
compute_size_cb (GdkToplevel     *toplevel,
                 GdkToplevelSize *size,
                 gpointer         user_data)
{
  (void) toplevel;
  (void) user_data;
  gdk_toplevel_size_set_shadow_width (size, 0, 0, 0, 0);
}

void
awra_win32_style_frame (gpointer handle,
                        gboolean popup)
{
  HWND hwnd = handle;
  int corner = popup ? AWRA_DWMWCP_ROUNDSMALL : AWRA_DWMWCP_ROUND;
  COLORREF border = AWRA_DWMWA_COLOR_NONE;

  if (hwnd == NULL || awra_win32_build_number () < AWRA_WIN32_BUILD_WINDOWS_11)
    return;
  DwmSetWindowAttribute (hwnd, AWRA_DWMWA_WINDOW_CORNER_PREFERENCE,
                         &corner, sizeof (corner));
  DwmSetWindowAttribute (hwnd, AWRA_DWMWA_BORDER_COLOR,
                         &border, sizeof (border));
}

void
awra_win32_window_attach (GtkWindow *window)
{
  GdkSurface *surface = gtk_native_get_surface (GTK_NATIVE (window));
  HWND hwnd;

  if (!GDK_IS_WIN32_SURFACE (surface))
    return;
  hwnd = gdk_win32_surface_get_handle (surface);
  if (hwnd == NULL)
    return;

  /* Runs after GTK's own handler, connected when the window was realized. */
  g_signal_connect (surface, "compute-size", G_CALLBACK (compute_size_cb), NULL);
  SetWindowSubclass (hwnd, window_proc, SUBCLASS_ID, (DWORD_PTR) window);
  awra_win32_style_frame (hwnd, FALSE);
}
