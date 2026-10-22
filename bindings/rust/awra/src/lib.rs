// SPDX-License-Identifier: LGPL-2.1-or-later

#![allow(deprecated)]
#![allow(clippy::manual_c_str_literals)]

pub use awra_sys as ffi;
pub use gdk;
pub use gio;
pub use glib;
pub use gtk;

extern crate glib as gobject;

macro_rules! assert_initialized_main_thread {
    () => {
        assert!(
            gtk::is_initialized_main_thread(),
            "GTK must be initialized on the main thread before constructing Awra widgets"
        );
    };
}

macro_rules! skip_assert_initialized {
    () => {};
}

#[allow(clippy::derived_hash_with_manual_eq)]
#[allow(clippy::too_many_arguments)]
#[allow(clippy::type_complexity)]
#[allow(clippy::let_and_return)]
#[allow(unused_imports)]
mod auto;

pub use auto::*;

mod inspector;

pub mod builders {
    pub use crate::auto::builders::*;
}

pub mod prelude {
    pub use crate::auto::traits::*;
    pub use gtk::prelude::*;
}

/// Applies one of Awra's public, semantic style roles to a GTK widget.
///
/// Prefer a dedicated Awra widget whenever one exists. Style roles are the
/// supported escape hatch for domain-specific compositions, not a replacement
/// for framework components.
pub fn add_style_role(widget: &impl glib::object::IsA<gtk::Widget>, role: &str) -> bool {
    use glib::translate::{from_glib, ToGlibPtr};

    let role = std::ffi::CString::new(role).expect("Awra style roles cannot contain NUL bytes");
    unsafe {
        from_glib(ffi::awra_widget_add_style_role(
            widget.as_ref().to_glib_none().0,
            role.as_ptr(),
        ))
    }
}

/// Removes a public Awra style role previously applied with
/// [`add_style_role`].
pub fn remove_style_role(widget: &impl glib::object::IsA<gtk::Widget>, role: &str) -> bool {
    use glib::translate::{from_glib, ToGlibPtr};

    let role = std::ffi::CString::new(role).expect("Awra style roles cannot contain NUL bytes");
    unsafe {
        from_glib(ffi::awra_widget_remove_style_role(
            widget.as_ref().to_glib_none().0,
            role.as_ptr(),
        ))
    }
}

/// Applies Awra's spacing and inset recipe for a semantic layout.
pub fn apply_layout_preset(box_: &gtk::Box, preset: LayoutPreset) {
    use glib::translate::{IntoGlib, ToGlibPtr};

    unsafe {
        ffi::awra_box_apply_layout_preset(box_.to_glib_none().0, preset.into_glib());
    }
}

/// Applies an Awra typography token without exposing CSS classes to consumers.
pub fn set_typography(widget: &impl glib::object::IsA<gtk::Widget>, typography: Typography) {
    use glib::translate::{IntoGlib, ToGlibPtr};

    unsafe {
        ffi::awra_widget_set_typography(widget.as_ref().to_glib_none().0, typography.into_glib());
    }
}

/// Registers Awra's resources and public types.
pub fn init() {
    assert_initialized_main_thread!();
    unsafe { ffi::awra_init() }
}
