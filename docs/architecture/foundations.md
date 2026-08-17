<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Awra foundation architecture

Awra 0.1 is an experimental C17/GObject library. Its public ABI contains no
Wayland or compositor types. Applications select a semantic material; Awra
resolves it against the current token snapshot and effect capabilities.

The native path is:

```text
AwraWindow / AwraPopover
        -> GtkNative / GdkSurface
        -> private effect coordinator
        -> ext-background-effect-v1 or generic fallback
```

The Wayland backend is compiled from the pinned protocol XML in `protocols/`.
Registry discovery uses a short-lived private Wayland event queue and synchronous
roundtrips on GTK's main thread. It never starts another file-descriptor reader.
The bound manager is returned to the display's normal queue for capability
updates. Every effect region is surface-local and rounded corners are
approximated with integer scanline rectangles. GTK 4.22's public
`gdk_wayland_surface_force_next_commit()` schedules application of the
double-buffered region.

## Material invariants

- Solid is always opaque.
- Translucent never requests compositor blur.
- Frosted requests blur only when the backend advertises it.
- Frosted becomes opaque when blur is unavailable or reduced transparency is
  enabled.
- Window inactivity never changes the fill tint, fill opacity, or blur request;
  it only attenuates border, highlight, and shadow decoration.

Nested surfaces do not request independent backdrop effects when they share a
native surface. The root native surface owns the blur; nested surfaces provide
tint, border, and elevation. Popovers implement `GtkNative`, so they register a
separate native effect for each mapping.

## Responsive and interaction layers

`AwraSplitView` derives compact, medium and expanded modes from its allocation;
collapsing the sidebar never mutates the root material or its blur request.
Controls reuse GTK behavior through derivation or composition. Menus are built
from `GMenuModel`/`GAction`, dropdowns and lists retain GTK model semantics,
and navigation maintains explicit push/pop/replace history.

Motion durations are semantic presets. Reduced motion resolves every preset to
zero, and the navigation and tab containers retarget their GTK transitions when
that preference changes. Toasts remain in-window while popovers and dialogs
continue through the native effect lifecycle.

The developer inspector holds its target weakly. It exposes dimensions,
accessible role, semantic material and surface state, and can draw the exact
rounded region Awra submits for the inspected native root.

## Known limits

The protocol does not control blur radius, saturation, or compositor algorithm.
The rounded region is quantized to logical integer coordinates, so fractional
scaling still requires visual validation. If protocol discovery, capability
negotiation, surface creation, or region update fails, Awra keeps the widget
functional and uses its opaque material fallback.
