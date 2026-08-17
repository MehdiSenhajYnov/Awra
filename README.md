<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Awra

Awra is an experimental GTK 4.22+ desktop UI framework with semantic materials,
GSK-rendered surfaces, accessible GTK-derived controls, and progressive native
background effects. It does not depend on libadwaita.

```sh
meson setup build -Ddeveloper=true
meson compile -C build
meson test -C build
meson install -C build --destdir "$PWD/staging"
```

Run `build/showcase/awra-showcase` to inspect Solid, Translucent, Frosted,
responsive layouts, the control library, native and in-window overlays,
fallback, motion preferences, and live platform diagnostics.

The install includes `awra-1.pc`, `Awra-1.0.gir`, `Awra-1.0.typelib`, and,
when `vapigen` is available, `awra-1.vapi`.

The API remains experimental in 0.1. Architecture and limitations are
documented in [`docs/architecture/foundations.md`](docs/architecture/foundations.md),
the API families in [`docs/api/README.md`](docs/api/README.md), and validation
in [`docs/architecture/validation.md`](docs/architecture/validation.md).

Blueprint validation is optional (`-Dblueprint=auto`) and is performed when
`blueprint-compiler` is installed. It is a build tool only; Awra has no
Blueprint or libadwaita runtime dependency.
