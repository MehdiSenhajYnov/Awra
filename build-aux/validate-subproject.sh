#!/usr/bin/env bash
# SPDX-License-Identifier: LGPL-2.1-or-later

set -euo pipefail

source_root=$(realpath "$(dirname "$0")/..")
fixture_root=$(mktemp -d -t awra-subproject-gate-XXXXXX)
trap 'rm -rf -- "$fixture_root"' EXIT INT TERM

mkdir -p "$fixture_root/subprojects"
cp "$source_root/tests/consumers/subproject/meson.build" "$fixture_root/meson.build"
cp "$source_root/tests/consumers/subproject/main.c" "$fixture_root/main.c"
ln -s "$source_root" "$fixture_root/subprojects/awra"

meson setup "$fixture_root/build" "$fixture_root" \
  -Dawra:tests=false \
  -Dawra:showcase=false \
  -Dawra:examples=false \
  -Dawra:developer=false \
  -Dawra:introspection=disabled
meson compile -C "$fixture_root/build"
"$fixture_root/build/awra-subproject-consumer"
echo "Awra Meson subproject gate passed"
