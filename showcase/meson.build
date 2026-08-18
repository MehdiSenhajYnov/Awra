# SPDX-License-Identifier: LGPL-2.1-or-later

awra_showcase = executable(
  'awra-showcase',
  'main.c',
  dependencies: awra_dep,
  install: true,
)

test(
  'showcase-smoke',
  awra_showcase,
  env: [
    'AWRA_FORCE_FALLBACK=1',
    'AWRA_SHOWCASE_SMOKE_TEST=1',
    'GTK_A11Y=none',
    'G_DEBUG=fatal-warnings',
  ],
  is_parallel: false,
)
