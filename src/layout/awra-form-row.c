/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-form-row.h>
#include <awra/awra-layout.h>
#include <awra/awra-typography.h>

struct _AwraFormRow {
  GtkWidget parent_instance;
  GtkBox *root;
  GtkLabel *label_widget;
  GtkBox *field;
  GtkLabel *help_widget;
  GtkLabel *error_widget;
  GtkWidget *control;
  char *label;
  char *help_text;
  char *error_message;
  gboolean required;
  gboolean compact;
  AwraValidationState validation_state;
};

enum {
  PROP_0,
  PROP_LABEL,
  PROP_HELP_TEXT,
  PROP_ERROR_MESSAGE,
  PROP_CONTROL,
  PROP_REQUIRED,
  PROP_VALIDATION_STATE,
  N_PROPS
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraFormRow, awra_form_row, GTK_TYPE_WIDGET)

static gboolean
validation_state_is_valid (AwraValidationState state)
{
  return state >= AWRA_VALIDATION_STATE_NONE &&
         state <= AWRA_VALIDATION_STATE_ERROR;
}

static void
update_label (AwraFormRow *self)
{
  g_autofree char *visible = NULL;

  if (self->required && self->label != NULL && *self->label != '\0')
    visible = g_strdup_printf ("%s *", self->label);
  gtk_label_set_text (self->label_widget,
                      visible != NULL ? visible :
                      (self->label != NULL ? self->label : ""));
  gtk_widget_set_visible (GTK_WIDGET (self->label_widget),
                          self->label != NULL && *self->label != '\0');
}

static void
reset_validation_classes (GtkWidget *widget)
{
  gtk_widget_remove_css_class (widget, "awra-validation-success");
  gtk_widget_remove_css_class (widget, "awra-validation-warning");
  gtk_widget_remove_css_class (widget, "awra-validation-error");
}

static void
update_accessibility (AwraFormRow *self)
{
  if (self->control == NULL)
    return;
  gtk_label_set_mnemonic_widget (self->label_widget, self->control);
  gtk_accessible_update_property (
    GTK_ACCESSIBLE (self->control),
    GTK_ACCESSIBLE_PROPERTY_LABEL,
    self->label != NULL ? self->label : "",
    -1);
  gtk_accessible_update_state (
    GTK_ACCESSIBLE (self->control),
    GTK_ACCESSIBLE_STATE_INVALID,
    self->validation_state == AWRA_VALIDATION_STATE_ERROR
      ? GTK_ACCESSIBLE_INVALID_TRUE
      : GTK_ACCESSIBLE_INVALID_FALSE,
    -1);
  gtk_accessible_update_property (
    GTK_ACCESSIBLE (self->control),
    GTK_ACCESSIBLE_PROPERTY_DESCRIPTION,
    self->validation_state == AWRA_VALIDATION_STATE_ERROR &&
    self->error_message != NULL
      ? self->error_message
      : (self->help_text != NULL ? self->help_text : ""),
    -1);
}

static void
update_validation (AwraFormRow *self)
{
  gboolean show_error =
    self->validation_state == AWRA_VALIDATION_STATE_ERROR &&
    self->error_message != NULL && *self->error_message != '\0';
  GtkWidget *widget = GTK_WIDGET (self);

  reset_validation_classes (widget);
  if (self->control != NULL)
    reset_validation_classes (self->control);
  switch (self->validation_state) {
  case AWRA_VALIDATION_STATE_SUCCESS:
    gtk_widget_add_css_class (widget, "awra-validation-success");
    if (self->control != NULL)
      gtk_widget_add_css_class (self->control, "awra-validation-success");
    break;
  case AWRA_VALIDATION_STATE_WARNING:
    gtk_widget_add_css_class (widget, "awra-validation-warning");
    if (self->control != NULL)
      gtk_widget_add_css_class (self->control, "awra-validation-warning");
    break;
  case AWRA_VALIDATION_STATE_ERROR:
    gtk_widget_add_css_class (widget, "awra-validation-error");
    if (self->control != NULL)
      gtk_widget_add_css_class (self->control, "awra-validation-error");
    break;
  case AWRA_VALIDATION_STATE_NONE:
  default:
    break;
  }
  gtk_widget_set_visible (GTK_WIDGET (self->error_widget), show_error);
  gtk_widget_set_visible (GTK_WIDGET (self->help_widget),
                          !show_error && self->help_text != NULL &&
                          *self->help_text != '\0');
  update_accessibility (self);
}

static void
update_responsive_layout (AwraFormRow *self,
                          int          width)
{
  gboolean compact = width < 560;

  if (self->compact == compact)
    return;
  self->compact = compact;
  gtk_orientable_set_orientation (GTK_ORIENTABLE (self->root),
                                  compact ? GTK_ORIENTATION_VERTICAL
                                          : GTK_ORIENTATION_HORIZONTAL);
  gtk_widget_set_size_request (GTK_WIDGET (self->label_widget),
                               compact ? -1 : 176, -1);
  gtk_widget_set_valign (GTK_WIDGET (self->label_widget),
                         compact ? GTK_ALIGN_START : GTK_ALIGN_CENTER);
  if (compact)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-compact");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-compact");
}

