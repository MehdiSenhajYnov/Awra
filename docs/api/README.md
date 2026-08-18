<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Awra 1.0 API map

Awra exposes one C/GObject ABI and the `Awra-1.0` introspection namespace.
The umbrella header is `<awra/awra.h>`.

The stable 1.x compatibility and ownership rules are documented in
[stability.md](stability.md). They are enforced by public-symbol, GIR and
external-consumer tests.

## Runtime and appearance

- `AwraContext` is the lazy singleton associated with a `GdkDisplay`.
- `AwraStyleManager` owns appearance, accent, contrast, reduced motion and
  reduced transparency preferences. Accent sources are SYSTEM (best-effort,
  DEFAULT fallback), DEFAULT and CUSTOM.
- The style manager also exposes reversible material-calibration overrides for
  Canvas tint/alpha, grain scale and native-blur activation. These rebuild the
  immutable token snapshot in real time; `reset_material_tuning()` restores the
  profile defaults. Native blur is a boolean request because the Wayland
  protocol exposes no blur-strength or algorithm parameter.
- Per-material calibration accepts either a low-level `AwraMaterial` descriptor
  or a semantic preset descriptor. Tint/alpha, radius, grain, outline,
  highlight and blur intent are global to that recipe: changing Floating is
  observed by every existing and future Floating surface. Solid and Opaque
  keep alpha locked to 1, and only Frosted, Canvas and Floating can request
  native blur. A per-material reset and the existing global reset are public.
- `AwraTokenSet` is the immutable semantic token snapshot.
- `AwraDiagnostics` reports backend capability and native effect state.
- `AwraMaterialResolution` is a read-only snapshot of the exact resolved fill,
  decoration, fallback and blur-request values used by a context. It exists so
  diagnostics can prove active/inactive invariants without private APIs.

## Rendering and layout

- `AwraMaterial` keeps low-level Solid, Translucent and Frosted intent and adds
  Canvas, Content, Chrome, Layer, Floating and Opaque semantic presets.
- `AwraSurface` renders the resolved material, clipping and elevation with GSK.
- `AwraCardAppearance` selects Plain, Tinted or Raised grouping without
  application CSS. `AwraElevation` names Flat, Raised, Floating and Modal depth.
- `AwraSpacing` exposes the low-level NONE/XS/SM/MD/LG/XL/XXL scale.
  `AwraLayoutPreset` combines those tokens into Compact, Control Group, Section,
  Content, Page, Toolbar and Overlay recipes. The public box/grid/margin helpers
  apply the recipes to ordinary GTK containers, keeping layouts introspectable
  and eliminating application-owned magic pixels.
- `AwraCard`, `AwraHeader`, `AwraSidebar` and `AwraSplitView` provide the
  responsive layout foundation. `AwraHeader` has independent start/center/end,
  drag and window-control choices; `AwraWindow:chrome` accepts it or another
  application-defined titlebar without imposing a sidebar composition.
  Cards own an LG content inset by default. `AwraSidebar` starts with an MD
  inset; NONE keeps the traditional docked composition.
  `blend-with-window` shares the root material and root surface role, while surface corner/edge masks
  distribute one continuous outer silhouette across header and content.
- `AwraPage` owns vertical scrolling, tokenized content insets and a centered
  readable width (960 logical pixels by default). `AwraPageHeader` and
  `AwraSection` provide semantic heading/action/content structure without
  painting another card. `AwraToolbar` exposes independent start/center/end
  groups and a compact density. All four are GtkBuilder/GIR types; their child
  properties are nullable and use GTK container ownership.
- `AwraForm` and adaptive `AwraFormRow` own accessible label/control/help/error
  relationships and validation state. `AwraEmptyState`, `AwraLoadingState` and
  `AwraErrorState` provide reusable page feedback.
- `AwraFilterBar` owns search/filter/summary/reset flow. `AwraMasterDetail`
  exposes observable Compact/Medium/Expanded layout and logical pane
  navigation; `AwraDetailPane` owns entity identity, metadata, actions and
  semantic sections without locking applications into one window chrome.
