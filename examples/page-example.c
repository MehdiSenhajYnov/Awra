/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static gboolean
quit_smoke (gpointer data)
{
  g_application_quit (data);
  return G_SOURCE_REMOVE;
}

static void
activate (GtkApplication *app)
{
  GtkWidget *window = awra_window_new (app);
  GtkWidget *page = awra_page_new ();
  GtkWidget *content = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  GtkWidget *header = awra_page_header_new ();
  GtkWidget *section = awra_section_new ();
  GtkWidget *form = awra_form_new ();
  GtkWidget *row = awra_form_row_new ();

  awra_page_header_set_title (AWRA_PAGE_HEADER (header), "Create workspace");
  awra_page_header_set_subtitle (
    AWRA_PAGE_HEADER (header),
    "A complete C page with framework-owned spacing and validation");
  awra_form_row_set_label (AWRA_FORM_ROW (row), "Name");
  awra_form_row_set_help_text (AWRA_FORM_ROW (row),
                               "IME, clipboard and accessibility stay GTK-native");
  awra_form_row_set_control (AWRA_FORM_ROW (row), awra_entry_new ());
  awra_form_append (AWRA_FORM (form), AWRA_FORM_ROW (row));
  awra_section_set_title (AWRA_SECTION (section), "Workspace details");
  awra_section_set_child (AWRA_SECTION (section), form);
  awra_box_apply_layout_preset (GTK_BOX (content), AWRA_LAYOUT_PRESET_PAGE);
  gtk_box_append (GTK_BOX (content), header);
  gtk_box_append (GTK_BOX (content), section);
  awra_page_set_child (AWRA_PAGE (page), content);
  awra_window_set_content (AWRA_WINDOW (window), page);
  gtk_window_set_default_size (GTK_WINDOW (window), 720, 560);
  gtk_window_present (GTK_WINDOW (window));

  if (g_getenv ("AWRA_EXAMPLE_SMOKE") != NULL)
    g_idle_add (quit_smoke, app);
}

int
main (int argc, char **argv)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.Example.CPage", G_APPLICATION_NON_UNIQUE);

  g_signal_connect (app, "activate", G_CALLBACK (activate), NULL);
  return g_application_run (G_APPLICATION (app), argc, argv);
}
