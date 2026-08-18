/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-diagnostics.h>

AwraDiagnostics *awra_diagnostics_new (const char *session_type,
                                       const char *gdk_backend);
void awra_diagnostics_set_backend      (AwraDiagnostics      *self,
                                        const char           *backend,
                                        gboolean              interface_announced,
                                        AwraEffectCapability  capabilities,
                                        const char           *fallback_reason);
void awra_diagnostics_set_counts       (AwraDiagnostics      *self,
                                        guint                 native_surfaces,
                                        guint                 effects_applied);
void awra_diagnostics_set_region_details (AwraDiagnostics *self,
                                          guint64          update_count,
                                          const char      *summary);