- `AwraEdgePanel` overlays a semantic Floating surface on either logical edge.
  It can remain visible, be controlled explicitly, or reveal from a narrow
  pointer/keyboard trigger and dismiss after a configurable delay or Escape.
  Its motion automatically follows reduced-motion preferences.
- `AwraMotionPreset` maps Fast, Normal and Slow motion to zero duration when
  reduced motion is enabled.

## Controls and navigation

The input widgets preserve GTK behavior either by subclassing a derivable GTK
control or by delegating to a final GTK control. This keeps actions, IME,
selection, keyboard navigation and accessibility semantics in GTK.

The extended set includes `AwraActionRow`, `AwraDropdown`, `AwraListView`,
`AwraSegmentedControl`, `AwraTabView`, `AwraNavigationView`,
`AwraNavigationItem`, `AwraBadge` and `AwraProgressBar`. Buttons expose Primary,
Secondary, Ghost, Destructive and Toolbar appearances.
Badges expose Neutral, Accent, Info, Success, Warning and Danger appearances,
so category and status colors remain accessible and isolated in Light/Dark.
For domain vocabularies with more categories, `AwraBadge:custom-color` draws a
token-independent category fill and derives readable light/dark content; this
keeps applications from manufacturing CSS classes for each data category.
`AwraDropdown` exposes its Floating popup through
`awra_dropdown_get_popover()` plus explicit `popup()`/`popdown()` operations;
changing the global Floating material immediately updates every open dropdown.
`AwraTabView` owns the complete dynamic-tab grammar: pinned and closable pages,
selection by widget, live title/tooltip changes and a vetoable `close-page`
signal. Its content stack is visible by default; `content-visible=false`
supports applications whose tabs navigate a shared external workspace while
retaining the same Awra-owned tab bar and interaction model.
`AwraDataView` retains GTK models and virtualization while owning the dense
table presentation, state views, scrolling and incremental-loading feedback.
`AwraDataColumn` wraps GTK factories/sorters with semantic sizing and
alignment. `AwraSelectionToolbar` binds contextual actions directly to a
selection model. See [data-views.md](../guides/data-views.md).
`AwraMetricRow`, `AwraStatBar`, `AwraBadgeGroup` and `AwraMetadataGroup`
provide dense reusable detail composition without application spacing.
`awra_widget_set_typography()` applies the public Body, Muted, Eyebrow, Title,
Display or Monospace hierarchy to any `GtkWidget`; its implementation classes
remain private, while the system font family and scale remain authoritative.

`awra_widget_add_style_role()` and `awra_widget_remove_style_role()` opt an
ordinary GTK behavioral widget into Awra's data-application recipes. These
roles cover dense tables, filter toolbars, domain tags,
statistics and comparison charts without exposing CSS provider ownership to an
application. They are intentionally complementary to the higher-level Awra
widgets: GTK continues to own scrolling, selection, editing and activation,
while Awra owns the visual identity. Role identifiers use lowercase ASCII,
digits and hyphens and are ABI-stable strings so bindings can consume new
recipes without a new enum value.
The supported vocabulary, expected GTK widgets and typed replacements are
listed in [the role catalogue](../guides/style-roles.md).

## Native and in-window overlays

`AwraPopover` and `AwraDialog` own native surfaces and therefore participate in
the private effect coordinator. `AwraToastOverlay` stays inside its parent
window. Menus consume `GMenuModel` and `GAction`; applications never call a
Wayland or compositor API. `awra_widget_set_context_menu_model()` attaches the
same Awra menu presentation and secondary-click lifecycle to any widget, so
applications do not need to manually parent popovers or own input gestures.

`AwraResponsiveBin` exposes observable size classes. `AwraBreadcrumbBar` and
`AwraCommandPalette` complete the typed navigation family; the latter consumes
ordinary `GMenuModel` commands and restores focus after dismissal. See
[responsive-navigation.md](../guides/responsive-navigation.md).

`AwraInspector` reports widget/surface state and can outline the native effect
region for developer diagnostics.
