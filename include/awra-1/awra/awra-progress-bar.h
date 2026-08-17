/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_PROGRESS_BAR (awra_progress_bar_get_type ())
G_DECLARE_FINAL_TYPE (AwraProgressBar, awra_progress_bar, AWRA, PROGRESS_BAR, GtkWidget)

GtkWidget      *awra_progress_bar_new           (void);
double          awra_progress_bar_get_fraction  (AwraProgressBar *self);
void            awra_progress_bar_set_fraction  (AwraProgressBar *self,
                                                  double           fraction);
const char     *awra_progress_bar_get_text      (AwraProgressBar *self);
void            awra_progress_bar_set_text      (AwraProgressBar *self,
                                                  const char      *text);
gboolean        awra_progress_bar_get_show_text (AwraProgressBar *self);
void            awra_progress_bar_set_show_text (AwraProgressBar *self,
                                                  gboolean         show_text);
/**
 * awra_progress_bar_get_delegate:
 * @self: an Awra progress bar
 *
 * Returns: (transfer none): the underlying GTK progress bar
 */
GtkProgressBar *awra_progress_bar_get_delegate  (AwraProgressBar *self);

G_END_DECLS
