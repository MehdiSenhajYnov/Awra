/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <glib-object.h>

G_BEGIN_DECLS

typedef enum {
  AWRA_APPEARANCE_SYSTEM,
  AWRA_APPEARANCE_LIGHT,
  AWRA_APPEARANCE_DARK,
} AwraAppearance;

#define AWRA_TYPE_APPEARANCE (awra_appearance_get_type ())
GType awra_appearance_get_type (void) G_GNUC_CONST;

typedef enum {
  AWRA_MATERIAL_KIND_SOLID,
  AWRA_MATERIAL_KIND_TRANSLUCENT,
  AWRA_MATERIAL_KIND_FROSTED,
  AWRA_MATERIAL_KIND_LIQUID,
} AwraMaterialKind;

#define AWRA_TYPE_MATERIAL_KIND (awra_material_kind_get_type ())
GType awra_material_kind_get_type (void) G_GNUC_CONST;

typedef enum {
  AWRA_SURFACE_ROLE_WINDOW,
  AWRA_SURFACE_ROLE_CONTENT,
  AWRA_SURFACE_ROLE_SIDEBAR,
  AWRA_SURFACE_ROLE_CARD,
  AWRA_SURFACE_ROLE_TOOLBAR,
  AWRA_SURFACE_ROLE_FLOATING,
  AWRA_SURFACE_ROLE_POPOVER,
  AWRA_SURFACE_ROLE_MENU,
  AWRA_SURFACE_ROLE_DIALOG,
  AWRA_SURFACE_ROLE_TOOLTIP,
  AWRA_SURFACE_ROLE_HUD,
} AwraSurfaceRole;

#define AWRA_TYPE_SURFACE_ROLE (awra_surface_role_get_type ())
GType awra_surface_role_get_type (void) G_GNUC_CONST;

typedef enum {
  AWRA_EFFECT_CAPABILITY_NONE = 0,
  AWRA_EFFECT_CAPABILITY_BLUR = 1 << 0,
} AwraEffectCapability;

#define AWRA_TYPE_EFFECT_CAPABILITY (awra_effect_capability_get_type ())
GType awra_effect_capability_get_type (void) G_GNUC_CONST;

typedef enum {
  AWRA_LAYOUT_MODE_COMPACT,
  AWRA_LAYOUT_MODE_MEDIUM,
  AWRA_LAYOUT_MODE_EXPANDED,
} AwraLayoutMode;

#define AWRA_TYPE_LAYOUT_MODE (awra_layout_mode_get_type ())
GType awra_layout_mode_get_type (void) G_GNUC_CONST;

typedef enum {
  AWRA_MOTION_PRESET_INSTANT,
  AWRA_MOTION_PRESET_FAST,
  AWRA_MOTION_PRESET_NORMAL,
  AWRA_MOTION_PRESET_SLOW,
} AwraMotionPreset;

#define AWRA_TYPE_MOTION_PRESET (awra_motion_preset_get_type ())
GType awra_motion_preset_get_type (void) G_GNUC_CONST;

G_END_DECLS
