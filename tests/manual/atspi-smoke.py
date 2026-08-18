#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

"""Inspect a mapped Awra application through the external AT-SPI bridge."""

from __future__ import annotations

from collections import Counter
import os
from pathlib import Path
import subprocess
import sys
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi  # noqa: E402


def find_application(needle: str, process_id: int):
    needle = needle.casefold()
    for desktop_index in range(Atspi.get_desktop_count()):
        desktop = Atspi.get_desktop(desktop_index)
        for child_index in range(desktop.get_child_count()):
            application = desktop.get_child_at_index(child_index)
            if (
                application.get_process_id() == process_id
                and needle in (application.get_name() or "").casefold()
            ):
                return application
    return None


def inspect_tree(root) -> tuple[Counter[str], list[tuple[str, str]]]:
    roles: Counter[str] = Counter()
    named: list[tuple[str, str]] = []

    def visit(node, depth: int) -> None:
        role = node.get_role_name()
        name = node.get_name() or ""
        roles[role] += 1
        if name:
            named.append((role, name))
        if depth >= 24:
            return
        for index in range(node.get_child_count()):
            visit(node.get_child_at_index(index), depth + 1)

    visit(root, 0)
    return roles, named


def main() -> int:
    if len(sys.argv) not in {2, 3}:
        raise SystemExit("usage: atspi-smoke.py APPLICATION [AT_SPI_NAME]")

    executable = Path(sys.argv[1]).resolve()
    needle = sys.argv[2] if len(sys.argv) == 3 else executable.name
    environment = os.environ.copy()
    environment["GTK_A11Y"] = "atspi"
    environment["G_DEBUG"] = "fatal-warnings"
    process = subprocess.Popen(
        [str(executable)],
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    summary = ""
    unexpected: list[str] = []
    try:
        application = None
        # Do not ask the registry for the application while GTK is still
        # publishing its cache object; AT-SPI otherwise emits a harmless
        # GetItems race before the first poll.
        time.sleep(0.5)
        for _ in range(50):
            if process.poll() is not None:
                break
            application = find_application(needle, process.pid)
            if application is not None and application.get_child_count() > 0:
                break
            time.sleep(0.1)
        if application is None:
            raise RuntimeError(f"{needle!r} did not appear on AT-SPI")

        # The application object may precede its cache population by one D-Bus
        # round trip. Let that transaction settle before walking descendants.
        time.sleep(0.3)
        roles, named = inspect_tree(application)
        required = {"frame", "button", "label"}
        missing = required.difference(roles)
        if missing:
            raise RuntimeError(f"AT-SPI roles missing: {sorted(missing)}")
        if len(named) < 12:
            raise RuntimeError(
                f"AT-SPI exposed only {len(named)} named nodes"
            )
        summary = (
            "AT-SPI bridge passed: "
            f"{sum(roles.values())} nodes, {len(named)} named, "
            f"roles={dict(sorted(roles.items()))}"
        )
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            stdout, stderr = process.communicate(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
        unexpected = [
            line
            for line in (stdout + "\n" + stderr).splitlines()
            if any(
                word in line.casefold()
                for word in ("warning", "critical", "protocol error")
            )
        ]
    if unexpected:
        print("\n".join(unexpected), file=sys.stderr)
        return 1
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
