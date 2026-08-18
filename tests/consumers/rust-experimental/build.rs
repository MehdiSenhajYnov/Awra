// SPDX-License-Identifier: LGPL-2.1-or-later

use std::{env, fs, path::PathBuf};

fn main() {
    let build_dir = PathBuf::from(
        env::var_os("AWRA_BUILD_DIR").expect("AWRA_BUILD_DIR is required by the Meson gate"),
    );
    let gir_path = PathBuf::from(
        env::var_os("AWRA_GIR_PATH").expect("AWRA_GIR_PATH is required by the Meson gate"),
    );
    let gir = fs::read_to_string(&gir_path).expect("Awra-1.0.gir must be readable");

    // These checks intentionally live in the Rust consumer: a C-compatible
    // pointer is not enough when the GIR needs to become Vec<String> or
    // Option<T> in generated bindings.
    assert!(gir.contains("c:identifier=\"awra_dropdown_new_from_strings\""));
    assert!(gir.contains("<array c:type=\"const char* const*\">"));
    assert!(gir.contains("c:identifier=\"awra_context_resolve_material\""));
    assert!(gir.contains("transfer-ownership=\"full\""));
    assert!(gir.contains("c:identifier=\"awra_widget_set_context_menu_model\""));
    assert!(gir.contains("c:identifier=\"awra_master_detail_set_master\""));
    assert!(gir.contains("c:identifier=\"awra_detail_pane_set_title\""));
    assert!(gir.contains("c:identifier=\"awra_data_view_append_column\""));
    assert!(gir.contains("c:identifier=\"awra_selection_toolbar_set_model\""));
    assert!(gir.contains("c:identifier=\"awra_text_area_set_text\""));
    assert!(gir.contains("c:identifier=\"awra_tag_entry_add\""));
    assert!(gir.contains("c:identifier=\"awra_responsive_bin_get_layout_mode\""));
    assert!(gir.contains("c:identifier=\"awra_breadcrumb_bar_set_model\""));
    assert!(gir.contains("c:identifier=\"awra_command_palette_set_menu_model\""));
    assert!(gir.contains("c:identifier=\"awra_metadata_group_append\""));
    assert!(gir.contains("c:identifier=\"awra_skeleton_set_lines\""));

    println!("cargo:rustc-link-search=native={}", build_dir.display());
    println!("cargo:rustc-link-lib=dylib=awra-1");
    println!("cargo:rerun-if-env-changed=AWRA_BUILD_DIR");
    println!("cargo:rerun-if-env-changed=AWRA_GIR_PATH");
    println!("cargo:rerun-if-changed={}", gir_path.display());
}
