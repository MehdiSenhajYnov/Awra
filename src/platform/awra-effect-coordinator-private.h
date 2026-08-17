/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-diagnostics.h>
#include <awra/awra-material.h>
#include <awra/awra-style-manager.h>

typedef struct _AwraEffectCoordinator AwraEffectCoordinator;

AwraEffectCoordinator *awra_effect_coordinator_new    (GdkDisplay        *display,
                                                       AwraStyleManager  *style_manager,
                                                       AwraDiagnostics   *diagnostics);
void                   awra_effect_coordinator_free   (AwraEffectCoordinator *self);
void                   awra_effect_coordinator_attach (AwraEffectCoordinator *self,
                                                       GtkNative             *native,
                                                       AwraMaterial          *material,
                                                       double                 radius);
void                   awra_effect_coordinator_update (AwraEffectCoordinator *self,
                                                       GtkNative             *native,
                                                       AwraMaterial          *material,
                                                       double                 radius);
void                   awra_effect_coordinator_detach (AwraEffectCoordinator *self,
                                                       GtkNative             *native);
gboolean               awra_effect_coordinator_has_blur (AwraEffectCoordinator *self);

