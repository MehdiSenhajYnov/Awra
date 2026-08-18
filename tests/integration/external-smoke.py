#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Exercise Awra exclusively through the installed-style GI contract."""

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Awra", "1.0")

from gi.repository import Awra, Gtk  # noqa: E402


def main() -> int:
    Gtk.init()
    Awra.init()
    material = Awra.Material.new_for_preset(Awra.MaterialPreset.CANVAS)
    assert material.get_kind() == Awra.MaterialKind.FROSTED
    assert material.get_preset() == Awra.MaterialPreset.CANVAS

    surface = Awra.Surface.new_with_role(Awra.SurfaceRole.CARD)
    child = Gtk.Label(label="Python/GI consumer")
    surface.set_child(child)
    assert surface.get_child() is child
    surface.set_child(None)
    assert surface.get_child() is None

    dropdown = Awra.Dropdown.new_from_strings(["One", "Two", "Three"])
    dropdown.set_selected(1)
    assert dropdown.get_selected() == 1
    dropdown.set_model(None)

    popover = Awra.Popover.new()
    popover.set_child(Gtk.Label(label="Floating"))
    popover.set_child(None)
    menu = Awra.MenuButton.new()
    menu.set_label("Actions")
    menu.set_popover(popover)
    assert menu.get_popover() is popover
    menu.set_popover(None)

    target = Gtk.Box()
    Awra.widget_set_context_menu_model(target, None)

    page = Awra.Page.new()
    header = Awra.PageHeader.new()
    header.set_title("Library")
    header.set_subtitle("Typed Python composition")
    section = Awra.Section.new()
    section.set_title("Recent work")
    section.set_child(Gtk.Label(label="No manual section spacing"))
    toolbar = Awra.Toolbar.new()
    toolbar.set_end_widget(Awra.Button.new_with_label("Create"))
    content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    content.append(header)
    content.append(toolbar)
    content.append(section)
    page.set_child(content)
    assert page.get_child() is content
    page.set_child(None)

    form = Awra.Form.new()
    row = Awra.FormRow.new()
    row.set_label("Email")
    row.set_control(Awra.Entry.new())
    row.set_error_message("Enter a valid address")
    row.set_validation_state(Awra.ValidationState.ERROR)
    form.append(row)
    assert form.get_row(0) is row
    empty = Awra.EmptyState.new()
    empty.set_title("No results")
    empty.set_action(Awra.Button.new_with_label("Reset"))
    loading = Awra.LoadingState.new()
    loading.set_active(False)
    error = Awra.ErrorState.new()
    error.set_action(Awra.Button.new_with_label("Retry"))
    filters = Awra.FilterBar.new()
    filters.set_search(Awra.SearchEntry.new())
    filters.append_filter(Awra.Dropdown.new_from_strings(["All", "Open"]))
    assert filters.get_n_filters() == 1
    detail = Awra.DetailPane.new()
    detail.set_title("Workspace")
    detail_section = Awra.Section.new()
    detail_section.set_title("Overview")
    detail.append_section(detail_section)
    master_detail = Awra.MasterDetail.new()
    master_detail.set_master(filters)
    master_detail.set_detail(detail)
    master_detail.show_detail()
    assert master_detail.get_visible_pane() == Awra.MasterDetailPane.DETAIL
    data_view = Awra.DataView.new(None)
    data_column = Awra.DataColumn.new("Name", None)
    data_column.set_expand(True)
    data_view.append_column(data_column)
    data_view.set_state(Awra.DataViewState.EMPTY)
    selection_toolbar = Awra.SelectionToolbar.new(None)
    selection_toolbar.set_auto_hide(False)
    selection_toolbar.set_title("record")
    selection_toolbar.set_plural_title("records")
    assert data_view.get_n_columns() == 1
    text_area = Awra.TextArea.new()
    text_area.set_text("Notes")
    password = Awra.PasswordEntry.new()
    password.set_text("secret")
    tags = Awra.TagEntry.new()
    assert tags.add("GTK")
    choices = Awra.ChoiceGroup.new()
    choices.set_exclusive(True)
    choices.append("Daily")
    banner = Awra.StatusBanner.new()
    banner.set_appearance(Awra.StatusAppearance.INFO)
    responsive = Awra.ResponsiveBin.new()
    responsive.set_child(Gtk.Label(label="Adaptive"))
    assert responsive.get_child() is not None
    breadcrumb = Awra.BreadcrumbItem.new("Library", "library")
    breadcrumbs = Awra.BreadcrumbBar.new()
    assert breadcrumb.get_name() == "library"
    assert breadcrumbs.get_model() is None
    palette = Awra.CommandPalette.new(None)
    palette.set_title("Quick actions")
    palette.set_empty_text("Nothing found")
    assert palette.get_title() == "Quick actions"
    stat = Awra.StatBar.new("HP")
    stat.set_value(45)
    metadata = Awra.MetadataGroup.new()
    metadata.append("Height", "0.7 m")
    skeleton = Awra.Skeleton.new()
    skeleton.set_lines(4)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
