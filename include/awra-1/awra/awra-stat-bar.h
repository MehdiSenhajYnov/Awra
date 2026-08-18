/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_STAT_BAR (awra_stat_bar_get_type ())
G_DECLARE_FINAL_TYPE (AwraStatBar, awra_stat_bar, AWRA, STAT_BAR, GtkWidget)
GtkWidget  *awra_stat_bar_new       (const char  *label);
const char *awra_stat_bar_get_label (AwraStatBar *self);
void        awra_stat_bar_set_label (AwraStatBar *self, const char *label);
double      awra_stat_bar_get_value (AwraStatBar *self);
void        awra_stat_bar_set_value (AwraStatBar *self, double value);
double      awra_stat_bar_get_maximum (AwraStatBar *self);
void        awra_stat_bar_set_maximum (AwraStatBar *self, double maximum);
gboolean    awra_stat_bar_get_show_value (AwraStatBar *self);
void        awra_stat_bar_set_show_value (AwraStatBar *self, gboolean show_value);
G_END_DECLS
