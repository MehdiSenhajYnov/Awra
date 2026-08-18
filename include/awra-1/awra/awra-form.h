/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-form-row.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_FORM (awra_form_get_type ())
G_DECLARE_FINAL_TYPE (AwraForm, awra_form, AWRA, FORM, GtkWidget)

GtkWidget   *awra_form_new       (void);
void         awra_form_append    (AwraForm    *self,
                                  AwraFormRow *row);
void         awra_form_insert    (AwraForm    *self,
                                  AwraFormRow *row,
                                  guint        position);
void         awra_form_remove    (AwraForm    *self,
                                  AwraFormRow *row);
guint        awra_form_get_n_rows (AwraForm   *self);
/**
 * awra_form_get_row:
 * @self: an Awra form
 * @position: a row index
 *
 * Returns: (transfer none) (nullable): the row at @position
 */
AwraFormRow *awra_form_get_row   (AwraForm    *self,
                                  guint        position);

G_END_DECLS
