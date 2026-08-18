/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-choice-group.h>
#include <awra/awra-layout.h>
#include <awra/awra-typography.h>

struct _AwraChoiceGroup {
  GtkWidget parent_instance;
  GtkBox *root;
  GtkLabel *title_label;
  GtkLabel *description_label;
  GtkBox *choices_box;
  GPtrArray *choices;
  char *title;
  char *description;
  gboolean exclusive;
};

enum { PROP_0, PROP_TITLE, PROP_DESCRIPTION, PROP_EXCLUSIVE, N_PROPS };
enum { SELECTION_CHANGED, N_SIGNALS };
static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];
static GtkBuildableIface *parent_buildable_iface;
static void awra_choice_group_buildable_init (GtkBuildableIface *iface);

G_DEFINE_FINAL_TYPE_WITH_CODE (
  AwraChoiceGroup, awra_choice_group, GTK_TYPE_WIDGET,
  G_IMPLEMENT_INTERFACE (GTK_TYPE_BUILDABLE, awra_choice_group_buildable_init))

static void
choice_toggled_cb (GtkCheckButton *button,
                   AwraChoiceGroup *self)
{
  guint position;
  if (g_ptr_array_find (self->choices, button, &position))
    g_signal_emit (self, signals[SELECTION_CHANGED], 0, position,
                   gtk_check_button_get_active (button));
}

static void
update_groups (AwraChoiceGroup *self)
{
  AwraCheckButton *first = self->choices->len > 0
                             ? g_ptr_array_index (self->choices, 0) : NULL;
  for (guint i = 0; i < self->choices->len; i++) {
    AwraCheckButton *choice = g_ptr_array_index (self->choices, i);
    awra_check_button_set_group (choice,
      self->exclusive && choice != first ? first : NULL);
  }
}

static void
awra_choice_group_dispose (GObject *object)
{
  AwraChoiceGroup *self = AWRA_CHOICE_GROUP (object);
  if (self->root != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->root));
    self->root = NULL;
    self->title_label = NULL;
    self->description_label = NULL;
    self->choices_box = NULL;
  }
  g_clear_pointer (&self->choices, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_choice_group_parent_class)->dispose (object);
}

static void
awra_choice_group_finalize (GObject *object)
{
  AwraChoiceGroup *self = AWRA_CHOICE_GROUP (object);
  g_clear_pointer (&self->title, g_free);
  g_clear_pointer (&self->description, g_free);
  G_OBJECT_CLASS (awra_choice_group_parent_class)->finalize (object);
}

static void
awra_choice_group_snapshot (GtkWidget *widget, GtkSnapshot *snapshot)
{
  gtk_widget_snapshot_child (widget,
    GTK_WIDGET (AWRA_CHOICE_GROUP (widget)->root), snapshot);
}

