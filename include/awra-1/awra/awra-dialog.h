/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <awra/awra-window.h>
G_BEGIN_DECLS
#define AWRA_TYPE_DIALOG (awra_dialog_get_type ())
G_DECLARE_FINAL_TYPE (AwraDialog, awra_dialog, AWRA, DIALOG, AwraWindow)
/**
 * awra_dialog_new:
 * @parent: (nullable): the transient parent, or %NULL
 *
 * Returns: (transfer full): a new Awra dialog
 */
GtkWidget *awra_dialog_new (GtkWindow *parent);
G_END_DECLS
