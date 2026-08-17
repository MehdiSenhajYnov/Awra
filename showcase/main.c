/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

static void
set_margin (GtkWidget *widget,
            int        margin)
{
  gtk_widget_set_margin_top (widget, margin);
  gtk_widget_set_margin_bottom (widget, margin);
  gtk_widget_set_margin_start (widget, margin);
  gtk_widget_set_margin_end (widget, margin);
}

static GtkWidget *
make_material_card (const char   *title,
                    const char   *description,
                    AwraMaterial *material)
{
  GtkWidget *surface = awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD);
  GtkWidget *box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 8);
  GtkWidget *heading = gtk_label_new (title);
  GtkWidget *body = gtk_label_new (description);

  gtk_widget_add_css_class (heading, "title-3");
  gtk_label_set_wrap (GTK_LABEL (body), TRUE);
  gtk_label_set_xalign (GTK_LABEL (heading), 0.0f);
  gtk_label_set_xalign (GTK_LABEL (body), 0.0f);
  gtk_widget_set_hexpand (surface, TRUE);
  gtk_widget_set_size_request (surface, 190, 150);
  set_margin (box, 18);
  gtk_box_append (GTK_BOX (box), heading);
  gtk_box_append (GTK_BOX (box), body);
  awra_surface_set_child (AWRA_SURFACE (surface), box);
  awra_surface_set_material (AWRA_SURFACE (surface), material);
  awra_surface_set_elevation (AWRA_SURFACE (surface), 2);

  return surface;
}

static void
appearance_clicked_cb (GtkButton        *button,
                       AwraStyleManager *manager)
{
  AwraAppearance appearance = GPOINTER_TO_INT (
    g_object_get_data (G_OBJECT (button), "awra-appearance"));
  awra_style_manager_set_appearance (manager, appearance);
}

static void
transparency_toggled_cb (GtkCheckButton   *button,
                         AwraStyleManager *manager)
{
  awra_style_manager_set_reduced_transparency (
    manager,
    gtk_check_button_get_active (button));
}

static void
motion_toggled_cb (GtkCheckButton   *button,
                   AwraStyleManager *manager)
{
  awra_style_manager_set_reduced_motion (manager,
                                         gtk_check_button_get_active (button));
}

static void
update_diagnostics (AwraDiagnostics *diagnostics,
                    GParamSpec      *pspec,
                    GtkLabel        *label)
{
  g_autofree char *text = NULL;
  const char *fallback = awra_diagnostics_get_fallback_reason (diagnostics);

  (void) pspec;
  text = g_strdup_printf (
    "Session: %s\nGDK: %s\nEffect backend: %s\n"
    "Protocol announced: %s\nBlur capability: %s\n"
    "Native surfaces tracked: %u\nEffects applied: %u\nFallback: %s",
    awra_diagnostics_get_session_type (diagnostics),
    awra_diagnostics_get_gdk_backend (diagnostics),
    awra_diagnostics_get_effect_backend (diagnostics),
    awra_diagnostics_get_interface_announced (diagnostics) ? "yes" : "no",
    (awra_diagnostics_get_capabilities (diagnostics) &
     AWRA_EFFECT_CAPABILITY_BLUR) ? "yes" : "no",
    awra_diagnostics_get_native_surfaces (diagnostics),
    awra_diagnostics_get_effects_applied (diagnostics),
    fallback != NULL ? fallback : "none");
  gtk_label_set_text (label, text);
}

static GtkWidget *
make_appearance_button (const char       *label,
                        AwraAppearance    appearance,
                        AwraStyleManager *manager)
{
  GtkWidget *button = awra_button_new_with_label (label);

  g_object_set_data (G_OBJECT (button),
                     "awra-appearance",
                     GINT_TO_POINTER (appearance));
  g_signal_connect (button,
                    "clicked",
                    G_CALLBACK (appearance_clicked_cb),
                    manager);
  return button;
}

static GtkWidget *
make_popover_button (void)
{
  GtkWidget *menu_button = awra_menu_button_new ();
  GtkWidget *popover = awra_popover_new ();
  GtkWidget *box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 8);
  GtkWidget *title = gtk_label_new ("Native Awra popover");
  GtkWidget *action = awra_button_new_with_label ("An accessible action");

  set_margin (box, 18);
  gtk_widget_set_size_request (box, 250, -1);
  gtk_label_set_xalign (GTK_LABEL (title), 0.0f);
  gtk_box_append (GTK_BOX (box), title);
  gtk_box_append (GTK_BOX (box), action);
  awra_popover_set_child (AWRA_POPOVER (popover), box);
  awra_menu_button_set_label (AWRA_MENU_BUTTON (menu_button), "Open native overlay");
  awra_menu_button_set_popover (AWRA_MENU_BUTTON (menu_button),
                                AWRA_POPOVER (popover));

  return menu_button;
}

