#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: install-generated-docs.py SOURCE RELATIVE_DEST")
    source = Path(sys.argv[1])
    prefix = Path(os.environ["MESON_INSTALL_DESTDIR_PREFIX"])
    destination = prefix / sys.argv[2]
    shutil.copytree(source, destination, dirs_exist_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
