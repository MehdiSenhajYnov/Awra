/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-keyboard-view.h>
#include <awra/awra-shortcut-capture.h>

#include "awra-i18n-private.h"
#include "widgets/awra-key-codes-private.h"

struct _AwraShortcutCapture {
  GtkWidget parent_instance;

  GtkBox *box;
  GtkLabel *status;

  GArray *keycodes;
  GArray *keyvals;
  GdkModifierType modifiers;
  char **display_labels;
  char *placeholder;
  gboolean allow_chords;

  gboolean keyvals_from_layout;
  gboolean listening;
  GArray *held;
  GArray *pending_keycodes;
  GArray *pending_keyvals;
};

enum {
  PROP_0,
  PROP_LISTENING,
  PROP_ALLOW_CHORDS,
  PROP_PLACEHOLDER,
  N_PROPS,
};

enum {
  SIGNAL_CAPTURED,
  SIGNAL_CANCELLED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraShortcutCapture, awra_shortcut_capture,
                     GTK_TYPE_WIDGET)

static GdkModifierType
modifier_for_keyval (guint keyval)
{
  switch (keyval) {
  case GDK_KEY_Shift_L:
  case GDK_KEY_Shift_R:
    return GDK_SHIFT_MASK;
  case GDK_KEY_Control_L:
  case GDK_KEY_Control_R:
    return GDK_CONTROL_MASK;
  case GDK_KEY_Alt_L:
  case GDK_KEY_Alt_R:
  case GDK_KEY_Meta_L:
  case GDK_KEY_Meta_R:
    return GDK_ALT_MASK;
  case GDK_KEY_Super_L:
  case GDK_KEY_Super_R:
  case GDK_KEY_Hyper_L:
  case GDK_KEY_Hyper_R:
    return GDK_SUPER_MASK;
  default:
    return 0;
  }
}

static gboolean
is_modifier_keyval (guint keyval)
{
  return modifier_for_keyval (keyval) != 0 ||
         keyval == GDK_KEY_ISO_Level3_Shift ||
         keyval == GDK_KEY_Mode_switch;
}

static gboolean
array_contains (GArray *array,
                guint   value,
                guint  *index_out)
{
  for (guint i = 0; i < array->len; i++) {
    if (g_array_index (array, guint, i) == value) {
      if (index_out != NULL)
        *index_out = i;
      return TRUE;
    }
  }
  return FALSE;
}

static guint
keyval_for_keycode (AwraShortcutCapture *self,
                    guint                keycode,
                    int                  layout,
                    guint                fallback)
{
  guint keyval = 0;

  if (gdk_display_translate_key (gtk_widget_get_display (GTK_WIDGET (self)),
                                 keycode, 0, layout, &keyval, NULL, NULL,
                                 NULL) &&
      keyval != 0)
    return keyval;
  return gdk_keyval_to_lower (fallback);
}

static char *
label_for_key (AwraShortcutCapture *self,
               guint                keycode,
               guint                keyval)
{
  const AwraKeyCodeInfo *info = awra_key_code_info_lookup_keycode (keycode);

  /* Numpad and navigation keys keep their physical legend; printable keys
   * use the keyval that was actually produced. */
  if (info != NULL && info->kind == AWRA_KEY_LABEL_FIXED &&
      modifier_for_keyval (keyval) == 0)
    return awra_key_code_info_dup_label (info, NULL, 0);
  (void) self;
  return awra_key_keyval_dup_label (keyval);
}

