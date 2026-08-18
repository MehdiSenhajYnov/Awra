/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

int
main (void)
{
  g_autoptr (AwraMaterial) material =
    awra_material_new_for_preset (AWRA_MATERIAL_PRESET_CANVAS);

  return awra_material_get_preset (material) == AWRA_MATERIAL_PRESET_CANVAS
           ? 0 : 1;
}
