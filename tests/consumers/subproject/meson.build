# SPDX-License-Identifier: LGPL-2.1-or-later

project('awra-subproject-consumer', 'c', default_options: ['c_std=c17'])

awra = dependency('awra-1', fallback: ['awra', 'awra_dep'])
executable('awra-subproject-consumer', 'main.c', dependencies: awra)
