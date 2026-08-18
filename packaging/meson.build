# SPDX-License-Identifier: LGPL-2.1-or-later

install_data(
  'org.awra.Showcase.desktop',
  install_dir: get_option('datadir') / 'applications',
)
install_data(
  'org.awra.Showcase.metainfo.xml',
  install_dir: get_option('datadir') / 'metainfo',
)
install_data(
  'org.awra.Showcase.svg',
  install_dir: get_option('datadir') / 'icons/hicolor/scalable/apps',
)

desktop_file_validate = find_program('desktop-file-validate', required: false)
if desktop_file_validate.found()
  test('desktop-file-validation', desktop_file_validate,
       args: files('org.awra.Showcase.desktop'))
endif

appstreamcli = find_program('appstreamcli', required: false)
if appstreamcli.found()
  test('appstream-validation', appstreamcli,
       args: ['validate', '--no-net', files('org.awra.Showcase.metainfo.xml')])
endif
