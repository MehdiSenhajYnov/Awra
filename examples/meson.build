# SPDX-License-Identifier: LGPL-2.1-or-later

c_page_example = executable(
  'awra-page-example-c',
  'page-example.c',
  dependencies: awra_dep,
)
test(
  'example-c-page',
  c_page_example,
  env: ['AWRA_EXAMPLE_SMOKE=1', 'AWRA_FORCE_FALLBACK=1'],
  is_parallel: false,
)

if gir.length() > 0
  test(
    'example-python-settings',
    python,
    args: files('settings-example.py'),
    env: [
      'AWRA_EXAMPLE_SMOKE=1',
      'AWRA_FORCE_FALLBACK=1',
      'GI_TYPELIB_PATH=' + meson.project_build_root(),
      'LD_LIBRARY_PATH=' + meson.project_build_root(),
    ],
    depends: gir,
    is_parallel: false,
  )
endif

if vala_available and have_awra_vapi
  vala_navigation_example = executable(
    'awra-navigation-example-vala',
    'navigation-example.vala',
    dependencies: [awra_dep, awra_vapi],
    c_args: ['-Wno-unused-parameter', '-Wno-cast-function-type'],
  )
  test(
    'example-vala-navigation',
    vala_navigation_example,
    env: ['AWRA_EXAMPLE_SMOKE=1', 'AWRA_FORCE_FALLBACK=1'],
    is_parallel: false,
  )
endif

install_data(
  'page-example.c',
  'settings-example.py',
  'navigation-example.vala',
  install_dir: get_option('datadir') / 'doc' / 'awra-1' / 'examples',
)
