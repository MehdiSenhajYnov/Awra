/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-surface.h>

G_BEGIN_DECLS

#define AWRA_TYPE_EDGE_PANEL (awra_edge_panel_get_type ())
G_DECLARE_FINAL_TYPE (AwraEdgePanel, awra_edge_panel, AWRA, EDGE_PANEL, GtkWidget)

GtkWidget     *awra_edge_panel_new              (void);
/**
 * awra_edge_panel_get_content:
 * @self: an Awra edge panel
 *
 * Returns: (transfer none) (nullable): the main content
 */
GtkWidget     *awra_edge_panel_get_content      (AwraEdgePanel *self);
/**
 * awra_edge_panel_set_content:
 * @self: an Awra edge panel
 * @content: (nullable): the uninterrupted canvas content, or %NULL
 */
void           awra_edge_panel_set_content      (AwraEdgePanel *self,
                                                  GtkWidget     *content);
/**
 * awra_edge_panel_get_panel:
 * @self: an Awra edge panel
 *
 * Returns: (transfer none) (nullable): the floating panel content
 */
GtkWidget     *awra_edge_panel_get_panel        (AwraEdgePanel *self);
/**
 * awra_edge_panel_set_panel:
 * @self: an Awra edge panel
 * @panel: (nullable): the floating panel content, or %NULL
 */
void           awra_edge_panel_set_panel        (AwraEdgePanel *self,
                                                  GtkWidget     *panel);
/**
 * awra_edge_panel_get_surface:
 * @self: an Awra edge panel
 *
 * Returns: (transfer none): the floating surface
 */
AwraSurface   *awra_edge_panel_get_surface      (AwraEdgePanel *self);
AwraPanelEdge  awra_edge_panel_get_edge         (AwraEdgePanel *self);
void           awra_edge_panel_set_edge         (AwraEdgePanel *self,
                                                  AwraPanelEdge  edge);
gboolean       awra_edge_panel_get_revealed     (AwraEdgePanel *self);
void           awra_edge_panel_set_revealed     (AwraEdgePanel *self,
                                                  gboolean       revealed);
gboolean       awra_edge_panel_get_auto_hide    (AwraEdgePanel *self);
void           awra_edge_panel_set_auto_hide    (AwraEdgePanel *self,
                                                  gboolean       auto_hide);
guint          awra_edge_panel_get_panel_width  (AwraEdgePanel *self);
void           awra_edge_panel_set_panel_width  (AwraEdgePanel *self,
                                                  guint          width);
guint          awra_edge_panel_get_reveal_width (AwraEdgePanel *self);
void           awra_edge_panel_set_reveal_width (AwraEdgePanel *self,
                                                  guint          width);
guint          awra_edge_panel_get_hide_delay   (AwraEdgePanel *self);
void           awra_edge_panel_set_hide_delay   (AwraEdgePanel *self,
                                                  guint          delay_ms);

G_END_DECLS
