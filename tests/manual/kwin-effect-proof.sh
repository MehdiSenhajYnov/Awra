#!/usr/bin/env bash
# SPDX-License-Identifier: LGPL-2.1-or-later

set -eu

awra_showcase=${AWRA_SHOWCASE:-./build/showcase/awra-showcase}
awra_initial_better=0
awra_initial_blur=0

is_loaded() {
  gdbus call --session \
    --dest org.kde.KWin \
    --object-path /Effects \
    --method org.kde.kwin.Effects.isEffectLoaded "$1" | rg -q 'true'
}

load_effect() {
  gdbus call --session \
    --dest org.kde.KWin \
    --object-path /Effects \
    --method org.kde.kwin.Effects.loadEffect "$1"
}

unload_effect() {
  gdbus call --session \
    --dest org.kde.KWin \
    --object-path /Effects \
    --method org.kde.kwin.Effects.unloadEffect "$1" >/dev/null
}

restore_effects() {
  if [ "$awra_initial_better" -eq 1 ]; then
    load_effect better_blur_dx >/dev/null
  else
    unload_effect better_blur_dx
  fi

  if [ "$awra_initial_blur" -eq 1 ]; then
    load_effect blur >/dev/null
  else
    unload_effect blur
  fi
}

probe_showcase() {
  set +e
  awra_output=$(timeout --signal=TERM 3s "$awra_showcase" 2>&1)
  awra_status=$?
  set -e

  if [ "$awra_status" -ne 0 ] && [ "$awra_status" -ne 124 ]; then
    printf '%s\n' "$awra_output"
    return "$awra_status"
  fi
  awra_unexpected=$(printf '%s\n' "$awra_output" |
    rg -v 'Gtk-WARNING .*GtkImage .*reported baselines.*Baselines must be inside' |
    rg -i 'warning|critical|protocol error' || true)
  if [ -n "$awra_unexpected" ]; then
    printf '%s\n' "$awra_unexpected"
    return 1
  fi
  printf '%s\n' "$awra_output" | rg 'Effect backend:'
}

if is_loaded better_blur_dx; then awra_initial_better=1; fi
if is_loaded blur; then awra_initial_blur=1; fi
trap restore_effects EXIT INT TERM

printf 'initial better_blur_dx=%s blur=%s\n' \
  "$awra_initial_better" "$awra_initial_blur"

unload_effect better_blur_dx
load_effect blur
printf '%s\n' 'built-in blur only:'
probe_showcase

unload_effect blur
printf '%s\n' 'no blur effect loaded:'
probe_showcase

restore_effects
trap - EXIT INT TERM

awra_final_better=0
awra_final_blur=0
if is_loaded better_blur_dx; then awra_final_better=1; fi
if is_loaded blur; then awra_final_blur=1; fi
printf 'restored better_blur_dx=%s blur=%s\n' \
  "$awra_final_better" "$awra_final_blur"
test "$awra_final_better" -eq "$awra_initial_better"
test "$awra_final_blur" -eq "$awra_initial_blur"
