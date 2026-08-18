/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_TAG_ENTRY (awra_tag_entry_get_type ())
G_DECLARE_FINAL_TYPE (AwraTagEntry, awra_tag_entry, AWRA, TAG_ENTRY, GtkWidget)

GtkWidget *awra_tag_entry_new              (void);
gboolean   awra_tag_entry_add              (AwraTagEntry *self,
                                            const char   *tag);
gboolean   awra_tag_entry_remove           (AwraTagEntry *self,
                                            const char   *tag);
void       awra_tag_entry_clear            (AwraTagEntry *self);
guint      awra_tag_entry_get_n_tags       (AwraTagEntry *self);
/**
 * awra_tag_entry_get_tag:
 * Returns: (transfer none) (nullable): the tag at @position
 */
const char *awra_tag_entry_get_tag         (AwraTagEntry *self,
                                            guint         position);
gboolean   awra_tag_entry_get_editable     (AwraTagEntry *self);
void       awra_tag_entry_set_editable     (AwraTagEntry *self,
                                            gboolean      editable);
/**
 * awra_tag_entry_get_delegate:
 * Returns: (transfer none): the entry used to add tags
 */
GtkEntry  *awra_tag_entry_get_delegate     (AwraTagEntry *self);

G_END_DECLS
