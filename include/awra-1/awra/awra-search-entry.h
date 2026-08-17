/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_SEARCH_ENTRY (awra_search_entry_get_type ())
G_DECLARE_FINAL_TYPE (AwraSearchEntry, awra_search_entry, AWRA, SEARCH_ENTRY, GtkWidget)
GtkWidget      *awra_search_entry_new                  (void);
const char     *awra_search_entry_get_text             (AwraSearchEntry *self);
void            awra_search_entry_set_text             (AwraSearchEntry *self,
                                                         const char      *text);
const char     *awra_search_entry_get_placeholder_text (AwraSearchEntry *self);
void            awra_search_entry_set_placeholder_text (AwraSearchEntry *self,
                                                         const char      *text);
/**
 * awra_search_entry_get_delegate:
 * @self: an Awra search entry
 *
 * Returns: (transfer none): the underlying GTK search entry
 */
GtkSearchEntry *awra_search_entry_get_delegate         (AwraSearchEntry *self);
G_END_DECLS
