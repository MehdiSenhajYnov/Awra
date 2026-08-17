/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

#include "layout/awra-split-view-private.h"

static guint click_count;

static void
clicked_cb (AwraButton *button,
            gpointer    user_data)
{
  (void) button;
  (void) user_data;
  click_count++;
}

static void
test_constructors (void)
{
  g_autoptr (GtkWidget) surface = g_object_ref_sink (
    awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD));
  GtkWidget *button = awra_button_new_with_label ("Activate");
  g_autoptr (AwraMaterial) material = awra_material_new_translucent ();

  awra_surface_set_material (AWRA_SURFACE (surface), material);
  awra_surface_set_child (AWRA_SURFACE (surface), button);
  g_assert_true (AWRA_IS_BUTTON (button));
  g_assert_true (awra_surface_get_child (AWRA_SURFACE (surface)) == button);
  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (button)),
                   ==,
                   GTK_ACCESSIBLE_ROLE_BUTTON);

  g_signal_connect (button, "clicked", G_CALLBACK (clicked_cb), NULL);
  g_signal_emit_by_name (button, "clicked");
  g_assert_cmpuint (click_count, ==, 1);
}

static void
test_builder (void)
{
  static const char xml[] =
    "<interface>"
    " <object class='AwraSurface' id='surface'>"
    "  <property name='role'>card</property>"
    "  <property name='child'>"
    "   <object class='AwraButton' id='button'>"
    "    <property name='label'>Builder button</property>"
    "   </object>"
    "  </property>"
    " </object>"
    "</interface>";
  g_autoptr (GtkBuilder) builder = gtk_builder_new ();
  g_autoptr (GError) error = NULL;
  GObject *surface;
  GObject *button;

  g_type_ensure (AWRA_TYPE_SURFACE);
  g_type_ensure (AWRA_TYPE_BUTTON);
  g_assert_true (gtk_builder_add_from_string (builder, xml, -1, &error));
  g_assert_no_error (error);
  surface = gtk_builder_get_object (builder, "surface");
  button = gtk_builder_get_object (builder, "button");
  g_assert_true (AWRA_IS_SURFACE (surface));
  g_assert_true (AWRA_IS_BUTTON (button));
  g_assert_cmpstr (gtk_button_get_label (GTK_BUTTON (button)),
                   ==,
                   "Builder button");
}

static void
test_controls (void)
{
  g_autoptr (GtkWidget) box = g_object_ref_sink (gtk_box_new (GTK_ORIENTATION_VERTICAL, 6));
  GtkWidget *toggle = awra_toggle_button_new_with_label ("Toggle");
  GtkWidget *entry = awra_entry_new ();
  GtkWidget *search = awra_search_entry_new ();
  GtkWidget *switcher = awra_switch_new ();
  GtkWidget *slider = awra_slider_new_with_range (GTK_ORIENTATION_HORIZONTAL, 0, 10, 1);
  GtkWidget *check = awra_check_button_new_with_label ("Check");
  GtkWidget *radio = awra_check_button_new_with_label ("Radio");
  GtkWidget *spin = awra_spin_button_new_with_range (-5, 5, 0.5);

  gtk_box_append (GTK_BOX (box), toggle);
  gtk_box_append (GTK_BOX (box), entry);
  gtk_box_append (GTK_BOX (box), search);
  gtk_box_append (GTK_BOX (box), switcher);
  gtk_box_append (GTK_BOX (box), slider);
  gtk_box_append (GTK_BOX (box), check);
  gtk_box_append (GTK_BOX (box), radio);
  gtk_box_append (GTK_BOX (box), spin);

  gtk_editable_set_text (GTK_EDITABLE (entry), "IME-ready");
  g_assert_cmpstr (gtk_editable_get_text (GTK_EDITABLE (entry)), ==, "IME-ready");
  awra_search_entry_set_text (AWRA_SEARCH_ENTRY (search), "query");
  awra_search_entry_set_placeholder_text (AWRA_SEARCH_ENTRY (search), "Search");
  g_assert_cmpstr (awra_search_entry_get_text (AWRA_SEARCH_ENTRY (search)), ==, "query");
  g_assert_cmpstr (awra_search_entry_get_placeholder_text (AWRA_SEARCH_ENTRY (search)), ==, "Search");
  awra_switch_set_active (AWRA_SWITCH (switcher), TRUE);
  g_assert_true (awra_switch_get_active (AWRA_SWITCH (switcher)));
  gtk_range_set_value (GTK_RANGE (slider), 7.0);
  g_assert_cmpfloat (gtk_range_get_value (GTK_RANGE (slider)), ==, 7.0);
  gtk_check_button_set_active (GTK_CHECK_BUTTON (check), TRUE);
  g_assert_true (gtk_check_button_get_active (GTK_CHECK_BUTTON (check)));
  awra_check_button_set_group (AWRA_CHECK_BUTTON (radio), AWRA_CHECK_BUTTON (check));
  gtk_check_button_set_active (GTK_CHECK_BUTTON (radio), TRUE);
  g_assert_false (gtk_check_button_get_active (GTK_CHECK_BUTTON (check)));
  awra_spin_button_set_value (AWRA_SPIN_BUTTON (spin), 2.5);
  g_assert_cmpfloat (awra_spin_button_get_value (AWRA_SPIN_BUTTON (spin)), ==, 2.5);
  gtk_toggle_button_set_active (GTK_TOGGLE_BUTTON (toggle), TRUE);
  g_assert_true (gtk_toggle_button_get_active (GTK_TOGGLE_BUTTON (toggle)));
}

