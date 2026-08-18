#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Generate the ELF export map from Awra's installed C headers."""

from __future__ import annotations

import re
import sys
from pathlib import Path


def symbols_from_headers(paths: list[Path]) -> set[str]:
    text = "\n".join(path.read_text(encoding="utf-8") for path in paths)
    symbols = set(re.findall(r"\b(awra_[a-z0-9_]+)\s*\(", text))
    for prefix in re.findall(
        r"G_DECLARE_(?:FINAL|DERIVABLE)_TYPE\s*\([^,]+,\s*([a-z0-9_]+)", text
    ):
        symbols.add(f"{prefix}_get_type")
    return symbols


def main() -> int:
    if len(sys.argv) < 3:
        raise SystemExit("usage: generate-version-script.py OUTPUT HEADER...")
    output = Path(sys.argv[1])
    symbols = symbols_from_headers([Path(value) for value in sys.argv[2:]])
    if not symbols:
        raise SystemExit("no Awra API symbols found")
    lines = ["AWRA_0_1 {", "  global:"]
    lines.extend(f"    {symbol};" for symbol in sorted(symbols))
    lines.extend(["  local:", "    *;", "};", ""])
    output.write_text("\n".join(lines), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
