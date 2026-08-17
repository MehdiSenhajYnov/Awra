<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Awra 0.1 API map

Awra exposes one C/GObject ABI and the `Awra-1.0` introspection namespace.
The umbrella header is `<awra/awra.h>`.

## Runtime and appearance

- `AwraContext` is the lazy singleton associated with a `GdkDisplay`.
- `AwraStyleManager` owns appearance, accent, contrast, reduced motion and
  reduced transparency preferences.
- `AwraTokenSet` is the immutable semantic token snapshot.
- `AwraDiagnostics` reports backend capability and native effect state.

## Rendering and layout

- `AwraMaterial` describes Solid, Translucent or Frosted intent.
- `AwraSurface` renders the resolved material, clipping and elevation with GSK.
- `AwraCard`, `AwraHeader`, `AwraSidebar` and `AwraSplitView` provide the
  responsive layout foundation.
- `AwraMotionPreset` maps Fast, Normal and Slow motion to zero duration when
  reduced motion is enabled.

## Controls and navigation

The input widgets preserve GTK behavior either by subclassing a derivable GTK
control or by delegating to a final GTK control. This keeps actions, IME,
selection, keyboard navigation and accessibility semantics in GTK.

The extended set includes `AwraDropdown`, `AwraListView`,
`AwraSegmentedControl`, `AwraTabView`, `AwraNavigationView`, `AwraBadge` and
`AwraProgressBar`.

## Native and in-window overlays

`AwraPopover` and `AwraDialog` own native surfaces and therefore participate in
the private effect coordinator. `AwraToastOverlay` stays inside its parent
window. Menus consume `GMenuModel` and `GAction`; applications never call a
Wayland or compositor API.

`AwraInspector` reports widget/surface state and can outline the native effect
region for developer diagnostics.
