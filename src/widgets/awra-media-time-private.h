/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <glib.h>
#include <math.h>

G_BEGIN_DECLS

/* Formats a media time as m:ss, or h:mm:ss from one hour. Negative and
 * non-finite values format as 0:00. */
static inline char *
awra_media_format_time (double seconds)
{
  gint64 total;

  if (!isfinite (seconds) || seconds < 0.0)
    seconds = 0.0;
  total = (gint64) floor (seconds);
  if (total >= 3600)
    return g_strdup_printf ("%" G_GINT64_FORMAT ":%02d:%02d", total / 3600,
                            (int) ((total / 60) % 60), (int) (total % 60));
  return g_strdup_printf ("%" G_GINT64_FORMAT ":%02d", total / 60,
                          (int) (total % 60));
}

G_END_DECLS
