# SPDX-License-Identifier: LGPL-2.1-or-later

i18n.gettext(
  'awra-1',
  args: ['--from-code=UTF-8'],
  preset: 'glib',
)

# `meson devenv` and uninstalled consumers read the catalogs from the build tree.
po_devenv = environment()
po_devenv.set('AWRA_LOCALEDIR', meson.current_build_dir())
meson.add_devenv(po_devenv)
