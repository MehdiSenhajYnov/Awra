/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_SECTION (awra_section_get_type ())
G_DECLARE_FINAL_TYPE (AwraSection, awra_section, AWRA, SECTION, GtkWidget)

GtkWidget  *awra_section_new             (void);
/**
 * awra_section_get_title:
 * @self: an Awra section
 *
 * Returns: (transfer none) (nullable): the title
 */
const char *awra_section_get_title       (AwraSection *self);
/**
 * awra_section_set_title:
 * @self: an Awra section
 * @title: (nullable): the title, or %NULL
 */
void        awra_section_set_title       (AwraSection *self,
                                          const char  *title);
/**
 * awra_section_get_description:
 * @self: an Awra section
 *
 * Returns: (transfer none) (nullable): the description
 */
const char *awra_section_get_description (AwraSection *self);
/**
 * awra_section_set_description:
 * @self: an Awra section
 * @description: (nullable): the description, or %NULL
 */
void        awra_section_set_description (AwraSection *self,
                                          const char  *description);
/**
 * awra_section_get_actions:
 * @self: an Awra section
 *
 * Returns: (transfer none) (nullable): the section actions
 */
GtkWidget  *awra_section_get_actions     (AwraSection *self);
/**
 * awra_section_set_actions:
 * @self: an Awra section
 * @actions: (nullable): section actions, or %NULL
 */
void        awra_section_set_actions     (AwraSection *self,
                                          GtkWidget   *actions);
/**
 * awra_section_get_child:
 * @self: an Awra section
 *
 * Returns: (transfer none) (nullable): the section content
 */
GtkWidget  *awra_section_get_child       (AwraSection *self);
/**
 * awra_section_set_child:
 * @self: an Awra section
 * @child: (nullable): section content, or %NULL
 */
void        awra_section_set_child       (AwraSection *self,
                                          GtkWidget   *child);

G_END_DECLS
