/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-motion.h>

guint
awra_motion_get_duration (AwraStyleManager *manager,
                          AwraMotionPreset  preset)
{
  static const guint durations[] = { 0, 120, 220, 360 };

  g_return_val_if_fail (AWRA_IS_STYLE_MANAGER (manager), 0);
  g_return_val_if_fail (preset >= AWRA_MOTION_PRESET_INSTANT &&
                        preset <= AWRA_MOTION_PRESET_SLOW,
                        0);

  if (awra_style_manager_get_reduced_motion (manager))
    return 0;
  return durations[preset];
}

double
awra_motion_ease_out_cubic (double progress)
{
  double inverse;

  progress = CLAMP (progress, 0.0, 1.0);
  inverse = 1.0 - progress;
  return 1.0 - inverse * inverse * inverse;
}

double
awra_motion_ease_in_out_cubic (double progress)
{
  progress = CLAMP (progress, 0.0, 1.0);
  if (progress < 0.5)
    return 4.0 * progress * progress * progress;
  return 1.0 - ((-2.0 * progress + 2.0) *
                (-2.0 * progress + 2.0) *
                (-2.0 * progress + 2.0)) / 2.0;
}
