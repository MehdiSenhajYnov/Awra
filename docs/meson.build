# SPDX-License-Identifier: LGPL-2.1-or-later

subdir('guides')

install_subdir(
  'api',
  install_dir: get_option('datadir') / 'doc' / 'awra-1',
)
install_subdir(
  'architecture',
  install_dir: get_option('datadir') / 'doc' / 'awra-1',
)
install_subdir(
  'guides',
  install_dir: get_option('datadir') / 'doc' / 'awra-1',
  exclude_files: ['meson.build'],
)

gi_docgen = find_program('gi-docgen', required: false)
if gi_docgen.found() and gir.length() > 0
  api_reference_dir = meson.current_build_dir() / 'reference'
  api_reference = custom_target(
    'awra-api-reference',
    input: gir[0],
    output: 'awra-api-reference.stamp',
    command: [
      python,
      files('../build-aux/generate-api-docs.py'),
      gi_docgen,
      files('awra.toml'),
      api_reference_dir,
      '@INPUT@',
      '@OUTPUT@',
    ],
    build_by_default: true,
  )
  test(
    'api-documentation',
    python,
    args: [
      files('../tests/api/test-generated-docs.py'),
      gir[0],
      api_reference_dir / 'index.json',
    ],
    depends: api_reference,
  )
  meson.add_install_script(
    python,
    files('../build-aux/install-generated-docs.py'),
    api_reference_dir,
    get_option('datadir') / 'doc' / 'awra-1' / 'reference',
  )
endif
