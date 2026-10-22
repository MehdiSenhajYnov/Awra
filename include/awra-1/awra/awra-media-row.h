/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_MEDIA_ROW (awra_media_row_get_type ())
G_DECLARE_FINAL_TYPE (AwraMediaRow, awra_media_row, AWRA, MEDIA_ROW, GtkWidget)

/**
 * awra_media_row_new:
 * @title: (nullable): the media title
 *
 * Returns: (transfer floating): a new media row
 */
GtkWidget     *awra_media_row_new                  (const char    *title);
/**
 * awra_media_row_get_title:
 * @self: an Awra media row
 *
 * Returns: (transfer none) (nullable): the title
 */
const char    *awra_media_row_get_title            (AwraMediaRow  *self);
/**
 * awra_media_row_set_title:
 * @self: an Awra media row
 * @title: (nullable): the title
 */
void           awra_media_row_set_title            (AwraMediaRow  *self,
                                                    const char    *title);
/**
 * awra_media_row_get_subtitle:
 * @self: an Awra media row
 *
 * Returns: (transfer none) (nullable): the subtitle
 */
const char    *awra_media_row_get_subtitle         (AwraMediaRow  *self);
/**
 * awra_media_row_set_subtitle:
 * @self: an Awra media row
 * @subtitle: (nullable): secondary text such as an artist or a channel
 */
void           awra_media_row_set_subtitle         (AwraMediaRow  *self,
                                                    const char    *subtitle);
double         awra_media_row_get_position         (AwraMediaRow  *self);
void           awra_media_row_set_position         (AwraMediaRow  *self,
                                                    double         position);
double         awra_media_row_get_duration         (AwraMediaRow  *self);
void           awra_media_row_set_duration         (AwraMediaRow  *self,
                                                    double         duration);
gboolean       awra_media_row_get_playing          (AwraMediaRow  *self);
void           awra_media_row_set_playing          (AwraMediaRow  *self,
                                                    gboolean       playing);
gboolean       awra_media_row_get_seekable         (AwraMediaRow  *self);
void           awra_media_row_set_seekable         (AwraMediaRow  *self,
                                                    gboolean       seekable);
double         awra_media_row_get_volume           (AwraMediaRow  *self);
void           awra_media_row_set_volume           (AwraMediaRow  *self,
                                                    double         volume);
gboolean       awra_media_row_get_show_volume      (AwraMediaRow  *self);
void           awra_media_row_set_show_volume      (AwraMediaRow  *self,
                                                    gboolean       show);
gboolean       awra_media_row_get_show_play_button (AwraMediaRow  *self);
void           awra_media_row_set_show_play_button (AwraMediaRow  *self,
                                                    gboolean       show);
gboolean       awra_media_row_get_show_stop_button (AwraMediaRow  *self);
void           awra_media_row_set_show_stop_button (AwraMediaRow  *self,
                                                    gboolean       show);
/**
 * awra_media_row_get_icon_name:
 * @self: an Awra media row
 *
 * Returns: (transfer none) (nullable): the leading icon name
 */
const char    *awra_media_row_get_icon_name        (AwraMediaRow  *self);
/**
 * awra_media_row_set_icon_name:
 * @self: an Awra media row
 * @icon_name: (nullable): a leading symbolic icon name
 */
void           awra_media_row_set_icon_name        (AwraMediaRow  *self,
                                                    const char    *icon_name);
/**
 * awra_media_row_get_accent_color:
 * @self: an Awra media row
 *
 * Returns: (transfer none) (nullable): the leading swatch color
 */
const GdkRGBA *awra_media_row_get_accent_color     (AwraMediaRow  *self);
/**
 * awra_media_row_set_accent_color:
 * @self: an Awra media row
 * @color: (nullable): a leading swatch color, for example a channel color
 */
void           awra_media_row_set_accent_color     (AwraMediaRow  *self,
                                                    const GdkRGBA *color);
/**
 * awra_media_row_get_suffix:
 * @self: an Awra media row
 *
 * Returns: (transfer none) (nullable): the trailing widget
 */
GtkWidget     *awra_media_row_get_suffix           (AwraMediaRow  *self);
/**
 * awra_media_row_set_suffix:
 * @self: an Awra media row
 * @suffix: (nullable): a trailing widget, or %NULL
 */
void           awra_media_row_set_suffix           (AwraMediaRow  *self,
                                                    GtkWidget     *suffix);

G_END_DECLS
