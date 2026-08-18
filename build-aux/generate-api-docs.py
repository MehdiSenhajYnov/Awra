#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 6:
        raise SystemExit(
            "usage: generate-api-docs.py GI_DOCGEN CONFIG OUTPUT_DIR GIR STAMP"
        )
    tool, config, output, gir, stamp = sys.argv[1:]
    output_path = Path(output)
    if output_path.exists():
        shutil.rmtree(output_path)
    subprocess.run(
        [
            tool,
            "generate",
            "--fatal-warnings",
            "-C",
            config,
            "--output-dir",
            output,
            "--no-namespace-dir",
            gir,
        ],
        check=True,
    )
    Path(stamp).touch()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
