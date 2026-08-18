#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Give every copied distribution entry one reproducible modification time."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path


def source_epoch() -> int:
    configured = os.environ.get("SOURCE_DATE_EPOCH")
    if configured is not None:
        return int(configured)

    source_root = os.environ["MESON_SOURCE_ROOT"]
    value = subprocess.check_output(
        ["git", "-C", source_root, "log", "-1", "--format=%ct"],
        text=True,
    )
    return int(value.strip())


def main() -> int:
    root = Path(os.environ["MESON_PROJECT_DIST_ROOT"])
    timestamp = source_epoch()

    # Children precede their parents so updating a child cannot change the
    # final directory timestamp after it has been normalized.
    entries = sorted(root.rglob("*"), key=lambda path: len(path.parts), reverse=True)
    entries.append(root)
    for path in entries:
        os.utime(path, (timestamp, timestamp), follow_symlinks=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
