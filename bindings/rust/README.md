<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Awra Rust bindings

This permanent consumer is generated from `Awra-1.0.gir` with the official
gtk-rs `gir` generator. `awra-sys` is the complete unsafe ABI projection;
`awra` is the safe gtk-rs layer and keeps GTK types visible for composition.

Regeneration is intentionally explicit and versioned with the stable C API:

```sh
meson compile -C build Awra-1.0.gir
meson subprojects download gir gir-files
cargo run --manifest-path subprojects/gir/Cargo.toml -- \
  -c bindings/rust/awra-sys/Gir.toml -o bindings/rust/awra-sys
cargo run --manifest-path subprojects/gir/Cargo.toml -- \
  -c bindings/rust/awra/Gir.toml -o bindings/rust/awra
python3 build-aux/fix-rust-projection.py bindings/rust/awra
cargo test --offline --manifest-path bindings/rust/Cargo.toml
```

The safe generator configuration lists every GTK/Gio type crossing the Awra
API boundary, so delegates, models, expressions, sorters, enum parameters and
the `activate-command` signal remain typed gtk-rs API rather than commented
generator stubs. The executable consumer compiles these projections on every
Meson developer build.

The small projection fixup restores `Gio.ActionMap` on `AwraWindow`. The GIR
contains the interface, but the pinned generator cannot currently combine
version-conditioned interfaces from Gio and GTK without emitting duplicate
wrapper declarations. The compile-time assertion in the example guards this
relationship. The CI consumer builds the resulting committed output.
