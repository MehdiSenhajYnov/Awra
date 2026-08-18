/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static void
test_roles_keyboard_and_rtl (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestAccessibility", G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  GtkWidget *window;
  GtkWidget *root;
  GtkWidget *page;
  GtkWidget *content;
  GtkWidget *navigation;
  GtkWidget *form;
  GtkWidget *row;
  GtkWidget *entry;
  GtkWidget *button;
  GtkWidget *stat;
  GtkWidget *edge;
  GtkWidget *panel;
  graphene_rect_t ltr_bounds;
  graphene_rect_t rtl_bounds;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  window = awra_window_new (app);
  root = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  page = awra_page_new ();
  content = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  navigation = awra_navigation_item_new_with_label (
    "A deliberately long translated navigation destination");
  form = awra_form_new ();
  row = awra_form_row_new ();
  entry = awra_entry_new ();
  button = awra_button_new_with_label ("Continue");
  stat = awra_stat_bar_new ("Accessible metric");
  edge = awra_edge_panel_new ();
  panel = gtk_label_new ("Inspector");

  awra_form_row_set_label (AWRA_FORM_ROW (row), "Workspace name");
  awra_form_row_set_help_text (AWRA_FORM_ROW (row),
                               "Supports IME, selection and clipboard");
  awra_form_row_set_control (AWRA_FORM_ROW (row), entry);
  awra_form_append (AWRA_FORM (form), AWRA_FORM_ROW (row));
  awra_stat_bar_set_maximum (AWRA_STAT_BAR (stat), 255.0);
  awra_stat_bar_set_value (AWRA_STAT_BAR (stat), 45.0);
  awra_box_apply_layout_preset (GTK_BOX (content), AWRA_LAYOUT_PRESET_PAGE);
  gtk_box_append (GTK_BOX (content), navigation);
  gtk_box_append (GTK_BOX (content), form);
  gtk_box_append (GTK_BOX (content), stat);
  gtk_box_append (GTK_BOX (content), button);
  awra_page_set_child (AWRA_PAGE (page), content);
  awra_edge_panel_set_content (AWRA_EDGE_PANEL (edge), page);
  awra_edge_panel_set_panel (AWRA_EDGE_PANEL (edge), panel);
  awra_edge_panel_set_edge (AWRA_EDGE_PANEL (edge), AWRA_PANEL_EDGE_START);
  awra_edge_panel_set_panel_width (AWRA_EDGE_PANEL (edge), 220);
  awra_edge_panel_set_revealed (AWRA_EDGE_PANEL (edge), TRUE);
  gtk_box_append (GTK_BOX (root), edge);
  awra_window_set_content (AWRA_WINDOW (window), root);
  gtk_window_set_default_size (GTK_WINDOW (window), 760, 560);
  gtk_window_present (GTK_WINDOW (window));
  gtk_test_widget_wait_for_draw (window);

  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (page)),
                   ==, GTK_ACCESSIBLE_ROLE_MAIN);
  g_assert_cmpint (gtk_accessible_get_accessible_role (
                     GTK_ACCESSIBLE (navigation)), ==,
                   GTK_ACCESSIBLE_ROLE_BUTTON);
  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (entry)),
                   ==, GTK_ACCESSIBLE_ROLE_TEXT_BOX);
  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (stat)),
                   ==, GTK_ACCESSIBLE_ROLE_METER);
  g_assert_true (gtk_widget_grab_focus (entry));
  {
    GtkWidget *focus = gtk_root_get_focus (GTK_ROOT (window));
    g_assert_nonnull (focus);
    g_assert_true (focus == entry || gtk_widget_is_ancestor (focus, entry));
  }
  g_assert_true (gtk_widget_child_focus (root, GTK_DIR_TAB_FORWARD));

  g_assert_true (gtk_widget_compute_bounds (
    GTK_WIDGET (awra_edge_panel_get_surface (AWRA_EDGE_PANEL (edge))), edge,
    &ltr_bounds));
  gtk_widget_set_direction (edge, GTK_TEXT_DIR_RTL);
  gtk_widget_queue_allocate (edge);
  gtk_test_widget_wait_for_draw (window);
  g_assert_true (gtk_widget_compute_bounds (
    GTK_WIDGET (awra_edge_panel_get_surface (AWRA_EDGE_PANEL (edge))), edge,
    &rtl_bounds));
  g_assert_cmpfloat (rtl_bounds.origin.x, >, ltr_bounds.origin.x);
  g_assert_cmpint (gtk_widget_get_width (content), <=,
                   gtk_widget_get_width (page));

  gtk_window_destroy (GTK_WINDOW (window));
}

int
main (int argc, char **argv)
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ())
    return 77;
  g_test_add_func ("/awra/accessibility/roles-keyboard-rtl",
                   test_roles_keyboard_and_rtl);
  return g_test_run ();
}
