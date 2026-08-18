#!/usr/bin/env bash
# SPDX-License-Identifier: LGPL-2.1-or-later

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 BUILD_DIR" >&2
  exit 2
fi

build_dir=$(realpath "$1")
source_dir=$(realpath "$(dirname "$0")/..")
stage=$(mktemp -d -t awra-install-gate-XXXXXX)
trap 'rm -rf -- "$stage"' EXIT INT TERM

DESTDIR="$stage" meson install -C "$build_dir" --no-rebuild >/dev/null
pc_file=$(find "$stage" -type f -name awra-1.pc -print -quit)
library=$(find "$stage" -type f -name 'libawra-1.so.*.*.*' -print -quit)
typelib=$(find "$stage" -type f -name Awra-1.0.typelib -print -quit)
vapi=$(find "$stage" -type f -name awra-1.vapi -print -quit)
docs=$(find "$stage" -type f -path '*/doc/awra-1/architecture/foundations.md' -print -quit)
desktop=$(find "$stage" -type f -name org.awra.Showcase.desktop -print -quit)

test -n "$pc_file"
test -n "$library"
test -n "$typelib"
test -n "$vapi"
test -n "$docs"
test -n "$desktop"

export PKG_CONFIG_PATH="$(dirname "$pc_file")"
export LD_LIBRARY_PATH="$(dirname "$library")"
export GI_TYPELIB_PATH="$(dirname "$typelib")"
export XDG_DATA_DIRS="$(dirname "$(dirname "$(dirname "$vapi")")"):${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"

stage_prefix=$(realpath "$(dirname "$pc_file")/../..")
test "$(pkg-config --modversion awra-1)" = "1.0.0"
cc "$source_dir/tests/integration/external-smoke.c" \
  -I"$stage_prefix/include/awra-1" -L"$(dirname "$library")" -lawra-1 \
  $(pkg-config --cflags --libs gtk4) \
  -o "$stage/external-smoke-c"
"$stage/external-smoke-c"

python3 "$source_dir/tests/integration/external-smoke.py"

vapi_dir=$(dirname "$vapi")
valac --vapidir="$vapi_dir" --pkg=gtk4 --pkg=awra-1 \
  -X "-I$stage_prefix/include/awra-1" \
  -X "-L$(dirname "$library")" -X -lawra-1 \
  "$source_dir/tests/integration/external-smoke.vala" \
  -o "$stage/external-smoke-vala"
"$stage/external-smoke-vala"

if ldd "$library" | grep -qi adwaita; then
  echo "libawra unexpectedly depends on libadwaita" >&2
  exit 1
fi

echo "Awra clean-install gate passed: C, Python/GI, Vala, pkg-config and no libadwaita"