static void
test_layout_components (void)
{
  g_autoptr (GtkWidget) split = g_object_ref_sink (awra_split_view_new ());
  GtkWidget *sidebar = awra_sidebar_new ();
  GtkWidget *content = awra_card_new ();
  GtkWidget *header = awra_header_new ();
  GtkWidget *start = awra_button_new_with_label ("Back");

  awra_sidebar_set_child (AWRA_SIDEBAR (sidebar), gtk_label_new ("Navigation"));
  awra_card_set_child (AWRA_CARD (content), gtk_label_new ("Content"));
  awra_header_set_title (AWRA_HEADER (header), "Library");
  awra_header_set_subtitle (AWRA_HEADER (header), "Responsive foundation");
  awra_header_set_start_widget (AWRA_HEADER (header), start);
  g_assert_true (awra_header_get_start_widget (AWRA_HEADER (header)) == start);

  awra_split_view_set_sidebar (AWRA_SPLIT_VIEW (split), sidebar);
  awra_split_view_set_content (AWRA_SPLIT_VIEW (split), content);
  awra_split_view_update_for_width (AWRA_SPLIT_VIEW (split), 520);
  g_assert_cmpint (awra_split_view_get_layout_mode (AWRA_SPLIT_VIEW (split)),
                   ==,
                   AWRA_LAYOUT_MODE_COMPACT);
  g_assert_false (gtk_widget_get_visible (sidebar));
  awra_split_view_update_for_width (AWRA_SPLIT_VIEW (split), 760);
  g_assert_cmpint (awra_split_view_get_layout_mode (AWRA_SPLIT_VIEW (split)),
                   ==,
                   AWRA_LAYOUT_MODE_MEDIUM);
  g_assert_true (gtk_widget_get_visible (sidebar));
  awra_split_view_update_for_width (AWRA_SPLIT_VIEW (split), 1100);
  g_assert_cmpint (awra_split_view_get_layout_mode (AWRA_SPLIT_VIEW (split)),
                   ==,
                   AWRA_LAYOUT_MODE_EXPANDED);
  g_assert_true (gtk_widget_get_visible (sidebar));
  g_object_ref_sink (header);
  g_object_unref (header);
}

