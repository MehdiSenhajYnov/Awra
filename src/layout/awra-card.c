/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-card.h>

struct _AwraCard {
  GtkWidget parent_instance;
  AwraSurface *surface;
};

enum { PROP_0, PROP_CHILD, PROP_SURFACE, N_PROPS };
static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraCard, awra_card, GTK_TYPE_WIDGET)

static void
awra_card_dispose (GObject *object)
{
  AwraCard *self = AWRA_CARD (object);
  if (self->surface != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->surface));
    self->surface = NULL;
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
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_card_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec)
{
  if (id == PROP_CHILD)
    awra_card_set_child (AWRA_CARD (object), g_value_get_object (value));
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
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awracard");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_card_init (AwraCard *self)
{
  g_autoptr (AwraMaterial) material = awra_material_new_translucent ();
  self->surface = AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_CARD));
  awra_surface_set_material (self->surface, material);
  awra_surface_set_elevation (self->surface, 2);
  gtk_widget_set_parent (GTK_WIDGET (self->surface), GTK_WIDGET (self));
}

GtkWidget *awra_card_new (void) { return g_object_new (AWRA_TYPE_CARD, NULL); }
GtkWidget *awra_card_get_child (AwraCard *self) {
  g_return_val_if_fail (AWRA_IS_CARD (self), NULL);
  return awra_surface_get_child (self->surface);
}
void awra_card_set_child (AwraCard *self, GtkWidget *child) {
  g_return_if_fail (AWRA_IS_CARD (self));
  if (awra_card_get_child (self) == child) return;
  awra_surface_set_child (self->surface, child);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]);
}
AwraSurface *awra_card_get_surface (AwraCard *self) {
  g_return_val_if_fail (AWRA_IS_CARD (self), NULL);
  return self->surface;
}

