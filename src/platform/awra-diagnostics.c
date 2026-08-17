/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-diagnostics.h>

#include "platform/awra-diagnostics-private.h"

struct _AwraDiagnostics {
  GObject parent_instance;
  char *session_type;
  char *gdk_backend;
  char *effect_backend;
  gboolean interface_announced;
  AwraEffectCapability capabilities;
  guint native_surfaces;
  guint effects_applied;
  char *fallback_reason;
};

enum {
  PROP_0,
  PROP_SESSION_TYPE,
  PROP_GDK_BACKEND,
  PROP_EFFECT_BACKEND,
  PROP_INTERFACE_ANNOUNCED,
  PROP_CAPABILITIES,
  PROP_NATIVE_SURFACES,
  PROP_EFFECTS_APPLIED,
  PROP_FALLBACK_REASON,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraDiagnostics, awra_diagnostics, G_TYPE_OBJECT)

static void
awra_diagnostics_finalize (GObject *object)
{
  AwraDiagnostics *self = AWRA_DIAGNOSTICS (object);

  g_free (self->session_type);
  g_free (self->gdk_backend);
  g_free (self->effect_backend);
  g_free (self->fallback_reason);

  G_OBJECT_CLASS (awra_diagnostics_parent_class)->finalize (object);
}

static void
awra_diagnostics_get_property (GObject    *object,
                               guint       property_id,
                               GValue     *value,
                               GParamSpec *pspec)
{
  AwraDiagnostics *self = AWRA_DIAGNOSTICS (object);

  switch (property_id) {
  case PROP_SESSION_TYPE:
    g_value_set_string (value, self->session_type);
    break;
  case PROP_GDK_BACKEND:
    g_value_set_string (value, self->gdk_backend);
    break;
  case PROP_EFFECT_BACKEND:
    g_value_set_string (value, self->effect_backend);
    break;
  case PROP_INTERFACE_ANNOUNCED:
    g_value_set_boolean (value, self->interface_announced);
    break;
  case PROP_CAPABILITIES:
    g_value_set_flags (value, self->capabilities);
    break;
  case PROP_NATIVE_SURFACES:
    g_value_set_uint (value, self->native_surfaces);
    break;
  case PROP_EFFECTS_APPLIED:
    g_value_set_uint (value, self->effects_applied);
    break;
  case PROP_FALLBACK_REASON:
    g_value_set_string (value, self->fallback_reason);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_diagnostics_class_init (AwraDiagnosticsClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->finalize = awra_diagnostics_finalize;
  object_class->get_property = awra_diagnostics_get_property;

  properties[PROP_SESSION_TYPE] =
    g_param_spec_string ("session-type", NULL, NULL, "unknown",
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_GDK_BACKEND] =
    g_param_spec_string ("gdk-backend", NULL, NULL, "unknown",
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_EFFECT_BACKEND] =
    g_param_spec_string ("effect-backend", NULL, NULL, "generic-fallback",
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_INTERFACE_ANNOUNCED] =
    g_param_spec_boolean ("interface-announced", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_CAPABILITIES] =
    g_param_spec_flags ("capabilities", NULL, NULL,
                        AWRA_TYPE_EFFECT_CAPABILITY,
                        AWRA_EFFECT_CAPABILITY_NONE,
                        G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_NATIVE_SURFACES] =
    g_param_spec_uint ("native-surfaces", NULL, NULL, 0, G_MAXUINT, 0,
                       G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_EFFECTS_APPLIED] =
    g_param_spec_uint ("effects-applied", NULL, NULL, 0, G_MAXUINT, 0,
                       G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_FALLBACK_REASON] =
    g_param_spec_string ("fallback-reason", NULL, NULL, "not initialized",
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);

  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_diagnostics_init (AwraDiagnostics *self)
{
  self->session_type = g_strdup ("unknown");
  self->gdk_backend = g_strdup ("unknown");
  self->effect_backend = g_strdup ("generic-fallback");
  self->fallback_reason = g_strdup ("not initialized");
}

AwraDiagnostics *
awra_diagnostics_new (const char *session_type,
                      const char *gdk_backend)
{
  AwraDiagnostics *self = g_object_new (AWRA_TYPE_DIAGNOSTICS, NULL);

  g_free (self->session_type);
  self->session_type = g_strdup (session_type != NULL ? session_type : "unknown");
  g_free (self->gdk_backend);
  self->gdk_backend = g_strdup (gdk_backend != NULL ? gdk_backend : "unknown");

  return self;
}

void
awra_diagnostics_set_backend (AwraDiagnostics      *self,
                              const char           *backend,
                              gboolean              interface_announced,
                              AwraEffectCapability  capabilities,
                              const char           *fallback_reason)
{
  g_return_if_fail (AWRA_IS_DIAGNOSTICS (self));

  if (g_strcmp0 (self->effect_backend, backend) != 0) {
    g_free (self->effect_backend);
    self->effect_backend = g_strdup (backend);
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EFFECT_BACKEND]);
  }
  if (self->interface_announced != interface_announced) {
    self->interface_announced = interface_announced;
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_INTERFACE_ANNOUNCED]);
  }
  if (self->capabilities != capabilities) {
    self->capabilities = capabilities;
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CAPABILITIES]);
  }
  if (g_strcmp0 (self->fallback_reason, fallback_reason) != 0) {
    g_free (self->fallback_reason);
    self->fallback_reason = g_strdup (fallback_reason);
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_FALLBACK_REASON]);
  }
}

void
awra_diagnostics_set_counts (AwraDiagnostics *self,
                             guint            native_surfaces,
                             guint            effects_applied)
{
  g_return_if_fail (AWRA_IS_DIAGNOSTICS (self));

  if (self->native_surfaces != native_surfaces) {
    self->native_surfaces = native_surfaces;
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_NATIVE_SURFACES]);
  }
  if (self->effects_applied != effects_applied) {
    self->effects_applied = effects_applied;
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EFFECTS_APPLIED]);
  }
}

#define DEFINE_STRING_GETTER(name, field) \
  const char * \
  awra_diagnostics_get_##name (AwraDiagnostics *self) \
  { \
    g_return_val_if_fail (AWRA_IS_DIAGNOSTICS (self), NULL); \
    return self->field; \
  }

DEFINE_STRING_GETTER (session_type, session_type)
DEFINE_STRING_GETTER (gdk_backend, gdk_backend)
DEFINE_STRING_GETTER (effect_backend, effect_backend)
DEFINE_STRING_GETTER (fallback_reason, fallback_reason)

gboolean
awra_diagnostics_get_interface_announced (AwraDiagnostics *self)
{
  g_return_val_if_fail (AWRA_IS_DIAGNOSTICS (self), FALSE);
  return self->interface_announced;
}

AwraEffectCapability
awra_diagnostics_get_capabilities (AwraDiagnostics *self)
{
  g_return_val_if_fail (AWRA_IS_DIAGNOSTICS (self), AWRA_EFFECT_CAPABILITY_NONE);
  return self->capabilities;
}

guint
awra_diagnostics_get_native_surfaces (AwraDiagnostics *self)
{
  g_return_val_if_fail (AWRA_IS_DIAGNOSTICS (self), 0);
  return self->native_surfaces;
}

guint
awra_diagnostics_get_effects_applied (AwraDiagnostics *self)
{
  g_return_val_if_fail (AWRA_IS_DIAGNOSTICS (self), 0);
  return self->effects_applied;
}

