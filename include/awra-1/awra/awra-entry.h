/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_ENTRY (awra_entry_get_type ())
G_DECLARE_FINAL_TYPE (AwraEntry, awra_entry, AWRA, ENTRY, GtkEntry)
GtkWidget *awra_entry_new (void);
G_END_DECLS

