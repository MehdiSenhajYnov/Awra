#!/usr/bin/env bash
# SPDX-License-Identifier: LGPL-2.1-or-later

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 BUILD_DIR" >&2
  exit 2
fi

sanitize_build=$1
CC=clang meson setup "$sanitize_build" \
  -Dintrospection=disabled \
  -Ddeveloper=true \
  -Db_sanitize=address,undefined \
  -Db_lundef=false
meson compile -C "$sanitize_build"
ASAN_OPTIONS=detect_leaks=0:halt_on_error=1 \
UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1 \
G_DEBUG=fatal-warnings \
AWRA_STRESS_ITERATIONS=200 \
meson test -C "$sanitize_build" --print-errorlogs
