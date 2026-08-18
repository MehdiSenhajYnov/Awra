#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Guard the multi-language contract encoded by Awra-1.0.gir."""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET


CORE = "http://www.gtk.org/introspection/core/1.0"
C = "http://www.gtk.org/introspection/c/1.0"
NS = {"gi": CORE, "c": C}


def fail(message: str) -> None:
    raise AssertionError(message)


def callable_by_c_identifier(root: ET.Element, identifier: str) -> ET.Element:
    for tag in ("constructor", "function", "method"):
        for node in root.findall(f".//gi:{tag}", NS):
            if node.get(f"{{{C}}}identifier") == identifier:
                return node
    fail(f"{identifier} is missing from the GIR")


def parameter(callable_node: ET.Element, name: str) -> ET.Element:
    node = callable_node.find(f".//gi:parameter[@name='{name}']", NS)
    if node is None:
        fail(f"parameter {name!r} is missing from {callable_node.get('name')}")
    return node


def assert_nullable(identifier: str, name: str, root: ET.Element) -> None:
    node = parameter(callable_by_c_identifier(root, identifier), name)
    if node.get("nullable") != "1" or node.get("allow-none") != "1":
        fail(f"{identifier}::{name} must project as nullable")


def assert_return_transfer(identifier: str, transfer: str, root: ET.Element) -> None:
    node = callable_by_c_identifier(root, identifier).find("gi:return-value", NS)
    if node is None or node.get("transfer-ownership") != transfer:
        fail(f"{identifier} must return transfer-{transfer}")


