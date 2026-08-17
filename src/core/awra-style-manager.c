/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <gtk/gtk.h>
#include <awra/awra-style-manager.h>

#include "core/awra-style-manager-private.h"

struct _AwraStyleManager {
  GObject parent_instance;
  GtkSettings *settings;
  AwraAppearance appearance;
  GdkRGBA accent;
  gboolean high_contrast;
  gboolean reduced_motion;
  gboolean reduced_transparency;
  AwraTokenSet *tokens;
};

enum {
  PROP_0,
  PROP_APPEARANCE,
  PROP_ACCENT,
  PROP_HIGH_CONTRAST,
  PROP_REDUCED_MOTION,
  PROP_REDUCED_TRANSPARENCY,
  PROP_TOKEN_SET,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraStyleManager, awra_style_manager, G_TYPE_OBJECT)

static gboolean
system_is_dark (AwraStyleManager *self)
{
  GtkInterfaceColorScheme scheme = GTK_INTERFACE_COLOR_SCHEME_DEFAULT;

  if (self->settings != NULL)
    g_object_get (self->settings, "gtk-interface-color-scheme", &scheme, NULL);

  return scheme == GTK_INTERFACE_COLOR_SCHEME_DARK;
}

static void
rebuild_tokens (AwraStyleManager *self)
{
  gboolean dark = self->appearance == AWRA_APPEARANCE_DARK ||
                  (self->appearance == AWRA_APPEARANCE_SYSTEM && system_is_dark (self));

  g_clear_object (&self->tokens);
  self->tokens = awra_token_set_new (dark, &self->accent, self->high_contrast);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TOKEN_SET]);
}

static void
settings_changed_cb (GtkSettings      *settings,
                     GParamSpec       *pspec,
                     AwraStyleManager *self)
{
  (void) settings;
  (void) pspec;

  if (self->appearance == AWRA_APPEARANCE_SYSTEM)
    rebuild_tokens (self);
}

static void
awra_style_manager_dispose (GObject *object)
{
  AwraStyleManager *self = AWRA_STYLE_MANAGER (object);

  if (self->settings != NULL)
    g_signal_handlers_disconnect_by_data (self->settings, self);
  g_clear_object (&self->settings);
  g_clear_object (&self->tokens);

  G_OBJECT_CLASS (awra_style_manager_parent_class)->dispose (object);
}

