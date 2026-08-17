/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-motion.h>
#include <awra/awra-tab-view.h>

struct _AwraTabView {
  GtkWidget parent_instance;
  GtkBox *box;
  GtkStackSwitcher *switcher;
  GtkStack *stack;
  AwraStyleManager *style_manager;
  gulong style_handler;
};

enum {
  PROP_0,
  PROP_SELECTED_NAME,
  PROP_STACK,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraTabView, awra_tab_view, GTK_TYPE_WIDGET)

static void
update_motion (AwraTabView *self)
{
  guint duration = 0;

  if (self->style_manager != NULL)
    duration = awra_motion_get_duration (self->style_manager,
                                         AWRA_MOTION_PRESET_NORMAL);
  gtk_stack_set_transition_duration (self->stack, duration);
  gtk_stack_set_transition_type (
    self->stack,
    duration == 0 ? GTK_STACK_TRANSITION_TYPE_NONE
                  : GTK_STACK_TRANSITION_TYPE_CROSSFADE);
}

static void
motion_changed_cb (AwraStyleManager *manager,
                   GParamSpec       *pspec,
                   AwraTabView      *self)
{
  (void) manager;
  (void) pspec;
  update_motion (self);
}

static void
selected_changed_cb (GtkStack    *stack,
                     GParamSpec  *pspec,
                     AwraTabView *self)
{
  (void) stack;
  (void) pspec;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED_NAME]);
}

static void
awra_tab_view_map (GtkWidget *widget)
{
  AwraTabView *self = AWRA_TAB_VIEW (widget);
  AwraContext *context;

  GTK_WIDGET_CLASS (awra_tab_view_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style_manager = awra_context_get_style_manager (context);
  self->style_handler = g_signal_connect (self->style_manager,
                                          "notify::reduced-motion",
                                          G_CALLBACK (motion_changed_cb),
                                          self);
  update_motion (self);
}

static void
awra_tab_view_unmap (GtkWidget *widget)
{
  AwraTabView *self = AWRA_TAB_VIEW (widget);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
    self->style_manager = NULL;
  }
  GTK_WIDGET_CLASS (awra_tab_view_parent_class)->unmap (widget);
}

static void
awra_tab_view_dispose (GObject *object)
{
  AwraTabView *self = AWRA_TAB_VIEW (object);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
  }
  if (self->box != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->box));
    self->box = NULL;
    self->switcher = NULL;
    self->stack = NULL;
  }
  G_OBJECT_CLASS (awra_tab_view_parent_class)->dispose (object);
}

static void
awra_tab_view_snapshot (GtkWidget   *widget,
                        GtkSnapshot *snapshot)
{
  AwraTabView *self = AWRA_TAB_VIEW (widget);

  if (self->box != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->box), snapshot);
}

static void
awra_tab_view_get_property (GObject    *object,
                            guint       property_id,
                            GValue     *value,
                            GParamSpec *pspec)
{
  AwraTabView *self = AWRA_TAB_VIEW (object);

  if (property_id == PROP_SELECTED_NAME)
    g_value_set_string (value, awra_tab_view_get_selected_name (self));
  else if (property_id == PROP_STACK)
    g_value_set_object (value, self->stack);
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_tab_view_set_property (GObject      *object,
                            guint         property_id,
                            const GValue *value,
                            GParamSpec   *pspec)
{
  if (property_id == PROP_SELECTED_NAME)
    awra_tab_view_set_selected_name (AWRA_TAB_VIEW (object),
                                     g_value_get_string (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_tab_view_class_init (AwraTabViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_tab_view_dispose;
  object_class->get_property = awra_tab_view_get_property;
  object_class->set_property = awra_tab_view_set_property;
  widget_class->map = awra_tab_view_map;
  widget_class->unmap = awra_tab_view_unmap;
  widget_class->snapshot = awra_tab_view_snapshot;
  properties[PROP_SELECTED_NAME] =
    g_param_spec_string ("selected-name", NULL, NULL, NULL,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_STACK] =
    g_param_spec_object ("stack", NULL, NULL, GTK_TYPE_STACK,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awratabview");
}

static void
awra_tab_view_init (AwraTabView *self)
{
  self->box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 8));
  self->switcher = GTK_STACK_SWITCHER (gtk_stack_switcher_new ());
  self->stack = GTK_STACK (gtk_stack_new ());
  gtk_stack_switcher_set_stack (self->switcher, self->stack);
  gtk_widget_add_css_class (GTK_WIDGET (self->switcher), "awra-tabs");
  gtk_widget_set_halign (GTK_WIDGET (self->switcher), GTK_ALIGN_START);
  gtk_widget_set_vexpand (GTK_WIDGET (self->stack), TRUE);
  gtk_box_append (self->box, GTK_WIDGET (self->switcher));
  gtk_box_append (self->box, GTK_WIDGET (self->stack));
  gtk_widget_set_parent (GTK_WIDGET (self->box), GTK_WIDGET (self));
  g_signal_connect (self->stack,
                    "notify::visible-child-name",
                    G_CALLBACK (selected_changed_cb),
                    self);
}

GtkWidget *
awra_tab_view_new (void)
{
  return g_object_new (AWRA_TYPE_TAB_VIEW, NULL);
}

void
awra_tab_view_add (AwraTabView *self,
                   GtkWidget   *page,
                   const char  *name,
                   const char  *title)
{
  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));
  g_return_if_fail (name != NULL && *name != '\0');

  gtk_stack_add_titled (self->stack, page, name, title != NULL ? title : name);
}

const char *
awra_tab_view_get_selected_name (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  return gtk_stack_get_visible_child_name (self->stack);
}

void
awra_tab_view_set_selected_name (AwraTabView *self,
                                 const char  *name)
{
  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (name != NULL);
  g_return_if_fail (gtk_stack_get_child_by_name (self->stack, name) != NULL);

  gtk_stack_set_visible_child_name (self->stack, name);
}

GtkStack *
awra_tab_view_get_stack (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  return self->stack;
}
