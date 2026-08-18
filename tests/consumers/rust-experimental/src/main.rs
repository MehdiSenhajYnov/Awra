// SPDX-License-Identifier: LGPL-2.1-or-later

use gtk::glib::{self, gobject_ffi, translate::*};
use gtk::prelude::*;
use std::ffi::{c_char, c_void, CString};

#[link(name = "awra-1")]
unsafe extern "C" {
    fn awra_init();
    fn awra_material_new_for_preset(preset: i32) -> *mut gobject_ffi::GObject;
    fn awra_material_get_kind(material: *mut c_void) -> i32;
    fn awra_material_get_preset(material: *mut c_void) -> i32;
    fn awra_surface_new_with_role(role: i32) -> *mut gtk::ffi::GtkWidget;
    fn awra_surface_set_child(surface: *mut c_void, child: *mut gtk::ffi::GtkWidget);
    fn awra_surface_get_child(surface: *mut c_void) -> *mut gtk::ffi::GtkWidget;
    fn awra_dropdown_new_from_strings(strings: *const *const c_char)
        -> *mut gtk::ffi::GtkWidget;
    fn awra_dropdown_set_selected(dropdown: *mut c_void, selected: u32);
    fn awra_dropdown_get_selected(dropdown: *mut c_void) -> u32;
    fn awra_page_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_page_set_child(page: *mut c_void, child: *mut gtk::ffi::GtkWidget);
    fn awra_page_get_child(page: *mut c_void) -> *mut gtk::ffi::GtkWidget;
    fn awra_page_header_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_page_header_set_title(header: *mut c_void, title: *const c_char);
    fn awra_form_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_form_row_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_form_row_set_control(row: *mut c_void, control: *mut gtk::ffi::GtkWidget);
    fn awra_form_append(form: *mut c_void, row: *mut c_void);
    fn awra_form_get_n_rows(form: *mut c_void) -> u32;
    fn awra_filter_bar_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_filter_bar_set_search(bar: *mut c_void, search: *mut gtk::ffi::GtkWidget);
    fn awra_detail_pane_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_detail_pane_set_title(pane: *mut c_void, title: *const c_char);
    fn awra_master_detail_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_master_detail_set_master(view: *mut c_void, master: *mut gtk::ffi::GtkWidget);
    fn awra_master_detail_set_detail(view: *mut c_void, detail: *mut gtk::ffi::GtkWidget);
    fn awra_master_detail_show_detail(view: *mut c_void);
    fn awra_master_detail_get_visible_pane(view: *mut c_void) -> i32;
    fn awra_data_column_new(
        title: *const c_char,
        factory: *mut c_void,
    ) -> *mut gobject_ffi::GObject;
    fn awra_data_view_new(model: *mut c_void) -> *mut gtk::ffi::GtkWidget;
    fn awra_data_view_append_column(view: *mut c_void, column: *mut c_void);
    fn awra_data_view_get_n_columns(view: *mut c_void) -> u32;
    fn awra_selection_toolbar_new(model: *mut c_void) -> *mut gtk::ffi::GtkWidget;
    fn awra_selection_toolbar_set_auto_hide(toolbar: *mut c_void, auto_hide: i32);
    fn awra_text_area_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_text_area_set_text(area: *mut c_void, text: *const c_char);
    fn awra_tag_entry_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_tag_entry_add(entry: *mut c_void, tag: *const c_char) -> i32;
    fn awra_responsive_bin_new() -> *mut gtk::ffi::GtkWidget;
    fn awra_responsive_bin_get_layout_mode(bin: *mut c_void) -> i32;
}

