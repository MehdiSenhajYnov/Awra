/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-segmented-control.h>
#include <awra/awra-toggle-button.h>

struct _AwraSegmentedControl {
  GtkWidget parent_instance;
  GtkBox *box;
  GPtrArray *buttons;
  guint selected;
};

enum {
  PROP_0,
  PROP_SELECTED,
  PROP_N_ITEMS,
  N_PROPS,
};

enum {
  CHANGED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraSegmentedControl,
                     awra_segmented_control,
                     GTK_TYPE_WIDGET)

static void
segment_toggled_cb (GtkToggleButton      *button,
                    AwraSegmentedControl *self)
{
  guint selected;

  if (!gtk_toggle_button_get_active (button))
    return;
  for (selected = 0; selected < self->buttons->len; selected++) {
    if (g_ptr_array_index (self->buttons, selected) == button)
      break;
  }
  if (selected >= self->buttons->len || selected == self->selected)
    return;
  self->selected = selected;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED]);
  g_signal_emit (self, signals[CHANGED], 0, selected);
}

static void
awra_segmented_control_dispose (GObject *object)
{
  AwraSegmentedControl *self = AWRA_SEGMENTED_CONTROL (object);

  if (self->box != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->box));
    self->box = NULL;
  }
  g_clear_pointer (&self->buttons, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_segmented_control_parent_class)->dispose (object);
}

static void
awra_segmented_control_snapshot (GtkWidget   *widget,
                                 GtkSnapshot *snapshot)
{
  AwraSegmentedControl *self = AWRA_SEGMENTED_CONTROL (widget);

  if (self->box != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->box), snapshot);
}

static void
awra_segmented_control_get_property (GObject    *object,
                                     guint       property_id,
                                     GValue     *value,
                                     GParamSpec *pspec)
{
  AwraSegmentedControl *self = AWRA_SEGMENTED_CONTROL (object);

  if (property_id == PROP_SELECTED)
    g_value_set_uint (value, self->selected);
  else if (property_id == PROP_N_ITEMS)
    g_value_set_uint (value, self->buttons->len);
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_segmented_control_set_property (GObject      *object,
                                     guint         property_id,
                                     const GValue *value,
                                     GParamSpec   *pspec)
{
  if (property_id == PROP_SELECTED)
    awra_segmented_control_set_selected (AWRA_SEGMENTED_CONTROL (object),
                                         g_value_get_uint (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_segmented_control_class_init (AwraSegmentedControlClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_segmented_control_dispose;
  object_class->get_property = awra_segmented_control_get_property;
  object_class->set_property = awra_segmented_control_set_property;
  widget_class->snapshot = awra_segmented_control_snapshot;
  properties[PROP_SELECTED] =
    g_param_spec_uint ("selected", NULL, NULL,
                       0, G_MAXUINT, GTK_INVALID_LIST_POSITION,
                       G_PARAM_READWRITE |
                       G_PARAM_EXPLICIT_NOTIFY |
                       G_PARAM_STATIC_STRINGS);
  properties[PROP_N_ITEMS] =
    g_param_spec_uint ("n-items", NULL, NULL, 0, G_MAXUINT, 0,
                       G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  signals[CHANGED] =
    g_signal_new ("changed",
                  G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST,
                  0,
                  NULL,
                  NULL,
                  NULL,
                  G_TYPE_NONE,
                  1,
                  G_TYPE_UINT);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awrasegmentedcontrol");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_segmented_control_init (AwraSegmentedControl *self)
{
  self->box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->buttons = g_ptr_array_new ();
  self->selected = GTK_INVALID_LIST_POSITION;
  gtk_widget_add_css_class (GTK_WIDGET (self->box), "awra-segmented");
  gtk_widget_set_parent (GTK_WIDGET (self->box), GTK_WIDGET (self));
}

GtkWidget *
awra_segmented_control_new (void)
{
  return g_object_new (AWRA_TYPE_SEGMENTED_CONTROL, NULL);
}

guint
awra_segmented_control_append (AwraSegmentedControl *self,
                               const char           *label)
{
  GtkWidget *button;
  guint position;

  g_return_val_if_fail (AWRA_IS_SEGMENTED_CONTROL (self),
                        GTK_INVALID_LIST_POSITION);
  g_return_val_if_fail (label != NULL, GTK_INVALID_LIST_POSITION);
  position = self->buttons->len;
  button = awra_toggle_button_new_with_label (label);
  gtk_widget_add_css_class (button, "awra-segment");
  if (position > 0)
    gtk_toggle_button_set_group (GTK_TOGGLE_BUTTON (button),
                                 GTK_TOGGLE_BUTTON (
                                   g_ptr_array_index (self->buttons, 0)));
  g_ptr_array_add (self->buttons, button);
  g_signal_connect (button,
                    "toggled",
                    G_CALLBACK (segment_toggled_cb),
                    self);
  gtk_box_append (self->box, button);
  if (position == 0)
    gtk_toggle_button_set_active (GTK_TOGGLE_BUTTON (button), TRUE);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_N_ITEMS]);
  return position;
}

guint
awra_segmented_control_get_n_items (AwraSegmentedControl *self)
{
  g_return_val_if_fail (AWRA_IS_SEGMENTED_CONTROL (self), 0);
  return self->buttons->len;
}

guint
awra_segmented_control_get_selected (AwraSegmentedControl *self)
{
  g_return_val_if_fail (AWRA_IS_SEGMENTED_CONTROL (self),
                        GTK_INVALID_LIST_POSITION);
  return self->selected;
}

void
awra_segmented_control_set_selected (AwraSegmentedControl *self,
                                     guint                 selected)
{
  g_return_if_fail (AWRA_IS_SEGMENTED_CONTROL (self));
  g_return_if_fail (selected < self->buttons->len);

  gtk_toggle_button_set_active (
    GTK_TOGGLE_BUTTON (g_ptr_array_index (self->buttons, selected)),
    TRUE);
}
