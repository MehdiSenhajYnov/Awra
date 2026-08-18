/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_PASSWORD_ENTRY (awra_password_entry_get_type ())
G_DECLARE_FINAL_TYPE (AwraPasswordEntry, awra_password_entry,
                      AWRA, PASSWORD_ENTRY, GtkWidget)

GtkWidget        *awra_password_entry_new                  (void);
const char       *awra_password_entry_get_text             (AwraPasswordEntry *self);
void              awra_password_entry_set_text             (AwraPasswordEntry *self,
                                                            const char        *text);
const char       *awra_password_entry_get_placeholder_text (AwraPasswordEntry *self);
void              awra_password_entry_set_placeholder_text (AwraPasswordEntry *self,
                                                            const char        *text);
gboolean          awra_password_entry_get_show_peek_icon   (AwraPasswordEntry *self);
void              awra_password_entry_set_show_peek_icon   (AwraPasswordEntry *self,
                                                            gboolean           show);
gboolean          awra_password_entry_get_activates_default (AwraPasswordEntry *self);
void              awra_password_entry_set_activates_default (AwraPasswordEntry *self,
                                                             gboolean           activates);
/**
 * awra_password_entry_get_delegate:
 * Returns: (transfer none): the GTK password entry
 */
GtkPasswordEntry *awra_password_entry_get_delegate         (AwraPasswordEntry *self);

G_END_DECLS
