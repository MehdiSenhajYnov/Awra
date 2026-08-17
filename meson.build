# SPDX-License-Identifier: LGPL-2.1-or-later

project(
  'awra',
  'c',
  version: '0.1.0',
  license: 'LGPL-2.1-or-later',
  meson_version: '>= 1.3.0',
  default_options: [
    'c_std=c17',
    'warning_level=2',
    'werror=true',
  ],
)

gnome = import('gnome')
pkgconfig = import('pkgconfig')

cc = meson.get_compiler('c')
gtk_dep = dependency('gtk4', version: '>= 4.22.0')
gio_dep = dependency('gio-2.0', version: '>= 2.80')
wayland_dep = dependency(
  'wayland-client',
  required: get_option('wayland-effects'),
)
wayland_scanner = find_program(
  'wayland-scanner',
  required: get_option('wayland-effects'),
)

conf = configuration_data()
conf.set_quoted('AWRA_VERSION', meson.project_version())
conf.set('AWRA_HAVE_WAYLAND_EFFECTS', wayland_dep.found() and wayland_scanner.found())
conf.set('AWRA_DEVELOPER_MODE', get_option('developer'))
configure_file(output: 'awra-config.h', configuration: conf)

add_project_arguments(
  '-DG_LOG_USE_STRUCTURED=1',
  language: 'c',
)

inc_public = include_directories('include/awra-1')
inc_private = include_directories('src', 'src/platform')

public_headers = files(
  'include/awra-1/awra/awra.h',
  'include/awra-1/awra/awra-version.h',
  'include/awra-1/awra/awra-enums.h',
  'include/awra-1/awra/awra-token-set.h',
  'include/awra-1/awra/awra-style-manager.h',
  'include/awra-1/awra/awra-material.h',
  'include/awra-1/awra/awra-diagnostics.h',
  'include/awra-1/awra/awra-context.h',
  'include/awra-1/awra/awra-surface.h',
  'include/awra-1/awra/awra-button.h',
  'include/awra-1/awra/awra-window.h',
  'include/awra-1/awra/awra-popover.h',
  'include/awra-1/awra/awra-menu-button.h',
  'include/awra-1/awra/awra-card.h',
  'include/awra-1/awra/awra-header.h',
  'include/awra-1/awra/awra-sidebar.h',
  'include/awra-1/awra/awra-split-view.h',
  'include/awra-1/awra/awra-toggle-button.h',
  'include/awra-1/awra/awra-entry.h',
  'include/awra-1/awra/awra-search-entry.h',
  'include/awra-1/awra/awra-switch.h',
  'include/awra-1/awra/awra-slider.h',
  'include/awra-1/awra/awra-check-button.h',
  'include/awra-1/awra/awra-spin-button.h',
  'include/awra-1/awra/awra-dropdown.h',
  'include/awra-1/awra/awra-dialog.h',
  'include/awra-1/awra/awra-toast-overlay.h',
  'include/awra-1/awra/awra-navigation-view.h',
  'include/awra-1/awra/awra-motion.h',
  'include/awra-1/awra/awra-badge.h',
  'include/awra-1/awra/awra-progress-bar.h',
  'include/awra-1/awra/awra-segmented-control.h',
  'include/awra-1/awra/awra-tab-view.h',
  'include/awra-1/awra/awra-list-view.h',
  'include/awra-1/awra/awra-inspector.h',
)

awra_sources = files(
  'src/awra-init.c',
  'src/awra-enums.c',
  'src/core/awra-context.c',
  'src/core/awra-style-manager.c',
  'src/tokens/awra-token-set.c',
  'src/material/awra-material.c',
  'src/material/awra-material-resolver.c',
  'src/platform/awra-diagnostics.c',
  'src/platform/awra-effect-coordinator.c',
  'src/platform/generic/awra-generic-effect-backend.c',
  'src/surface/awra-surface.c',
  'src/widgets/awra-button.c',
  'src/application/awra-window.c',
  'src/overlays/awra-popover.c',
  'src/overlays/awra-menu-button.c',
  'src/layout/awra-card.c',
  'src/layout/awra-header.c',
  'src/layout/awra-sidebar.c',
  'src/layout/awra-split-view.c',
  'src/widgets/awra-controls.c',
  'src/widgets/awra-dropdown.c',
  'src/overlays/awra-dialog.c',
  'src/overlays/awra-toast-overlay.c',
  'src/navigation/awra-navigation-view.c',
  'src/motion/awra-motion.c',
  'src/widgets/awra-badge.c',
  'src/widgets/awra-progress-bar.c',
  'src/widgets/awra-segmented-control.c',
  'src/navigation/awra-tab-view.c',
  'src/widgets/awra-list-view.c',
  'src/platform/awra-inspector.c',
)

awra_resources = gnome.compile_resources(
  'awra-resources',
  'resources/awra.gresource.xml',
  source_dir: 'resources',
  c_name: 'awra',
)

awra_deps = [gtk_dep, gio_dep]
if wayland_dep.found() and wayland_scanner.found()
  protocol_xml = files('protocols/ext-background-effect-v1.xml')
  protocol_header = custom_target(
    'ext-background-effect-v1-client-header',
    input: protocol_xml,
    output: 'ext-background-effect-v1-client-protocol.h',
    command: [wayland_scanner, 'client-header', '@INPUT@', '@OUTPUT@'],
  )
  protocol_code = custom_target(
    'ext-background-effect-v1-private-code',
    input: protocol_xml,
    output: 'ext-background-effect-v1-protocol.c',
    command: [wayland_scanner, 'private-code', '@INPUT@', '@OUTPUT@'],
  )
  awra_sources += files('src/platform/wayland/awra-wayland-effect-backend.c')
  awra_sources += [protocol_header, protocol_code]
  awra_deps += wayland_dep
endif

libawra = library(
  'awra-1',
  awra_sources,
  awra_resources,
  version: meson.project_version(),
  soversion: '0',
  dependencies: awra_deps,
  include_directories: [inc_public, inc_private],
  install: true,
)

awra_dep = declare_dependency(
  link_with: libawra,
  include_directories: inc_public,
  dependencies: gtk_dep,
)

install_headers(public_headers, subdir: 'awra-1/awra')

pkgconfig.generate(
  libawra,
  filebase: 'awra-1',
  name: 'Awra',
  description: 'An opinionated GTK 4 desktop UI framework',
  subdirs: 'awra-1',
  requires: ['gtk4 >= 4.22.0'],
)

gir = []
if not get_option('introspection').disabled()
  gir_dep = dependency(
    'gobject-introspection-1.0',
    required: get_option('introspection'),
  )
  if gir_dep.found()
    gir = gnome.generate_gir(
      libawra,
      sources: public_headers,
      namespace: 'Awra',
      nsversion: '1.0',
      identifier_prefix: 'Awra',
      symbol_prefix: 'awra',
      includes: ['Gtk-4.0', 'Gdk-4.0', 'Gio-2.0'],
      header: 'awra/awra.h',
      export_packages: 'awra-1',
      install: true,
      extra_args: ['--warn-all', '--c-include=awra/awra.h'],
    )
    vapigen = find_program('vapigen', required: false)
    if vapigen.found()
      gnome.generate_vapi(
        'awra-1',
        sources: gir[0],
        packages: ['gtk4'],
        install: true,
      )
    endif
  endif
endif

subdir('docs/guides')

if get_option('showcase')
  subdir('showcase')
  subdir('packaging')
endif
subdir('tests')