static void
rebuild (AwraShortcutCapture *self)
{
  g_autoptr (GStrvBuilder) names = g_strv_builder_new ();
  g_auto (GStrv) accessible_parts = NULL;
  g_autofree char *accessible = NULL;
  GArray *codes = self->listening ? self->pending_keycodes : self->keycodes;
  GArray *vals = self->listening ? self->pending_keyvals : self->keyvals;
  GtkWidget *child;
  const char *status_text = NULL;

  child = gtk_widget_get_first_child (GTK_WIDGET (self->box));
  while (child != NULL) {
    GtkWidget *next = gtk_widget_get_next_sibling (child);

    if (child != GTK_WIDGET (self->status))
      gtk_box_remove (self->box, child);
    child = next;
  }

  if (!self->listening && self->display_labels != NULL) {
    for (guint i = 0; self->display_labels[i] != NULL; i++)
      g_strv_builder_add (names, self->display_labels[i]);
  } else {
    for (guint i = 0; i < codes->len; i++) {
      g_autofree char *label = label_for_key (
        self, g_array_index (codes, guint, i), g_array_index (vals, guint, i));

      g_strv_builder_add (names, label);
    }
  }
  accessible_parts = g_strv_builder_end (names);

  /* Chips precede the status text; RTL mirroring is owned by GtkBox. */
  for (int i = (int) g_strv_length (accessible_parts) - 1; i >= 0; i--) {
    GtkWidget *chip = gtk_label_new (accessible_parts[i]);

    gtk_widget_add_css_class (chip, "awra-shortcut-chip");
    gtk_accessible_update_state (GTK_ACCESSIBLE (chip),
                                 GTK_ACCESSIBLE_STATE_HIDDEN, TRUE, -1);
    gtk_box_prepend (self->box, chip);
  }

  if (self->listening)
    status_text = accessible_parts[0] == NULL ? _("Press keys…") : "…";
  else if (accessible_parts[0] == NULL)
    status_text = self->placeholder != NULL ? self->placeholder
                                            : _("Not set");
  gtk_label_set_text (self->status, status_text != NULL ? status_text : "");
  gtk_widget_set_visible (GTK_WIDGET (self->status), status_text != NULL);

  if (self->listening)
    accessible = g_strdup (_("Press keys…"));
  else if (accessible_parts[0] != NULL)
    accessible = g_strjoinv ("+", accessible_parts);
  else
    accessible = g_strdup (status_text);
  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL, accessible,
                                  GTK_ACCESSIBLE_PROPERTY_DESCRIPTION,
                                  _("Activate to record a new shortcut"),
                                  -1);
  gtk_accessible_update_state (GTK_ACCESSIBLE (self),
                               GTK_ACCESSIBLE_STATE_PRESSED, self->listening,
                               -1);
}

static void
set_listening (AwraShortcutCapture *self,
               gboolean             listening)
{
  if (self->listening == listening)
    return;
  self->listening = listening;
  g_array_set_size (self->held, 0);
  g_array_set_size (self->pending_keycodes, 0);
  g_array_set_size (self->pending_keyvals, 0);
  if (listening)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-shortcut-listening");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-shortcut-listening");
  rebuild (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LISTENING]);
}

static void
commit (AwraShortcutCapture *self)
{
  GdkModifierType modifiers = 0;

  g_array_set_size (self->keycodes, 0);
  g_array_set_size (self->keyvals, 0);
  g_array_append_vals (self->keycodes, self->pending_keycodes->data,
                       self->pending_keycodes->len);
  g_array_append_vals (self->keyvals, self->pending_keyvals->data,
                       self->pending_keyvals->len);
  for (guint i = 0; i < self->keyvals->len; i++)
    modifiers |= modifier_for_keyval (g_array_index (self->keyvals, guint, i));
  self->modifiers = modifiers;
  self->keyvals_from_layout = FALSE;
  g_clear_pointer (&self->display_labels, g_strfreev);
  set_listening (self, FALSE);
  g_signal_emit (self, signals[SIGNAL_CAPTURED], 0);
}

static gboolean
key_pressed_cb (GtkEventControllerKey *controller,
                guint                  keyval,
                guint                  keycode,
                GdkModifierType        state,
                AwraShortcutCapture   *self)
{
  GdkEvent *event;
  int layout = 0;
  guint base;

  (void) state;
  if (!self->listening) {
    if (keyval == GDK_KEY_Return || keyval == GDK_KEY_KP_Enter ||
        keyval == GDK_KEY_ISO_Enter || keyval == GDK_KEY_space ||
        keyval == GDK_KEY_KP_Space) {
      awra_shortcut_capture_start (self);
      return TRUE;
    }
    return FALSE;
  }

  if (keyval == GDK_KEY_Escape && self->held->len == 0 &&
      self->pending_keycodes->len == 0) {
    awra_shortcut_capture_cancel (self);
    return TRUE;
  }
  if (array_contains (self->held, keycode, NULL))
    return TRUE; /* auto-repeat */

  event = gtk_event_controller_get_current_event (
    GTK_EVENT_CONTROLLER (controller));
  if (event != NULL && gdk_event_get_event_type (event) == GDK_KEY_PRESS)
    layout = (int) gdk_key_event_get_layout (event);
  base = keyval_for_keycode (self, keycode, layout, keyval);

  g_array_append_val (self->held, keycode);
  if (array_contains (self->pending_keycodes, keycode, NULL))
    return TRUE;

  if (!self->allow_chords && !is_modifier_keyval (base)) {
    for (guint i = 0; i < self->pending_keyvals->len; i++) {
      if (!is_modifier_keyval (g_array_index (self->pending_keyvals, guint, i))) {
        g_array_remove_index (self->pending_keycodes, i);
        g_array_remove_index (self->pending_keyvals, i);
        break;
      }
    }
  }
  g_array_append_val (self->pending_keycodes, keycode);
  g_array_append_val (self->pending_keyvals, base);
  rebuild (self);
  return TRUE;
}

