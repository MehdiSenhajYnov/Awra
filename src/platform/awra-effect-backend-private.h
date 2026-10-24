/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-enums.h>

typedef struct _AwraEffectBackend AwraEffectBackend;

typedef void (*AwraBackendCapabilitiesChanged) (AwraEffectBackend     *backend,
                                                AwraEffectCapability  capabilities,
                                                gpointer              user_data);

struct _AwraEffectBackend {
  const char *name;
  gboolean interface_announced;
  /* Set when the platform refused the effect for good: why it fell back. */
  const char *refusal;
  AwraEffectCapability capabilities;
  AwraBackendCapabilitiesChanged capabilities_changed;
  gpointer capabilities_changed_data;

  gpointer (*apply)  (AwraEffectBackend *backend,
                      GdkSurface        *surface,
                      int                width,
                      int                height,
                      int                radius,
                      GError           **error);
  gboolean (*update) (AwraEffectBackend *backend,
                      gpointer           handle,
                      GdkSurface        *surface,
                      int                width,
                      int                height,
                      int                radius,
                      GError           **error);
  /* Optional: follow the light/dark appearance (e.g. tinted backdrops). */
  void     (*set_dark) (AwraEffectBackend *backend,
                        gpointer           handle,
                        GdkSurface        *surface,
                        gboolean           dark);
  void     (*clear)   (AwraEffectBackend *backend,
                      gpointer           handle,
                      GdkSurface        *surface);
  void     (*destroy) (AwraEffectBackend *backend);
};

AwraEffectBackend *awra_generic_effect_backend_new (void);

#ifdef AWRA_HAVE_WIN32
AwraEffectBackend *awra_win32_effect_backend_new (GdkDisplay *display);
#endif

#ifdef AWRA_HAVE_WAYLAND_EFFECTS
AwraEffectBackend *awra_wayland_effect_backend_new (GdkDisplay *display,
                                                    GError    **error);
#endif
