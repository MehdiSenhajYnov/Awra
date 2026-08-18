/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-check-button.h>
#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_CHOICE_GROUP (awra_choice_group_get_type ())
G_DECLARE_FINAL_TYPE (AwraChoiceGroup, awra_choice_group,
                      AWRA, CHOICE_GROUP, GtkWidget)

GtkWidget       *awra_choice_group_new             (void);
const char      *awra_choice_group_get_title       (AwraChoiceGroup *self);
void             awra_choice_group_set_title       (AwraChoiceGroup *self,
                                                    const char      *title);
const char      *awra_choice_group_get_description (AwraChoiceGroup *self);
void             awra_choice_group_set_description (AwraChoiceGroup *self,
                                                    const char      *description);
gboolean         awra_choice_group_get_exclusive   (AwraChoiceGroup *self);
void             awra_choice_group_set_exclusive   (AwraChoiceGroup *self,
                                                    gboolean         exclusive);
/**
 * awra_choice_group_append:
 * @self: a choice group
 * @label: label for the new choice
 *
 * Returns: (transfer none): the newly appended choice owned by @self
 */
AwraCheckButton *awra_choice_group_append          (AwraChoiceGroup *self,
                                                    const char      *label);
void             awra_choice_group_remove          (AwraChoiceGroup *self,
                                                    AwraCheckButton *choice);
guint            awra_choice_group_get_n_choices   (AwraChoiceGroup *self);
/**
 * awra_choice_group_get_choice:
 * Returns: (transfer none) (nullable): the choice at @position
 */
AwraCheckButton *awra_choice_group_get_choice      (AwraChoiceGroup *self,
                                                    guint            position);

G_END_DECLS
