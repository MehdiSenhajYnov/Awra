/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <glib.h>

G_BEGIN_DECLS

#define AWRA_MAJOR_VERSION (1)
#define AWRA_MINOR_VERSION (1)
#define AWRA_MICRO_VERSION (0)
#define AWRA_VERSION_S "1.1.0"

/**
 * AWRA_CHECK_VERSION:
 * @major: the major version required
 * @minor: the minor version required
 * @micro: the micro version required
 *
 * Whether the Awra headers being compiled against are at least version
 * @major.@minor.@micro, to use API added in a later release.
 *
 * Since: 1.1
 */
#define AWRA_CHECK_VERSION(major, minor, micro)                              \
  (AWRA_MAJOR_VERSION > (major) ||                                           \
   (AWRA_MAJOR_VERSION == (major) && AWRA_MINOR_VERSION > (minor)) ||        \
   (AWRA_MAJOR_VERSION == (major) && AWRA_MINOR_VERSION == (minor) &&        \
    AWRA_MICRO_VERSION >= (micro)))

guint       awra_get_major_version (void) G_GNUC_CONST;
guint       awra_get_minor_version (void) G_GNUC_CONST;
guint       awra_get_micro_version (void) G_GNUC_CONST;
const char *awra_get_version       (void) G_GNUC_CONST;

G_END_DECLS
