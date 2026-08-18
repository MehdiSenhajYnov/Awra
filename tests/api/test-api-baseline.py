#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Compare the complete non-documentation GIR surface with the 1.0 contract."""

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


CORE = "http://www.gtk.org/introspection/core/1.0"
IGNORED_TAGS = {
    f"{{{CORE}}}doc",
    f"{{{CORE}}}doc-deprecated",
    f"{{{CORE}}}source-position",
}


def local_name(value: str) -> str:
    return value.rsplit("}", 1)[-1]


def canonical(node: ET.Element) -> dict[str, object]:
    attributes = {
        local_name(key): value
        for key, value in sorted(node.attrib.items(), key=lambda item: local_name(item[0]))
    }
    children = [canonical(child) for child in node if child.tag not in IGNORED_TAGS]
    if local_name(node.tag) != "parameters":
        children.sort(
            key=lambda child: (
                str(child["tag"]),
                str(child["attributes"].get("name", "")),
                str(child["attributes"].get("identifier", "")),
                json.dumps(child, sort_keys=True, ensure_ascii=False),
            )
        )
    result: dict[str, object] = {"tag": local_name(node.tag)}
    if attributes:
        result["attributes"] = attributes
    else:
        result["attributes"] = {}
    if children:
        result["children"] = children
    return result


def contract(path: Path) -> dict[str, object]:
    root = ET.parse(path).getroot()
    namespace = root.find(f"{{{CORE}}}namespace")
    if namespace is None:
        raise RuntimeError("GIR contains no namespace")
    return canonical(namespace)


def main() -> int:
    if len(sys.argv) not in (3, 4):
        raise SystemExit("usage: test-api-baseline.py GIR BASELINE [--update]")
    gir = Path(sys.argv[1])
    baseline = Path(sys.argv[2])
    current = contract(gir)
    rendered = json.dumps(current, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    if len(sys.argv) == 4:
        if sys.argv[3] != "--update":
            raise SystemExit(f"unknown option: {sys.argv[3]}")
        baseline.write_text(rendered, encoding="utf-8")
        return 0
    expected = baseline.read_text(encoding="utf-8")
    if current != json.loads(expected):
        raise AssertionError(
            "Awra-1.0 public API changed; inspect the GIR diff and update the "
            "baseline only for a compatible, reviewed API addition"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
