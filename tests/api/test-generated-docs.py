#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

from __future__ import annotations

import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


CORE = "http://www.gtk.org/introspection/core/1.0"
DOCUMENTED_TAGS = {
    "bitfield",
    "class",
    "constant",
    "enumeration",
    "function",
    "interface",
    "record",
    "union",
}


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: test-generated-docs.py GIR INDEX_JSON")
    root = ET.parse(sys.argv[1]).getroot()
    namespace = root.find(f"{{{CORE}}}namespace")
    if namespace is None:
        raise RuntimeError("GIR contains no namespace")
    expected: set[tuple[str, str]] = set()
    for child in namespace:
        tag = child.tag.rsplit("}", 1)[-1]
        name = child.get("name")
        if tag not in DOCUMENTED_TAGS or name is None:
            continue
        if tag == "record" and any(
            key.endswith("is-gtype-struct-for") for key in child.attrib
        ):
            continue
        moved_to = child.get("moved-to")
        if tag == "function" and moved_to:
            expected.add(("type_func", moved_to.rsplit(".", 1)[-1]))
        else:
            expected.add((tag, name))
    index = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
    type_aliases = {"enum": "enumeration", "struct": "record"}
    actual = {
        (type_aliases.get(symbol["type"], symbol["type"]), symbol["name"])
        for symbol in index["symbols"]
    }
    missing = sorted(expected - actual)
    if missing:
        raise AssertionError(f"generated API reference is incomplete: {missing}")
    if index["meta"].get("ns") != "Awra" or index["meta"].get("version") != "1.0":
        raise AssertionError("generated API reference has the wrong namespace")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