static void
awra_choice_group_get_property (GObject *object, guint id, GValue *value,
                                GParamSpec *pspec)
{
  AwraChoiceGroup *self = AWRA_CHOICE_GROUP (object);
  switch (id) {
  case PROP_TITLE: g_value_set_string (value, self->title); break;
  case PROP_DESCRIPTION: g_value_set_string (value, self->description); break;
  case PROP_EXCLUSIVE: g_value_set_boolean (value, self->exclusive); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_choice_group_set_property (GObject *object, guint id,
                                const GValue *value, GParamSpec *pspec)
{
  switch (id) {
  case PROP_TITLE: awra_choice_group_set_title (AWRA_CHOICE_GROUP (object), g_value_get_string (value)); break;
  case PROP_DESCRIPTION: awra_choice_group_set_description (AWRA_CHOICE_GROUP (object), g_value_get_string (value)); break;
  case PROP_EXCLUSIVE: awra_choice_group_set_exclusive (AWRA_CHOICE_GROUP (object), g_value_get_boolean (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_choice_group_class_init (AwraChoiceGroupClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_choice_group_dispose;
  object_class->finalize = awra_choice_group_finalize;
  object_class->get_property = awra_choice_group_get_property;
  object_class->set_property = awra_choice_group_set_property;
  widget_class->snapshot = awra_choice_group_snapshot;
  properties[PROP_TITLE] = g_param_spec_string (
    "title", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_DESCRIPTION] = g_param_spec_string (
    "description", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_EXCLUSIVE] = g_param_spec_boolean (
    "exclusive", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  signals[SELECTION_CHANGED] = g_signal_new (
    "selection-changed", G_TYPE_FROM_CLASS (klass), G_SIGNAL_RUN_LAST,
    0, NULL, NULL, NULL, G_TYPE_NONE, 2, G_TYPE_UINT, G_TYPE_BOOLEAN);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awrachoicegroup");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_choice_group_init (AwraChoiceGroup *self)
{
  self->choices = g_ptr_array_new ();
  self->root = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  self->title_label = GTK_LABEL (gtk_label_new (NULL));
  self->description_label = GTK_LABEL (gtk_label_new (NULL));
  self->choices_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  awra_box_set_spacing (self->root, AWRA_SPACING_XS);
  awra_box_set_spacing (self->choices_box, AWRA_SPACING_XS);
  awra_widget_set_typography (GTK_WIDGET (self->title_label),
                              AWRA_TYPOGRAPHY_TITLE_3);
  awra_widget_set_typography (GTK_WIDGET (self->description_label),
                              AWRA_TYPOGRAPHY_MUTED);
  gtk_label_set_xalign (self->title_label, 0.0f);
  gtk_label_set_xalign (self->description_label, 0.0f);
  gtk_label_set_wrap (self->description_label, TRUE);
  gtk_widget_set_visible (GTK_WIDGET (self->title_label), FALSE);
  gtk_widget_set_visible (GTK_WIDGET (self->description_label), FALSE);
  gtk_box_append (self->root, GTK_WIDGET (self->title_label));
  gtk_box_append (self->root, GTK_WIDGET (self->description_label));
  gtk_box_append (self->root, GTK_WIDGET (self->choices_box));
  gtk_widget_set_parent (GTK_WIDGET (self->root), GTK_WIDGET (self));
}

static void
awra_choice_group_buildable_add_child (GtkBuildable *buildable,
                                       GtkBuilder *builder,
                                       GObject *child,
                                       const char *type)
{
  if (g_strcmp0 (type, "choice") == 0 && AWRA_IS_CHECK_BUTTON (child)) {
    AwraChoiceGroup *self = AWRA_CHOICE_GROUP (buildable);
    g_ptr_array_add (self->choices, child);
    gtk_box_append (self->choices_box, GTK_WIDGET (child));
    g_signal_connect (child, "toggled", G_CALLBACK (choice_toggled_cb), self);
    update_groups (self);
  } else {
    parent_buildable_iface->add_child (buildable, builder, child, type);
  }
}

static void
awra_choice_group_buildable_init (GtkBuildableIface *iface)
{
  parent_buildable_iface = g_type_interface_peek_parent (iface);
  iface->add_child = awra_choice_group_buildable_add_child;
}

GtkWidget *awra_choice_group_new (void) { return g_object_new (AWRA_TYPE_CHOICE_GROUP, NULL); }
const char *awra_choice_group_get_title (AwraChoiceGroup *self) { g_return_val_if_fail (AWRA_IS_CHOICE_GROUP (self), NULL); return self->title; }
void awra_choice_group_set_title (AwraChoiceGroup *self, const char *title) { g_return_if_fail (AWRA_IS_CHOICE_GROUP (self)); if (g_strcmp0 (self->title, title) == 0) return; g_free (self->title); self->title = g_strdup (title); gtk_label_set_text (self->title_label, title != NULL ? title : ""); gtk_widget_set_visible (GTK_WIDGET (self->title_label), title != NULL && *title != '\0'); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TITLE]); }
const char *awra_choice_group_get_description (AwraChoiceGroup *self) { g_return_val_if_fail (AWRA_IS_CHOICE_GROUP (self), NULL); return self->description; }
void awra_choice_group_set_description (AwraChoiceGroup *self, const char *description) { g_return_if_fail (AWRA_IS_CHOICE_GROUP (self)); if (g_strcmp0 (self->description, description) == 0) return; g_free (self->description); self->description = g_strdup (description); gtk_label_set_text (self->description_label, description != NULL ? description : ""); gtk_widget_set_visible (GTK_WIDGET (self->description_label), description != NULL && *description != '\0'); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DESCRIPTION]); }
gboolean awra_choice_group_get_exclusive (AwraChoiceGroup *self) { g_return_val_if_fail (AWRA_IS_CHOICE_GROUP (self), FALSE); return self->exclusive; }
void awra_choice_group_set_exclusive (AwraChoiceGroup *self, gboolean exclusive) { g_return_if_fail (AWRA_IS_CHOICE_GROUP (self)); exclusive = !!exclusive; if (self->exclusive == exclusive) return; self->exclusive = exclusive; update_groups (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EXCLUSIVE]); }
AwraCheckButton *awra_choice_group_append (AwraChoiceGroup *self, const char *label) { AwraCheckButton *choice; g_return_val_if_fail (AWRA_IS_CHOICE_GROUP (self), NULL); choice = AWRA_CHECK_BUTTON (awra_check_button_new_with_label (label)); g_ptr_array_add (self->choices, choice); gtk_box_append (self->choices_box, GTK_WIDGET (choice)); g_signal_connect (choice, "toggled", G_CALLBACK (choice_toggled_cb), self); update_groups (self); return choice; }
void awra_choice_group_remove (AwraChoiceGroup *self, AwraCheckButton *choice) { guint position; g_return_if_fail (AWRA_IS_CHOICE_GROUP (self)); g_return_if_fail (AWRA_IS_CHECK_BUTTON (choice)); if (!g_ptr_array_find (self->choices, choice, &position)) return; g_signal_handlers_disconnect_by_func (choice, choice_toggled_cb, self); gtk_box_remove (self->choices_box, GTK_WIDGET (choice)); g_ptr_array_remove_index (self->choices, position); update_groups (self); }
guint awra_choice_group_get_n_choices (AwraChoiceGroup *self) { g_return_val_if_fail (AWRA_IS_CHOICE_GROUP (self), 0); return self->choices->len; }
AwraCheckButton *awra_choice_group_get_choice (AwraChoiceGroup *self, guint position) { g_return_val_if_fail (AWRA_IS_CHOICE_GROUP (self), NULL); return position < self->choices->len ? g_ptr_array_index (self->choices, position) : NULL; }
