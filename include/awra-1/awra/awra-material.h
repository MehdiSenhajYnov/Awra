/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-enums.h>

G_BEGIN_DECLS

#define AWRA_TYPE_MATERIAL (awra_material_get_type ())
G_DECLARE_FINAL_TYPE (AwraMaterial, awra_material, AWRA, MATERIAL, GObject)

AwraMaterial    *awra_material_new_solid       (void);
AwraMaterial    *awra_material_new_translucent (void);
AwraMaterial    *awra_material_new_frosted     (void);
AwraMaterial    *awra_material_new_for_preset  (AwraMaterialPreset preset);
AwraMaterialKind awra_material_get_kind        (AwraMaterial *self);
AwraMaterialPreset awra_material_get_preset    (AwraMaterial *self);
const char      *awra_material_get_name        (AwraMaterial *self);
gboolean         awra_material_requests_blur   (AwraMaterial *self);

G_END_DECLS
