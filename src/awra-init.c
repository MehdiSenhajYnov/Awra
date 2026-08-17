/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

#include "awra-init-private.h"

static GQuark provider_quark;

guint
awra_get_major_version (void)
{
  return AWRA_MAJOR_VERSION;
}

guint
awra_get_minor_version (void)
{
  return AWRA_MINOR_VERSION;
}

guint
awra_get_micro_version (void)
{
  return AWRA_MICRO_VERSION;
}

const char *
awra_get_version (void)
{
  return AWRA_VERSION_S;
}

void
awra_install_css_for_display (GdkDisplay *display)
{
  GtkCssProvider *provider;

  g_return_if_fail (GDK_IS_DISPLAY (display));

  if (provider_quark == 0)
    provider_quark = g_quark_from_static_string ("awra-css-provider");

  if (g_object_get_qdata (G_OBJECT (display), provider_quark) != NULL)
    return;

  provider = gtk_css_provider_new ();
  gtk_css_provider_load_from_resource (provider, "/org/awra/awra.css");
  gtk_style_context_add_provider_for_display (
    display,
    GTK_STYLE_PROVIDER (provider),
    GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
  g_object_set_qdata_full (G_OBJECT (display),
                           provider_quark,
                           provider,
                           g_object_unref);
}

void
awra_init (void)
{
  GdkDisplay *display = gdk_display_get_default ();

  if (display == NULL) {
    g_warning ("awra_init() called before GTK opened a display");
    return;
  }

  (void) awra_context_get_for_display (display);
}

void
awra_widget_set_tooltip_text (GtkWidget  *widget,
                              const char *text)
{
  g_return_if_fail (GTK_IS_WIDGET (widget));
  gtk_widget_set_tooltip_text (widget, text);
}
