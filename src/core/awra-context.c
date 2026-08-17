/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include "awra-config.h"

#include <awra/awra-context.h>

#include "awra-init-private.h"
#include "core/awra-context-private.h"
#include "core/awra-style-manager-private.h"
#include "platform/awra-diagnostics-private.h"

struct _AwraContext {
  GObject parent_instance;
  GdkDisplay *display;
  AwraStyleManager *style_manager;
  AwraDiagnostics *diagnostics;
  AwraEffectCoordinator *coordinator;
};

G_DEFINE_FINAL_TYPE (AwraContext, awra_context, G_TYPE_OBJECT)

static GQuark context_quark;

static void
awra_context_dispose (GObject *object)
{
  AwraContext *self = AWRA_CONTEXT (object);

  awra_effect_coordinator_free (g_steal_pointer (&self->coordinator));
  g_clear_object (&self->style_manager);
  g_clear_object (&self->diagnostics);
  self->display = NULL;

  G_OBJECT_CLASS (awra_context_parent_class)->dispose (object);
}

static void
awra_context_class_init (AwraContextClass *klass)
{
  G_OBJECT_CLASS (klass)->dispose = awra_context_dispose;
}

static void
awra_context_init (AwraContext *self)
{
  (void) self;
}

static const char *
detect_session_type (void)
{
  const char *session = g_getenv ("XDG_SESSION_TYPE");
  return session != NULL && *session != '\0' ? session : "unknown";
}

AwraContext *
awra_context_get_for_display (GdkDisplay *display)
{
  AwraContext *self;

  g_return_val_if_fail (GDK_IS_DISPLAY (display), NULL);

  if (context_quark == 0)
    context_quark = g_quark_from_static_string ("awra-context");

  self = g_object_get_qdata (G_OBJECT (display), context_quark);
  if (self != NULL)
    return self;

  awra_install_css_for_display (display);
  self = g_object_new (AWRA_TYPE_CONTEXT, NULL);
  self->display = display;
  self->style_manager = awra_style_manager_new_for_display (display);
  self->diagnostics = awra_diagnostics_new (detect_session_type (),
                                            G_OBJECT_TYPE_NAME (display));
  self->coordinator = awra_effect_coordinator_new (display,
                                                   self->style_manager,
                                                   self->diagnostics);
  g_object_set_qdata_full (G_OBJECT (display),
                           context_quark,
                           self,
                           g_object_unref);

  return self;
}

GdkDisplay *
awra_context_get_display (AwraContext *self)
{
  g_return_val_if_fail (AWRA_IS_CONTEXT (self), NULL);
  return self->display;
}

AwraStyleManager *
awra_context_get_style_manager (AwraContext *self)
{
  g_return_val_if_fail (AWRA_IS_CONTEXT (self), NULL);
  return self->style_manager;
}

AwraDiagnostics *
awra_context_get_diagnostics (AwraContext *self)
{
  g_return_val_if_fail (AWRA_IS_CONTEXT (self), NULL);
  return self->diagnostics;
}

AwraEffectCoordinator *
awra_context_get_effect_coordinator (AwraContext *self)
{
  g_return_val_if_fail (AWRA_IS_CONTEXT (self), NULL);
  return self->coordinator;
}

