/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

int
main (void)
{
  g_autoptr (AwraMaterial) material = awra_material_new_frosted ();

  return awra_material_get_kind (material) == AWRA_MATERIAL_KIND_FROSTED
           ? 0
           : 1;
}

