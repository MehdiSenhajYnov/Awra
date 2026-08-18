/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-section.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_DETAIL_PANE (awra_detail_pane_get_type ())
G_DECLARE_FINAL_TYPE (AwraDetailPane, awra_detail_pane,
                      AWRA, DETAIL_PANE, GtkWidget)

GtkWidget   *awra_detail_pane_new           (void);
/**
 * awra_detail_pane_get_title:
 * @self: a detail pane
 *
 * Returns: (transfer none) (nullable): the entity title
 */
const char  *awra_detail_pane_get_title     (AwraDetailPane *self);
/**
 * awra_detail_pane_set_title:
 * @self: a detail pane
 * @title: (nullable): the entity title, or %NULL
 */
void         awra_detail_pane_set_title     (AwraDetailPane *self,
                                             const char     *title);
/**
 * awra_detail_pane_get_subtitle:
 * @self: a detail pane
 *
 * Returns: (transfer none) (nullable): the entity subtitle
 */
const char  *awra_detail_pane_get_subtitle  (AwraDetailPane *self);
/**
 * awra_detail_pane_set_subtitle:
 * @self: a detail pane
 * @subtitle: (nullable): the entity subtitle, or %NULL
 */
void         awra_detail_pane_set_subtitle  (AwraDetailPane *self,
                                             const char     *subtitle);
/**
 * awra_detail_pane_get_media:
 * @self: a detail pane
 *
 * Returns: (transfer none) (nullable): the entity media
 */
GtkWidget   *awra_detail_pane_get_media     (AwraDetailPane *self);
/**
 * awra_detail_pane_set_media:
 * @self: a detail pane
 * @media: (nullable): entity media, or %NULL
 */
void         awra_detail_pane_set_media     (AwraDetailPane *self,
                                             GtkWidget      *media);
/**
 * awra_detail_pane_get_actions:
 * @self: a detail pane
 *
 * Returns: (transfer none) (nullable): entity actions
 */
GtkWidget   *awra_detail_pane_get_actions   (AwraDetailPane *self);
/**
 * awra_detail_pane_set_actions:
 * @self: a detail pane
 * @actions: (nullable): entity actions, or %NULL
 */
void         awra_detail_pane_set_actions   (AwraDetailPane *self,
                                             GtkWidget      *actions);
/**
 * awra_detail_pane_get_metadata:
 * @self: a detail pane
 *
 * Returns: (transfer none) (nullable): entity metadata
 */
GtkWidget   *awra_detail_pane_get_metadata  (AwraDetailPane *self);
/**
 * awra_detail_pane_set_metadata:
 * @self: a detail pane
 * @metadata: (nullable): entity metadata, or %NULL
 */
void         awra_detail_pane_set_metadata  (AwraDetailPane *self,
                                             GtkWidget      *metadata);
void         awra_detail_pane_append_section (AwraDetailPane *self,
                                              AwraSection    *section);
void         awra_detail_pane_remove_section (AwraDetailPane *self,
                                              AwraSection    *section);
guint        awra_detail_pane_get_n_sections (AwraDetailPane *self);
/**
 * awra_detail_pane_get_section:
 * @self: a detail pane
 * @position: a section index
 *
 * Returns: (transfer none) (nullable): the section at @position
 */
AwraSection *awra_detail_pane_get_section    (AwraDetailPane *self,
                                              guint           position);

G_END_DECLS
