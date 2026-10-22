/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_DROP_ZONE (awra_drop_zone_get_type ())
G_DECLARE_FINAL_TYPE (AwraDropZone, awra_drop_zone, AWRA, DROP_ZONE, GtkWidget)

GtkWidget  *awra_drop_zone_new                     (void);
/**
 * awra_drop_zone_get_child:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none) (nullable): the content
 */
GtkWidget  *awra_drop_zone_get_child               (AwraDropZone *self);
/**
 * awra_drop_zone_set_child:
 * @self: an Awra drop zone
 * @child: (nullable): the content; without content the zone presents its
 *   empty-state well
 */
void        awra_drop_zone_set_child               (AwraDropZone *self,
                                                    GtkWidget    *child);
/**
 * awra_drop_zone_get_title:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none) (nullable): the empty-state title
 */
const char *awra_drop_zone_get_title               (AwraDropZone *self);
/**
 * awra_drop_zone_set_title:
 * @self: an Awra drop zone
 * @title: (nullable): the empty-state title
 */
void        awra_drop_zone_set_title               (AwraDropZone *self,
                                                    const char   *title);
/**
 * awra_drop_zone_get_subtitle:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none) (nullable): the empty-state subtitle
 */
const char *awra_drop_zone_get_subtitle            (AwraDropZone *self);
/**
 * awra_drop_zone_set_subtitle:
 * @self: an Awra drop zone
 * @subtitle: (nullable): the empty-state subtitle
 */
void        awra_drop_zone_set_subtitle            (AwraDropZone *self,
                                                    const char   *subtitle);
/**
 * awra_drop_zone_get_icon_name:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none) (nullable): the icon of the empty state and drop
 *   overlay
 */
const char *awra_drop_zone_get_icon_name           (AwraDropZone *self);
/**
 * awra_drop_zone_set_icon_name:
 * @self: an Awra drop zone
 * @icon_name: (nullable): a symbolic icon name, or %NULL for the default
 */
void        awra_drop_zone_set_icon_name           (AwraDropZone *self,
                                                    const char   *icon_name);
/**
 * awra_drop_zone_get_drop_message:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none): the message shown while acceptable files hover
 */
const char *awra_drop_zone_get_drop_message        (AwraDropZone *self);
/**
 * awra_drop_zone_set_drop_message:
 * @self: an Awra drop zone
 * @message: (nullable): the hover message, or %NULL for the default
 */
void        awra_drop_zone_set_drop_message        (AwraDropZone *self,
                                                    const char   *message);
gboolean    awra_drop_zone_get_show_browse_button  (AwraDropZone *self);
void        awra_drop_zone_set_show_browse_button  (AwraDropZone *self,
                                                    gboolean      show);
/**
 * awra_drop_zone_get_browse_label:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none): the browse button label
 */
const char *awra_drop_zone_get_browse_label        (AwraDropZone *self);
/**
 * awra_drop_zone_set_browse_label:
 * @self: an Awra drop zone
 * @label: (nullable): the browse button label, or %NULL for the default
 */
void        awra_drop_zone_set_browse_label        (AwraDropZone *self,
                                                    const char   *label);
/**
 * awra_drop_zone_get_accepted_extensions:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none) (array zero-terminated=1) (nullable): accepted
 *   lowercase extensions without a leading dot
 */
const char * const *awra_drop_zone_get_accepted_extensions (AwraDropZone *self);
/**
 * awra_drop_zone_set_accepted_extensions:
 * @self: an Awra drop zone
 * @extensions: (array zero-terminated=1) (nullable): file extensions such as
 *   `mp3` or `.ogg`, compared case-insensitively, or %NULL
 */
void        awra_drop_zone_set_accepted_extensions (AwraDropZone       *self,
                                                    const char * const *extensions);
/**
 * awra_drop_zone_get_accepted_mime_types:
 * @self: an Awra drop zone
 *
 * Returns: (transfer none) (array zero-terminated=1) (nullable): accepted
 *   MIME types
 */
const char * const *awra_drop_zone_get_accepted_mime_types (AwraDropZone *self);
/**
 * awra_drop_zone_set_accepted_mime_types:
 * @self: an Awra drop zone
 * @mime_types: (array zero-terminated=1) (nullable): MIME types such as
 *   `audio/mpeg` or a whole family such as `audio/` followed by an asterisk, or %NULL
 *
 * Types are guessed from file names only, so the check never blocks on I/O.
 */
void        awra_drop_zone_set_accepted_mime_types (AwraDropZone       *self,
                                                    const char * const *mime_types);
/**
 * awra_drop_zone_accepts_file:
 * @self: an Awra drop zone
 * @file: a file
 *
 * Applies the extension and MIME filters. A file is accepted when it matches
 * either list, or when no filter is set.
 *
 * Returns: whether @file would be delivered by #AwraDropZone::files-dropped
 */
gboolean    awra_drop_zone_accepts_file            (AwraDropZone *self,
                                                    GFile        *file);
gboolean    awra_drop_zone_get_drop_active         (AwraDropZone *self);

G_END_DECLS
