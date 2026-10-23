/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-form-row.h>

G_BEGIN_DECLS

/* The label column, shared by the rows of an AwraForm through a size group. */
GtkWidget *awra_form_row_get_label_widget (AwraFormRow *self);

G_END_DECLS
