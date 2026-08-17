/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-style-manager.h>

G_BEGIN_DECLS

guint  awra_motion_get_duration      (AwraStyleManager *manager,
                                      AwraMotionPreset  preset);
double awra_motion_ease_out_cubic    (double            progress);
double awra_motion_ease_in_out_cubic (double            progress);

G_END_DECLS
