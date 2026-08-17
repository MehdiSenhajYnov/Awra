/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-button.h>
#include <awra/awra-menu-button.h>
#include <awra/awra-popover.h>

#include "core/awra-context-private.h"

struct _AwraPopover {
  GtkPopover parent_instance;
  AwraSurface *surface;
  AwraContext *context;
  gulong material_handler;
  GMenuModel *menu_model;
};

enum {
  PROP_0,
  PROP_CHILD,
  PROP_SURFACE,
  PROP_MENU_MODEL,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraPopover, awra_popover, GTK_TYPE_POPOVER)

static void
sync_native_effect (AwraPopover *self)
{
  if (self->context == NULL || !gtk_widget_get_mapped (GTK_WIDGET (self)))
    return;

  awra_effect_coordinator_update (
    awra_context_get_effect_coordinator (self->context),
    GTK_NATIVE (self),
    awra_surface_get_material (self->surface),
    awra_surface_get_radius (self->surface));
}

static void
material_changed_cb (AwraSurface *surface,
                     GParamSpec  *pspec,
                     AwraPopover *self)
{
  (void) surface;
  (void) pspec;
  sync_native_effect (self);
}

static void
awra_popover_map (GtkWidget *widget)
{
  AwraPopover *self = AWRA_POPOVER (widget);

  GTK_WIDGET_CLASS (awra_popover_parent_class)->map (widget);
  self->context = awra_context_get_for_display (gtk_widget_get_display (widget));
  awra_effect_coordinator_attach (
    awra_context_get_effect_coordinator (self->context),
    GTK_NATIVE (self),
    awra_surface_get_material (self->surface),
    awra_surface_get_radius (self->surface));
}

static void
awra_popover_unmap (GtkWidget *widget)
{
  AwraPopover *self = AWRA_POPOVER (widget);

  if (self->context != NULL) {
    awra_effect_coordinator_detach (
      awra_context_get_effect_coordinator (self->context),
      GTK_NATIVE (self));
  }
  GTK_WIDGET_CLASS (awra_popover_parent_class)->unmap (widget);
}

static void
awra_popover_size_allocate (GtkWidget *widget,
                            int        width,
                            int        height,
                            int        baseline)
{
  GTK_WIDGET_CLASS (awra_popover_parent_class)->size_allocate (widget,
                                                               width,
                                                               height,
                                                               baseline);
  sync_native_effect (AWRA_POPOVER (widget));
}

static void
awra_popover_dispose (GObject *object)
{
  AwraPopover *self = AWRA_POPOVER (object);

  if (self->material_handler != 0) {
    g_signal_handler_disconnect (self->surface, self->material_handler);
    self->material_handler = 0;
  }
  self->surface = NULL;
  self->context = NULL;
  g_clear_object (&self->menu_model);

  G_OBJECT_CLASS (awra_popover_parent_class)->dispose (object);
}