static void
show_toast_clicked_cb (GtkButton        *button,
                       AwraToastOverlay *overlay)
{
  (void) button;
  awra_toast_overlay_show_message (overlay,
                                   "The Awra toast stays inside the window",
                                   2400);
}

static void
show_dialog_clicked_cb (GtkButton  *button,
                        AwraWindow *parent)
{
  GtkWidget *dialog = awra_dialog_new (GTK_WINDOW (parent));
  GtkWidget *box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 14);
  GtkWidget *title = gtk_label_new ("Native Awra dialog");
  GtkWidget *body = gtk_label_new (
    "It is modal, transient, keyboard-accessible and owns a native surface.");
  GtkWidget *close = awra_button_new_with_label ("Close");

  (void) button;
  gtk_widget_add_css_class (title, "title-2");
  gtk_label_set_wrap (GTK_LABEL (body), TRUE);
  set_margin (box, 28);
  gtk_box_append (GTK_BOX (box), title);
  gtk_box_append (GTK_BOX (box), body);
  gtk_box_append (GTK_BOX (box), close);
  awra_window_set_content (AWRA_WINDOW (dialog), box);
  g_signal_connect_swapped (close,
                            "clicked",
                            G_CALLBACK (gtk_window_destroy),
                            dialog);
  gtk_window_present (GTK_WINDOW (dialog));
}

static void
inspector_debug_toggled_cb (GtkCheckButton *button,
                            AwraInspector  *inspector)
{
  awra_inspector_set_effect_region_visible (
    inspector,
    gtk_check_button_get_active (button));
}

