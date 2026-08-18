/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <awra/awra-metric-row.h>
G_BEGIN_DECLS
#define AWRA_TYPE_METADATA_GROUP (awra_metadata_group_get_type ())
G_DECLARE_FINAL_TYPE (AwraMetadataGroup, awra_metadata_group, AWRA, METADATA_GROUP, GtkWidget)
GtkWidget     *awra_metadata_group_new          (void);
const char    *awra_metadata_group_get_title    (AwraMetadataGroup *self);
void           awra_metadata_group_set_title    (AwraMetadataGroup *self, const char *title);
/**
 * awra_metadata_group_append:
 * Returns: (transfer none): the newly appended metric row
 */
AwraMetricRow *awra_metadata_group_append       (AwraMetadataGroup *self,
                                                 const char        *label,
                                                 const char        *value);
void           awra_metadata_group_append_row   (AwraMetadataGroup *self,
                                                 AwraMetricRow     *row);
void           awra_metadata_group_remove_row   (AwraMetadataGroup *self,
                                                 AwraMetricRow     *row);
guint          awra_metadata_group_get_n_rows   (AwraMetadataGroup *self);
/**
 * awra_metadata_group_get_row:
 * Returns: (transfer none) (nullable): the row at @position
 */
AwraMetricRow *awra_metadata_group_get_row      (AwraMetadataGroup *self,
                                                 guint              position);
G_END_DECLS
