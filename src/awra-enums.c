/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-enums.h>

GType
awra_appearance_get_type (void)
{
  static gsize type_id;
  static const GEnumValue values[] = {
    { AWRA_APPEARANCE_SYSTEM, "AWRA_APPEARANCE_SYSTEM", "system" },
    { AWRA_APPEARANCE_LIGHT, "AWRA_APPEARANCE_LIGHT", "light" },
    { AWRA_APPEARANCE_DARK, "AWRA_APPEARANCE_DARK", "dark" },
    { 0, NULL, NULL },
  };

  if (g_once_init_enter (&type_id)) {
    GType id = g_enum_register_static ("AwraAppearance", values);
    g_once_init_leave (&type_id, id);
  }

  return (GType) type_id;
}

GType
awra_material_kind_get_type (void)
{
  static gsize type_id;
  static const GEnumValue values[] = {
    { AWRA_MATERIAL_KIND_SOLID, "AWRA_MATERIAL_KIND_SOLID", "solid" },
    { AWRA_MATERIAL_KIND_TRANSLUCENT, "AWRA_MATERIAL_KIND_TRANSLUCENT", "translucent" },
    { AWRA_MATERIAL_KIND_FROSTED, "AWRA_MATERIAL_KIND_FROSTED", "frosted" },
    { AWRA_MATERIAL_KIND_LIQUID, "AWRA_MATERIAL_KIND_LIQUID", "liquid" },
    { 0, NULL, NULL },
  };

  if (g_once_init_enter (&type_id)) {
    GType id = g_enum_register_static ("AwraMaterialKind", values);
    g_once_init_leave (&type_id, id);
  }

  return (GType) type_id;
}

GType
awra_surface_role_get_type (void)
{
  static gsize type_id;
  static const GEnumValue values[] = {
    { AWRA_SURFACE_ROLE_WINDOW, "AWRA_SURFACE_ROLE_WINDOW", "window" },
    { AWRA_SURFACE_ROLE_CONTENT, "AWRA_SURFACE_ROLE_CONTENT", "content" },
    { AWRA_SURFACE_ROLE_SIDEBAR, "AWRA_SURFACE_ROLE_SIDEBAR", "sidebar" },
    { AWRA_SURFACE_ROLE_CARD, "AWRA_SURFACE_ROLE_CARD", "card" },
    { AWRA_SURFACE_ROLE_TOOLBAR, "AWRA_SURFACE_ROLE_TOOLBAR", "toolbar" },
    { AWRA_SURFACE_ROLE_FLOATING, "AWRA_SURFACE_ROLE_FLOATING", "floating" },
    { AWRA_SURFACE_ROLE_POPOVER, "AWRA_SURFACE_ROLE_POPOVER", "popover" },
    { AWRA_SURFACE_ROLE_MENU, "AWRA_SURFACE_ROLE_MENU", "menu" },
    { AWRA_SURFACE_ROLE_DIALOG, "AWRA_SURFACE_ROLE_DIALOG", "dialog" },
    { AWRA_SURFACE_ROLE_TOOLTIP, "AWRA_SURFACE_ROLE_TOOLTIP", "tooltip" },
    { AWRA_SURFACE_ROLE_HUD, "AWRA_SURFACE_ROLE_HUD", "hud" },
    { 0, NULL, NULL },
  };

  if (g_once_init_enter (&type_id)) {
    GType id = g_enum_register_static ("AwraSurfaceRole", values);
    g_once_init_leave (&type_id, id);
  }

  return (GType) type_id;
}

GType
awra_effect_capability_get_type (void)
{
  static gsize type_id;
  static const GFlagsValue values[] = {
    { AWRA_EFFECT_CAPABILITY_NONE, "AWRA_EFFECT_CAPABILITY_NONE", "none" },
    { AWRA_EFFECT_CAPABILITY_BLUR, "AWRA_EFFECT_CAPABILITY_BLUR", "blur" },
    { 0, NULL, NULL },
  };

  if (g_once_init_enter (&type_id)) {
    GType id = g_flags_register_static ("AwraEffectCapability", values);
    g_once_init_leave (&type_id, id);
  }

  return (GType) type_id;
}

GType
awra_layout_mode_get_type (void)
{
  static gsize type_id;
  static const GEnumValue values[] = {
    { AWRA_LAYOUT_MODE_COMPACT, "AWRA_LAYOUT_MODE_COMPACT", "compact" },
    { AWRA_LAYOUT_MODE_MEDIUM, "AWRA_LAYOUT_MODE_MEDIUM", "medium" },
    { AWRA_LAYOUT_MODE_EXPANDED, "AWRA_LAYOUT_MODE_EXPANDED", "expanded" },
    { 0, NULL, NULL },
  };

  if (g_once_init_enter (&type_id)) {
    GType id = g_enum_register_static ("AwraLayoutMode", values);
    g_once_init_leave (&type_id, id);
  }

  return (GType) type_id;
}

GType
awra_motion_preset_get_type (void)
{
  static gsize type_id;
  static const GEnumValue values[] = {
    { AWRA_MOTION_PRESET_INSTANT, "AWRA_MOTION_PRESET_INSTANT", "instant" },
    { AWRA_MOTION_PRESET_FAST, "AWRA_MOTION_PRESET_FAST", "fast" },
    { AWRA_MOTION_PRESET_NORMAL, "AWRA_MOTION_PRESET_NORMAL", "normal" },
    { AWRA_MOTION_PRESET_SLOW, "AWRA_MOTION_PRESET_SLOW", "slow" },
    { 0, NULL, NULL },
  };

  if (g_once_init_enter (&type_id)) {
    GType id = g_enum_register_static ("AwraMotionPreset", values);
    g_once_init_leave (&type_id, id);
  }

  return (GType) type_id;
}
