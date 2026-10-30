#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Compare the complete non-documentation GIR surface with a contract.

By default the GIR must match the baseline exactly (the current contract,
tests/api/awra-api.json). With --compatible it must only extend it: every
element of the baseline (the frozen tests/api/awra-1.0-api.json) is still
there, unchanged; new elements may be added, and existing ones may gain
attributes such as a version. Differences are listed by path.
"""

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


# Signatures are compared whole: a changed parameter, return value or type
# is a change even in --compatible mode.
WHOLE = {
    "parameters", "parameter", "instance-parameter", "return-value",
    "type", "array", "varargs", "member", "field",
}


# Named after the platform's library file, not part of the API.
PLATFORM_ATTRIBUTES = {"shared-library"}

# Their values follow the release.
VERSION_CONSTANTS = {"MAJOR_VERSION", "MINOR_VERSION", "MICRO_VERSION", "VERSION_S"}


def key(node: dict[str, object]) -> tuple[str, str, str]:
    attributes = node.get("attributes", {})
    return (
        str(node["tag"]),
        str(attributes.get("name", "")),
        str(attributes.get("identifier", "")),
    )


def label(node: dict[str, object]) -> str:
    attributes = node.get("attributes", {})
    return f"{node['tag']}:{attributes.get('identifier') or attributes.get('name', '')}"


def compare(
    old: dict[str, object],
    new: dict[str, object],
    path: str,
    compatible: bool,
    problems: list[str],
) -> None:
    old_attributes = old.get("attributes", {})
    new_attributes = new.get("attributes", {})
    for name in sorted(set(old_attributes) | set(new_attributes)):
        before, after = old_attributes.get(name), new_attributes.get(name)
        if name in PLATFORM_ATTRIBUTES:
            continue
        if (compatible and old["tag"] == "constant" and name == "value" and
                old_attributes.get("name") in VERSION_CONSTANTS):
            continue
        if before != after and not (compatible and before is None):
            problems.append(f"{path} @{name}: {before!r} -> {after!r}")
    if old["tag"] in WHOLE and compatible:
        if old.get("children") != new.get("children"):
            problems.append(f"{path}: signature changed")
        return
    remaining: dict[tuple[str, str, str], list[dict[str, object]]] = {}
    for child in new.get("children", []):
        remaining.setdefault(key(child), []).append(child)
    for child in old.get("children", []):
        candidates = remaining.get(key(child))
        child_path = f"{path}/{label(child)}"
        if not candidates:
            problems.append(f"{child_path}: removed")
            continue
        compare(child, candidates.pop(0), child_path, compatible, problems)
    if not compatible:
        for children in remaining.values():
            for child in children:
                problems.append(f"{path}/{label(child)}: added")


def main() -> int:
    args = sys.argv[1:]
    compatible = "--compatible" in args
    update = "--update" in args
    args = [arg for arg in args if arg not in ("--compatible", "--update")]
    if len(args) != 2 or (compatible and update):
        raise SystemExit(
            "usage: test-api-baseline.py GIR BASELINE [--update | --compatible]"
        )
    gir = Path(args[0])
    baseline = Path(args[1])
    current = contract(gir)
    rendered = json.dumps(current, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
    if update:
        baseline.write_text(rendered, encoding="utf-8")
        return 0
    expected = json.loads(baseline.read_text(encoding="utf-8"))
    if current == expected:
        return 0
    problems: list[str] = []
    compare(expected, current, "Awra", compatible, problems)
    if not problems:
        return 0
    shown = "\n".join(problems[:80])
    more = f"\n... and {len(problems) - 80} more" if len(problems) > 80 else ""
    if compatible:
        raise AssertionError(
            f"the public API is no longer compatible with {baseline.name}:\n{shown}{more}"
        )
    raise AssertionError(
        "the public API changed; review the differences and update the "
        f"baseline with --update only for a compatible addition:\n{shown}{more}"
    )


if __name__ == "__main__":
    raise SystemExit(main())
