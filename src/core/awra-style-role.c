/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-style-role.h>

static gboolean
role_is_supported (const char *role)
{
  if (role == NULL || *role == '\0')
    return FALSE;
  for (const char *cursor = role; *cursor != '\0'; cursor++)
    if (!(g_ascii_islower (*cursor) || g_ascii_isdigit (*cursor) ||
          *cursor == '-'))
      return FALSE;
  return TRUE;
}

static char *
css_class_for_role (const char *role)
{
  if (g_str_equal (role, "data-window")) return g_strdup ("awra-data-window");
  if (g_str_equal (role, "data-root")) return g_strdup ("awra-data-root");

  /* Public role names are API vocabulary, not raw GTK CSS classes. Keeping
   * the implementation class private to Awra prevents collisions with
   * desktop themes (for example, libadwaita themes commonly own
   * `.sidebar-pane` and may paint outside the widget's allocation). */
  return g_strconcat ("awra-role-", role, NULL);
}

gboolean
awra_widget_add_style_role (GtkWidget  *widget,
                            const char *role)
{
  g_autofree char *css_class = NULL;

  g_return_val_if_fail (GTK_IS_WIDGET (widget), FALSE);
  if (!role_is_supported (role))
    return FALSE;
  css_class = css_class_for_role (role);
  gtk_widget_add_css_class (widget, css_class);
  return TRUE;
}

gboolean
awra_widget_remove_style_role (GtkWidget  *widget,
                               const char *role)
{
  g_autofree char *css_class = NULL;

  g_return_val_if_fail (GTK_IS_WIDGET (widget), FALSE);
  if (!role_is_supported (role))
    return FALSE;
  css_class = css_class_for_role (role);
  gtk_widget_remove_css_class (widget, css_class);
  return TRUE;
}
