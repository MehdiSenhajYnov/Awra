/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <glib.h>

G_BEGIN_DECLS

#define AWRA_MAJOR_VERSION (1)
#define AWRA_MINOR_VERSION (0)
#define AWRA_MICRO_VERSION (0)
#define AWRA_VERSION_S "1.0.0"

guint       awra_get_major_version (void) G_GNUC_CONST;
guint       awra_get_minor_version (void) G_GNUC_CONST;
guint       awra_get_micro_version (void) G_GNUC_CONST;
const char *awra_get_version       (void) G_GNUC_CONST;

G_END_DECLS
