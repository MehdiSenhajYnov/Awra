/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-badge.h>

struct _AwraBadge {
  GtkWidget parent_instance;
  GtkLabel *label;
};

enum {
  PROP_0,
  PROP_TEXT,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraBadge, awra_badge, GTK_TYPE_WIDGET)

static void
awra_badge_dispose (GObject *object)
{
  AwraBadge *self = AWRA_BADGE (object);

  if (self->label != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->label));
    self->label = NULL;
  }
  G_OBJECT_CLASS (awra_badge_parent_class)->dispose (object);
}

static void
awra_badge_snapshot (GtkWidget   *widget,
                     GtkSnapshot *snapshot)
{
  AwraBadge *self = AWRA_BADGE (widget);

  if (self->label != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->label), snapshot);
}

static void
awra_badge_get_property (GObject    *object,
                         guint       property_id,
                         GValue     *value,
                         GParamSpec *pspec)
{
  if (property_id == PROP_TEXT)
    g_value_set_string (value, awra_badge_get_text (AWRA_BADGE (object)));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_badge_set_property (GObject      *object,
                         guint         property_id,
                         const GValue *value,
                         GParamSpec   *pspec)
{
  if (property_id == PROP_TEXT)
    awra_badge_set_text (AWRA_BADGE (object), g_value_get_string (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_badge_class_init (AwraBadgeClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_badge_dispose;
  object_class->get_property = awra_badge_get_property;
  object_class->set_property = awra_badge_set_property;
  widget_class->snapshot = awra_badge_snapshot;
  properties[PROP_TEXT] =
    g_param_spec_string ("text", NULL, NULL, NULL,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awrabadge");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GENERIC);
}

static void
awra_badge_init (AwraBadge *self)
{
  self->label = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_set_parent (GTK_WIDGET (self->label), GTK_WIDGET (self));
}

GtkWidget *
awra_badge_new (const char *text)
{
  return g_object_new (AWRA_TYPE_BADGE, "text", text, NULL);
}

const char *
awra_badge_get_text (AwraBadge *self)
{
  g_return_val_if_fail (AWRA_IS_BADGE (self), NULL);
  return gtk_label_get_text (self->label);
}

void
awra_badge_set_text (AwraBadge  *self,
                     const char *text)
{
  g_return_if_fail (AWRA_IS_BADGE (self));

  if (g_strcmp0 (gtk_label_get_text (self->label), text) == 0)
    return;
  gtk_label_set_text (self->label, text != NULL ? text : "");
  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  text != NULL ? text : "",
                                  -1);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TEXT]);
}
