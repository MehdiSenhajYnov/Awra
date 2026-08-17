/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-dropdown.h>

struct _AwraDropdown { GtkWidget parent_instance; GtkDropDown *delegate; };
enum { PROP_0, PROP_MODEL, PROP_SELECTED, N_PROPS };
static GParamSpec *properties[N_PROPS];
G_DEFINE_FINAL_TYPE (AwraDropdown, awra_dropdown, GTK_TYPE_WIDGET)

static void delegate_notify_cb (GtkDropDown *delegate, GParamSpec *pspec, AwraDropdown *self) {
  (void) delegate;
  g_object_notify_by_pspec (G_OBJECT (self),
    g_str_equal (pspec->name, "model") ? properties[PROP_MODEL] : properties[PROP_SELECTED]);
}
static void awra_dropdown_dispose (GObject *object) {
  AwraDropdown *self = AWRA_DROPDOWN (object);
  if (self->delegate != NULL) { gtk_widget_unparent (GTK_WIDGET (self->delegate)); self->delegate = NULL; }
  G_OBJECT_CLASS (awra_dropdown_parent_class)->dispose (object);
}
static void awra_dropdown_snapshot (GtkWidget *widget, GtkSnapshot *snapshot) {
  gtk_widget_snapshot_child (widget, GTK_WIDGET (AWRA_DROPDOWN (widget)->delegate), snapshot);
}
static void awra_dropdown_get_property (GObject *object, guint id, GValue *value, GParamSpec *pspec) {
  AwraDropdown *self = AWRA_DROPDOWN (object);
  if (id == PROP_MODEL) g_value_set_object (value, awra_dropdown_get_model (self));
  else if (id == PROP_SELECTED) g_value_set_uint (value, awra_dropdown_get_selected (self));
  else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
}
static void awra_dropdown_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec) {
  AwraDropdown *self = AWRA_DROPDOWN (object);
  if (id == PROP_MODEL) awra_dropdown_set_model (self, g_value_get_object (value));
  else if (id == PROP_SELECTED) awra_dropdown_set_selected (self, g_value_get_uint (value));
  else G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
}
static void awra_dropdown_class_init (AwraDropdownClass *klass) {
  GObjectClass *oc = G_OBJECT_CLASS (klass); GtkWidgetClass *wc = GTK_WIDGET_CLASS (klass);
  oc->dispose = awra_dropdown_dispose; oc->get_property = awra_dropdown_get_property; oc->set_property = awra_dropdown_set_property;
  wc->snapshot = awra_dropdown_snapshot;
  properties[PROP_MODEL] = g_param_spec_object ("model", NULL, NULL, G_TYPE_LIST_MODEL, G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SELECTED] = g_param_spec_uint ("selected", NULL, NULL, 0, G_MAXUINT, GTK_INVALID_LIST_POSITION, G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (oc, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (wc, GTK_TYPE_BIN_LAYOUT); gtk_widget_class_set_css_name (wc, "awradropdown");
}
static void awra_dropdown_init (AwraDropdown *self) {
  self->delegate = GTK_DROP_DOWN (gtk_drop_down_new (NULL, NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->delegate), "awra-dropdown");
  gtk_widget_set_parent (GTK_WIDGET (self->delegate), GTK_WIDGET (self));
  g_signal_connect (self->delegate, "notify::model", G_CALLBACK (delegate_notify_cb), self);
  g_signal_connect (self->delegate, "notify::selected", G_CALLBACK (delegate_notify_cb), self);
}
GtkWidget *awra_dropdown_new (GListModel *model, GtkExpression *expression) {
  AwraDropdown *self = g_object_new (AWRA_TYPE_DROPDOWN, NULL);
  gtk_drop_down_set_model (self->delegate, model); gtk_drop_down_set_expression (self->delegate, expression); return GTK_WIDGET (self);
}
GtkWidget *awra_dropdown_new_from_strings (const char *const *strings) {
  g_autoptr (GtkStringList) model = gtk_string_list_new (strings); return awra_dropdown_new (G_LIST_MODEL (model), NULL);
}
GListModel *awra_dropdown_get_model (AwraDropdown *self) { g_return_val_if_fail (AWRA_IS_DROPDOWN (self), NULL); return gtk_drop_down_get_model (self->delegate); }
void awra_dropdown_set_model (AwraDropdown *self, GListModel *model) { g_return_if_fail (AWRA_IS_DROPDOWN (self)); gtk_drop_down_set_model (self->delegate, model); }
guint awra_dropdown_get_selected (AwraDropdown *self) { g_return_val_if_fail (AWRA_IS_DROPDOWN (self), GTK_INVALID_LIST_POSITION); return gtk_drop_down_get_selected (self->delegate); }
void awra_dropdown_set_selected (AwraDropdown *self, guint position) { g_return_if_fail (AWRA_IS_DROPDOWN (self)); gtk_drop_down_set_selected (self->delegate, position); }
GtkDropDown *awra_dropdown_get_delegate (AwraDropdown *self) { g_return_val_if_fail (AWRA_IS_DROPDOWN (self), NULL); return self->delegate; }

