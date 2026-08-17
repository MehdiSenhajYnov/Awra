/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-button.h>
#include <awra/awra-context.h>

struct _AwraButton {
  GtkButton parent_instance;
  AwraStyleManager *style_manager;
  gulong style_handler;
};

G_DEFINE_FINAL_TYPE (AwraButton, awra_button, GTK_TYPE_BUTTON)

static void
update_appearance_class (AwraButton *self)
{
  gboolean dark = awra_token_set_get_dark (
    awra_style_manager_get_token_set (self->style_manager));

  gtk_widget_remove_css_class (GTK_WIDGET (self), dark ? "awra-light" : "awra-dark");
  gtk_widget_add_css_class (GTK_WIDGET (self), dark ? "awra-dark" : "awra-light");
}

static void
style_changed_cb (AwraStyleManager *manager,
                  GParamSpec       *pspec,
                  AwraButton       *self)
{
  (void) manager;
  (void) pspec;
  update_appearance_class (self);
}

static void
awra_button_map (GtkWidget *widget)
{
  AwraButton *self = AWRA_BUTTON (widget);
  AwraContext *context;

  GTK_WIDGET_CLASS (awra_button_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style_manager = awra_context_get_style_manager (context);
  update_appearance_class (self);
  self->style_handler = g_signal_connect (self->style_manager,
                                          "notify::token-set",
                                          G_CALLBACK (style_changed_cb),
                                          self);
}

static void
awra_button_unmap (GtkWidget *widget)
{
  AwraButton *self = AWRA_BUTTON (widget);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
    self->style_manager = NULL;
  }
  GTK_WIDGET_CLASS (awra_button_parent_class)->unmap (widget);
}

static void
awra_button_class_init (AwraButtonClass *klass)
{
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  widget_class->map = awra_button_map;
  widget_class->unmap = awra_button_unmap;
  gtk_widget_class_set_css_name (widget_class, "button");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_BUTTON);
}

static void
awra_button_init (AwraButton *self)
{
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-button");
  gtk_button_set_has_frame (GTK_BUTTON (self), FALSE);
  gtk_widget_set_focusable (GTK_WIDGET (self), TRUE);
}

GtkWidget *
awra_button_new (void)
{
  return g_object_new (AWRA_TYPE_BUTTON, NULL);
}

GtkWidget *
awra_button_new_with_label (const char *label)
{
  return g_object_new (AWRA_TYPE_BUTTON, "label", label, NULL);
}

GtkWidget *
awra_button_new_from_icon_name (const char *icon_name)
{
  return g_object_new (AWRA_TYPE_BUTTON, "icon-name", icon_name, NULL);
}
