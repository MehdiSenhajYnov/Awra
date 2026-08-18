/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-diagnostics.h>
#include <awra/awra-material-resolution.h>
#include <awra/awra-material.h>
#include <awra/awra-style-manager.h>

G_BEGIN_DECLS

#define AWRA_TYPE_CONTEXT (awra_context_get_type ())
G_DECLARE_FINAL_TYPE (AwraContext, awra_context, AWRA, CONTEXT, GObject)

/**
 * awra_context_get_for_display:
 * @display: a GDK display
 *
 * Returns: (transfer none): the singleton Awra context for @display
 */
AwraContext      *awra_context_get_for_display (GdkDisplay  *display);
/**
 * awra_context_get_display:
 * @self: an Awra context
 *
 * Returns: (transfer none): the associated display
 */
GdkDisplay       *awra_context_get_display     (AwraContext *self);
/**
 * awra_context_get_style_manager:
 * @self: an Awra context
 *
 * Returns: (transfer none): the display style manager
 */
AwraStyleManager *awra_context_get_style_manager (AwraContext *self);
/**
 * awra_context_get_diagnostics:
 * @self: an Awra context
 *
 * Returns: (transfer none): live platform diagnostics
 */
AwraDiagnostics  *awra_context_get_diagnostics (AwraContext *self);
/**
 * awra_context_resolve_material:
 * @self: an Awra context
 * @material: an immutable material descriptor
 * @role: the semantic surface role
 * @window_active: whether to resolve active window decorations
 * @elevation: the semantic elevation
 *
 * Resolves exactly the values used by Awra surfaces for the context's current
 * tokens, accessibility preferences and native-effect capabilities.
 *
 * Returns: (transfer full): an immutable diagnostic snapshot
 */
AwraMaterialResolution *awra_context_resolve_material (AwraContext     *self,
                                                       AwraMaterial    *material,
                                                       AwraSurfaceRole  role,
                                                       gboolean         window_active,
                                                       guint            elevation);

G_END_DECLS
