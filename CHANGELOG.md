<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Changelog

## 1.1.0 — unreleased

API added in this release is documented `Since: 1.1`; every 1.0.0 API is
unchanged (checked against the frozen 1.0.0 contract).

- Responsive layout: `AwraMasterDetail`, `AwraFilterBar` and `AwraFormRow`
  are measured in the layout their width gives, so no frame is drawn with the
  previous layout's sizes after creation or a resize across a breakpoint.
  `AwraMasterDetail` takes the pane hidden in compact mode off screen without
  changing its visibility, and stays compact while both panes do not fit.
- `AwraSplitView` keeps a divider the user dragged until its mode changes.
- `AwraResponsiveBin` and `AwraSplitView` accept their compact and expanded
  widths in either order.
- `AwraNavigationView` slides forward on push and back on pop.
- Windows: Win+arrows snap and resize windows (Snap, FancyZones); system
  preferences follow Windows' change broadcasts instead of a poll, and no
  longer override an application's own GTK settings; the DLL exports only
  the public API; a Windows CI job builds and tests Awra.
- `AWRA_CHECK_VERSION ()`; the version header is checked against the
  project's version.

- Windows support: a `win32-dwm` effect backend (Acrylic system backdrop on
  Windows 11 22H2+, accent-policy blur on Windows 10), Windows dark mode,
  accent colour, high contrast and animation preferences mirrored into GTK,
  native DWM shadow and corners for Awra windows, relocatable translations,
  and a MinGW cross file (`build-aux/windows/mingw64.meson`).
- Keyboard helpers map physical keys to the platform's hardware keycodes
  (virtual keys on Windows), so layout-aware legends work there too.
- The command palette shows icons, accelerators and section headings.

- Added `AwraKeyCap`, `AwraKeyboardView` (ANSI/ISO, layout-aware legends,
  selection, roving focus, per-key file drops) and `AwraShortcutCapture`,
  plus public `KeyboardEvent.code` ↔ hardware keycode helpers.
- Added `AwraWaveformView`, `AwraVolumeControl`, `AwraMediaRow` and
  `AwraDropZone` for media workspaces.
- Added toast actions to `AwraToastOverlay` (`show_with_action()`,
  `dismiss()`, `get_current_toast_id()`, `dismissed`); `show_message()` is
  unchanged.
- The safe Rust crate projects the new family and exposes motion duration and
  easing, context-menu and key-code helpers.
- Showcase gains a soundboard pattern and a media workspace built on
  `AwraMediaRow`.

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