fn main() {
    gtk::init().expect("the Rust projection smoke test requires a GTK display");
    unsafe { awra_init() };

    let material: glib::Object = unsafe { from_glib_full(awra_material_new_for_preset(1)) };
    assert_eq!(unsafe { awra_material_get_kind(material.as_ptr().cast()) }, 2);
    assert_eq!(unsafe { awra_material_get_preset(material.as_ptr().cast()) }, 1);

    let surface: gtk::Widget = unsafe { from_glib_none(awra_surface_new_with_role(2)) };
    let child = gtk::Label::new(Some("Rust/GIR projection consumer"));
    unsafe { awra_surface_set_child(surface.as_ptr().cast(), child.as_ptr().cast()) };
    let returned: gtk::Widget = unsafe {
        from_glib_none(awra_surface_get_child(surface.as_ptr().cast()))
    };
    assert_eq!(returned, child.upcast::<gtk::Widget>());

    let values = ["Canvas", "Floating", "Opaque"]
        .into_iter()
        .map(|value| CString::new(value).unwrap())
        .collect::<Vec<_>>();
    let mut pointers = values.iter().map(|value| value.as_ptr()).collect::<Vec<_>>();
    pointers.push(std::ptr::null());
    let dropdown: gtk::Widget = unsafe {
        from_glib_none(awra_dropdown_new_from_strings(pointers.as_ptr()))
    };
    unsafe { awra_dropdown_set_selected(dropdown.as_ptr().cast(), 1) };
    assert_eq!(unsafe { awra_dropdown_get_selected(dropdown.as_ptr().cast()) }, 1);

    let page: gtk::Widget = unsafe { from_glib_none(awra_page_new()) };
    let header: gtk::Widget = unsafe { from_glib_none(awra_page_header_new()) };
    let title = CString::new("Rust projection").unwrap();
    unsafe {
        awra_page_header_set_title(header.as_ptr().cast(), title.as_ptr());
        awra_page_set_child(page.as_ptr().cast(), header.as_ptr().cast());
    }
    let page_child: gtk::Widget = unsafe {
        from_glib_none(awra_page_get_child(page.as_ptr().cast()))
    };
    assert_eq!(page_child, header);

    let form: gtk::Widget = unsafe { from_glib_none(awra_form_new()) };
    let row: gtk::Widget = unsafe { from_glib_none(awra_form_row_new()) };
    let entry = gtk::Entry::new();
    unsafe {
        awra_form_row_set_control(row.as_ptr().cast(), entry.as_ptr().cast());
        awra_form_append(form.as_ptr().cast(), row.as_ptr().cast());
    }
    assert_eq!(unsafe { awra_form_get_n_rows(form.as_ptr().cast()) }, 1);

    let filter_bar: gtk::Widget = unsafe { from_glib_none(awra_filter_bar_new()) };
    let search = gtk::SearchEntry::new();
    let detail_pane: gtk::Widget = unsafe { from_glib_none(awra_detail_pane_new()) };
    let detail_title = CString::new("Workspace").unwrap();
    let master_detail: gtk::Widget = unsafe { from_glib_none(awra_master_detail_new()) };
    unsafe {
        awra_filter_bar_set_search(filter_bar.as_ptr().cast(), search.as_ptr().cast());
        awra_detail_pane_set_title(detail_pane.as_ptr().cast(), detail_title.as_ptr());
        awra_master_detail_set_master(master_detail.as_ptr().cast(), filter_bar.as_ptr().cast());
        awra_master_detail_set_detail(master_detail.as_ptr().cast(), detail_pane.as_ptr().cast());
        awra_master_detail_show_detail(master_detail.as_ptr().cast());
    }
    assert_eq!(unsafe { awra_master_detail_get_visible_pane(master_detail.as_ptr().cast()) }, 1);

    let column_title = CString::new("Name").unwrap();
    let data_column: glib::Object = unsafe {
        from_glib_full(awra_data_column_new(column_title.as_ptr(), std::ptr::null_mut()))
    };
    let data_view: gtk::Widget = unsafe {
        from_glib_none(awra_data_view_new(std::ptr::null_mut()))
    };
    unsafe {
        awra_data_view_append_column(data_view.as_ptr().cast(), data_column.as_ptr().cast());
    }
    assert_eq!(unsafe { awra_data_view_get_n_columns(data_view.as_ptr().cast()) }, 1);
    let selection_toolbar: gtk::Widget = unsafe {
        from_glib_none(awra_selection_toolbar_new(std::ptr::null_mut()))
    };
    unsafe {
        awra_selection_toolbar_set_auto_hide(selection_toolbar.as_ptr().cast(), 0);
    }
    assert!(selection_toolbar.is_visible());
    let text_area: gtk::Widget = unsafe { from_glib_none(awra_text_area_new()) };
    let notes = CString::new("Rust notes").unwrap();
    unsafe { awra_text_area_set_text(text_area.as_ptr().cast(), notes.as_ptr()) };
    let tags: gtk::Widget = unsafe { from_glib_none(awra_tag_entry_new()) };
    let tag = CString::new("gtk-rs").unwrap();
    assert_ne!(unsafe { awra_tag_entry_add(tags.as_ptr().cast(), tag.as_ptr()) }, 0);
    let responsive: gtk::Widget = unsafe { from_glib_none(awra_responsive_bin_new()) };
    assert_eq!(unsafe {
        awra_responsive_bin_get_layout_mode(responsive.as_ptr().cast())
    }, 2);
}