static void
key_released_cb (GtkEventControllerKey *controller,
                 guint                  keyval,
                 guint                  keycode,
                 GdkModifierType        state,
                 AwraShortcutCapture   *self)
{
  guint index;

  (void) controller;
  (void) keyval;
  (void) state;
  if (!self->listening)
    return;
  if (array_contains (self->held, keycode, &index))
    g_array_remove_index (self->held, index);
  if (self->held->len == 0 && self->pending_keycodes->len > 0)
    commit (self);
}

static void
click_released_cb (GtkGestureClick     *gesture,
                   int                  n_press,
                   double               x,
                   double               y,
                   AwraShortcutCapture *self)
{
  (void) gesture;
  (void) n_press;
  (void) x;
  (void) y;
  if (self->listening)
    awra_shortcut_capture_cancel (self);
  else
    awra_shortcut_capture_start (self);
}

static void
focus_leave_cb (GtkEventControllerFocus *controller,
                AwraShortcutCapture     *self)
{
  (void) controller;
  if (self->listening)
    awra_shortcut_capture_cancel (self);
}

static void
refresh_layout_keyvals (AwraShortcutCapture *self)
{
  int layout = awra_key_codes_get_layout_index (
    gtk_widget_get_display (GTK_WIDGET (self)));

  for (guint i = 0; i < self->keycodes->len; i++)
    g_array_index (self->keyvals, guint, i) = keyval_for_keycode (
      self, g_array_index (self->keycodes, guint, i), layout,
      g_array_index (self->keyvals, guint, i));
}

static void
awra_shortcut_capture_map (GtkWidget *widget)
{
  AwraShortcutCapture *self = AWRA_SHORTCUT_CAPTURE (widget);

  GTK_WIDGET_CLASS (awra_shortcut_capture_parent_class)->map (widget);
  /* Stored shortcuts follow the layout that is active when shown. */
  if (self->keyvals_from_layout) {
    refresh_layout_keyvals (self);
    rebuild (self);
  }
}

static void
awra_shortcut_capture_dispose (GObject *object)
{
  AwraShortcutCapture *self = AWRA_SHORTCUT_CAPTURE (object);

  if (self->box != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->box));
    self->box = NULL;
    self->status = NULL;
  }
  G_OBJECT_CLASS (awra_shortcut_capture_parent_class)->dispose (object);
}

static void
awra_shortcut_capture_finalize (GObject *object)
{
  AwraShortcutCapture *self = AWRA_SHORTCUT_CAPTURE (object);

  g_array_unref (self->keycodes);
  g_array_unref (self->keyvals);
  g_array_unref (self->held);
  g_array_unref (self->pending_keycodes);
  g_array_unref (self->pending_keyvals);
  g_strfreev (self->display_labels);
  g_free (self->placeholder);
  G_OBJECT_CLASS (awra_shortcut_capture_parent_class)->finalize (object);
}

