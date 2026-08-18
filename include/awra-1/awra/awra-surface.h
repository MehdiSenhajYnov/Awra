/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>
#include <awra/awra-material.h>

G_BEGIN_DECLS

#define AWRA_TYPE_SURFACE (awra_surface_get_type ())
G_DECLARE_FINAL_TYPE (AwraSurface, awra_surface, AWRA, SURFACE, GtkWidget)

GtkWidget       *awra_surface_new           (void);
GtkWidget       *awra_surface_new_with_role (AwraSurfaceRole role);
/**
 * awra_surface_get_child:
 * @self: an Awra surface
 *
 * Returns: (transfer none) (nullable): the child widget
 */
GtkWidget       *awra_surface_get_child     (AwraSurface    *self);
/**
 * awra_surface_set_child:
 * @self: an Awra surface
 * @child: (nullable): the sole child, or %NULL
 */
void             awra_surface_set_child     (AwraSurface    *self,
                                              GtkWidget      *child);
AwraSurfaceRole  awra_surface_get_role      (AwraSurface    *self);
void             awra_surface_set_role      (AwraSurface    *self,
                                              AwraSurfaceRole role);
/**
 * awra_surface_get_material:
 * @self: an Awra surface
 *
 * Returns: (transfer none): the immutable material descriptor
 */
AwraMaterial    *awra_surface_get_material  (AwraSurface    *self);
void             awra_surface_set_material  (AwraSurface    *self,
                                              AwraMaterial   *material);
double           awra_surface_get_radius    (AwraSurface    *self);
void             awra_surface_set_radius    (AwraSurface    *self,
                                              double          radius);
AwraSurfaceCorner awra_surface_get_corner_mask (AwraSurface *self);
void              awra_surface_set_corner_mask (AwraSurface *self,
                                                 AwraSurfaceCorner corners);
AwraSurfaceEdge   awra_surface_get_edge_mask (AwraSurface *self);
void              awra_surface_set_edge_mask (AwraSurface *self,
                                               AwraSurfaceEdge edges);
guint            awra_surface_get_elevation (AwraSurface    *self);
void             awra_surface_set_elevation (AwraSurface    *self,
                                              guint           elevation);
AwraElevation    awra_surface_get_elevation_level (AwraSurface *self);
void             awra_surface_set_elevation_level (AwraSurface *self,
                                                    AwraElevation elevation);
gboolean         awra_surface_get_clip_child (AwraSurface   *self);
void             awra_surface_set_clip_child (AwraSurface   *self,
                                               gboolean       clip_child);

G_END_DECLS
