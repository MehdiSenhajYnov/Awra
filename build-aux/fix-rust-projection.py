#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Apply the documented gtk-rs/gir projection fixups for Awra.

GIR correctly records that AwraWindow implements Gio.ActionMap.  The pinned
gir release cannot combine version-conditioned interfaces from two external
namespaces and emits duplicate wrapper declarations when Gio.ActionMap is put
in the manual type list.  Keep the generator output otherwise untouched and
restore that inherited interface deterministically here.
"""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: fix-rust-projection.py PATH/TO/awra")

    root = Path(sys.argv[1])
    window = root / "src" / "auto" / "window.rs"
    source = window.read_text(encoding="utf-8")
    if "gio::ActionMap" not in source:
        needle = "gio::ActionGroup;"
        replacement = "gio::ActionGroup, gio::ActionMap;"
        occurrences = source.count(needle)
        if occurrences != 2:
            raise RuntimeError(
                f"expected two AwraWindow wrapper variants, found {occurrences}"
            )
        window.write_text(source.replace(needle, replacement), encoding="utf-8")

    forbidden = ("TODO: call ffi:", "Unsupported or ignored")
    failures: list[str] = []
    for path in sorted((root / "src" / "auto").glob("*.rs")):
        generated = path.read_text(encoding="utf-8")
        if any(marker in generated for marker in forbidden):
            failures.append(path.name)
    if failures:
        joined = ", ".join(failures)
        raise RuntimeError(
            "the safe Rust projection still contains unsupported stubs in " + joined
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
