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

/// Registers Awra's resources and public types.
pub fn init() {
    assert_initialized_main_thread!();
    unsafe { ffi::awra_init() }
}