static void
test_window_and_popover (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestWidgets",
    G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  GtkWidget *window;
  GtkWidget *content;
  GtkWidget *popover;
  GtkWidget *popover_child;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  window = awra_window_new (app);
  content = gtk_label_new ("Content");
  awra_window_set_content (AWRA_WINDOW (window), content);
  g_assert_true (awra_window_get_content (AWRA_WINDOW (window)) == content);
  g_assert_cmpint (awra_surface_get_role (
                     awra_window_get_root_surface (AWRA_WINDOW (window))),
                   ==,
                   AWRA_SURFACE_ROLE_WINDOW);

  popover = awra_popover_new ();
  popover_child = gtk_label_new ("Popover content");
  awra_popover_set_child (AWRA_POPOVER (popover), popover_child);
  g_assert_true (awra_popover_get_child (AWRA_POPOVER (popover)) == popover_child);
  g_object_ref_sink (popover);
  g_object_unref (popover);
  gtk_window_destroy (GTK_WINDOW (window));
}

static void
test_overlays_and_navigation (void)
{
  static const char *choices[] = { "System", "Light", "Dark", NULL };
  g_autoptr (GtkWidget) dropdown = g_object_ref_sink (
    awra_dropdown_new_from_strings (choices));
  g_autoptr (GtkWidget) navigation = g_object_ref_sink (
    awra_navigation_view_new ());
  g_autoptr (GtkWidget) toast = g_object_ref_sink (
    awra_toast_overlay_new ());
  g_autoptr (GtkWidget) popover = g_object_ref_sink (awra_popover_new ());
  g_autoptr (GtkWidget) menu_button = g_object_ref_sink (awra_menu_button_new ());
  g_autoptr (GMenu) menu = g_menu_new ();
  GtkWidget *content = gtk_label_new ("Toast content");
  GtkWidget *home = gtk_label_new ("Home");
  GtkWidget *details = gtk_label_new ("Details");

  g_assert_cmpuint (g_list_model_get_n_items (
                      awra_dropdown_get_model (AWRA_DROPDOWN (dropdown))),
                    ==,
                    3);
  awra_dropdown_set_selected (AWRA_DROPDOWN (dropdown), 2);
  g_assert_cmpuint (awra_dropdown_get_selected (AWRA_DROPDOWN (dropdown)), ==, 2);
  g_assert_true (GTK_IS_DROP_DOWN (
    awra_dropdown_get_delegate (AWRA_DROPDOWN (dropdown))));

  awra_navigation_view_add (AWRA_NAVIGATION_VIEW (navigation), home, "home");
  awra_navigation_view_add (AWRA_NAVIGATION_VIEW (navigation), details, "details");
  g_assert_true (awra_navigation_view_push (AWRA_NAVIGATION_VIEW (navigation),
                                            "home"));
  g_assert_true (awra_navigation_view_push (AWRA_NAVIGATION_VIEW (navigation),
                                            "details"));
  g_assert_true (awra_navigation_view_get_can_pop (
    AWRA_NAVIGATION_VIEW (navigation)));
  g_assert_cmpstr (awra_navigation_view_get_visible_page_name (
                     AWRA_NAVIGATION_VIEW (navigation)),
                   ==,
                   "details");
  g_assert_true (awra_navigation_view_pop (AWRA_NAVIGATION_VIEW (navigation)));
  g_assert_cmpstr (awra_navigation_view_get_visible_page_name (
                     AWRA_NAVIGATION_VIEW (navigation)),
                   ==,
                   "home");
  g_assert_true (awra_navigation_view_replace (AWRA_NAVIGATION_VIEW (navigation),
                                               "details"));
  g_assert_false (awra_navigation_view_get_can_pop (
    AWRA_NAVIGATION_VIEW (navigation)));

  awra_toast_overlay_set_child (AWRA_TOAST_OVERLAY (toast), content);
  g_assert_true (awra_toast_overlay_get_child (AWRA_TOAST_OVERLAY (toast)) == content);
  awra_toast_overlay_show_message (AWRA_TOAST_OVERLAY (toast), "Saved", 0);
  g_assert_true (awra_toast_overlay_get_revealed (AWRA_TOAST_OVERLAY (toast)));

  g_menu_append (menu, "Refresh", "app.refresh");
  g_menu_append (menu, "Close", "win.close");
  awra_popover_set_menu_model (AWRA_POPOVER (popover), G_MENU_MODEL (menu));
  g_assert_true (awra_popover_get_menu_model (AWRA_POPOVER (popover)) ==
                 G_MENU_MODEL (menu));
  g_assert_true (GTK_IS_BOX (awra_popover_get_child (AWRA_POPOVER (popover))));
  awra_menu_button_set_menu_model (AWRA_MENU_BUTTON (menu_button),
                                   G_MENU_MODEL (menu));
  g_assert_true (AWRA_IS_POPOVER (
    awra_menu_button_get_popover (AWRA_MENU_BUTTON (menu_button))));

  awra_widget_set_tooltip_text (menu_button, "Application actions");
  g_assert_cmpstr (gtk_widget_get_tooltip_text (menu_button),
                   ==,
                   "Application actions");
}

