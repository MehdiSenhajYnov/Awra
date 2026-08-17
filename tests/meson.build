# SPDX-License-Identifier: LGPL-2.1-or-later

unit_material = executable(
  'test-material',
  'unit/test-material.c',
  dependencies: awra_dep,
  include_directories: inc_private,
)
test('material-matrix', unit_material)

widget_basics = executable(
  'test-widgets',
  'widget/test-widgets.c',
  dependencies: awra_dep,
  include_directories: inc_private,
)
test('widget-basics', widget_basics, is_parallel: false)

fallback_context = executable(
  'test-fallback-context',
  'integration/test-fallback-context.c',
  dependencies: awra_dep,
)
test(
  'generic-fallback',
  fallback_context,
  env: ['AWRA_FORCE_FALLBACK=1'],
)

native_lifecycle = executable(
  'test-native-lifecycle',
  'integration/test-native-lifecycle.c',
  dependencies: awra_dep,
)
test('native-lifecycle', native_lifecycle, is_parallel: false)

visual_render = executable(
  'test-render',
  'visual/test-render.c',
  dependencies: awra_dep,
)
test(
  'visual-render',
  visual_render,
  env: ['AWRA_FORCE_FALLBACK=1'],
  is_parallel: false,
)