static void
activate_cb (GtkApplication *application,
             gpointer        user_data)
{
  GtkWidget *window;
  GtkWidget *scroll;
  GtkWidget *content;
  GtkWidget *hero;
  GtkWidget *title;
  GtkWidget *subtitle;
  GtkWidget *controls;
  GtkWidget *materials;
  GtkWidget *diagnostic_surface;
  GtkWidget *diagnostic_label;
  GtkWidget *split_view;
  GtkWidget *sidebar;
  GtkWidget *navigation;
  GtkWidget *section_header;
  GtkWidget *control_card;
  GtkWidget *control_grid;
  GtkWidget *radio_a;
  GtkWidget *radio_b;
  GtkWidget *reduced_transparency;
  GtkWidget *reduced_motion;
  GtkWidget *toast_overlay;
  GtkWidget *show_toast;
  GtkWidget *show_dialog;
  GtkWidget *dropdown;
  GtkWidget *segments;
  GtkWidget *progress;
  GtkWidget *badge;
  GtkWidget *tabs;
  GtkWidget *inspector;
  GtkWidget *inspector_toggle;
  AwraContext *context;
  AwraStyleManager *manager;
  AwraDiagnostics *diagnostics;
  g_autoptr (AwraMaterial) solid = NULL;
  g_autoptr (AwraMaterial) translucent = NULL;
  g_autoptr (AwraMaterial) frosted = NULL;

  (void) user_data;
  awra_init ();
  window = awra_window_new (application);
  gtk_window_set_title (GTK_WINDOW (window), "Awra Showcase");
  context = awra_context_get_for_display (gtk_widget_get_display (window));
  manager = awra_context_get_style_manager (context);
  diagnostics = awra_context_get_diagnostics (context);
  toast_overlay = awra_toast_overlay_new ();

  scroll = gtk_scrolled_window_new ();
  gtk_scrolled_window_set_policy (GTK_SCROLLED_WINDOW (scroll),
                                  GTK_POLICY_NEVER,
                                  GTK_POLICY_AUTOMATIC);
  content = gtk_box_new (GTK_ORIENTATION_VERTICAL, 22);
  set_margin (content, 28);
  gtk_scrolled_window_set_child (GTK_SCROLLED_WINDOW (scroll), content);

  hero = gtk_box_new (GTK_ORIENTATION_VERTICAL, 6);
  title = gtk_label_new ("Every app deserves some Awra.");
  subtitle = gtk_label_new (
    "GTK 4 is the engine. Awra owns materials, surfaces and native effects.");
  gtk_widget_add_css_class (title, "title-1");
  gtk_label_set_xalign (GTK_LABEL (title), 0.0f);
  gtk_label_set_xalign (GTK_LABEL (subtitle), 0.0f);
  gtk_box_append (GTK_BOX (hero), title);
  gtk_box_append (GTK_BOX (hero), subtitle);
  gtk_box_append (GTK_BOX (content), hero);

  section_header = awra_header_new ();
  awra_header_set_title (AWRA_HEADER (section_header), "Foundation gallery");
  awra_header_set_subtitle (AWRA_HEADER (section_header),
                            "Compact, medium and expanded layouts");
  gtk_box_append (GTK_BOX (content), section_header);

  controls = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 8);
  gtk_box_append (GTK_BOX (controls),
                  make_appearance_button ("System",
                                          AWRA_APPEARANCE_SYSTEM,
                                          manager));
  gtk_box_append (GTK_BOX (controls),
                  make_appearance_button ("Light",
                                          AWRA_APPEARANCE_LIGHT,
                                          manager));
  gtk_box_append (GTK_BOX (controls),
                  make_appearance_button ("Dark",
                                          AWRA_APPEARANCE_DARK,
                                          manager));
  reduced_transparency = gtk_check_button_new_with_label ("Reduced transparency");
  reduced_motion = gtk_check_button_new_with_label ("Reduced motion");
  g_signal_connect (reduced_transparency,
                    "toggled",
                    G_CALLBACK (transparency_toggled_cb),
                    manager);
  g_signal_connect (reduced_motion,
                    "toggled",
                    G_CALLBACK (motion_toggled_cb),
                    manager);
  gtk_box_append (GTK_BOX (controls), reduced_transparency);
  gtk_box_append (GTK_BOX (controls), reduced_motion);
  gtk_box_append (GTK_BOX (content), controls);

  solid = awra_material_new_solid ();
  translucent = awra_material_new_translucent ();
  frosted = awra_material_new_frosted ();
  materials = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 14);
  gtk_box_set_homogeneous (GTK_BOX (materials), TRUE);
  gtk_box_append (GTK_BOX (materials),
                  make_material_card ("Solid",
                                      "Opaque by intent and the safe fallback.",
                                      solid));
  gtk_box_append (GTK_BOX (materials),
                  make_material_card ("Translucent",
                                      "Tint and alpha without requesting blur.",
                                      translucent));
  gtk_box_append (GTK_BOX (materials),
                  make_material_card ("Frosted",
                                      "Native compositor blur when available; opaque otherwise.",
                                      frosted));
  gtk_box_append (GTK_BOX (content), materials);

  control_card = awra_card_new ();
  control_grid = gtk_grid_new ();
  gtk_grid_set_row_spacing (GTK_GRID (control_grid), 12);
  gtk_grid_set_column_spacing (GTK_GRID (control_grid), 16);
  set_margin (control_grid, 18);
  gtk_grid_attach (GTK_GRID (control_grid), awra_toggle_button_new_with_label ("Toggle"), 0, 0, 1, 1);
  gtk_grid_attach (GTK_GRID (control_grid), awra_entry_new (), 1, 0, 1, 1);
  gtk_entry_set_placeholder_text (GTK_ENTRY (gtk_grid_get_child_at (GTK_GRID (control_grid), 1, 0)), "Entry / IME");
  GtkWidget *search_entry = awra_search_entry_new ();
  awra_search_entry_set_placeholder_text (AWRA_SEARCH_ENTRY (search_entry), "Search");
  gtk_grid_attach (GTK_GRID (control_grid), search_entry, 0, 1, 1, 1);
  gtk_grid_attach (GTK_GRID (control_grid), awra_switch_new (), 1, 1, 1, 1);
  gtk_grid_attach (GTK_GRID (control_grid), awra_slider_new_with_range (GTK_ORIENTATION_HORIZONTAL, 0, 100, 1), 0, 2, 2, 1);
  radio_a = awra_check_button_new_with_label ("Option A");
  radio_b = awra_check_button_new_with_label ("Option B");
  awra_check_button_set_group (AWRA_CHECK_BUTTON (radio_b), AWRA_CHECK_BUTTON (radio_a));
  gtk_grid_attach (GTK_GRID (control_grid), radio_a, 0, 3, 1, 1);
  gtk_grid_attach (GTK_GRID (control_grid), radio_b, 1, 3, 1, 1);
  gtk_grid_attach (GTK_GRID (control_grid), awra_spin_button_new_with_range (0, 10, 1), 0, 4, 1, 1);
  dropdown = awra_dropdown_new_from_strings (
    (const char *const[]) { "System", "Light", "Dark", NULL });
  gtk_grid_attach (GTK_GRID (control_grid), dropdown, 1, 4, 1, 1);
  segments = awra_segmented_control_new ();
  awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Day");
  awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Week");
  awra_segmented_control_append (AWRA_SEGMENTED_CONTROL (segments), "Month");
  gtk_grid_attach (GTK_GRID (control_grid), segments, 0, 5, 2, 1);
  progress = awra_progress_bar_new ();
  awra_progress_bar_set_fraction (AWRA_PROGRESS_BAR (progress), 0.68);
  awra_progress_bar_set_text (AWRA_PROGRESS_BAR (progress), "Foundation 68 %");
  awra_progress_bar_set_show_text (AWRA_PROGRESS_BAR (progress), TRUE);
  gtk_grid_attach (GTK_GRID (control_grid), progress, 0, 6, 2, 1);
  badge = awra_badge_new ("New");
  gtk_grid_attach (GTK_GRID (control_grid), badge, 0, 7, 1, 1);
  awra_card_set_child (AWRA_CARD (control_card), control_grid);
  gtk_box_append (GTK_BOX (content), control_card);
  gtk_box_append (GTK_BOX (content), make_popover_button ());
  show_toast = awra_button_new_with_label ("Show toast");
  show_dialog = awra_button_new_with_label ("Open dialog");
  g_signal_connect (show_toast,
                    "clicked",
                    G_CALLBACK (show_toast_clicked_cb),
                    toast_overlay);
  g_signal_connect (show_dialog,
                    "clicked",
                    G_CALLBACK (show_dialog_clicked_cb),
                    window);
  gtk_box_append (GTK_BOX (content), show_toast);
  gtk_box_append (GTK_BOX (content), show_dialog);

  tabs = awra_tab_view_new ();
  awra_tab_view_add (AWRA_TAB_VIEW (tabs),
                     gtk_label_new ("Semantic materials resolve at snapshot time."),
                     "rendering",
                     "Rendering");
  awra_tab_view_add (AWRA_TAB_VIEW (tabs),
                     gtk_label_new ("Native effects remain private to Awra."),
                     "platform",
                     "Platform");
  gtk_widget_set_size_request (tabs, -1, 120);
  gtk_box_append (GTK_BOX (content), tabs);

  diagnostic_surface = awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD);
  awra_surface_set_material (AWRA_SURFACE (diagnostic_surface), solid);
  diagnostic_label = gtk_label_new (NULL);
  gtk_label_set_xalign (GTK_LABEL (diagnostic_label), 0.0f);
  gtk_label_set_selectable (GTK_LABEL (diagnostic_label), TRUE);
  set_margin (diagnostic_label, 18);
  awra_surface_set_child (AWRA_SURFACE (diagnostic_surface), diagnostic_label);
  update_diagnostics (diagnostics, NULL, GTK_LABEL (diagnostic_label));
  g_signal_connect_object (diagnostics,
                           "notify",
                           G_CALLBACK (update_diagnostics),
                           diagnostic_label,
                           0);
  gtk_box_append (GTK_BOX (content), diagnostic_surface);

  inspector_toggle = gtk_check_button_new_with_label (
    "Visualize the inspected native effect region");
  inspector = awra_inspector_new ();
  awra_inspector_set_target (AWRA_INSPECTOR (inspector), window);
  g_signal_connect (inspector_toggle,
                    "toggled",
                    G_CALLBACK (inspector_debug_toggled_cb),
                    inspector);
  gtk_box_append (GTK_BOX (content), inspector_toggle);
  gtk_box_append (GTK_BOX (content), inspector);

  sidebar = awra_sidebar_new ();
  navigation = gtk_box_new (GTK_ORIENTATION_VERTICAL, 6);
  set_margin (navigation, 18);
  for (const char *const *item = (const char *const[]) {
         "Overview", "Surfaces", "Materials", "Controls", "Inputs",
         "Navigation", "Overlays", "Motion", "Layout", "Platform & Blur",
         "Diagnostics", NULL };
       *item != NULL;
       item++) {
    GtkWidget *label = gtk_label_new (*item);
    gtk_label_set_xalign (GTK_LABEL (label), 0.0f);
    gtk_box_append (GTK_BOX (navigation), label);
  }
  awra_sidebar_set_child (AWRA_SIDEBAR (sidebar), navigation);
  split_view = awra_split_view_new ();
  awra_split_view_set_sidebar (AWRA_SPLIT_VIEW (split_view), sidebar);
  awra_split_view_set_content (AWRA_SPLIT_VIEW (split_view), scroll);
  awra_toast_overlay_set_child (AWRA_TOAST_OVERLAY (toast_overlay), split_view);
  awra_window_set_content (AWRA_WINDOW (window), toast_overlay);
  gtk_window_present (GTK_WINDOW (window));
}

int
main (int   argc,
      char *argv[])
{
  g_autoptr (GtkApplication) application = gtk_application_new (
    "org.awra.Showcase",
    G_APPLICATION_DEFAULT_FLAGS);

  g_signal_connect (application, "activate", G_CALLBACK (activate_cb), NULL);
  return g_application_run (G_APPLICATION (application), argc, argv);
}
