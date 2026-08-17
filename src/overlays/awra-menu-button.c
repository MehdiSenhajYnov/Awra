/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-menu-button.h>

struct _AwraMenuButton {
  GtkWidget parent_instance;
  GtkMenuButton *button;
  AwraPopover *popover;
  AwraStyleManager *style_manager;
  gulong style_handler;
};

enum {
  PROP_0,
  PROP_LABEL,
  PROP_POPOVER,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraMenuButton, awra_menu_button, GTK_TYPE_WIDGET)

static void
update_appearance_class (AwraMenuButton *self)
{
  gboolean dark = awra_token_set_get_dark (
    awra_style_manager_get_token_set (self->style_manager));

  gtk_widget_remove_css_class (GTK_WIDGET (self->button),
                               dark ? "awra-light" : "awra-dark");
  gtk_widget_add_css_class (GTK_WIDGET (self->button),
                            dark ? "awra-dark" : "awra-light");
}

static void
style_changed_cb (AwraStyleManager *manager,
                  GParamSpec       *pspec,
                  AwraMenuButton   *self)
{
  (void) manager;
  (void) pspec;
  update_appearance_class (self);
}

static void
awra_menu_button_map (GtkWidget *widget)
{
  AwraMenuButton *self = AWRA_MENU_BUTTON (widget);
  AwraContext *context;

  GTK_WIDGET_CLASS (awra_menu_button_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style_manager = awra_context_get_style_manager (context);
  update_appearance_class (self);
  self->style_handler = g_signal_connect (self->style_manager,
                                          "notify::token-set",
                                          G_CALLBACK (style_changed_cb),
                                          self);
}

static void
awra_menu_button_unmap (GtkWidget *widget)
{
  AwraMenuButton *self = AWRA_MENU_BUTTON (widget);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
    self->style_manager = NULL;
  }
  GTK_WIDGET_CLASS (awra_menu_button_parent_class)->unmap (widget);
}

static void
awra_menu_button_dispose (GObject *object)
{
  AwraMenuButton *self = AWRA_MENU_BUTTON (object);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
    self->style_manager = NULL;
  }
  if (self->button != NULL) {
    gtk_menu_button_set_popover (self->button, NULL);
    gtk_widget_unparent (GTK_WIDGET (self->button));
    self->button = NULL;
    self->popover = NULL;
  }

  G_OBJECT_CLASS (awra_menu_button_parent_class)->dispose (object);
}

static void
awra_menu_button_snapshot (GtkWidget   *widget,
                           GtkSnapshot *snapshot)
{
  AwraMenuButton *self = AWRA_MENU_BUTTON (widget);

  if (self->button != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->button), snapshot);
}

static void
awra_menu_button_get_property (GObject    *object,
                               guint       property_id,
                               GValue     *value,
                               GParamSpec *pspec)
{
  AwraMenuButton *self = AWRA_MENU_BUTTON (object);

  switch (property_id) {
  case PROP_LABEL:
    g_value_set_string (value, gtk_menu_button_get_label (self->button));
    break;
  case PROP_POPOVER:
    g_value_set_object (value, self->popover);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_menu_button_set_property (GObject      *object,
                               guint         property_id,
                               const GValue *value,
                               GParamSpec   *pspec)
{
  switch (property_id) {
  case PROP_LABEL:
    awra_menu_button_set_label (AWRA_MENU_BUTTON (object), g_value_get_string (value));
    break;
  case PROP_POPOVER:
    awra_menu_button_set_popover (AWRA_MENU_BUTTON (object), g_value_get_object (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_menu_button_class_init (AwraMenuButtonClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_menu_button_dispose;
  object_class->get_property = awra_menu_button_get_property;
  object_class->set_property = awra_menu_button_set_property;
  widget_class->snapshot = awra_menu_button_snapshot;
  widget_class->map = awra_menu_button_map;
  widget_class->unmap = awra_menu_button_unmap;

  properties[PROP_LABEL] =
    g_param_spec_string ("label", NULL, NULL, NULL,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_POPOVER] =
    g_param_spec_object ("popover", NULL, NULL, AWRA_TYPE_POPOVER,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awramenubutton");
}

static void
awra_menu_button_init (AwraMenuButton *self)
{
  self->button = GTK_MENU_BUTTON (gtk_menu_button_new ());
  gtk_menu_button_set_always_show_arrow (self->button, TRUE);
  gtk_widget_add_css_class (GTK_WIDGET (self->button), "awra-menu-button");
  gtk_widget_set_parent (GTK_WIDGET (self->button), GTK_WIDGET (self));
}

GtkWidget *
awra_menu_button_new (void)
{
  return g_object_new (AWRA_TYPE_MENU_BUTTON, NULL);
}

const char *
awra_menu_button_get_label (AwraMenuButton *self)
{
  g_return_val_if_fail (AWRA_IS_MENU_BUTTON (self), NULL);
  return gtk_menu_button_get_label (self->button);
}

void
awra_menu_button_set_label (AwraMenuButton *self,
                            const char     *label)
{
  g_return_if_fail (AWRA_IS_MENU_BUTTON (self));

  if (g_strcmp0 (gtk_menu_button_get_label (self->button), label) == 0)
    return;
  gtk_menu_button_set_label (self->button, label);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LABEL]);
}

AwraPopover *
awra_menu_button_get_popover (AwraMenuButton *self)
{
  g_return_val_if_fail (AWRA_IS_MENU_BUTTON (self), NULL);
  return self->popover;
}

void
awra_menu_button_set_popover (AwraMenuButton *self,
                              AwraPopover    *popover)
{
  g_return_if_fail (AWRA_IS_MENU_BUTTON (self));
  g_return_if_fail (popover == NULL || AWRA_IS_POPOVER (popover));

  if (self->popover == popover)
    return;
  gtk_menu_button_set_popover (self->button,
                               popover != NULL ? GTK_WIDGET (popover) : NULL);
  self->popover = popover;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_POPOVER]);
}

void
awra_menu_button_popup (AwraMenuButton *self)
{
  g_return_if_fail (AWRA_IS_MENU_BUTTON (self));
  gtk_menu_button_popup (self->button);
}

void
awra_menu_button_popdown (AwraMenuButton *self)
{
  g_return_if_fail (AWRA_IS_MENU_BUTTON (self));
  gtk_menu_button_popdown (self->button);
}

void
awra_menu_button_set_menu_model (AwraMenuButton *self,
                                 GMenuModel     *model)
{
  AwraPopover *popover;

  g_return_if_fail (AWRA_IS_MENU_BUTTON (self));
  g_return_if_fail (model == NULL || G_IS_MENU_MODEL (model));

  popover = self->popover;
  if (popover == NULL && model != NULL) {
    popover = AWRA_POPOVER (awra_popover_new ());
    awra_menu_button_set_popover (self, popover);
  }
  if (popover != NULL)
    awra_popover_set_menu_model (popover, model);
}
