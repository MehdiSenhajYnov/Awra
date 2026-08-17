<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Foundation validation record

Validated on 2026-08-17 with GTK 4.22.4, KWin/Wayland, GCC 16.1 and Clang
22.1. The regular and Wayland-disabled builds both pass the material, widget,
forced-fallback, and native lifecycle suites. The lifecycle test opens and
closes an `AwraPopover` three times and verifies tracked/effective native
surface counts return to zero after destruction.

The ASan/UBSan build passes all suites with Clang. Leak detection is disabled
for the GTK integration process because GTK, Pango, and Fontconfig retain
process-global caches; invalid access and undefined-behavior detection remain
enabled.

## KWin proof

The initial compositor state was `better_blur_dx=true`, built-in `blur=false`.
The transaction in `tests/manual/kwin-effect-proof.sh` produced:

```text
built-in blur only: interface=yes, blur=yes
no blur effect loaded: interface=yes, blur=no
restored: better_blur_dx=true, blur=false
```

This proves that Awra uses the standardized capability rather than naming or
depending on either KWin effect. The script records both initial values and
restores them through an `EXIT`, `INT`, and `TERM` trap.

Installed consumers were also compiled through `awra-1.pc`, imported through
`Awra-1.0.typelib` in Python, and compiled through the generated `awra-1.vapi`.
`ldd` contains GTK/GDK/Wayland dependencies and no libadwaita dependency.

## Extended library gate

The responsive layout, control, overlay, navigation, motion and display layers
are covered by the widget suite. This includes GTK Builder construction,
editable text, grouped selection, dropdown/list models, dialog transience,
menu models, toast state, navigation history, segmented selection, tabs,
progress, badges and weak inspector targets.

The visual suite snapshots a fully allocated Frosted scene directly into GSK,
checks repeat snapshots serialize identically, and proves Light and Dark scenes
produce distinct render trees. It captures only the Awra fixture and never the
desktop. The generated GIR is scanned with `--warn-all` and a Vala API is built
from it.

GTK 4.22.4 currently logs two `GtkImage` baseline warnings when a plain
`GtkSwitch` is allocated; the same warning reproduces in a minimal GTK-only
window without Awra. Showcase startup otherwise produces no Awra or Wayland
warning. Awra keeps the real GTK switch to preserve its keyboard and
accessibility behavior rather than replacing it with a visual imitation.