static void
awra_shortcut_capture_get_property (GObject    *object,
                                    guint       property_id,
                                    GValue     *value,
                                    GParamSpec *pspec)
{
  AwraShortcutCapture *self = AWRA_SHORTCUT_CAPTURE (object);

  switch (property_id) {
  case PROP_LISTENING:
    g_value_set_boolean (value, self->listening);
    break;
  case PROP_ALLOW_CHORDS:
    g_value_set_boolean (value, self->allow_chords);
    break;
  case PROP_PLACEHOLDER:
    g_value_set_string (value, self->placeholder);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_shortcut_capture_set_property (GObject      *object,
                                    guint         property_id,
                                    const GValue *value,
                                    GParamSpec   *pspec)
{
  AwraShortcutCapture *self = AWRA_SHORTCUT_CAPTURE (object);

  switch (property_id) {
  case PROP_ALLOW_CHORDS:
    awra_shortcut_capture_set_allow_chords (self, g_value_get_boolean (value));
    break;
  case PROP_PLACEHOLDER:
    awra_shortcut_capture_set_placeholder (self, g_value_get_string (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_shortcut_capture_class_init (AwraShortcutCaptureClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_shortcut_capture_dispose;
  object_class->finalize = awra_shortcut_capture_finalize;
  object_class->get_property = awra_shortcut_capture_get_property;
  object_class->set_property = awra_shortcut_capture_set_property;
  widget_class->map = awra_shortcut_capture_map;

  properties[PROP_LISTENING] =
    g_param_spec_boolean ("listening", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_ALLOW_CHORDS] =
    g_param_spec_boolean ("allow-chords", NULL, NULL, FALSE,
                          G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                          G_PARAM_STATIC_STRINGS);
  properties[PROP_PLACEHOLDER] =
    g_param_spec_string ("placeholder", NULL, NULL, NULL,
                         G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraShortcutCapture::captured:
   * @self: the shortcut capture
   *
   * Emitted when every key of a new combination has been released. Read the
   * result with awra_shortcut_capture_get_keycodes(),
   * awra_shortcut_capture_get_codes() and
   * awra_shortcut_capture_get_modifiers().
   */
  signals[SIGNAL_CAPTURED] =
    g_signal_new ("captured", G_TYPE_FROM_CLASS (klass), G_SIGNAL_RUN_LAST,
                  0, NULL, NULL, NULL, G_TYPE_NONE, 0);
  /**
   * AwraShortcutCapture::cancelled:
   * @self: the shortcut capture
   *
   * Emitted when listening stops without a new combination: Escape, a second
   * click or focus leaving the control. The previous shortcut is kept.
   */
  signals[SIGNAL_CANCELLED] =
    g_signal_new ("cancelled", G_TYPE_FROM_CLASS (klass), G_SIGNAL_RUN_LAST,
                  0, NULL, NULL, NULL, G_TYPE_NONE, 0);

  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awrashortcutcapture");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_BUTTON);
}

static void
awra_shortcut_capture_init (AwraShortcutCapture *self)
{
  GtkEventController *keys;
  GtkEventController *focus;
  GtkGesture *click;

  self->keycodes = g_array_new (FALSE, FALSE, sizeof (guint));
  self->keyvals = g_array_new (FALSE, FALSE, sizeof (guint));
  self->held = g_array_new (FALSE, FALSE, sizeof (guint));
  self->pending_keycodes = g_array_new (FALSE, FALSE, sizeof (guint));
  self->pending_keyvals = g_array_new (FALSE, FALSE, sizeof (guint));

  self->box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 4));
  gtk_widget_set_valign (GTK_WIDGET (self->box), GTK_ALIGN_CENTER);
  self->status = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->status), "awra-shortcut-status");
  gtk_label_set_ellipsize (self->status, PANGO_ELLIPSIZE_END);
  gtk_accessible_update_state (GTK_ACCESSIBLE (self->status),
                               GTK_ACCESSIBLE_STATE_HIDDEN, TRUE, -1);
  gtk_box_append (self->box, GTK_WIDGET (self->status));
  gtk_widget_set_parent (GTK_WIDGET (self->box), GTK_WIDGET (self));
  gtk_widget_set_focusable (GTK_WIDGET (self), TRUE);
  gtk_widget_set_halign (GTK_WIDGET (self), GTK_ALIGN_START);
  gtk_widget_set_cursor_from_name (GTK_WIDGET (self), "pointer");

  /* Capture phase: while listening, no key reaches descendants, the window,
   * shortcuts or mnemonics. */
  keys = gtk_event_controller_key_new ();
  gtk_event_controller_set_propagation_phase (keys, GTK_PHASE_CAPTURE);
  g_signal_connect (keys, "key-pressed", G_CALLBACK (key_pressed_cb), self);
  g_signal_connect (keys, "key-released", G_CALLBACK (key_released_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), keys);

  click = gtk_gesture_click_new ();
  gtk_gesture_single_set_button (GTK_GESTURE_SINGLE (click), GDK_BUTTON_PRIMARY);
  g_signal_connect (click, "released", G_CALLBACK (click_released_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), GTK_EVENT_CONTROLLER (click));

  focus = gtk_event_controller_focus_new ();
  g_signal_connect (focus, "leave", G_CALLBACK (focus_leave_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), focus);

  rebuild (self);
}

GtkWidget *
awra_shortcut_capture_new (void)
{
  return g_object_new (AWRA_TYPE_SHORTCUT_CAPTURE, NULL);
}

/**
 * awra_shortcut_capture_start:
 * @self: an Awra shortcut capture
 *
 * Focuses the control and starts listening for a new combination.
 */
void
awra_shortcut_capture_start (AwraShortcutCapture *self)
{
  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  if (gtk_widget_get_focusable (GTK_WIDGET (self)))
    gtk_widget_grab_focus (GTK_WIDGET (self));
  set_listening (self, TRUE);
}

/**
 * awra_shortcut_capture_cancel:
 * @self: an Awra shortcut capture
 *
 * Stops listening and keeps the previous combination. Emits
 * #AwraShortcutCapture::cancelled when a capture was in progress.
 */
void
awra_shortcut_capture_cancel (AwraShortcutCapture *self)
{
  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  if (!self->listening)
    return;
  set_listening (self, FALSE);
  g_signal_emit (self, signals[SIGNAL_CANCELLED], 0);
}

void
awra_shortcut_capture_clear (AwraShortcutCapture *self)
{
  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  if (self->listening)
    awra_shortcut_capture_cancel (self);
  g_array_set_size (self->keycodes, 0);
  g_array_set_size (self->keyvals, 0);
  self->modifiers = 0;
  g_clear_pointer (&self->display_labels, g_strfreev);
  rebuild (self);
}

gboolean
awra_shortcut_capture_get_listening (AwraShortcutCapture *self)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), FALSE);
  return self->listening;
}

