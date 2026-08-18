<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Packaging Awra

The Meson install is the supported integration point. It installs the shared
library and SONAME links, public headers, pkg-config file, GIR, typelib, VAPI,
Showcase desktop metadata/icon and the versioned Markdown documentation tree.
No KWin or libadwaita runtime dependency is introduced.

## Non-standard prefix and DESTDIR

```sh
meson setup build --prefix=/opt/awra
meson compile -C build
DESTDIR="$PWD/stage" meson install -C build
```

`build-aux/validate-install.sh` performs this as an automated gate and compiles
external C, Vala and Python/GI consumers using only installed metadata.

## Flatpak

`org.awra.Showcase.Devel.json` builds the framework and Showcase as one module
against the GNOME 50 SDK (the first platform carrying the required GTK 4.22).
It requests only display/graphics permissions. The native effect remains
capability-driven and falls back safely when the host compositor or Flatpak
socket does not advertise it.

```sh
flatpak-builder --force-clean _flatpak-build \
  packaging/org.awra.Showcase.Devel.json
```

## Source release

Run the full suite and `meson dist -C build`. CI performs the same operation
from a clean checkout so the generated archive can never silently omit dirty
or untracked API files. Release archives include the pinned protocol XML and
license; generated Wayland C remains a build-directory artifact.
