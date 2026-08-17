/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>

G_BEGIN_DECLS

#define AWRA_TYPE_DIAGNOSTICS (awra_diagnostics_get_type ())
G_DECLARE_FINAL_TYPE (AwraDiagnostics, awra_diagnostics, AWRA, DIAGNOSTICS, GObject)

const char           *awra_diagnostics_get_session_type        (AwraDiagnostics *self);
const char           *awra_diagnostics_get_gdk_backend         (AwraDiagnostics *self);
const char           *awra_diagnostics_get_effect_backend      (AwraDiagnostics *self);
gboolean              awra_diagnostics_get_interface_announced (AwraDiagnostics *self);
AwraEffectCapability  awra_diagnostics_get_capabilities        (AwraDiagnostics *self);
guint                 awra_diagnostics_get_native_surfaces     (AwraDiagnostics *self);
guint                 awra_diagnostics_get_effects_applied     (AwraDiagnostics *self);
const char           *awra_diagnostics_get_fallback_reason     (AwraDiagnostics *self);

G_END_DECLS