static void
test_dialog (void)
{
  g_autoptr (GtkApplication) app = gtk_application_new (
    "org.awra.TestDialog",
    G_APPLICATION_NON_UNIQUE);
  g_autoptr (GError) error = NULL;
  GtkWidget *parent;
  GtkWidget *dialog;

  g_assert_true (g_application_register (G_APPLICATION (app), NULL, &error));
  g_assert_no_error (error);
  parent = awra_window_new (app);
  dialog = awra_dialog_new (GTK_WINDOW (parent));
  g_assert_true (gtk_window_get_modal (GTK_WINDOW (dialog)));
  g_assert_true (gtk_window_get_transient_for (GTK_WINDOW (dialog)) ==
                 GTK_WINDOW (parent));
  g_assert_cmpint (awra_surface_get_role (
                     awra_window_get_root_surface (AWRA_WINDOW (dialog))),
                   ==,
                   AWRA_SURFACE_ROLE_DIALOG);
  gtk_window_destroy (GTK_WINDOW (dialog));
  gtk_window_destroy (GTK_WINDOW (parent));
}

static void
test_extended_components (void)
{
  static const char *items[] = { "Alpha", "Beta", "Gamma", NULL };
  AwraContext *context = awra_context_get_for_display (gdk_display_get_default ());
  AwraStyleManager *manager = awra_context_get_style_manager (context);
  g_autoptr (GtkWidget) badge = g_object_ref_sink (awra_badge_new ("3"));
  g_autoptr (GtkWidget) progress = g_object_ref_sink (awra_progress_bar_new ());
  g_autoptr (GtkWidget) segments = g_object_ref_sink (
    awra_segmented_control_new ());
  g_autoptr (GtkWidget) tabs = g_object_ref_sink (awra_tab_view_new ());
  g_autoptr (GtkStringList) strings = gtk_string_list_new (items);
  g_autoptr (GtkSingleSelection) selection = gtk_single_selection_new (
    G_LIST_MODEL (g_steal_pointer (&strings)));
  g_autoptr (GtkListItemFactory) factory = gtk_signal_list_item_factory_new ();
  g_autoptr (GtkWidget) list = g_object_ref_sink (
    awra_list_view_new (GTK_SELECTION_MODEL (selection), factory));
  g_autoptr (GtkWidget) card = g_object_ref_sink (awra_card_new ());
  g_autoptr (GtkWidget) inspector = g_object_ref_sink (awra_inspector_new ());
  g_autoptr (GtkWidget) inspected_target = NULL;

  g_assert_cmpuint (awra_motion_get_duration (manager,
                                              AWRA_MOTION_PRESET_FAST),
                    ==,
                    120);
  awra_style_manager_set_reduced_motion (manager, TRUE);
  g_assert_cmpuint (awra_motion_get_duration (manager,
                                              AWRA_MOTION_PRESET_SLOW),
                    ==,
                    0);
  awra_style_manager_set_reduced_motion (manager, FALSE);
  g_assert_cmpfloat (awra_motion_ease_out_cubic (0.0), ==, 0.0);
  g_assert_cmpfloat (awra_motion_ease_out_cubic (1.0), ==, 1.0);
  g_assert_cmpfloat (awra_motion_ease_in_out_cubic (0.5), ==, 0.5);

  awra_badge_set_text (AWRA_BADGE (badge), "12");
  g_assert_cmpstr (awra_badge_get_text (AWRA_BADGE (badge)), ==, "12");
  awra_progress_bar_set_fraction (AWRA_PROGRESS_BAR (progress), 0.65);
  awra_progress_bar_set_text (AWRA_PROGRESS_BAR (progress), "65 %");
  awra_progress_bar_set_show_text (AWRA_PROGRESS_BAR (progress), TRUE);
  g_assert_cmpfloat (awra_progress_bar_get_fraction (
                       AWRA_PROGRESS_BAR (progress)),
                     ==,
                     0.65);
  g_assert_cmpstr (awra_progress_bar_get_text (AWRA_PROGRESS_BAR (progress)),
                   ==,
                   "65 %");
  g_assert_true (awra_progress_bar_get_show_text (
    AWRA_PROGRESS_BAR (progress)));

  awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Day");
  awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Week");
  awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Month");
  g_assert_cmpuint (awra_segmented_control_get_n_items (
                      AWRA_SEGMENTED_CONTROL (segments)),
                    ==,
                    3);
  awra_segmented_control_set_selected (AWRA_SEGMENTED_CONTROL (segments), 2);
  g_assert_cmpuint (awra_segmented_control_get_selected (
                      AWRA_SEGMENTED_CONTROL (segments)),
                    ==,
                    2);

  awra_tab_view_add (AWRA_TAB_VIEW (tabs), gtk_label_new ("Overview"),
                     "overview", "Overview");
  awra_tab_view_add (AWRA_TAB_VIEW (tabs), gtk_label_new ("Details"),
                     "details", "Details");
  awra_tab_view_set_selected_name (AWRA_TAB_VIEW (tabs), "details");
  g_assert_cmpstr (awra_tab_view_get_selected_name (AWRA_TAB_VIEW (tabs)),
                   ==,
                   "details");
  g_assert_true (awra_list_view_get_model (AWRA_LIST_VIEW (list)) ==
                 GTK_SELECTION_MODEL (selection));
  g_assert_true (awra_list_view_get_factory (AWRA_LIST_VIEW (list)) == factory);

  awra_inspector_set_target (AWRA_INSPECTOR (inspector), card);
  g_assert_nonnull (strstr (awra_inspector_get_details (
                              AWRA_INSPECTOR (inspector)),
                            "AwraCard"));
  awra_inspector_set_effect_region_visible (AWRA_INSPECTOR (inspector), TRUE);
  g_assert_true (gtk_widget_has_css_class (
    GTK_WIDGET (awra_card_get_surface (AWRA_CARD (card))),
    "awra-effect-region-debug"));
  inspected_target = awra_inspector_get_target (AWRA_INSPECTOR (inspector));
  g_assert_true (inspected_target == card);
}

int
main (int   argc,
      char *argv[])
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) {
    g_test_message ("No display available; skipping GTK widget tests");
    return 77;
  }

  g_test_add_func ("/awra/widgets/constructors", test_constructors);
  g_test_add_func ("/awra/widgets/builder", test_builder);
  g_test_add_func ("/awra/widgets/controls", test_controls);
  g_test_add_func ("/awra/widgets/layout", test_layout_components);
  g_test_add_func ("/awra/widgets/window-popover", test_window_and_popover);
  g_test_add_func ("/awra/widgets/overlays-navigation",
                   test_overlays_and_navigation);
  g_test_add_func ("/awra/widgets/dialog", test_dialog);
  g_test_add_func ("/awra/widgets/extended-components",
                   test_extended_components);
  return g_test_run ();
}
