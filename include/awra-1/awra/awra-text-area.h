/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_TEXT_AREA (awra_text_area_get_type ())
G_DECLARE_FINAL_TYPE (AwraTextArea, awra_text_area, AWRA, TEXT_AREA, GtkWidget)

GtkWidget     *awra_text_area_new                  (void);
const char    *awra_text_area_get_text             (AwraTextArea *self);
void           awra_text_area_set_text             (AwraTextArea *self,
                                                    const char   *text);
const char    *awra_text_area_get_placeholder_text (AwraTextArea *self);
void           awra_text_area_set_placeholder_text (AwraTextArea *self,
                                                    const char   *text);
gboolean       awra_text_area_get_monospace        (AwraTextArea *self);
void           awra_text_area_set_monospace        (AwraTextArea *self,
                                                    gboolean      monospace);
/**
 * awra_text_area_get_delegate:
 * Returns: (transfer none): the multiline GTK text view
 */
GtkTextView   *awra_text_area_get_delegate         (AwraTextArea *self);
/**
 * awra_text_area_get_buffer:
 * Returns: (transfer none): the editable text buffer
 */
GtkTextBuffer *awra_text_area_get_buffer           (AwraTextArea *self);

G_END_DECLS