static GtkSizeRequestMode
awra_form_row_request_mode (GtkWidget *widget)
{
  return gtk_widget_get_request_mode (
    GTK_WIDGET (AWRA_FORM_ROW (widget)->root));
}

static void
awra_form_row_measure (GtkWidget *widget, GtkOrientation orientation,
                       int for_size, int *minimum, int *natural,
                       int *minimum_baseline, int *natural_baseline)
{
  gtk_widget_measure (GTK_WIDGET (AWRA_FORM_ROW (widget)->root), orientation,
                      for_size, minimum, natural, minimum_baseline,
                      natural_baseline);
}

static void
awra_form_row_allocate (GtkWidget *widget, int width, int height,
                        int baseline)
{
  AwraFormRow *self = AWRA_FORM_ROW (widget);

  update_responsive_layout (self, width);
  gtk_widget_allocate (GTK_WIDGET (self->root), width, height, baseline, NULL);
}

static void
awra_form_row_dispose (GObject *object)
{
  AwraFormRow *self = AWRA_FORM_ROW (object);

  if (self->root != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->root));
    self->root = NULL;
    self->label_widget = NULL;
    self->field = NULL;
    self->help_widget = NULL;
    self->error_widget = NULL;
    self->control = NULL;
  }
  G_OBJECT_CLASS (awra_form_row_parent_class)->dispose (object);
}

static void
awra_form_row_finalize (GObject *object)
{
  AwraFormRow *self = AWRA_FORM_ROW (object);

  g_clear_pointer (&self->label, g_free);
  g_clear_pointer (&self->help_text, g_free);
  g_clear_pointer (&self->error_message, g_free);
  G_OBJECT_CLASS (awra_form_row_parent_class)->finalize (object);
}

