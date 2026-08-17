/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

struct _AwraInspector {
  GtkWidget parent_instance;
  AwraSurface *surface;
  GtkLabel *label;
  GWeakRef target;
  gulong target_handler;
  char *details;
  gboolean effect_region_visible;
};

enum {
  PROP_0,
  PROP_TARGET,
  PROP_DETAILS,
  PROP_EFFECT_REGION_VISIBLE,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraInspector, awra_inspector, GTK_TYPE_WIDGET)

static AwraSurface *
target_surface (GtkWidget *target)
{
  if (AWRA_IS_SURFACE (target))
    return AWRA_SURFACE (target);
  if (AWRA_IS_WINDOW (target))
    return awra_window_get_root_surface (AWRA_WINDOW (target));
  if (AWRA_IS_POPOVER (target))
    return awra_popover_get_surface (AWRA_POPOVER (target));
  if (AWRA_IS_CARD (target))
    return awra_card_get_surface (AWRA_CARD (target));
  if (AWRA_IS_SIDEBAR (target))
    return awra_sidebar_get_surface (AWRA_SIDEBAR (target));
  return NULL;
}

static const char *
enum_nick (GType enum_type,
           int   value)
{
  GEnumClass *enum_class = g_type_class_ref (enum_type);
  GEnumValue *enum_value = g_enum_get_value (enum_class, value);
  const char *nick = enum_value != NULL ? enum_value->value_nick : "unknown";
  const char *interned = g_intern_string (nick);

  g_type_class_unref (enum_class);
  return interned;
}

static void
set_debug_class (GtkWidget *target,
                 gboolean   visible)
{
  AwraSurface *surface = target_surface (target);

  if (surface == NULL)
    return;
  if (visible)
    gtk_widget_add_css_class (GTK_WIDGET (surface),
                              "awra-effect-region-debug");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (surface),
                                 "awra-effect-region-debug");
  gtk_widget_queue_draw (GTK_WIDGET (surface));
}

static void
target_notify_cb (GtkWidget     *target,
                  GParamSpec    *pspec,
                  AwraInspector *self)
{
  (void) target;
  (void) pspec;
  awra_inspector_refresh (self);
}

static void
awra_inspector_dispose (GObject *object)
{
  AwraInspector *self = AWRA_INSPECTOR (object);
  g_autoptr (GtkWidget) target = g_weak_ref_get (&self->target);

  if (target != NULL) {
    if (self->target_handler != 0)
      g_signal_handler_disconnect (target, self->target_handler);
    set_debug_class (target, FALSE);
  }
  self->target_handler = 0;
  g_weak_ref_set (&self->target, NULL);
  if (self->surface != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->surface));
    self->surface = NULL;
    self->label = NULL;
  }
  G_OBJECT_CLASS (awra_inspector_parent_class)->dispose (object);
}

static void
awra_inspector_finalize (GObject *object)
{
  AwraInspector *self = AWRA_INSPECTOR (object);

  g_weak_ref_clear (&self->target);
  g_free (self->details);
  G_OBJECT_CLASS (awra_inspector_parent_class)->finalize (object);
}

static void
awra_inspector_snapshot (GtkWidget   *widget,
                         GtkSnapshot *snapshot)
{
  AwraInspector *self = AWRA_INSPECTOR (widget);

  if (self->surface != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->surface), snapshot);
}

