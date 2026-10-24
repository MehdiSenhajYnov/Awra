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

/* A radio group: one Tab stop, the selected segment, which the arrow keys
 * move; assistive technologies hear radio buttons, checked or not. */
static void
update_segments (AwraSegmentedControl *self)
{
  for (guint i = 0; i < self->buttons->len; i++) {
    GtkWidget *button = g_ptr_array_index (self->buttons, i);
    gboolean selected = i == self->selected;

    gtk_widget_set_focusable (button, selected || self->selected >= self->buttons->len);
    gtk_accessible_update_state (GTK_ACCESSIBLE (button), GTK_ACCESSIBLE_STATE_CHECKED,
                                 selected ? GTK_ACCESSIBLE_TRISTATE_TRUE
                                          : GTK_ACCESSIBLE_TRISTATE_FALSE,
                                 -1);
  }
}

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
  update_segments (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED]);
  g_signal_emit (self, signals[CHANGED], 0, selected);
}

static gboolean
move_selection_cb (GtkWidget *widget,
                   GVariant  *args,
                   gpointer   user_data)
{
  AwraSegmentedControl *self = AWRA_SEGMENTED_CONTROL (widget);
  int step = g_variant_get_int32 (args);
  guint count = self->buttons->len;
  guint target;

  (void) user_data;
  if (count == 0 || self->selected >= count)
    return FALSE;
  /* Left and right follow the reading direction; Home and End go to the
   * first and last segments. */
  if (gtk_widget_get_direction (widget) == GTK_TEXT_DIR_RTL && (step == 1 || step == -1))
    step = -step;
  if (step == G_MININT32)
    target = 0;
  else if (step == G_MAXINT32)
    target = count - 1;
  else
    target = (guint) CLAMP ((int) self->selected + step, 0, (int) count - 1);
  if (target == self->selected)
    return TRUE;
  awra_segmented_control_set_selected (self, target);
  gtk_widget_grab_focus (g_ptr_array_index (self->buttons, target));
  return TRUE;
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
                                        GTK_ACCESSIBLE_ROLE_RADIO_GROUP);
  gtk_widget_class_add_binding (widget_class, GDK_KEY_Right, 0, move_selection_cb, "i", 1);
  gtk_widget_class_add_binding (widget_class, GDK_KEY_KP_Right, 0, move_selection_cb, "i", 1);
  gtk_widget_class_add_binding (widget_class, GDK_KEY_Left, 0, move_selection_cb, "i", -1);
  gtk_widget_class_add_binding (widget_class, GDK_KEY_KP_Left, 0, move_selection_cb, "i", -1);
  gtk_widget_class_add_binding (widget_class, GDK_KEY_Home, 0, move_selection_cb, "i", G_MININT32);
  gtk_widget_class_add_binding (widget_class, GDK_KEY_End, 0, move_selection_cb, "i", G_MAXINT32);
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
  button = g_object_new (AWRA_TYPE_TOGGLE_BUTTON, "label", label,
                         "accessible-role", GTK_ACCESSIBLE_ROLE_RADIO, NULL);
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
  update_segments (self);
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
