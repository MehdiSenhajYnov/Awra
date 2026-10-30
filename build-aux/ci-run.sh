#!/usr/bin/env bash
# SPDX-License-Identifier: LGPL-2.1-or-later
#
# Runs one CI step. When it fails, its error lines are repeated as a GitHub
# annotation, which anyone can read on the run page (and through the API)
# without opening, or being allowed to download, the full log.

set -uo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 COMMAND [ARGS...]" >&2
  exit 2
fi

log=$(mktemp)
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [[ $status -ne 0 && -n "${GITHUB_ACTIONS:-}" ]]; then
  # Command lines and desktop-portal or D-Bus chatter would fill the
  # annotation (GitHub cuts it short) without saying what failed.
  summary=$(grep -A 4 -E 'error|Error|ERROR|FAIL|not ok|assertion|CRITICAL|WARNING \*\*|Bail out|undefined reference|No such file' "$log" |
            grep -vE '^\s*$|^--$|xdg-desktop-portal|dbus-daemon|fuse init|cannot open display|RealtimeKit|^>>> ' |
            awk 'length($0) <= 400' | tail -n 60)
  [[ -n "$summary" ]] || summary=$(tail -n 40 "$log")
  # Annotations take one line: encode the newlines and percent signs.
  summary=${summary//'%'/'%25'}
  summary=${summary//$'\r'/}
  (( ${#summary} <= 3500 )) || summary=${summary: -3500}
  summary=${summary//$'\n'/'%0A'}
  printf '::error title=%s failed::%s\n' "$1" "$summary"
fi
rm -f "$log"
exit "$status"
