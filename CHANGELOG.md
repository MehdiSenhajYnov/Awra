<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Changelog

## 1.1.0 — unreleased

API added in this release is documented `Since: 1.1`; every 1.0.0 API is
unchanged (checked against the frozen 1.0.0 contract).

### Desktop workspace composition

- `AwraHeader:compact` provides compact titlebar proportions without changing
  the default header. `AwraSelectionToolbar:clear-label` customizes the
  localized clear-selection action.
- Public workspace roles cover embedded tabs, dense navigation and tables,
  pane focus, inline filtering, floating selection and docked document previews.
- Metadata values ellipsize with a full-value tooltip in narrow panes.
- Breadcrumb reveal runs after viewport allocation, keeping the visible path
  synchronized with the adjustment when a pane changes size.
- `AwraZoomController` adds scoped, bounded Ctrl+wheel content zoom. Text follows
  the desktop font, ordinary scroll input remains native, and `scale` notifications
  let consumers resize domain imagery without replacing their models.
- `canvas-table` provides transparent column guides for continuous-Canvas layouts.
- `AwraHeader:expand-center` fills the real gap between side controls for
  shared navigation/address bars, preserving the centered default.
- `drop-zone` follows GTK’s accepted-drop state for reusable destination feedback.

### Framework updates

- `AwraGridView` adds a public C/GI virtualized grid with shared GTK selection
  models, item factories, rubberband selection and semantic interaction styles.
- `AwraTextArea` applies its semantic foreground directly to GtkTextView so
  read-only previews retain contrast in both light and dark appearance.
- Breadcrumbs scroll horizontally, reveal the current segment, and respect RTL
  without making a long path the window minimum width.
- Empty/loading/error descriptions wrap in narrow panes; data table header
  padding no longer causes fixed-column row underallocation.
- `AwraTimeline` exposes configurable `step-increment` and `page-increment`
  properties so local and global transport shortcuts can use consistent steps.
  Defaults and editable-mode scaling remain compatible; C/GI/Vala/Rust expose
  both properties.

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
- Rust bindings regenerated: the 1.1 API (dialogs, key caps, keyboard view,
  media widgets...) behind the default `v1_1` feature; both crates carry
  crates.io metadata and are ready to publish.
- `AWRA_CHECK_VERSION ()`; the version header is checked against the
  project's version.

- Make the outer window frame square and undecorated by default when maximized
  or fullscreen. Add `AwraWindow:keep-rounded-corners` (default false) to retain
  rounding per application, including live changes and fullscreen with a hidden
  native titlebar. Restoration preserves the configured surface geometry;
  floating controls and overlay chrome retain their own rounding.

- Add decoder-independent `AwraFramePool` / `AwraFrame` for bounded aligned
  RGB and planar YUV storage, immutable texture leases without pixel copies,
  safe producer-to-consumer lifetime, and alpha-correct bilinear previews in
  another bounded pool. `AwraTextureStream` updates multiple
  pictures without per-frame layout or CPU mipmap generation;
  `AwraAspectPaintable` handles non-square source pixels. C, GI and Rust
  consumers cover ownership, color conversion and threaded production.

- Add `AwraOverlayBar` with full-canvas allocation, floating controls, idle
  policy, hover/focus protection and reduced-motion support.
- Add opt-in overlay chrome to `AwraWindow`, timeline-owned pointer previews
  and toast bottom clearance. Dock/overlay transitions preserve native surfaces.
- Fix early window title bindings and full-transfer dialog/palette constructors
  so retained language bindings remain valid after destruction. Transient
  dialogs join their parent's application and support Escape dismissal.
- Forward focus through search, spin, switch and password composites.

- Add the introspectable `AwraTimeline` for backend-independent seeking,
  interval/point markers, viewports, hover previews and cancellable offset edits.
  Keyboard, RTL and `GtkAccessibleRange` semantics are included.
- Add the `collection-view` style role for virtualized GTK grid/list factories.
- Exercise the additions in Showcase, native tests and Python/Rust consumers.

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
