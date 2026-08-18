/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_METRIC_ROW (awra_metric_row_get_type ())
G_DECLARE_FINAL_TYPE (AwraMetricRow, awra_metric_row, AWRA, METRIC_ROW, GtkWidget)
GtkWidget  *awra_metric_row_new           (const char    *label,
                                           const char    *value);
const char *awra_metric_row_get_label     (AwraMetricRow *self);
void        awra_metric_row_set_label     (AwraMetricRow *self,
                                           const char    *label);
const char *awra_metric_row_get_value     (AwraMetricRow *self);
void        awra_metric_row_set_value     (AwraMetricRow *self,
                                           const char    *value);
const char *awra_metric_row_get_icon_name (AwraMetricRow *self);
void        awra_metric_row_set_icon_name (AwraMetricRow *self,
                                           const char    *icon_name);
G_END_DECLS