static void
awra_popover_get_property (GObject    *object,
                           guint       property_id,
                           GValue     *value,
                           GParamSpec *pspec)
{
  AwraPopover *self = AWRA_POPOVER (object);

  switch (property_id) {
  case PROP_CHILD:
    g_value_set_object (value, awra_surface_get_child (self->surface));
    break;
  case PROP_SURFACE:
    g_value_set_object (value, self->surface);
    break;
  case PROP_MENU_MODEL:
    g_value_set_object (value, self->menu_model);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_popover_set_property (GObject      *object,
                           guint         property_id,
                           const GValue *value,
                           GParamSpec   *pspec)
{
  switch (property_id) {
  case PROP_CHILD:
    awra_popover_set_child (AWRA_POPOVER (object), g_value_get_object (value));
    break;
  case PROP_MENU_MODEL:
    awra_popover_set_menu_model (AWRA_POPOVER (object), g_value_get_object (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_popover_class_init (AwraPopoverClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_popover_dispose;
  object_class->get_property = awra_popover_get_property;
  object_class->set_property = awra_popover_set_property;
  widget_class->map = awra_popover_map;
  widget_class->unmap = awra_popover_unmap;
  widget_class->size_allocate = awra_popover_size_allocate;

  properties[PROP_CHILD] =
    g_param_spec_object ("child", NULL, NULL, GTK_TYPE_WIDGET,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SURFACE] =
    g_param_spec_object ("surface", NULL, NULL, AWRA_TYPE_SURFACE,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_MENU_MODEL] =
    g_param_spec_object ("menu-model", NULL, NULL, G_TYPE_MENU_MODEL,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_popover_init (AwraPopover *self)
{
  g_autoptr (AwraMaterial) frosted = awra_material_new_frosted ();

  self->surface = AWRA_SURFACE (awra_surface_new_with_role (AWRA_SURFACE_ROLE_POPOVER));
  awra_surface_set_material (self->surface, frosted);
  awra_surface_set_radius (self->surface, 18.0);
  awra_surface_set_elevation (self->surface, 6);
  gtk_popover_set_child (GTK_POPOVER (self), GTK_WIDGET (self->surface));
  gtk_popover_set_has_arrow (GTK_POPOVER (self), FALSE);
  gtk_popover_set_autohide (GTK_POPOVER (self), TRUE);
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-popover");
  self->material_handler = g_signal_connect (self->surface,
                                             "notify::material",
                                             G_CALLBACK (material_changed_cb),
                                             self);
}

GtkWidget *
awra_popover_new (void)
{
  return g_object_new (AWRA_TYPE_POPOVER, NULL);
}

GtkWidget *
awra_popover_get_child (AwraPopover *self)
{
  g_return_val_if_fail (AWRA_IS_POPOVER (self), NULL);
  return awra_surface_get_child (self->surface);
}

void
awra_popover_set_child (AwraPopover *self,
                        GtkWidget   *child)
{
  g_return_if_fail (AWRA_IS_POPOVER (self));
  g_return_if_fail (child == NULL || GTK_IS_WIDGET (child));

  if (awra_surface_get_child (self->surface) == child)
    return;
  if (self->menu_model != NULL) {
    g_clear_object (&self->menu_model);
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MENU_MODEL]);
  }
  awra_surface_set_child (self->surface, child);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]);
}

AwraSurface *
awra_popover_get_surface (AwraPopover *self)
{
  g_return_val_if_fail (AWRA_IS_POPOVER (self), NULL);
  return self->surface;
}

static void
append_menu_model (GtkBox     *box,
                   GMenuModel *model)
{
  int n_items = g_menu_model_get_n_items (model);

  for (int i = 0; i < n_items; i++) {
    g_autofree char *label = NULL;
    g_autofree char *action = NULL;
    g_autoptr (GMenuModel) section = NULL;
    g_autoptr (GMenuModel) submenu = NULL;
    g_autoptr (GVariant) target = NULL;

    section = g_menu_model_get_item_link (model, i, G_MENU_LINK_SECTION);
    if (section != NULL) {
      append_menu_model (box, section);
      continue;
    }

    (void) g_menu_model_get_item_attribute (model,
                                             i,
                                             G_MENU_ATTRIBUTE_LABEL,
                                             "s",
                                             &label);
    submenu = g_menu_model_get_item_link (model, i, G_MENU_LINK_SUBMENU);
    if (submenu != NULL) {
      GtkWidget *button = awra_menu_button_new ();
      GtkWidget *popover = awra_popover_new ();
      awra_menu_button_set_label (AWRA_MENU_BUTTON (button),
                                  label != NULL ? label : "Menu");
      awra_popover_set_menu_model (AWRA_POPOVER (popover), submenu);
      awra_menu_button_set_popover (AWRA_MENU_BUTTON (button), AWRA_POPOVER (popover));
      gtk_box_append (box, button);
      continue;
    }

    GtkWidget *button = awra_button_new_with_label (label != NULL ? label : "Action");
    if (g_menu_model_get_item_attribute (model,
                                         i,
                                         G_MENU_ATTRIBUTE_ACTION,
                                         "s",
                                         &action)) {
      gtk_actionable_set_action_name (GTK_ACTIONABLE (button), action);
      target = g_menu_model_get_item_attribute_value (model,
                                                       i,
                                                       G_MENU_ATTRIBUTE_TARGET,
                                                       NULL);
      if (target != NULL)
        gtk_actionable_set_action_target_value (GTK_ACTIONABLE (button), target);
    }
    gtk_widget_add_css_class (button, "awra-menu-item");
    gtk_box_append (box, button);
  }
}

GMenuModel *
awra_popover_get_menu_model (AwraPopover *self)
{
  g_return_val_if_fail (AWRA_IS_POPOVER (self), NULL);
  return self->menu_model;
}

void
awra_popover_set_menu_model (AwraPopover *self,
                             GMenuModel   *model)
{
  GtkWidget *box;

  g_return_if_fail (AWRA_IS_POPOVER (self));
  g_return_if_fail (model == NULL || G_IS_MENU_MODEL (model));

  if (!g_set_object (&self->menu_model, model))
    return;

  if (model == NULL) {
    awra_surface_set_child (self->surface, NULL);
  } else {
    box = gtk_box_new (GTK_ORIENTATION_VERTICAL, 4);
    gtk_widget_add_css_class (box, "awra-menu");
    append_menu_model (GTK_BOX (box), model);
    awra_surface_set_child (self->surface, box);
  }
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MENU_MODEL]);
}
