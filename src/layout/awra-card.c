/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-card.h>
#include <awra/awra-layout.h>

struct _AwraCard {
  GtkWidget parent_instance;
  AwraSurface *surface;
  GtkWidget *content;
  GtkWidget *child;
  AwraCardAppearance appearance;
  AwraSpacing content_inset;
};

enum {
  PROP_0,
  PROP_CHILD,
  PROP_SURFACE,
  PROP_APPEARANCE,
  PROP_CONTENT_INSET,
  N_PROPS
};
static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraCard, awra_card, GTK_TYPE_WIDGET)

static void
awra_card_dispose (GObject *object)
{
  AwraCard *self = AWRA_CARD (object);
  if (self->surface != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->surface));
    self->surface = NULL;
    self->content = NULL;
    self->child = NULL;
  }
  G_OBJECT_CLASS (awra_card_parent_class)->dispose (object);
}

static void
awra_card_snapshot (GtkWidget *widget, GtkSnapshot *snapshot)
{
  AwraCard *self = AWRA_CARD (widget);
  gtk_widget_snapshot_child (widget, GTK_WIDGET (self->surface), snapshot);
}

static void
awra_card_get_property (GObject *object, guint id, GValue *value, GParamSpec *pspec)
{
  AwraCard *self = AWRA_CARD (object);
  switch (id) {
  case PROP_CHILD: g_value_set_object (value, awra_card_get_child (self)); break;
  case PROP_SURFACE: g_value_set_object (value, self->surface); break;
  case PROP_APPEARANCE: g_value_set_enum (value, self->appearance); break;
  case PROP_CONTENT_INSET: g_value_set_enum (value, self->content_inset); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_card_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec)
{
  if (id == PROP_CHILD)
    awra_card_set_child (AWRA_CARD (object), g_value_get_object (value));
  else if (id == PROP_APPEARANCE)
    awra_card_set_appearance (AWRA_CARD (object), g_value_get_enum (value));
  else if (id == PROP_CONTENT_INSET)
    awra_card_set_content_inset (AWRA_CARD (object), g_value_get_enum (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
}

static void
awra_card_class_init (AwraCardClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_card_dispose;
  object_class->get_property = awra_card_get_property;
  object_class->set_property = awra_card_set_property;
  widget_class->snapshot = awra_card_snapshot;
  properties[PROP_CHILD] = g_param_spec_object ("child", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SURFACE] = g_param_spec_object ("surface", NULL, NULL, AWRA_TYPE_SURFACE,
    G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_APPEARANCE] = g_param_spec_enum (
    "appearance", NULL, NULL, AWRA_TYPE_CARD_APPEARANCE,
    AWRA_CARD_APPEARANCE_TINTED,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_CONTENT_INSET] = g_param_spec_enum (
    "content-inset", NULL, NULL, AWRA_TYPE_SPACING,
    AWRA_SPACING_LG,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awracard");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_card_init (AwraCard *self)
{
  self->surface = AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD));
  self->content = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  self->appearance = AWRA_CARD_APPEARANCE_TINTED;
  self->content_inset = AWRA_SPACING_LG;
  awra_widget_set_margin (self->content, self->content_inset);
  awra_surface_set_child (self->surface, self->content);
  gtk_widget_set_parent (GTK_WIDGET (self->surface), GTK_WIDGET (self));
}

GtkWidget *awra_card_new (void) { return g_object_new (AWRA_TYPE_CARD, NULL); }
GtkWidget *awra_card_get_child (AwraCard *self) {
  g_return_val_if_fail (AWRA_IS_CARD (self), NULL);
  return self->child;
}
void awra_card_set_child (AwraCard *self, GtkWidget *child) {
  g_return_if_fail (AWRA_IS_CARD (self));
  if (awra_card_get_child (self) == child) return;
  if (self->child != NULL)
    gtk_box_remove (GTK_BOX (self->content), self->child);
  self->child = child;
  if (child != NULL)
    gtk_box_append (GTK_BOX (self->content), child);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]);
}

AwraSpacing
awra_card_get_content_inset (AwraCard *self)
{
  g_return_val_if_fail (AWRA_IS_CARD (self), AWRA_SPACING_NONE);
  return self->content_inset;
}

void
awra_card_set_content_inset (AwraCard    *self,
                             AwraSpacing  inset)
{
  g_return_if_fail (AWRA_IS_CARD (self));
  g_return_if_fail (inset == AWRA_SPACING_NONE ||
                    (inset >= AWRA_SPACING_XS &&
                     inset <= AWRA_SPACING_XXL));
  if (self->content_inset == inset)
    return;
  self->content_inset = inset;
  awra_widget_set_margin (self->content, inset);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CONTENT_INSET]);
}
AwraSurface *awra_card_get_surface (AwraCard *self) {
  g_return_val_if_fail (AWRA_IS_CARD (self), NULL);
  return self->surface;
}

AwraCardAppearance
awra_card_get_appearance (AwraCard *self)
{
  g_return_val_if_fail (AWRA_IS_CARD (self), AWRA_CARD_APPEARANCE_TINTED);
  return self->appearance;
}

void
awra_card_set_appearance (AwraCard           *self,
                          AwraCardAppearance  appearance)
{
  AwraMaterialPreset preset;
  g_autoptr (AwraMaterial) material = NULL;

  g_return_if_fail (AWRA_IS_CARD (self));
  g_return_if_fail (appearance >= AWRA_CARD_APPEARANCE_PLAIN &&
                    appearance <= AWRA_CARD_APPEARANCE_RAISED);
  if (self->appearance == appearance)
    return;
  self->appearance = appearance;
  preset = appearance == AWRA_CARD_APPEARANCE_PLAIN
             ? AWRA_MATERIAL_PRESET_CONTENT
             : AWRA_MATERIAL_PRESET_LAYER;
  material = awra_material_new_for_preset (preset);
  awra_surface_set_material (self->surface, material);
  awra_surface_set_elevation_level (
    self->surface,
    appearance == AWRA_CARD_APPEARANCE_RAISED
      ? AWRA_ELEVATION_RAISED
      : AWRA_ELEVATION_FLAT);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_APPEARANCE]);
}
