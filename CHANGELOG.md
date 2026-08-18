<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Changelog

## 1.0.0 — 2026-08-19

- Added typed page, section, toolbar, forms, application states, filters,
  master/detail and detail-pane composition.
- Added virtualized data views, selection toolbar, advanced inputs, responsive
  bins, breadcrumbs, command palette and dense data components.
- Added accessibility/RTL, hostile-theme, lifecycle, performance and public
  consumer gates.
- Added compositor-neutral diagnostic export and Inspector region/overdraw
  tooling.
- Added generated `awra-sys` and safe gtk-rs bindings with a permanent Rust
  example; all GTK delegate/model signatures are projected and a regression
  gate rejects unsupported generated stubs.
- Added staged packaging, documentation install, Flatpak manifest and CI.
- Added gettext-backed framework strings, installed `gi-docgen` reference and
  an external AT-SPI/Orca bridge audit.
- Made every resolved material field focus-invariant and stabilized hostile
  theme/popup captures at their final rendered state.
- Fixed source distribution so `build-aux` generation and validation scripts
  cannot be excluded by the build-directory ignore rule, while Cargo build
  artifacts remain excluded; normalized dist mtimes make repeated archives
  byte-identical.
- Stabilized the `Awra-1.0` GIR namespace and `libawra-1.so.1` ABI after the
  complete Showcase and Pokedia reference-application gates.

## 0.1.0 — 2026-08-17

- Initial experimental C/GObject framework, semantic materials, AwraWindow,
  core controls, overlays and `ext-background-effect-v1` fallback backend.
