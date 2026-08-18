<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Experimental Rust consumer

This permanent smoke consumer is intentionally smaller than the future
official gtk-rs bindings. It compiles against the C ABI, owns returned GObjects
with gtk-rs translation traits, and inspects the generated GIR for the shapes
that must eventually become `Option<T>`, owned objects and string slices.

It belongs to the early API gate: every newly stabilised family should add one
representative call here before the generated bindings become the supported
Rust surface in Phase D.
