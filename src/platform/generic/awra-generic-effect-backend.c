/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"
#include "platform/awra-effect-backend-private.h"

static gpointer
generic_apply (AwraEffectBackend *backend,
               GdkSurface        *surface,
               int                width,
               int                height,
               int                radius,
               GError           **error)
{
  (void) backend;
  (void) surface;
  (void) width;
  (void) height;
  (void) radius;
  (void) error;
  return NULL;
}

static gboolean
generic_update (AwraEffectBackend *backend,
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
  return TRUE;
}

static void
generic_clear (AwraEffectBackend *backend,
               gpointer           handle,
               GdkSurface        *surface)
{
  (void) backend;
  (void) handle;
  (void) surface;
}

static void
generic_destroy (AwraEffectBackend *backend)
{
  g_free (backend);
}

AwraEffectBackend *
awra_generic_effect_backend_new (void)
{
  AwraEffectBackend *backend = g_new0 (AwraEffectBackend, 1);

  backend->name = "generic-fallback";
  backend->apply = generic_apply;
  backend->update = generic_update;
  backend->clear = generic_clear;
  backend->destroy = generic_destroy;

  return backend;
}