static void
awra_style_manager_get_property (GObject    *object,
                                 guint       property_id,
                                 GValue     *value,
                                 GParamSpec *pspec)
{
  AwraStyleManager *self = AWRA_STYLE_MANAGER (object);

  switch (property_id) {
  case PROP_APPEARANCE:
    g_value_set_enum (value, self->appearance);
    break;
  case PROP_ACCENT:
    g_value_set_boxed (value, &self->accent);
    break;
  case PROP_HIGH_CONTRAST:
    g_value_set_boolean (value, self->high_contrast);
    break;
  case PROP_REDUCED_MOTION:
    g_value_set_boolean (value, self->reduced_motion);
    break;
  case PROP_REDUCED_TRANSPARENCY:
    g_value_set_boolean (value, self->reduced_transparency);
    break;
  case PROP_TOKEN_SET:
    g_value_set_object (value, self->tokens);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_style_manager_set_property (GObject      *object,
                                 guint         property_id,
                                 const GValue *value,
                                 GParamSpec   *pspec)
{
  AwraStyleManager *self = AWRA_STYLE_MANAGER (object);

  switch (property_id) {
  case PROP_APPEARANCE:
    awra_style_manager_set_appearance (self, g_value_get_enum (value));
    break;
  case PROP_ACCENT:
    awra_style_manager_set_accent (self, g_value_get_boxed (value));
    break;
  case PROP_HIGH_CONTRAST:
    awra_style_manager_set_high_contrast (self, g_value_get_boolean (value));
    break;
  case PROP_REDUCED_MOTION:
    awra_style_manager_set_reduced_motion (self, g_value_get_boolean (value));
    break;
  case PROP_REDUCED_TRANSPARENCY:
    awra_style_manager_set_reduced_transparency (self, g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_style_manager_class_init (AwraStyleManagerClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->dispose = awra_style_manager_dispose;
  object_class->get_property = awra_style_manager_get_property;
  object_class->set_property = awra_style_manager_set_property;

  properties[PROP_APPEARANCE] =
    g_param_spec_enum ("appearance", NULL, NULL, AWRA_TYPE_APPEARANCE,
                       AWRA_APPEARANCE_SYSTEM,
                       G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ACCENT] =
    g_param_spec_boxed ("accent", NULL, NULL, GDK_TYPE_RGBA,
                        G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_HIGH_CONTRAST] =
    g_param_spec_boolean ("high-contrast", NULL, NULL, FALSE,
                          G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_REDUCED_MOTION] =
    g_param_spec_boolean ("reduced-motion", NULL, NULL, FALSE,
                          G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_REDUCED_TRANSPARENCY] =
    g_param_spec_boolean ("reduced-transparency", NULL, NULL, FALSE,
                          G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_TOKEN_SET] =
    g_param_spec_object ("token-set", NULL, NULL, AWRA_TYPE_TOKEN_SET,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);

  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_style_manager_init (AwraStyleManager *self)
{
  self->appearance = AWRA_APPEARANCE_SYSTEM;
  self->accent = (GdkRGBA) { 0.49, 0.31, 0.95, 1.0 };
}

AwraStyleManager *
awra_style_manager_new_for_display (GdkDisplay *display)
{
  AwraStyleManager *self;

  g_return_val_if_fail (GDK_IS_DISPLAY (display), NULL);

  self = g_object_new (AWRA_TYPE_STYLE_MANAGER, NULL);
  self->settings = g_object_ref (gtk_settings_get_for_display (display));
  g_signal_connect (self->settings,
                    "notify::gtk-interface-color-scheme",
                    G_CALLBACK (settings_changed_cb),
                    self);
  rebuild_tokens (self);

  return self;
}

AwraAppearance
awra_style_manager_get_appearance (AwraStyleManager *self)
{
  g_return_val_if_fail (AWRA_IS_STYLE_MANAGER (self), AWRA_APPEARANCE_SYSTEM);
  return self->appearance;
}

void
awra_style_manager_set_appearance (AwraStyleManager *self,
                                   AwraAppearance    appearance)
{
  g_return_if_fail (AWRA_IS_STYLE_MANAGER (self));
  g_return_if_fail (appearance >= AWRA_APPEARANCE_SYSTEM &&
                    appearance <= AWRA_APPEARANCE_DARK);

  if (self->appearance == appearance)
    return;

  self->appearance = appearance;
  rebuild_tokens (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_APPEARANCE]);
}

const GdkRGBA *
awra_style_manager_get_accent (AwraStyleManager *self)
{
  g_return_val_if_fail (AWRA_IS_STYLE_MANAGER (self), NULL);
  return &self->accent;
}

void
awra_style_manager_set_accent (AwraStyleManager *self,
                               const GdkRGBA    *accent)
{
  g_return_if_fail (AWRA_IS_STYLE_MANAGER (self));
  g_return_if_fail (accent != NULL);

  if (gdk_rgba_equal (&self->accent, accent))
    return;

  self->accent = *accent;
  rebuild_tokens (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ACCENT]);
}

#define DEFINE_BOOLEAN_ACCESSORS(name, field, prop, rebuild) \
  gboolean \
  awra_style_manager_get_##name (AwraStyleManager *self) \
  { \
    g_return_val_if_fail (AWRA_IS_STYLE_MANAGER (self), FALSE); \
    return self->field; \
  } \
  void \
  awra_style_manager_set_##name (AwraStyleManager *self, gboolean value) \
  { \
    g_return_if_fail (AWRA_IS_STYLE_MANAGER (self)); \
    value = !!value; \
    if (self->field == value) \
      return; \
    self->field = value; \
    if (rebuild) \
      rebuild_tokens (self); \
    g_object_notify_by_pspec (G_OBJECT (self), properties[prop]); \
  }

DEFINE_BOOLEAN_ACCESSORS (high_contrast, high_contrast, PROP_HIGH_CONTRAST, TRUE)
DEFINE_BOOLEAN_ACCESSORS (reduced_motion, reduced_motion, PROP_REDUCED_MOTION, FALSE)
DEFINE_BOOLEAN_ACCESSORS (reduced_transparency, reduced_transparency, PROP_REDUCED_TRANSPARENCY, FALSE)

AwraTokenSet *
awra_style_manager_get_token_set (AwraStyleManager *self)
{
  g_return_val_if_fail (AWRA_IS_STYLE_MANAGER (self), NULL);
  return self->tokens;
}