static void
awra_inspector_get_property (GObject    *object,
                             guint       property_id,
                             GValue     *value,
                             GParamSpec *pspec)
{
  AwraInspector *self = AWRA_INSPECTOR (object);

  switch (property_id) {
  case PROP_TARGET:
    g_value_take_object (value, g_weak_ref_get (&self->target));
    break;
  case PROP_DETAILS:
    g_value_set_string (value, self->details);
    break;
  case PROP_EFFECT_REGION_VISIBLE:
    g_value_set_boolean (value, self->effect_region_visible);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_inspector_set_property (GObject      *object,
                             guint         property_id,
                             const GValue *value,
                             GParamSpec   *pspec)
{
  if (property_id == PROP_TARGET)
    awra_inspector_set_target (AWRA_INSPECTOR (object),
                               g_value_get_object (value));
  else if (property_id == PROP_EFFECT_REGION_VISIBLE)
    awra_inspector_set_effect_region_visible (AWRA_INSPECTOR (object),
                                              g_value_get_boolean (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_inspector_class_init (AwraInspectorClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_inspector_dispose;
  object_class->finalize = awra_inspector_finalize;
  object_class->get_property = awra_inspector_get_property;
  object_class->set_property = awra_inspector_set_property;
  widget_class->snapshot = awra_inspector_snapshot;
  properties[PROP_TARGET] =
    g_param_spec_object ("target", NULL, NULL, GTK_TYPE_WIDGET,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_DETAILS] =
    g_param_spec_string ("details", NULL, NULL, "No target",
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_EFFECT_REGION_VISIBLE] =
    g_param_spec_boolean ("effect-region-visible", NULL, NULL, FALSE,
                          G_PARAM_READWRITE |
                          G_PARAM_EXPLICIT_NOTIFY |
                          G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awrainspector");
}

static void
awra_inspector_init (AwraInspector *self)
{
  g_autoptr (AwraMaterial) material = awra_material_new_solid ();

  g_weak_ref_init (&self->target, NULL);
  self->details = g_strdup ("No target");
  self->surface = AWRA_SURFACE (
    awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD));
  awra_surface_set_material (self->surface, material);
  self->label = GTK_LABEL (gtk_label_new (self->details));
  gtk_label_set_xalign (self->label, 0.0f);
  gtk_label_set_selectable (self->label, TRUE);
  gtk_widget_add_css_class (GTK_WIDGET (self->label), "awra-inspector-label");
  awra_surface_set_child (self->surface, GTK_WIDGET (self->label));
  gtk_widget_set_parent (GTK_WIDGET (self->surface), GTK_WIDGET (self));
}

GtkWidget *
awra_inspector_new (void)
{
  return g_object_new (AWRA_TYPE_INSPECTOR, NULL);
}

GtkWidget *
awra_inspector_get_target (AwraInspector *self)
{
  g_return_val_if_fail (AWRA_IS_INSPECTOR (self), NULL);
  return g_weak_ref_get (&self->target);
}

void
awra_inspector_set_target (AwraInspector *self,
                           GtkWidget     *target)
{
  g_autoptr (GtkWidget) previous = NULL;

  g_return_if_fail (AWRA_IS_INSPECTOR (self));
  g_return_if_fail (target == NULL || GTK_IS_WIDGET (target));
  previous = g_weak_ref_get (&self->target);
  if (previous == target)
    return;
  if (previous != NULL) {
    if (self->target_handler != 0)
      g_signal_handler_disconnect (previous, self->target_handler);
    set_debug_class (previous, FALSE);
  }
  self->target_handler = 0;
  g_weak_ref_set (&self->target, target);
  if (target != NULL) {
    self->target_handler = g_signal_connect (target,
                                             "notify",
                                             G_CALLBACK (target_notify_cb),
                                             self);
    set_debug_class (target, self->effect_region_visible);
  }
  awra_inspector_refresh (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TARGET]);
}

const char *
awra_inspector_get_details (AwraInspector *self)
{
  g_return_val_if_fail (AWRA_IS_INSPECTOR (self), NULL);
  return self->details;
}

void
awra_inspector_refresh (AwraInspector *self)
{
  g_autoptr (GtkWidget) target = NULL;
  g_autoptr (GString) details = NULL;
  AwraSurface *surface;

  g_return_if_fail (AWRA_IS_INSPECTOR (self));
  target = g_weak_ref_get (&self->target);
  if (target == NULL) {
    g_free (self->details);
    self->details = g_strdup ("No target");
  } else {
    GtkAccessibleRole accessible_role =
      gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (target));

    details = g_string_new (NULL);
    g_string_append_printf (details,
                            "Type: %s\nSize: %d × %d\nMapped: %s\nAccessible: %s",
                            G_OBJECT_TYPE_NAME (target),
                            gtk_widget_get_width (target),
                            gtk_widget_get_height (target),
                            gtk_widget_get_mapped (target) ? "yes" : "no",
                            enum_nick (GTK_TYPE_ACCESSIBLE_ROLE, accessible_role));
    surface = target_surface (target);
    if (surface != NULL) {
      g_string_append_printf (
        details,
        "\nSurface role: %s\nMaterial: %s\nRadius: %.1f\nElevation: %u",
        enum_nick (AWRA_TYPE_SURFACE_ROLE, awra_surface_get_role (surface)),
        enum_nick (AWRA_TYPE_MATERIAL_KIND,
                   awra_material_get_kind (awra_surface_get_material (surface))),
        awra_surface_get_radius (surface),
        awra_surface_get_elevation (surface));
    }
    g_free (self->details);
    self->details = g_string_free (g_steal_pointer (&details), FALSE);
  }
  gtk_label_set_text (self->label, self->details);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DETAILS]);
}

gboolean
awra_inspector_get_effect_region_visible (AwraInspector *self)
{
  g_return_val_if_fail (AWRA_IS_INSPECTOR (self), FALSE);
  return self->effect_region_visible;
}

void
awra_inspector_set_effect_region_visible (AwraInspector *self,
                                          gboolean       visible)
{
  g_autoptr (GtkWidget) target = NULL;

  g_return_if_fail (AWRA_IS_INSPECTOR (self));
  visible = !!visible;
  if (self->effect_region_visible == visible)
    return;
  self->effect_region_visible = visible;
  target = g_weak_ref_get (&self->target);
  if (target != NULL)
    set_debug_class (target, visible);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_EFFECT_REGION_VISIBLE]);
}