gboolean
awra_shortcut_capture_get_allow_chords (AwraShortcutCapture *self)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), FALSE);
  return self->allow_chords;
}

void
awra_shortcut_capture_set_allow_chords (AwraShortcutCapture *self,
                                        gboolean             allow_chords)
{
  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  allow_chords = !!allow_chords;
  if (self->allow_chords == allow_chords)
    return;
  self->allow_chords = allow_chords;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ALLOW_CHORDS]);
}

const char *
awra_shortcut_capture_get_placeholder (AwraShortcutCapture *self)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), NULL);
  return self->placeholder;
}

void
awra_shortcut_capture_set_placeholder (AwraShortcutCapture *self,
                                       const char          *placeholder)
{
  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  if (!g_set_str (&self->placeholder, placeholder))
    return;
  rebuild (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_PLACEHOLDER]);
}

const guint *
awra_shortcut_capture_get_keycodes (AwraShortcutCapture *self,
                                    guint               *n_keycodes)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), NULL);
  g_return_val_if_fail (n_keycodes != NULL, NULL);
  *n_keycodes = self->keycodes->len;
  return self->keycodes->len > 0 ? (const guint *) self->keycodes->data : NULL;
}

const guint *
awra_shortcut_capture_get_keyvals (AwraShortcutCapture *self,
                                   guint               *n_keyvals)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), NULL);
  g_return_val_if_fail (n_keyvals != NULL, NULL);
  *n_keyvals = self->keyvals->len;
  return self->keyvals->len > 0 ? (const guint *) self->keyvals->data : NULL;
}

char **
awra_shortcut_capture_get_codes (AwraShortcutCapture *self)
{
  g_autoptr (GStrvBuilder) builder = g_strv_builder_new ();

  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), NULL);
  for (guint i = 0; i < self->keycodes->len; i++) {
    const char *code = awra_keyboard_code_from_hardware_keycode (
      g_array_index (self->keycodes, guint, i));

    g_strv_builder_add (builder, code != NULL ? code : "Unidentified");
  }
  return g_strv_builder_end (builder);
}

GdkModifierType
awra_shortcut_capture_get_modifiers (AwraShortcutCapture *self)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), 0);
  return self->modifiers;
}

void
awra_shortcut_capture_set_shortcut (AwraShortcutCapture *self,
                                    const guint         *keycodes,
                                    guint                n_keycodes,
                                    GdkModifierType      modifiers)
{
  GdkDisplay *display;
  int layout;

  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  g_return_if_fail (keycodes != NULL || n_keycodes == 0);
  if (self->listening)
    set_listening (self, FALSE);
  display = gtk_widget_get_display (GTK_WIDGET (self));
  layout = awra_key_codes_get_layout_index (display);
  g_array_set_size (self->keycodes, 0);
  g_array_set_size (self->keyvals, 0);
  for (guint i = 0; i < n_keycodes; i++) {
    guint keyval = keyval_for_keycode (self, keycodes[i], layout, 0);

    g_array_append_val (self->keycodes, keycodes[i]);
    g_array_append_val (self->keyvals, keyval);
  }
  self->modifiers = modifiers & gtk_accelerator_get_default_mod_mask ();
  self->keyvals_from_layout = TRUE;
  g_clear_pointer (&self->display_labels, g_strfreev);
  rebuild (self);
}

const char * const *
awra_shortcut_capture_get_display_labels (AwraShortcutCapture *self)
{
  g_return_val_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self), NULL);
  return (const char * const *) self->display_labels;
}

void
awra_shortcut_capture_set_display_labels (AwraShortcutCapture *self,
                                          const char * const  *labels)
{
  g_return_if_fail (AWRA_IS_SHORTCUT_CAPTURE (self));
  g_strfreev (self->display_labels);
  self->display_labels = labels != NULL && labels[0] != NULL
                           ? g_strdupv ((char **) labels) : NULL;
  rebuild (self);
}