def main() -> int:
    if len(sys.argv) != 2:
        fail("usage: test-gir-contract.py /path/to/Awra-1.0.gir")
    root = ET.parse(sys.argv[1]).getroot()
    namespace = root.find("gi:namespace", NS)
    if namespace is None:
        fail("GIR has no namespace")
    if namespace.get("name") != "Awra" or namespace.get("version") != "1.0":
        fail("unexpected namespace identity")

    required_types = {
        "Context",
        "Material",
        "MaterialResolution",
        "StyleManager",
        "Surface",
        "Window",
        "Popover",
        "MenuButton",
        "Dialog",
        "Page",
        "PageHeader",
        "Section",
        "Toolbar",
        "Form",
        "FormRow",
        "EmptyState",
        "LoadingState",
        "ErrorState",
        "FilterBar",
        "MasterDetail",
        "MasterDetailPane",
        "DetailPane",
        "DataColumn",
        "DataView",
        "DataViewState",
        "SelectionToolbar",
        "TextArea",
        "PasswordEntry",
        "TagEntry",
        "ChoiceGroup",
        "StatusBanner",
        "StatusAppearance",
        "ResponsiveBin",
        "BreadcrumbItem",
        "BreadcrumbBar",
        "CommandPalette",
        "MetricRow",
        "StatBar",
        "BadgeGroup",
        "MetadataGroup",
        "Skeleton",
    }
    actual_types = {
        node.get("name")
        for tag in ("class", "enumeration", "record", "bitfield", "interface")
        for node in namespace.findall(f"gi:{tag}", NS)
    }
    missing = sorted(required_types - actual_types)
    if missing:
        fail(f"fundamental GIR types missing: {', '.join(missing)}")

    assert_return_transfer("awra_context_get_for_display", "none", root)
    assert_return_transfer("awra_context_resolve_material", "full", root)
    assert_return_transfer("awra_material_new_frosted", "full", root)
    assert_return_transfer("awra_inspector_get_target", "full", root)
    assert_nullable("awra_window_set_content", "content", root)
    assert_nullable("awra_window_set_chrome", "chrome", root)
    assert_nullable("awra_popover_set_child", "child", root)
    assert_nullable("awra_popover_set_menu_model", "model", root)
    assert_nullable("awra_menu_button_set_popover", "popover", root)
    assert_nullable("awra_widget_set_context_menu_model", "model", root)
    assert_nullable("awra_dropdown_new", "model", root)
    assert_nullable("awra_dropdown_new", "expression", root)
    assert_nullable("awra_inspector_set_target", "target", root)
    assert_nullable("awra_page_set_child", "child", root)
    assert_nullable("awra_page_header_set_title", "title", root)
    assert_nullable("awra_page_header_set_subtitle", "subtitle", root)
    assert_nullable("awra_page_header_set_actions", "actions", root)
    assert_nullable("awra_section_set_description", "description", root)
    assert_nullable("awra_section_set_child", "child", root)
    assert_nullable("awra_toolbar_set_center_widget", "widget", root)
    assert_nullable("awra_form_row_set_control", "control", root)
    assert_nullable("awra_form_row_set_help_text", "help_text", root)
    assert_nullable("awra_form_row_set_error_message", "message", root)
    assert_nullable("awra_empty_state_set_action", "action", root)
    assert_nullable("awra_loading_state_set_description", "description", root)
    assert_nullable("awra_error_state_set_action", "action", root)
    assert_nullable("awra_filter_bar_set_search", "search", root)
    assert_nullable("awra_filter_bar_set_summary", "summary", root)
    assert_nullable("awra_filter_bar_set_reset_widget", "reset_widget", root)
    assert_nullable("awra_master_detail_set_master", "master", root)
    assert_nullable("awra_master_detail_set_detail", "detail", root)
    assert_nullable("awra_detail_pane_set_title", "title", root)
    assert_nullable("awra_detail_pane_set_subtitle", "subtitle", root)
    assert_nullable("awra_detail_pane_set_media", "media", root)
    assert_nullable("awra_detail_pane_set_actions", "actions", root)
    assert_nullable("awra_detail_pane_set_metadata", "metadata", root)
    assert_nullable("awra_data_column_new", "title", root)
    assert_nullable("awra_data_column_new", "factory", root)
    assert_nullable("awra_data_column_set_factory", "factory", root)
    assert_nullable("awra_data_column_set_sorter", "sorter", root)
    assert_nullable("awra_data_view_new", "model", root)
    assert_nullable("awra_data_view_set_model", "model", root)
    assert_nullable("awra_data_view_set_empty_widget", "widget", root)
    assert_nullable("awra_data_view_set_loading_widget", "widget", root)
    assert_nullable("awra_data_view_set_error_widget", "widget", root)
    assert_nullable("awra_selection_toolbar_new", "model", root)
    assert_nullable("awra_selection_toolbar_set_model", "model", root)
    assert_nullable("awra_selection_toolbar_set_actions", "actions", root)
    assert_nullable("awra_selection_toolbar_set_title", "title", root)
    assert_nullable("awra_selection_toolbar_set_plural_title", "title", root)
    assert_nullable("awra_status_banner_set_action", "action", root)
    assert_nullable("awra_responsive_bin_set_child", "child", root)
    assert_nullable("awra_breadcrumb_bar_set_model", "model", root)
    assert_nullable("awra_command_palette_new", "parent", root)
    assert_nullable("awra_command_palette_set_menu_model", "model", root)
    assert_nullable("awra_command_palette_set_title", "title", root)
    assert_nullable("awra_command_palette_set_empty_text", "text", root)

    strings = parameter(
        callable_by_c_identifier(root, "awra_dropdown_new_from_strings"),
        "strings",
    )
    array = strings.find("gi:array", NS)
    # In GIR 1.2, an omitted zero-terminated attribute means true.
    if array is None or array.get("zero-terminated", "1") != "1":
        fail("awra_dropdown_new_from_strings must project as a zero-terminated array")
    item_type = array.find("gi:type", NS)
    if item_type is None or item_type.get("name") != "utf8":
        fail("awra_dropdown_new_from_strings must project as an array of UTF-8 strings")

    hidden = [
        node.get(f"{{{C}}}identifier") or node.get("name")
        for node in namespace.iter()
        if node.get("introspectable") == "0"
    ]
    if hidden:
        fail("non-introspectable public API: " + ", ".join(sorted(hidden)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
