/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-navigation-item.h>
#include <awra/awra-layout.h>

struct _AwraNavigationItem {
  GtkToggleButton parent_instance;
  GtkImage *icon;
  GtkLabel *label;
  char *icon_name;
};

enum {
  PROP_0,
  PROP_LABEL,
  PROP_ICON_NAME,
  PROP_SELECTED,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraNavigationItem, awra_navigation_item,
                     GTK_TYPE_TOGGLE_BUTTON)

static void
active_notify_cb (AwraNavigationItem *self,
                  GParamSpec         *pspec,
                  gpointer            user_data)
{
  (void) pspec;
  (void) user_data;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED]);
}

static void
awra_navigation_item_finalize (GObject *object)
{
  g_clear_pointer (&AWRA_NAVIGATION_ITEM (object)->icon_name, g_free);
  G_OBJECT_CLASS (awra_navigation_item_parent_class)->finalize (object);
}

static void
awra_navigation_item_get_property (GObject    *object,
                                   guint       property_id,
                                   GValue     *value,
                                   GParamSpec *pspec)
{
  AwraNavigationItem *self = AWRA_NAVIGATION_ITEM (object);

  switch (property_id) {
  case PROP_LABEL:
    g_value_set_string (value, awra_navigation_item_get_label (self));
    break;
  case PROP_ICON_NAME:
    g_value_set_string (value, self->icon_name);
    break;
  case PROP_SELECTED:
    g_value_set_boolean (value, awra_navigation_item_get_selected (self));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_navigation_item_set_property (GObject      *object,
                                   guint         property_id,
                                   const GValue *value,
                                   GParamSpec   *pspec)
{
  AwraNavigationItem *self = AWRA_NAVIGATION_ITEM (object);

  switch (property_id) {
  case PROP_LABEL:
    awra_navigation_item_set_label (self, g_value_get_string (value));
    break;
  case PROP_ICON_NAME:
    awra_navigation_item_set_icon_name (self, g_value_get_string (value));
    break;
  case PROP_SELECTED:
    awra_navigation_item_set_selected (self, g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_navigation_item_class_init (AwraNavigationItemClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->finalize = awra_navigation_item_finalize;
  object_class->get_property = awra_navigation_item_get_property;
  object_class->set_property = awra_navigation_item_set_property;
  properties[PROP_LABEL] = g_param_spec_string (
    "label", NULL, NULL, "",
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ICON_NAME] = g_param_spec_string (
    "icon-name", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SELECTED] = g_param_spec_boolean (
    "selected", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_css_name (widget_class, "button");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_BUTTON);
}

static void
awra_navigation_item_init (AwraNavigationItem *self)
{
  GtkWidget *box = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0);

  awra_box_set_spacing (GTK_BOX (box), AWRA_SPACING_MD);
  self->icon = GTK_IMAGE (gtk_image_new ());
  self->label = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-navigation-item");
  gtk_widget_add_css_class (box, "awra-navigation-item-box");
  gtk_widget_add_css_class (GTK_WIDGET (self->icon),
                            "awra-navigation-item-icon");
  gtk_widget_add_css_class (GTK_WIDGET (self->label),
                            "awra-navigation-item-label");
  gtk_widget_set_visible (GTK_WIDGET (self->icon), FALSE);
  gtk_widget_set_hexpand (GTK_WIDGET (self->label), TRUE);
  gtk_label_set_xalign (self->label, 0.0f);
  gtk_label_set_ellipsize (self->label, PANGO_ELLIPSIZE_END);
  gtk_box_append (GTK_BOX (box), GTK_WIDGET (self->icon));
  gtk_box_append (GTK_BOX (box), GTK_WIDGET (self->label));
  gtk_button_set_child (GTK_BUTTON (self), box);
  gtk_button_set_has_frame (GTK_BUTTON (self), FALSE);
  g_signal_connect (self, "notify::active", G_CALLBACK (active_notify_cb), NULL);
}

GtkWidget *
awra_navigation_item_new (void)
{
  return g_object_new (AWRA_TYPE_NAVIGATION_ITEM, NULL);
}

GtkWidget *
awra_navigation_item_new_with_label (const char *label)
{
  return g_object_new (AWRA_TYPE_NAVIGATION_ITEM, "label", label, NULL);
}

const char *
awra_navigation_item_get_label (AwraNavigationItem *self)
{
  g_return_val_if_fail (AWRA_IS_NAVIGATION_ITEM (self), NULL);
  return gtk_label_get_text (self->label);
}

void
awra_navigation_item_set_label (AwraNavigationItem *self,
                                const char         *label)
{
  const char *value;

  g_return_if_fail (AWRA_IS_NAVIGATION_ITEM (self));
  value = label != NULL ? label : "";
  if (g_strcmp0 (awra_navigation_item_get_label (self), value) == 0)
    return;
  gtk_label_set_text (self->label, value);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, value,
                                  -1);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LABEL]);
}

const char *
awra_navigation_item_get_icon_name (AwraNavigationItem *self)
{
  g_return_val_if_fail (AWRA_IS_NAVIGATION_ITEM (self), NULL);
  return self->icon_name;
}

void
awra_navigation_item_set_icon_name (AwraNavigationItem *self,
                                    const char         *icon_name)
{
  g_return_if_fail (AWRA_IS_NAVIGATION_ITEM (self));
  if (g_strcmp0 (self->icon_name, icon_name) == 0)
    return;
  g_free (self->icon_name);
  self->icon_name = g_strdup (icon_name);
  if (icon_name != NULL && *icon_name != '\0') {
    gtk_image_set_from_icon_name (self->icon, icon_name);
    gtk_widget_set_visible (GTK_WIDGET (self->icon), TRUE);
  } else {
    gtk_image_clear (self->icon);
    gtk_widget_set_visible (GTK_WIDGET (self->icon), FALSE);
  }
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ICON_NAME]);
}

gboolean
awra_navigation_item_get_selected (AwraNavigationItem *self)
{
  g_return_val_if_fail (AWRA_IS_NAVIGATION_ITEM (self), FALSE);
  return gtk_toggle_button_get_active (GTK_TOGGLE_BUTTON (self));
}

void
awra_navigation_item_set_selected (AwraNavigationItem *self,
                                   gboolean            selected)
{
  g_return_if_fail (AWRA_IS_NAVIGATION_ITEM (self));
  gtk_toggle_button_set_active (GTK_TOGGLE_BUTTON (self), !!selected);
}

void
awra_navigation_item_set_group (AwraNavigationItem *self,
                                AwraNavigationItem *group)
{
  g_return_if_fail (AWRA_IS_NAVIGATION_ITEM (self));
  g_return_if_fail (group == NULL || AWRA_IS_NAVIGATION_ITEM (group));
  gtk_toggle_button_set_group (GTK_TOGGLE_BUTTON (self),
                               group != NULL ? GTK_TOGGLE_BUTTON (group) : NULL);
}
