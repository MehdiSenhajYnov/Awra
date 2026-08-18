#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Reject incomplete committed output from the safe Rust GIR projection."""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: test-rust-projection.py PATH/TO/awra")

    root = Path(sys.argv[1])
    generated = root / "src" / "auto"
    forbidden = ("TODO: call ffi:", "Unsupported or ignored")
    failures: list[str] = []

    for path in sorted(generated.glob("*.rs")):
        source = path.read_text(encoding="utf-8")
        if any(marker in source for marker in forbidden):
            failures.append(path.name)

    window = (generated / "window.rs").read_text(encoding="utf-8")
    if "gio::ActionMap" not in window:
        failures.append("window.rs (missing Gio.ActionMap projection)")

    if failures:
        print("incomplete safe Rust projection: " + ", ".join(failures), file=sys.stderr)
        return 1

    print("safe Rust projection: complete; no unsupported generated stubs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
