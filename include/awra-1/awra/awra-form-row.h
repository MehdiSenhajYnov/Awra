/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_FORM_ROW (awra_form_row_get_type ())
G_DECLARE_FINAL_TYPE (AwraFormRow, awra_form_row, AWRA, FORM_ROW, GtkWidget)

GtkWidget           *awra_form_row_new                  (void);
/**
 * awra_form_row_get_label:
 * @self: an Awra form row
 *
 * Returns: (transfer none) (nullable): the field label
 */
const char          *awra_form_row_get_label            (AwraFormRow        *self);
/**
 * awra_form_row_set_label:
 * @self: an Awra form row
 * @label: (nullable): the field label, or %NULL
 */
void                 awra_form_row_set_label            (AwraFormRow        *self,
                                                         const char         *label);
/**
 * awra_form_row_get_help_text:
 * @self: an Awra form row
 *
 * Returns: (transfer none) (nullable): supporting help text
 */
const char          *awra_form_row_get_help_text        (AwraFormRow        *self);
/**
 * awra_form_row_set_help_text:
 * @self: an Awra form row
 * @help_text: (nullable): supporting help text, or %NULL
 */
void                 awra_form_row_set_help_text        (AwraFormRow        *self,
                                                         const char         *help_text);
/**
 * awra_form_row_get_error_message:
 * @self: an Awra form row
 *
 * Returns: (transfer none) (nullable): the current error message
 */
const char          *awra_form_row_get_error_message    (AwraFormRow        *self);
/**
 * awra_form_row_set_error_message:
 * @self: an Awra form row
 * @message: (nullable): an error message, or %NULL
 */
void                 awra_form_row_set_error_message    (AwraFormRow        *self,
                                                         const char         *message);
/**
 * awra_form_row_get_control:
 * @self: an Awra form row
 *
 * Returns: (transfer none) (nullable): the form control
 */
GtkWidget           *awra_form_row_get_control          (AwraFormRow        *self);
/**
 * awra_form_row_set_control:
 * @self: an Awra form row
 * @control: (nullable): the form control, or %NULL
 */
void                 awra_form_row_set_control          (AwraFormRow        *self,
                                                         GtkWidget          *control);
gboolean             awra_form_row_get_required         (AwraFormRow        *self);
void                 awra_form_row_set_required         (AwraFormRow        *self,
                                                         gboolean            required);
AwraValidationState  awra_form_row_get_validation_state (AwraFormRow        *self);
void                 awra_form_row_set_validation_state (AwraFormRow        *self,
                                                         AwraValidationState state);

G_END_DECLS
