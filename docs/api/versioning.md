<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Versioning, ABI and deprecation policy

Awra uses SemVer for its public C/GObject API and coordinates the GIR namespace
and Rust crate release with the C library release.

- The stable API namespace is `Awra-1.0`; its C include and pkg-config names
  remain `awra-1`.
- The shared-library ABI major is represented by the SONAME. A compatible
  minor release may add symbols, enum values where documented as extensible,
  properties and interfaces, but cannot remove or reinterpret existing ones.
- Source-breaking or ABI-breaking changes require the next major line and a
  parallel installable namespace when practical.
- A deprecated API remains available for at least one complete minor series.
  Its documentation names the replacement and the release that introduced the
  deprecation.
- Numeric visual calibration values are not ABI. Semantic meaning, ownership,
  focus behavior and accessibility are API contracts.
- Rust bindings use the matching Awra version and link the same C ABI. The GIR
  remains their generated source of truth; handwritten Rust is restricted to
  idiomatic projections that GIR cannot express.

Every release updates `CHANGELOG.md`, runs the public-symbol contract, clean
install consumers, sanitizers, visual matrix and a clean `meson dist`.