static void
awra_form_row_get_property (GObject    *object,
                            guint       property_id,
                            GValue     *value,
                            GParamSpec *pspec)
{
  AwraFormRow *self = AWRA_FORM_ROW (object);

  switch (property_id) {
  case PROP_LABEL: g_value_set_string (value, self->label); break;
  case PROP_HELP_TEXT: g_value_set_string (value, self->help_text); break;
  case PROP_ERROR_MESSAGE: g_value_set_string (value, self->error_message); break;
  case PROP_CONTROL: g_value_set_object (value, self->control); break;
  case PROP_REQUIRED: g_value_set_boolean (value, self->required); break;
  case PROP_VALIDATION_STATE: g_value_set_enum (value, self->validation_state); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_form_row_set_property (GObject      *object,
                            guint         property_id,
                            const GValue *value,
                            GParamSpec   *pspec)
{
  AwraFormRow *self = AWRA_FORM_ROW (object);

  switch (property_id) {
  case PROP_LABEL: awra_form_row_set_label (self, g_value_get_string (value)); break;
  case PROP_HELP_TEXT: awra_form_row_set_help_text (self, g_value_get_string (value)); break;
  case PROP_ERROR_MESSAGE: awra_form_row_set_error_message (self, g_value_get_string (value)); break;
  case PROP_CONTROL: awra_form_row_set_control (self, g_value_get_object (value)); break;
  case PROP_REQUIRED: awra_form_row_set_required (self, g_value_get_boolean (value)); break;
  case PROP_VALIDATION_STATE: awra_form_row_set_validation_state (self, g_value_get_enum (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_form_row_class_init (AwraFormRowClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_form_row_dispose;
  object_class->finalize = awra_form_row_finalize;
  object_class->get_property = awra_form_row_get_property;
  object_class->set_property = awra_form_row_set_property;
  properties[PROP_LABEL] = g_param_spec_string (
    "label", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_HELP_TEXT] = g_param_spec_string (
    "help-text", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ERROR_MESSAGE] = g_param_spec_string (
    "error-message", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_CONTROL] = g_param_spec_object (
    "control", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_REQUIRED] = g_param_spec_boolean (
    "required", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_VALIDATION_STATE] = g_param_spec_enum (
    "validation-state", NULL, NULL, AWRA_TYPE_VALIDATION_STATE,
    AWRA_VALIDATION_STATE_NONE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_css_name (widget_class, "awraformrow");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_form_row_init (AwraFormRow *self)
{
  gtk_widget_set_layout_manager (
    GTK_WIDGET (self),
    gtk_custom_layout_new (awra_form_row_request_mode,
                           awra_form_row_measure,
                           awra_form_row_allocate));
  self->root = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->field = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  self->label_widget = GTK_LABEL (gtk_label_new (NULL));
  self->help_widget = GTK_LABEL (gtk_label_new (NULL));
  self->error_widget = GTK_LABEL (gtk_label_new (NULL));
  self->validation_state = AWRA_VALIDATION_STATE_NONE;
  awra_box_set_spacing (self->root, AWRA_SPACING_LG);
  awra_box_set_spacing (self->field, AWRA_SPACING_XS);
  awra_widget_set_typography (GTK_WIDGET (self->label_widget),
                              AWRA_TYPOGRAPHY_BODY);
  awra_widget_set_typography (GTK_WIDGET (self->help_widget),
                              AWRA_TYPOGRAPHY_MUTED);
  awra_widget_set_typography (GTK_WIDGET (self->error_widget),
                              AWRA_TYPOGRAPHY_MUTED);
  gtk_widget_add_css_class (GTK_WIDGET (self->error_widget),
                            "awra-form-error");
  gtk_label_set_xalign (self->label_widget, 0.0f);
  gtk_label_set_xalign (self->help_widget, 0.0f);
  gtk_label_set_xalign (self->error_widget, 0.0f);
  gtk_label_set_wrap (self->help_widget, TRUE);
  gtk_label_set_wrap (self->error_widget, TRUE);
  gtk_widget_set_hexpand (GTK_WIDGET (self->field), TRUE);
  gtk_widget_set_size_request (GTK_WIDGET (self->label_widget), 176, -1);
  gtk_box_append (self->root, GTK_WIDGET (self->label_widget));
  gtk_box_append (self->root, GTK_WIDGET (self->field));
  gtk_box_append (self->field, GTK_WIDGET (self->help_widget));
  gtk_box_append (self->field, GTK_WIDGET (self->error_widget));
  gtk_widget_set_parent (GTK_WIDGET (self->root), GTK_WIDGET (self));
  update_label (self);
  update_validation (self);
}

GtkWidget *awra_form_row_new (void) { return g_object_new (AWRA_TYPE_FORM_ROW, NULL); }
const char *awra_form_row_get_label (AwraFormRow *self) { g_return_val_if_fail (AWRA_IS_FORM_ROW (self), NULL); return self->label; }
void awra_form_row_set_label (AwraFormRow *self, const char *label) { g_return_if_fail (AWRA_IS_FORM_ROW (self)); if (g_strcmp0 (self->label, label) == 0) return; g_free (self->label); self->label = g_strdup (label); update_label (self); update_accessibility (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LABEL]); }
const char *awra_form_row_get_help_text (AwraFormRow *self) { g_return_val_if_fail (AWRA_IS_FORM_ROW (self), NULL); return self->help_text; }
void awra_form_row_set_help_text (AwraFormRow *self, const char *text) { g_return_if_fail (AWRA_IS_FORM_ROW (self)); if (g_strcmp0 (self->help_text, text) == 0) return; g_free (self->help_text); self->help_text = g_strdup (text); gtk_label_set_text (self->help_widget, text != NULL ? text : ""); update_validation (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_HELP_TEXT]); }
const char *awra_form_row_get_error_message (AwraFormRow *self) { g_return_val_if_fail (AWRA_IS_FORM_ROW (self), NULL); return self->error_message; }
void awra_form_row_set_error_message (AwraFormRow *self, const char *message) { g_return_if_fail (AWRA_IS_FORM_ROW (self)); if (g_strcmp0 (self->error_message, message) == 0) return; g_free (self->error_message); self->error_message = g_strdup (message); gtk_label_set_text (self->error_widget, message != NULL ? message : ""); update_validation (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ERROR_MESSAGE]); }
GtkWidget *awra_form_row_get_control (AwraFormRow *self) { g_return_val_if_fail (AWRA_IS_FORM_ROW (self), NULL); return self->control; }
void awra_form_row_set_control (AwraFormRow *self, GtkWidget *control) { g_return_if_fail (AWRA_IS_FORM_ROW (self)); g_return_if_fail (control == NULL || GTK_IS_WIDGET (control)); if (self->control == control) return; if (self->control != NULL) gtk_box_remove (self->field, self->control); self->control = control; if (control != NULL) { gtk_widget_set_hexpand (control, TRUE); gtk_box_prepend (self->field, control); } update_validation (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CONTROL]); }
gboolean awra_form_row_get_required (AwraFormRow *self) { g_return_val_if_fail (AWRA_IS_FORM_ROW (self), FALSE); return self->required; }
void awra_form_row_set_required (AwraFormRow *self, gboolean required) { g_return_if_fail (AWRA_IS_FORM_ROW (self)); required = !!required; if (self->required == required) return; self->required = required; update_label (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_REQUIRED]); }
AwraValidationState awra_form_row_get_validation_state (AwraFormRow *self) { g_return_val_if_fail (AWRA_IS_FORM_ROW (self), AWRA_VALIDATION_STATE_NONE); return self->validation_state; }
void awra_form_row_set_validation_state (AwraFormRow *self, AwraValidationState state) { g_return_if_fail (AWRA_IS_FORM_ROW (self)); g_return_if_fail (validation_state_is_valid (state)); if (self->validation_state == state) return; self->validation_state = state; update_validation (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_VALIDATION_STATE]); }
