// SPDX-License-Identifier: LGPL-2.1-or-later

public void exercise_dropdown_api (GLib.ListModel model,
                                   Gtk.Expression expression) {
  var dropdown = new Awra.Dropdown (model, expression);
  dropdown.popup ();
  dropdown.popdown ();
  assert (dropdown.get_popover () != null);
}

public void exercise_overlay_and_sidebar_api (Awra.MenuButton menu,
                                              Awra.Sidebar sidebar) {
  menu.popup ();
  menu.popdown ();
  sidebar.set_inset (12);
  assert (sidebar.get_inset () == 12);
  sidebar.set_inset_spacing (Awra.Spacing.MD);
}

public void exercise_dynamic_tabs_api () {
  var tabs = new Awra.TabView ();
  var home = new Gtk.Label ("Home");
  var detail = new Gtk.Label ("Detail");
  tabs.append (home, "Home", true);
  tabs.append (detail, "Detail", false);
  tabs.set_selected_page (detail);
  tabs.set_page_title (detail, "Bulbasaur");
  tabs.set_content_visible (false);
  assert (tabs.get_selected_page () == detail);
  assert (tabs.get_tab_bar () != null);
  tabs.remove (detail);
}

int main () {
  Gtk.init ();
  var material = new Awra.Material.frosted ();
  var canvas = new Awra.Material.for_preset (Awra.MaterialPreset.CANVAS);
  var page = new Awra.Page ();
  var header = new Awra.PageHeader ();
  var section = new Awra.Section ();
  var toolbar = new Awra.Toolbar ();
  var form = new Awra.Form ();
  var row = new Awra.FormRow ();
  var empty = new Awra.EmptyState ();
  var filters = new Awra.FilterBar ();
  var master_detail = new Awra.MasterDetail ();
  var detail_pane = new Awra.DetailPane ();
  var data_view = new Awra.DataView (null);
  var data_column = new Awra.DataColumn ("Name", null);
  var selection_toolbar = new Awra.SelectionToolbar (null);
  selection_toolbar.set_title ("record");
  selection_toolbar.set_plural_title ("records");
  var text_area = new Awra.TextArea ();
  var password = new Awra.PasswordEntry ();
  var tags = new Awra.TagEntry ();
  var choices = new Awra.ChoiceGroup ();
  var banner = new Awra.StatusBanner ();
  var responsive = new Awra.ResponsiveBin ();
  var breadcrumb = new Awra.BreadcrumbItem ("Library", "library");
  var breadcrumbs = new Awra.BreadcrumbBar ();
  var stat = new Awra.StatBar ("HP");
  var metadata = new Awra.MetadataGroup ();
  var skeleton = new Awra.Skeleton ();
  var palette = new Awra.CommandPalette (null);
  var content = new Gtk.Label ("Vala page content");
  header.set_title ("Library");
  header.set_subtitle ("Typed Vala composition");
  section.set_title ("Recent work");
  section.set_child (content);
  toolbar.set_end_widget (new Awra.Button.with_label ("Create"));
  page.set_child (header);
  assert (page.get_child () == header);
  row.set_label ("Name");
  row.set_control (new Awra.Entry ());
  form.append (row);
  assert (form.get_n_rows () == 1);
  empty.set_title ("No results");
  empty.set_action (new Awra.Button.with_label ("Reset"));
  filters.set_search (new Awra.SearchEntry ());
  filters.append_filter (new Awra.Button.with_label ("All"));
  detail_pane.set_title ("Workspace");
  detail_pane.append_section (section);
  master_detail.set_master (filters);
  master_detail.set_detail (detail_pane);
  master_detail.show_detail ();
  assert (master_detail.get_visible_pane () == Awra.MasterDetailPane.DETAIL);
  data_view.append_column (data_column);
  data_view.set_state (Awra.DataViewState.EMPTY);
  selection_toolbar.set_auto_hide (false);
  assert (data_view.get_n_columns () == 1);
  text_area.set_text ("Notes");
  password.set_text ("secret");
  assert (tags.add ("GTK"));
  choices.set_exclusive (true);
  choices.append ("Daily");
  banner.set_appearance (Awra.StatusAppearance.INFO);
  responsive.set_child (new Gtk.Label ("Adaptive"));
  assert (responsive.get_child () != null);
  assert (breadcrumb.get_name () == "library");
  assert (breadcrumbs.get_model () == null);
  stat.set_value (45);
  metadata.append ("Height", "0.7 m");
  skeleton.set_lines (4);
  palette.set_title ("Quick actions");
  palette.set_empty_text ("Nothing found");
  return material.get_kind () == Awra.MaterialKind.FROSTED &&
         canvas.get_preset () == Awra.MaterialPreset.CANVAS &&
         typeof (Awra.NavigationItem) != Type.INVALID &&
         typeof (Awra.MaterialResolution) != Type.INVALID &&
         typeof (Awra.Header) != Type.INVALID &&
         typeof (Awra.EdgePanel) != Type.INVALID &&
         typeof (Awra.ActionRow) != Type.INVALID &&
         typeof (Awra.PanelEdge) != Type.INVALID &&
         typeof (Awra.AccentSource) != Type.INVALID &&
         typeof (Awra.FilterBar) != Type.INVALID &&
         typeof (Awra.MasterDetail) != Type.INVALID &&
         typeof (Awra.DetailPane) != Type.INVALID &&
         typeof (Awra.DataColumn) != Type.INVALID &&
         typeof (Awra.DataView) != Type.INVALID &&
         typeof (Awra.SelectionToolbar) != Type.INVALID &&
         typeof (Awra.TextArea) != Type.INVALID &&
         typeof (Awra.PasswordEntry) != Type.INVALID &&
         typeof (Awra.TagEntry) != Type.INVALID &&
         typeof (Awra.ChoiceGroup) != Type.INVALID &&
         typeof (Awra.StatusBanner) != Type.INVALID &&
         typeof (Awra.ResponsiveBin) != Type.INVALID &&
         typeof (Awra.BreadcrumbBar) != Type.INVALID &&
         typeof (Awra.CommandPalette) != Type.INVALID &&
         typeof (Awra.StatBar) != Type.INVALID &&
         typeof (Awra.MetadataGroup) != Type.INVALID &&
         typeof (Awra.Skeleton) != Type.INVALID &&
         typeof (Awra.SurfaceCorner) != Type.INVALID ? 0 : 1;
}
