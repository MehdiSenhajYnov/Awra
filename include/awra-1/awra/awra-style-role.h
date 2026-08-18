/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

/**
 * awra_widget_add_style_role:
 * @widget: a GTK widget participating in an Awra composition
 * @role: a documented Awra data-application role
 *
 * Applies an opt-in framework recipe to a GTK behavioral widget. Role names
 * are mapped to private, namespaced CSS classes and are never installed as
 * raw theme classes. This is for
 * dense tables, domain tags, charts and other application-specific content
 * where replacing GTK behavior with a new widget would be counterproductive.
 * Malformed role identifiers are rejected; roles without a framework recipe
 * are harmless and intentionally permit forward-compatible style packs.
 *
 * Returns: %TRUE when the role identifier is accepted
 */
gboolean awra_widget_add_style_role    (GtkWidget  *widget,
                                         const char *role);
gboolean awra_widget_remove_style_role (GtkWidget  *widget,
                                         const char *role);

G_END_DECLS
