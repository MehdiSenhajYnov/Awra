#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Reject framework bypasses in reference applications and examples."""

from pathlib import Path
import re
import sys

PATTERNS = {
    "private Awra header/source": re.compile(r"#\s*include\s*[<\"][^>\"]*(?:private|src/)[^>\"]*[>\"]"),
    "application CSS provider": re.compile(r"GtkCssProvider|gtk_css_provider|gtk_style_context_add_provider"),
    "direct Wayland API": re.compile(r"\b(?:gdk_wayland_|wl_(?:display|surface|registry|proxy|region)_)"),
    "direct KWin API": re.compile(r"org_kde_kwin|org\.kde\.KWin", re.IGNORECASE),
    "libadwaita API": re.compile(r"#\s*include\s*[<\"]adwaita\.h|\badw_[a-z]"),
}


def sources(root: Path):
    if root.is_file():
        yield root
        return
    for path in root.rglob("*"):
        if path.is_file() and path.suffix in {".c", ".h", ".vala", ".py", ".rs", ".blp"}:
            yield path


def main() -> int:
    failures: list[str] = []
    for raw in sys.argv[1:]:
        root = Path(raw)
        if not root.exists():
            continue
        css_files = list(root.rglob("*.css")) if root.is_dir() else []
        failures.extend(f"{path}: application-local CSS file" for path in css_files)
        for path in sources(root):
            text = path.read_text(encoding="utf-8")
            for label, pattern in PATTERNS.items():
                for match in pattern.finditer(text):
                    line = text.count("\n", 0, match.start()) + 1
                    failures.append(f"{path}:{line}: {label}")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("Public-consumer boundary passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
