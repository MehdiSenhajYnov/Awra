/* SPDX-License-Identifier: LGPL-2.1-or-later */

/* Behaviour and lifecycle tests for the media and keyboard input family:
 * AwraKeyCap, AwraKeyboardView, AwraShortcutCapture, AwraWaveformView,
 * AwraVolumeControl, AwraMediaRow, AwraDropZone and toast actions. */

#include <awra/awra.h>
#include <math.h>

typedef struct {
  guint count;
  double last_value;
  char *last_code;
  GdkModifierType last_modifiers;
} SignalLog;

static void
signal_log_clear (SignalLog *log)
{
  g_clear_pointer (&log->last_code, g_free);
  memset (log, 0, sizeof *log);
}

static void
count_cb (gpointer   instance,
          SignalLog *log)
{
  (void) instance;
  log->count++;
}

static void
double_cb (gpointer   instance,
           double     value,
           SignalLog *log)
{
  (void) instance;
  log->count++;
  log->last_value = value;
}

static void
modifiers_cb (gpointer         instance,
              GdkModifierType  modifiers,
              SignalLog       *log)
{
  (void) instance;
  log->count++;
  log->last_modifiers = modifiers;
}

static void
code_modifiers_cb (gpointer         instance,
                   const char      *code,
                   GdkModifierType  modifiers,
                   SignalLog       *log)
{
  (void) instance;
  log->count++;
  g_free (log->last_code);
  log->last_code = g_strdup (code);
  log->last_modifiers = modifiers;
}

static void
settle (GtkWidget *window)
{
  g_autoptr (GMainLoop) loop = g_main_loop_new (NULL, FALSE);

  g_timeout_add_once (180, (GSourceOnceFunc) g_main_loop_quit, loop);
  g_main_loop_run (loop);
  gtk_test_widget_wait_for_draw (window);
}

static GtkEventController *
find_controller (GtkWidget *widget,
                 GType      type)
{
  g_autoptr (GListModel) controllers = gtk_widget_observe_controllers (widget);

  for (guint i = 0; i < g_list_model_get_n_items (controllers); i++) {
    g_autoptr (GtkEventController) controller =
      g_list_model_get_item (controllers, i);

    if (G_TYPE_CHECK_INSTANCE_TYPE (controller, type))
      return controller;
  }
  return NULL;
}

static gboolean
press_key (GtkWidget       *widget,
           guint            keyval,
           guint            keycode,
           GdkModifierType  state)
{
  GtkEventController *keys = find_controller (widget,
                                              GTK_TYPE_EVENT_CONTROLLER_KEY);
  gboolean handled = FALSE;

  g_assert_nonnull (keys);
  g_signal_emit_by_name (keys, "key-pressed", keyval, keycode, state,
                         &handled);
  return handled;
}

static void
release_key (GtkWidget       *widget,
             guint            keyval,
             guint            keycode,
             GdkModifierType  state)
{
  GtkEventController *keys = find_controller (widget,
                                              GTK_TYPE_EVENT_CONTROLLER_KEY);

  g_assert_nonnull (keys);
  g_signal_emit_by_name (keys, "key-released", keyval, keycode, state);
}

static GtkWidget *
find_descendant (GtkWidget  *root,
                 GType       type,
                 const char *css_class)
{
  for (GtkWidget *child = gtk_widget_get_first_child (root);
       child != NULL;
       child = gtk_widget_get_next_sibling (child)) {
    GtkWidget *found;

    if (G_TYPE_CHECK_INSTANCE_TYPE (child, type) &&
        (css_class == NULL || gtk_widget_has_css_class (child, css_class)))
      return child;
    found = find_descendant (child, type, css_class);
    if (found != NULL)
      return found;
  }
  return NULL;
}

static gboolean
node_contains_type (GskRenderNode     *node,
                    GskRenderNodeType  type)
{
  GskRenderNode **children;
  gsize n_children;

  if (gsk_render_node_get_node_type (node) == type)
    return TRUE;
  children = gsk_render_node_get_children (node, &n_children);
  for (gsize i = 0; i < n_children; i++) {
    if (node_contains_type (children[i], type))
      return TRUE;
  }
  return FALSE;
}

static GskRenderNode *
snapshot_widget (GtkWidget *widget)
{
  g_autoptr (GtkSnapshot) snapshot = gtk_snapshot_new ();

  GTK_WIDGET_GET_CLASS (widget)->snapshot (widget, snapshot);
  return gtk_snapshot_to_node (snapshot);
}

static void
test_key_cap (void)
{
  g_autoptr (GtkWidget) window = g_object_ref_sink (gtk_window_new ());
  GtkWidget *cap = awra_key_cap_new ("KeyA", "A");
  GdkRGBA yellow = { 0.96, 0.82, 0.30, 1.0 };
  GdkRGBA navy = { 0.10, 0.12, 0.32, 1.0 };
  GdkRGBA mood = { 0.85, 0.25, 0.30, 1.0 };
  g_autoptr (GskRenderNode) node = NULL;
  SignalLog log = { 0 };
  int natural_one;
  int natural_two;

  g_object_ref_sink (cap);
  g_assert_cmpstr (awra_key_cap_get_key_code (AWRA_KEY_CAP (cap)), ==, "KeyA");
  g_assert_cmpstr (awra_key_cap_get_label (AWRA_KEY_CAP (cap)), ==, "A");
  g_assert_null (awra_key_cap_get_secondary_label (AWRA_KEY_CAP (cap)));
  g_assert_null (awra_key_cap_get_badge (AWRA_KEY_CAP (cap)));
  g_assert_null (awra_key_cap_get_tint (AWRA_KEY_CAP (cap)));
  g_assert_cmpfloat (awra_key_cap_get_width_units (AWRA_KEY_CAP (cap)), ==, 1.0);
  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (cap)),
                   ==, GTK_ACCESSIBLE_ROLE_BUTTON);
  g_assert_true (gtk_widget_get_focusable (cap));

  gtk_widget_measure (cap, GTK_ORIENTATION_HORIZONTAL, -1, NULL,
                      &natural_one, NULL, NULL);
  awra_key_cap_set_width_units (AWRA_KEY_CAP (cap), 2.0);
  gtk_widget_measure (cap, GTK_ORIENTATION_HORIZONTAL, -1, NULL,
                      &natural_two, NULL, NULL);
  g_assert_cmpint (natural_two, ==, natural_one * 2);
  awra_key_cap_set_width_units (AWRA_KEY_CAP (cap), 100.0);
  g_assert_cmpfloat (awra_key_cap_get_width_units (AWRA_KEY_CAP (cap)), ==,
                     12.0);
  awra_key_cap_set_width_units (AWRA_KEY_CAP (cap), 1.0);

  awra_key_cap_set_secondary_label (AWRA_KEY_CAP (cap), "Explosion");
  g_assert_cmpstr (awra_key_cap_get_secondary_label (AWRA_KEY_CAP (cap)), ==,
                   "Explosion");
  awra_key_cap_set_secondary_label (AWRA_KEY_CAP (cap), "");
  g_assert_null (awra_key_cap_get_secondary_label (AWRA_KEY_CAP (cap)));
  awra_key_cap_set_secondary_label (AWRA_KEY_CAP (cap), "Explosion");
  awra_key_cap_set_badge (AWRA_KEY_CAP (cap), "2");
  g_assert_cmpstr (awra_key_cap_get_badge (AWRA_KEY_CAP (cap)), ==, "2");

  awra_key_cap_set_bound (AWRA_KEY_CAP (cap), TRUE);
  g_assert_true (gtk_widget_has_css_class (cap, "awra-key-cap-bound"));
  awra_key_cap_set_selected (AWRA_KEY_CAP (cap), TRUE);
  g_assert_true (gtk_widget_has_css_class (cap, "awra-key-cap-selected"));

  /* The legend color follows the luminance of the domain tint. */
  awra_key_cap_set_tint (AWRA_KEY_CAP (cap), &yellow);
  g_assert_true (gdk_rgba_equal (awra_key_cap_get_tint (AWRA_KEY_CAP (cap)),
                                 &yellow));
  g_assert_true (gtk_widget_has_css_class (cap, "awra-key-cap-on-light"));
  awra_key_cap_set_tint (AWRA_KEY_CAP (cap), &navy);
  g_assert_true (gtk_widget_has_css_class (cap, "awra-key-cap-on-dark"));
  g_assert_false (gtk_widget_has_css_class (cap, "awra-key-cap-on-light"));
  awra_key_cap_set_tint (AWRA_KEY_CAP (cap), NULL);
  g_assert_false (gtk_widget_has_css_class (cap, "awra-key-cap-on-dark"));
  awra_key_cap_set_edge_color (AWRA_KEY_CAP (cap), &mood);
  g_assert_true (gdk_rgba_equal (
    awra_key_cap_get_edge_color (AWRA_KEY_CAP (cap)), &mood));

  /* Flash is a no-op until the cap is mapped. */
  awra_key_cap_flash (AWRA_KEY_CAP (cap));

  g_signal_connect (cap, "activated", G_CALLBACK (modifiers_cb), &log);
  g_assert_true (press_key (cap, GDK_KEY_Return, 36, GDK_CONTROL_MASK));
  g_assert_cmpuint (log.count, ==, 1);
  g_assert_cmpuint (log.last_modifiers, ==, GDK_CONTROL_MASK);
  g_assert_false (press_key (cap, GDK_KEY_a, 38, 0));
  awra_key_cap_set_dimmed (AWRA_KEY_CAP (cap), TRUE);
  g_assert_true (press_key (cap, GDK_KEY_space, 65, 0));
  g_assert_cmpuint (log.count, ==, 1);
  awra_key_cap_set_dimmed (AWRA_KEY_CAP (cap), FALSE);

  gtk_window_set_child (GTK_WINDOW (window), cap);
  gtk_window_present (GTK_WINDOW (window));
  settle (window);
  awra_key_cap_set_active (AWRA_KEY_CAP (cap), TRUE);
  awra_key_cap_flash (AWRA_KEY_CAP (cap));
  settle (window);
  node = snapshot_widget (cap);
  g_assert_nonnull (node);
  g_assert_true (node_contains_type (node, GSK_OUTSET_SHADOW_NODE));
  g_assert_true (node_contains_type (node, GSK_TEXT_NODE));

  /* Reduced motion keeps the active state but stops every animation. */
  awra_style_manager_set_reduced_motion (
    awra_context_get_style_manager (awra_context_get_for_display (
      gtk_widget_get_display (cap))), TRUE);
  awra_key_cap_flash (AWRA_KEY_CAP (cap));
  settle (window);
  awra_style_manager_set_reduced_motion (
    awra_context_get_style_manager (awra_context_get_for_display (
      gtk_widget_get_display (cap))), FALSE);

  gtk_window_set_child (GTK_WINDOW (window), NULL);
  gtk_window_destroy (GTK_WINDOW (window));
  g_assert_true (AWRA_IS_KEY_CAP (cap));
  g_object_unref (cap);
  signal_log_clear (&log);
}

static void
activate_cap (AwraKeyboardView *view,
              const char       *code,
              GdkModifierType   modifiers)
{
  AwraKeyCap *cap = awra_keyboard_view_get_key_cap (view, code);

  g_assert_nonnull (cap);
  g_signal_emit_by_name (cap, "activated", modifiers);
}

static void
assert_selection (AwraKeyboardView   *view,
                  const char * const *expected)
{
  g_auto (GStrv) selected = awra_keyboard_view_get_selected_codes (view);

  g_assert_cmpstrv (selected, expected);
}

static void
test_keyboard_view (void)
{
  g_autoptr (GtkWidget) window = g_object_ref_sink (gtk_window_new ());
  GtkWidget *keyboard = awra_keyboard_view_new ();
  AwraKeyboardView *view = AWRA_KEYBOARD_VIEW (keyboard);
  AwraKeyCap *cap;
  AwraKeyCap *space;
  g_auto (GStrv) codes = NULL;
  g_autofree char *label = NULL;
  SignalLog selection = { 0 };
  SignalLog activated = { 0 };
  const char *none[] = { NULL };
  const char *only_s[] = { "KeyS", NULL };
  const char *range[] = { "KeyA", "KeyS", "KeyD", "KeyF", NULL };
  const char *toggled[] = { "KeyA", "KeyS", "KeyF", NULL };
  const char *requested[] = { "KeyQ", "Bogus", "KeyW", NULL };
  const char *after_request[] = { "KeyQ", "KeyW", NULL };
  int width;
  GtkWidget *focus;

  g_assert_cmpint (awra_keyboard_view_get_physical_layout (view), ==,
                   AWRA_KEYBOARD_PHYSICAL_LAYOUT_ANSI);
  g_assert_true (awra_keyboard_view_get_show_function_row (view));
  g_assert_true (awra_keyboard_view_get_show_navigation_cluster (view));
  g_assert_false (awra_keyboard_view_get_show_numpad (view));
  g_assert_cmpint (awra_keyboard_view_get_selection_mode (view), ==,
                   GTK_SELECTION_SINGLE);

  codes = awra_keyboard_view_get_codes (view);
  g_assert_cmpstr (codes[0], ==, "Escape");
  g_assert_true (g_strv_contains ((const char * const *) codes, "KeyA"));
  g_assert_true (g_strv_contains ((const char * const *) codes, "ArrowUp"));
  g_assert_false (g_strv_contains ((const char * const *) codes,
                                   "IntlBackslash"));
  g_assert_false (g_strv_contains ((const char * const *) codes, "Numpad5"));
  g_assert_null (awra_keyboard_view_get_key_cap (view, "IntlBackslash"));
  g_assert_null (awra_keyboard_view_get_key_cap (view, "NotAKey"));
  g_clear_pointer (&codes, g_strfreev);

  awra_keyboard_view_set_physical_layout (view,
                                          AWRA_KEYBOARD_PHYSICAL_LAYOUT_ISO);
  awra_keyboard_view_set_show_numpad (view, TRUE);
  awra_keyboard_view_set_show_function_row (view, FALSE);
  codes = awra_keyboard_view_get_codes (view);
  g_assert_cmpstr (codes[0], ==, "Backquote");
  g_assert_true (g_strv_contains ((const char * const *) codes,
                                  "IntlBackslash"));
  g_assert_true (g_strv_contains ((const char * const *) codes, "Numpad5"));
  g_assert_false (g_strv_contains ((const char * const *) codes, "F1"));
  g_clear_pointer (&codes, g_strfreev);

  /* Physical proportions are kept by the caps. */
  cap = awra_keyboard_view_get_key_cap (view, "Backspace");
  g_assert_cmpfloat (awra_key_cap_get_width_units (cap), ==, 2.0);
  space = awra_keyboard_view_get_key_cap (view, "Space");
  g_assert_cmpfloat (awra_key_cap_get_width_units (space), ==, 6.25);
  g_assert_cmpfloat (awra_key_cap_get_width_units (
                       awra_keyboard_view_get_key_cap (view, "ShiftLeft")),
                     ==, 1.25);

  /* Labels: automatic, overridable and restorable. */
  cap = awra_keyboard_view_get_key_cap (view, "KeyA");
  g_assert_cmpstr (awra_key_cap_get_label (cap), !=, "");
  label = g_strdup (awra_key_cap_get_label (cap));
  awra_keyboard_view_set_key_label (view, "KeyA", "Kick");
  g_assert_cmpstr (awra_key_cap_get_label (cap), ==, "Kick");
  awra_keyboard_view_set_key_label (view, "KeyA", NULL);
  g_assert_cmpstr (awra_key_cap_get_label (cap), ==, label);
  g_assert_cmpstr (awra_key_cap_get_label (
                     awra_keyboard_view_get_key_cap (view, "Numpad4")), ==,
                   "4");

  g_signal_connect (view, "selection-changed", G_CALLBACK (count_cb),
                            &selection);
  g_signal_connect (view, "key-activated", G_CALLBACK (code_modifiers_cb),
                    &activated);

  /* Single selection: activation selects and reports the key. */
  activate_cap (view, "KeyA", 0);
  activate_cap (view, "KeyS", 0);
  assert_selection (view, only_s);
  g_assert_cmpuint (selection.count, ==, 2);
  g_assert_cmpuint (activated.count, ==, 2);
  g_assert_cmpstr (activated.last_code, ==, "KeyS");
  activate_cap (view, "KeyS", GDK_CONTROL_MASK);
  assert_selection (view, none);
  g_assert_cmpuint (activated.last_modifiers, ==, GDK_CONTROL_MASK);

  /* Multiple selection: Shift ranges follow visual order, Ctrl toggles. */
  awra_keyboard_view_set_selection_mode (view, GTK_SELECTION_MULTIPLE);
  activate_cap (view, "KeyA", 0);
  activate_cap (view, "KeyF", GDK_SHIFT_MASK);
  assert_selection (view, range);
  activate_cap (view, "KeyD", GDK_CONTROL_MASK);
  assert_selection (view, toggled);
  awra_key_cap_set_dimmed (awra_keyboard_view_get_key_cap (view, "KeyG"),
                           TRUE);
  awra_keyboard_view_select_all (view);
  codes = awra_keyboard_view_get_selected_codes (view);
  g_assert_false (g_strv_contains ((const char * const *) codes, "KeyG"));
  g_assert_true (g_strv_contains ((const char * const *) codes, "Numpad0"));
  g_clear_pointer (&codes, g_strfreev);
  awra_keyboard_view_unselect_all (view);
  assert_selection (view, none);
  awra_keyboard_view_set_selected_codes (view, requested);
  assert_selection (view, after_request);
  awra_keyboard_view_set_selection_mode (view, GTK_SELECTION_SINGLE);
  codes = awra_keyboard_view_get_selected_codes (view);
  g_assert_cmpuint (g_strv_length (codes), ==, 1);
  g_clear_pointer (&codes, g_strfreev);
  awra_keyboard_view_set_selection_mode (view, GTK_SELECTION_NONE);
  assert_selection (view, none);
  awra_keyboard_view_set_selection_mode (view, GTK_SELECTION_SINGLE);

  /* Hiding a section drops its keys from the selection. */
  awra_keyboard_view_set_selected_codes (
    view, (const char *[]) { "Numpad7", NULL });
  selection.count = 0;
  awra_keyboard_view_set_show_numpad (view, FALSE);
  assert_selection (view, none);
  g_assert_cmpuint (selection.count, ==, 1);

  /* Hardware keycodes are evdev + 8. */
  g_assert_cmpstr (awra_keyboard_code_from_hardware_keycode (38), ==, "KeyA");
  g_assert_cmpstr (awra_keyboard_code_from_hardware_keycode (65), ==, "Space");
  g_assert_null (awra_keyboard_code_from_hardware_keycode (3));
  g_assert_cmpuint (awra_keyboard_code_to_hardware_keycode ("Numpad4"), ==,
                    83);
  g_assert_cmpuint (awra_keyboard_code_to_hardware_keycode ("Nope"), ==, 0);
  g_clear_pointer (&label, g_free);
  label = awra_keyboard_code_get_label (NULL, "ArrowLeft");
  g_assert_cmpstr (label, ==, "←");
  g_clear_pointer (&label, g_free);
  label = awra_keyboard_code_get_label (gtk_widget_get_display (keyboard),
                                        "KeyZ");
  g_assert_nonnull (label);
  g_assert_null (awra_keyboard_code_get_label (NULL, "Nope"));

  awra_keyboard_view_set_accepts_file_drops (view, TRUE);
  g_assert_true (awra_keyboard_view_get_accepts_file_drops (view));

  /* Mapped geometry and roving keyboard focus. */
  gtk_window_set_child (GTK_WINDOW (window), keyboard);
  gtk_window_set_default_size (GTK_WINDOW (window), 900, 400);
  gtk_window_present (GTK_WINDOW (window));
  settle (window);
  width = gtk_widget_get_width (GTK_WIDGET (space));
  g_assert_cmpint (width, >, 5 * gtk_widget_get_width (
                     GTK_WIDGET (awra_keyboard_view_get_key_cap (view, "KeyB"))));
  awra_keyboard_view_set_selected_codes (view,
                                         (const char *[]) { "KeyS", NULL });
  gtk_window_set_focus (GTK_WINDOW (window), NULL);
  g_assert_true (gtk_widget_child_focus (keyboard, GTK_DIR_TAB_FORWARD));
  focus = gtk_root_get_focus (GTK_ROOT (window));
  g_assert_true (focus == GTK_WIDGET (awra_keyboard_view_get_key_cap (view,
                                                                       "KeyS")));
  /* Tab leaves the keyboard instead of walking every key. */
  g_assert_false (gtk_widget_child_focus (keyboard, GTK_DIR_TAB_FORWARD));
  g_assert_true (press_key (keyboard, GDK_KEY_Right, 114, 0));
  g_assert_true (gtk_root_get_focus (GTK_ROOT (window)) ==
                 GTK_WIDGET (awra_keyboard_view_get_key_cap (view, "KeyD")));
  assert_selection (view, (const char *[]) { "KeyD", NULL });
  g_assert_true (press_key (keyboard, GDK_KEY_Up, 111, 0));
  g_assert_true (gtk_root_get_focus (GTK_ROOT (window)) ==
                 GTK_WIDGET (awra_keyboard_view_get_key_cap (view, "KeyE")));
  /* End reaches the last key of the physical row, across sections. */
  g_assert_true (press_key (keyboard, GDK_KEY_End, 115, 0));
  g_assert_true (gtk_root_get_focus (GTK_ROOT (window)) ==
                 GTK_WIDGET (awra_keyboard_view_get_key_cap (view, "PageDown")));
  g_assert_true (press_key (keyboard, GDK_KEY_Home, 110, 0));
  g_assert_true (gtk_root_get_focus (GTK_ROOT (window)) ==
                 GTK_WIDGET (awra_keyboard_view_get_key_cap (view, "Tab")));
  /* Ctrl moves the cursor without changing the selection. */
  g_assert_true (press_key (keyboard, GDK_KEY_Down, 116, GDK_CONTROL_MASK));
  g_assert_true (gtk_root_get_focus (GTK_ROOT (window)) ==
                 GTK_WIDGET (awra_keyboard_view_get_key_cap (view, "CapsLock")));
  assert_selection (view, (const char *[]) { "Tab", NULL });

  gtk_window_set_child (GTK_WINDOW (window), NULL);
  gtk_window_destroy (GTK_WINDOW (window));
  signal_log_clear (&selection);
  signal_log_clear (&activated);
}

static void
test_shortcut_capture (void)
{
  g_autoptr (GtkWidget) capture = g_object_ref_sink (
    awra_shortcut_capture_new ());
  AwraShortcutCapture *self = AWRA_SHORTCUT_CAPTURE (capture);
  const guint *keycodes;
  const guint *keyvals;
  guint n = 0;
  g_auto (GStrv) codes = NULL;
  const char *labels[] = { "Ctrl", "Kick", NULL };
  const guint stored[] = { 37, 65 };
  SignalLog captured = { 0 };
  SignalLog cancelled = { 0 };

  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (capture)),
                   ==, GTK_ACCESSIBLE_ROLE_BUTTON);
  g_assert_false (awra_shortcut_capture_get_listening (self));
  g_assert_false (awra_shortcut_capture_get_allow_chords (self));
  g_assert_null (awra_shortcut_capture_get_keycodes (self, &n));
  g_assert_cmpuint (n, ==, 0);
  awra_shortcut_capture_set_placeholder (self, "Assign");
  g_assert_cmpstr (awra_shortcut_capture_get_placeholder (self), ==, "Assign");
  g_signal_connect (capture, "captured", G_CALLBACK (count_cb),
                            &captured);
  g_signal_connect (capture, "cancelled", G_CALLBACK (count_cb),
                            &cancelled);

  /* Keys are ignored until listening starts; Enter starts it. */
  g_assert_false (press_key (capture, GDK_KEY_a, 38, 0));
  g_assert_true (press_key (capture, GDK_KEY_Return, 36, 0));
  g_assert_true (awra_shortcut_capture_get_listening (self));
  release_key (capture, GDK_KEY_Return, 36, 0);
  g_assert_true (awra_shortcut_capture_get_listening (self));

  /* Ctrl+A commits only when every key has been released. */
  g_assert_true (press_key (capture, GDK_KEY_Control_L, 37, 0));
  g_assert_true (press_key (capture, GDK_KEY_a, 38, GDK_CONTROL_MASK));
  g_assert_true (press_key (capture, GDK_KEY_a, 38, GDK_CONTROL_MASK));
  release_key (capture, GDK_KEY_a, 38, GDK_CONTROL_MASK);
  g_assert_cmpuint (captured.count, ==, 0);
  release_key (capture, GDK_KEY_Control_L, 37, GDK_CONTROL_MASK);
  g_assert_cmpuint (captured.count, ==, 1);
  g_assert_false (awra_shortcut_capture_get_listening (self));
  keycodes = awra_shortcut_capture_get_keycodes (self, &n);
  g_assert_cmpuint (n, ==, 2);
  g_assert_cmpuint (keycodes[0], ==, 37);
  g_assert_cmpuint (keycodes[1], ==, 38);
  keyvals = awra_shortcut_capture_get_keyvals (self, &n);
  g_assert_cmpuint (n, ==, 2);
  g_assert_cmpuint (keyvals[0], ==, GDK_KEY_Control_L);
  g_assert_cmpuint (awra_shortcut_capture_get_modifiers (self), ==,
                    GDK_CONTROL_MASK);
  codes = awra_shortcut_capture_get_codes (self);
  g_assert_cmpstrv (codes, ((const char *[]) { "ControlLeft", "KeyA", NULL }));
  g_clear_pointer (&codes, g_strfreev);

  awra_shortcut_capture_set_display_labels (self, labels);
  g_assert_cmpstrv (awra_shortcut_capture_get_display_labels (self), labels);

  /* Without chords a second normal key replaces the first. */
  awra_shortcut_capture_start (self);
  press_key (capture, GDK_KEY_a, 38, 0);
  press_key (capture, GDK_KEY_z, 52, 0);
  release_key (capture, GDK_KEY_a, 38, 0);
  release_key (capture, GDK_KEY_z, 52, 0);
  codes = awra_shortcut_capture_get_codes (self);
  g_assert_cmpstrv (codes, ((const char *[]) { "KeyZ", NULL }));
  g_clear_pointer (&codes, g_strfreev);
  g_assert_null (awra_shortcut_capture_get_display_labels (self));

  /* Chords keep both keys. */
  awra_shortcut_capture_set_allow_chords (self, TRUE);
  awra_shortcut_capture_start (self);
  press_key (capture, GDK_KEY_a, 38, 0);
  press_key (capture, GDK_KEY_z, 52, 0);
  release_key (capture, GDK_KEY_z, 52, 0);
  release_key (capture, GDK_KEY_a, 38, 0);
  codes = awra_shortcut_capture_get_codes (self);
  g_assert_cmpstrv (codes, ((const char *[]) { "KeyA", "KeyZ", NULL }));
  g_clear_pointer (&codes, g_strfreev);
  g_assert_cmpuint (awra_shortcut_capture_get_modifiers (self), ==, 0);

  /* Escape cancels and keeps the previous shortcut. */
  awra_shortcut_capture_start (self);
  g_assert_true (press_key (capture, GDK_KEY_Escape, 9, 0));
  g_assert_false (awra_shortcut_capture_get_listening (self));
  g_assert_cmpuint (cancelled.count, ==, 1);
  awra_shortcut_capture_get_keycodes (self, &n);
  g_assert_cmpuint (n, ==, 2);
  awra_shortcut_capture_cancel (self);
  g_assert_cmpuint (cancelled.count, ==, 1);

  awra_shortcut_capture_set_shortcut (self, stored, G_N_ELEMENTS (stored),
                                      GDK_CONTROL_MASK);
  codes = awra_shortcut_capture_get_codes (self);
  g_assert_cmpstrv (codes, ((const char *[]) { "ControlLeft", "Space", NULL }));
  g_clear_pointer (&codes, g_strfreev);
  awra_shortcut_capture_clear (self);
  g_assert_null (awra_shortcut_capture_get_keycodes (self, &n));
  g_assert_cmpuint (awra_shortcut_capture_get_modifiers (self), ==, 0);
  g_assert_cmpuint (captured.count, ==, 3);
}

static void
test_waveform_view (void)
{
  g_autoptr (GtkWidget) window = g_object_ref_sink (gtk_window_new ());
  GtkWidget *waveform = awra_waveform_view_new ();
  AwraWaveformView *view = AWRA_WAVEFORM_VIEW (waveform);
  float peaks[64];
  const float *stored;
  gsize n = 0;
  SignalLog moved = { 0 };
  SignalLog committed = { 0 };
  SignalLog seek = { 0 };
  g_autoptr (GskRenderNode) node = NULL;

  for (guint i = 0; i < G_N_ELEMENTS (peaks); i++)
    peaks[i] = (float) fabs (sin (i * 0.3));
  g_assert_cmpint (gtk_accessible_get_accessible_role (GTK_ACCESSIBLE (waveform)),
                   ==, GTK_ACCESSIBLE_ROLE_SLIDER);
  g_assert_cmpfloat (awra_waveform_view_get_position (view), <, 0.0);
  g_assert_cmpfloat (awra_waveform_view_get_marker_position (view), <, 0.0);
  g_assert_cmpfloat (awra_waveform_view_get_hint_position (view), <, 0.0);
  g_assert_false (awra_waveform_view_get_marker_editable (view));
  g_assert_null (awra_waveform_view_get_peaks (view, &n));

  awra_waveform_view_set_peaks (view, peaks, 32);
  awra_waveform_view_set_peaks (view, peaks, G_N_ELEMENTS (peaks));
  stored = awra_waveform_view_get_peaks (view, &n);
  g_assert_cmpuint (n, ==, G_N_ELEMENTS (peaks));
  g_assert_cmpfloat (stored[10], ==, peaks[10]);
  awra_waveform_view_set_expected_peaks (view, 128);
  g_assert_cmpuint (awra_waveform_view_get_expected_peaks (view), ==, 128);

  awra_waveform_view_set_duration (view, 100.0);
  awra_waveform_view_set_marker_position (view, 250.0);
  g_assert_cmpfloat (awra_waveform_view_get_marker_position (view), ==, 100.0);
  awra_waveform_view_set_marker_position (view, 40.0);
  awra_waveform_view_set_hint_position (view, 55.0);
  awra_waveform_view_set_position (view, 12.0);
  awra_waveform_view_set_position (view, -5.0);
  g_assert_cmpfloat (awra_waveform_view_get_position (view), ==, -1.0);
  awra_waveform_view_set_position (view, 12.0);

  g_signal_connect (view, "marker-moved", G_CALLBACK (double_cb), &moved);
  g_signal_connect (view, "marker-committed", G_CALLBACK (double_cb),
                    &committed);
  g_signal_connect (view, "seek-requested", G_CALLBACK (double_cb), &seek);

  /* Non-editable markers turn keyboard steps into seek requests. */
  g_assert_true (press_key (waveform, GDK_KEY_Right, 114, 0));
  g_assert_cmpuint (seek.count, ==, 1);
  g_assert_cmpfloat_with_epsilon (seek.last_value, 13.0, 1e-9);
  g_assert_cmpfloat (awra_waveform_view_get_position (view), ==, 12.0);

  awra_waveform_view_set_marker_editable (view, TRUE);
  g_assert_true (press_key (waveform, GDK_KEY_Right, 114, GDK_SHIFT_MASK));
  g_assert_cmpfloat_with_epsilon (awra_waveform_view_get_marker_position (view),
                                  50.0, 1e-9);
  g_assert_cmpuint (moved.count, ==, 1);
  g_assert_cmpuint (committed.count, ==, 1);
  g_assert_cmpfloat_with_epsilon (committed.last_value, 50.0, 1e-9);
  g_assert_true (press_key (waveform, GDK_KEY_Home, 110, 0));
  g_assert_cmpfloat (awra_waveform_view_get_marker_position (view), ==, 0.0);
  g_assert_true (press_key (waveform, GDK_KEY_Left, 113, 0));
  g_assert_cmpfloat (awra_waveform_view_get_marker_position (view), ==, 0.0);
  g_assert_true (press_key (waveform, GDK_KEY_End, 115, 0));
  g_assert_cmpfloat (awra_waveform_view_get_marker_position (view), ==, 100.0);
  g_assert_false (press_key (waveform, GDK_KEY_a, 38, 0));

  gtk_window_set_child (GTK_WINDOW (window), waveform);
  gtk_window_set_default_size (GTK_WINDOW (window), 320, 48);
  gtk_window_present (GTK_WINDOW (window));
  settle (window);
  /* Streaming more peaks animates only the new bars, then settles. */
  awra_waveform_view_set_peaks (view, peaks, G_N_ELEMENTS (peaks));
  settle (window);
  node = snapshot_widget (waveform);
  g_assert_nonnull (node);
  g_assert_true (node_contains_type (node, GSK_FILL_NODE));
  gtk_widget_set_direction (waveform, GTK_TEXT_DIR_RTL);
  g_clear_pointer (&node, gsk_render_node_unref);
  node = snapshot_widget (waveform);
  g_assert_nonnull (node);
  awra_waveform_view_set_peaks (view, NULL, 0);
  g_assert_null (awra_waveform_view_get_peaks (view, &n));

  gtk_window_set_child (GTK_WINDOW (window), NULL);
  gtk_window_destroy (GTK_WINDOW (window));
}

static void
test_volume_and_media_row (void)
{
  g_autoptr (GtkWidget) window = g_object_ref_sink (gtk_window_new ());
  g_autoptr (GtkWidget) volume = g_object_ref_sink (awra_volume_control_new ());
  AwraVolumeControl *control = AWRA_VOLUME_CONTROL (volume);
  GtkWidget *row = awra_media_row_new ("Battle theme");
  AwraMediaRow *media = AWRA_MEDIA_ROW (row);
  GtkWidget *suffix = gtk_label_new ("OST");
  GtkWidget *replacement = gtk_label_new ("SFX");
  GtkWidget *button;
  GtkWidget *seek;
  GdkRGBA swatch = { 0.2, 0.5, 0.9, 1.0 };
  SignalLog volume_log = { 0 };
  SignalLog toggled = { 0 };
  SignalLog stopped = { 0 };
  SignalLog row_volume = { 0 };

  /* Volume control: programmatic changes notify, user changes signal. */
  g_assert_cmpfloat (awra_volume_control_get_volume (control), ==, 1.0);
  g_signal_connect (control, "volume-changed", G_CALLBACK (double_cb),
                    &volume_log);
  awra_volume_control_set_volume (control, 0.4);
  awra_volume_control_set_volume (control, 7.0);
  g_assert_cmpfloat (awra_volume_control_get_volume (control), ==, 1.0);
  g_assert_cmpuint (volume_log.count, ==, 0);
  gtk_range_set_value (awra_volume_control_get_slider (control), 0.25);
  g_assert_cmpuint (volume_log.count, ==, 1);
  g_assert_cmpfloat_with_epsilon (volume_log.last_value, 0.25, 1e-9);
  button = find_descendant (volume, GTK_TYPE_BUTTON, "awra-volume-button");
  g_assert_nonnull (button);
  g_assert_cmpstr (gtk_button_get_icon_name (GTK_BUTTON (button)), ==,
                   "audio-volume-low-symbolic");
  g_signal_emit_by_name (button, "clicked");
  g_assert_true (awra_volume_control_get_muted (control));
  g_assert_cmpfloat (awra_volume_control_get_effective_volume (control), ==,
                     0.0);
  g_assert_cmpfloat (volume_log.last_value, ==, 0.0);
  g_assert_cmpstr (gtk_button_get_icon_name (GTK_BUTTON (button)), ==,
                   "audio-volume-muted-symbolic");
  /* Raising the level unmutes. */
  gtk_range_set_value (awra_volume_control_get_slider (control), 0.8);
  g_assert_false (awra_volume_control_get_muted (control));
  g_assert_cmpfloat_with_epsilon (volume_log.last_value, 0.8, 1e-9);

  /* Media row. */
  g_object_ref_sink (row);
  g_object_ref_sink (suffix);
  g_assert_cmpstr (awra_media_row_get_title (media), ==, "Battle theme");
  g_assert_null (awra_media_row_get_subtitle (media));
  g_assert_true (gtk_widget_has_css_class (row, "awra-media-idle"));
  seek = find_descendant (row, GTK_TYPE_RANGE, "awra-media-seek");
  g_assert_nonnull (seek);
  g_assert_false (gtk_widget_get_sensitive (seek));
  awra_media_row_set_subtitle (media, "Final Boss OST");
  awra_media_row_set_duration (media, 200.0);
  awra_media_row_set_position (media, 65.0);
  g_assert_false (gtk_widget_has_css_class (row, "awra-media-idle"));
  g_assert_true (gtk_widget_get_sensitive (seek));
  g_assert_cmpfloat (gtk_range_get_value (GTK_RANGE (seek)), ==, 65.0);
  awra_media_row_set_position (media, -3.0);
  g_assert_cmpfloat (awra_media_row_get_position (media), ==, 0.0);
  awra_media_row_set_seekable (media, FALSE);
  g_assert_false (gtk_widget_get_sensitive (seek));
  awra_media_row_set_seekable (media, TRUE);

  g_signal_connect (row, "play-toggled", G_CALLBACK (count_cb),
                            &toggled);
  g_signal_connect (row, "stop-requested", G_CALLBACK (count_cb),
                            &stopped);
  g_signal_connect (row, "volume-changed", G_CALLBACK (double_cb),
                    &row_volume);
  button = find_descendant (row, GTK_TYPE_BUTTON, "awra-media-button");
  g_assert_cmpstr (gtk_button_get_icon_name (GTK_BUTTON (button)), ==,
                   "media-playback-start-symbolic");
  g_signal_emit_by_name (button, "clicked");
  g_assert_cmpuint (toggled.count, ==, 1);
  awra_media_row_set_playing (media, TRUE);
  g_assert_cmpstr (gtk_button_get_icon_name (GTK_BUTTON (button)), ==,
                   "media-playback-pause-symbolic");
  button = gtk_widget_get_next_sibling (button);
  g_signal_emit_by_name (button, "clicked");
  g_assert_cmpuint (stopped.count, ==, 1);
  awra_media_row_set_show_stop_button (media, FALSE);
  g_assert_false (gtk_widget_get_visible (button));
  g_assert_false (awra_media_row_get_show_volume (media));
  awra_media_row_set_show_volume (media, TRUE);
  awra_media_row_set_volume (media, 0.5);
  g_assert_cmpfloat (awra_media_row_get_volume (media), ==, 0.5);
  gtk_range_set_value (awra_volume_control_get_slider (AWRA_VOLUME_CONTROL (
    find_descendant (row, AWRA_TYPE_VOLUME_CONTROL, NULL))), 0.3);
  g_assert_cmpuint (row_volume.count, ==, 1);
  g_assert_cmpfloat_with_epsilon (row_volume.last_value, 0.3, 1e-9);

  awra_media_row_set_accent_color (media, &swatch);
  g_assert_true (gdk_rgba_equal (awra_media_row_get_accent_color (media),
                                 &swatch));
  awra_media_row_set_icon_name (media, "audio-x-generic-symbolic");
  g_assert_cmpstr (awra_media_row_get_icon_name (media), ==,
                   "audio-x-generic-symbolic");
  awra_media_row_set_suffix (media, suffix);
  g_assert_true (awra_media_row_get_suffix (media) == suffix);
  awra_media_row_set_suffix (media, replacement);
  g_assert_null (gtk_widget_get_parent (suffix));
  g_assert_true (gtk_widget_get_parent (replacement) != NULL);
  awra_media_row_set_suffix (media, NULL);
  g_assert_null (awra_media_row_get_suffix (media));

  gtk_window_set_child (GTK_WINDOW (window), row);
  gtk_window_present (GTK_WINDOW (window));
  settle (window);
  awra_media_row_set_duration (media, 0.0);
  g_assert_true (gtk_widget_has_css_class (row, "awra-media-idle"));
  gtk_window_set_child (GTK_WINDOW (window), NULL);
  gtk_window_destroy (GTK_WINDOW (window));
  g_object_unref (row);
  g_object_unref (suffix);
}

static void
test_drop_zone (void)
{
  g_autoptr (GtkWidget) zone = g_object_ref_sink (awra_drop_zone_new ());
  AwraDropZone *drop = AWRA_DROP_ZONE (zone);
  g_autoptr (GFile) mp3 = g_file_new_for_path ("/tmp/Theme.MP3");
  g_autoptr (GFile) ogg = g_file_new_for_path ("/tmp/rain.ogg");
  g_autoptr (GFile) text = g_file_new_for_path ("/tmp/notes.txt");
  g_autoptr (GFile) bare = g_file_new_for_path ("/tmp/README");
  const char *extensions[] = { ".mp3", "FLAC", NULL };
  const char *normalized[] = { "mp3", "flac", NULL };
  const char *mimes[] = { "audio/ogg", NULL };
  const char *families[] = { "audio/*", NULL };
  GtkWidget *child = gtk_label_new ("Queue");
  GtkWidget *button;
  SignalLog browse = { 0 };

  g_assert_null (awra_drop_zone_get_child (drop));
  g_assert_false (awra_drop_zone_get_drop_active (drop));
  g_assert_true (awra_drop_zone_accepts_file (drop, text));
  awra_drop_zone_set_accepted_extensions (drop, extensions);
  g_assert_cmpstrv (awra_drop_zone_get_accepted_extensions (drop), normalized);
  g_assert_true (awra_drop_zone_accepts_file (drop, mp3));
  g_assert_false (awra_drop_zone_accepts_file (drop, ogg));
  g_assert_false (awra_drop_zone_accepts_file (drop, bare));
  awra_drop_zone_set_accepted_mime_types (drop, mimes);
  g_assert_true (awra_drop_zone_accepts_file (drop, ogg));
  g_assert_false (awra_drop_zone_accepts_file (drop, text));
  awra_drop_zone_set_accepted_extensions (drop, NULL);
  g_assert_null (awra_drop_zone_get_accepted_extensions (drop));
  awra_drop_zone_set_accepted_mime_types (drop, families);
  g_assert_true (awra_drop_zone_accepts_file (drop, ogg));
  g_assert_false (awra_drop_zone_accepts_file (drop, text));
  awra_drop_zone_set_accepted_mime_types (drop, NULL);
  g_assert_true (awra_drop_zone_accepts_file (drop, bare));

  awra_drop_zone_set_title (drop, "Drop audio");
  awra_drop_zone_set_subtitle (drop, "MP3 or OGG");
  g_assert_cmpstr (awra_drop_zone_get_title (drop), ==, "Drop audio");
  g_assert_cmpstr (awra_drop_zone_get_subtitle (drop), ==, "MP3 or OGG");
  g_assert_nonnull (awra_drop_zone_get_drop_message (drop));
  awra_drop_zone_set_drop_message (drop, "Add to queue");
  g_assert_cmpstr (awra_drop_zone_get_drop_message (drop), ==, "Add to queue");
  awra_drop_zone_set_browse_label (drop, "Choose files…");
  g_assert_cmpstr (awra_drop_zone_get_browse_label (drop), ==,
                   "Choose files…");
  g_assert_false (awra_drop_zone_get_show_browse_button (drop));
  awra_drop_zone_set_show_browse_button (drop, TRUE);
  g_signal_connect (zone, "browse-requested", G_CALLBACK (count_cb),
                            &browse);
  button = find_descendant (zone, GTK_TYPE_BUTTON, NULL);
  g_assert_nonnull (button);
  g_signal_emit_by_name (button, "clicked");
  g_assert_cmpuint (browse.count, ==, 1);

  /* The empty well survives being replaced by content and back. */
  awra_drop_zone_set_child (drop, child);
  g_assert_true (awra_drop_zone_get_child (drop) == child);
  g_assert_null (find_descendant (zone, GTK_TYPE_BUTTON, NULL));
  awra_drop_zone_set_child (drop, NULL);
  button = find_descendant (zone, GTK_TYPE_BUTTON, NULL);
  g_assert_nonnull (button);
  g_signal_emit_by_name (button, "clicked");
  g_assert_cmpuint (browse.count, ==, 2);
  awra_drop_zone_set_child (drop, gtk_label_new ("Again"));
}

static void
toast_action_cb (GSimpleAction *action,
                 GVariant      *parameter,
                 gpointer       data)
{
  (void) action;
  (void) parameter;
  ((SignalLog *) data)->count++;
}

static void
dismissed_cb (AwraToastOverlay *overlay,
              guint             toast_id,
              SignalLog        *log)
{
  (void) overlay;
  log->count++;
  log->last_value = toast_id;
}

static void
test_toast_actions (void)
{
  g_autoptr (GtkWidget) window = g_object_ref_sink (gtk_window_new ());
  g_autoptr (GSimpleActionGroup) group = g_simple_action_group_new ();
  g_autoptr (GSimpleAction) undo = g_simple_action_new ("undo", NULL);
  GtkWidget *toast = awra_toast_overlay_new ();
  AwraToastOverlay *overlay = AWRA_TOAST_OVERLAY (toast);
  GtkWidget *button;
  SignalLog activated = { 0 };
  SignalLog dismissed = { 0 };
  guint first;
  guint second;

  g_signal_connect (undo, "activate", G_CALLBACK (toast_action_cb),
                    &activated);
  g_action_map_add_action (G_ACTION_MAP (group), G_ACTION (undo));
  gtk_widget_insert_action_group (window, "test", G_ACTION_GROUP (group));
  awra_toast_overlay_set_child (overlay, gtk_label_new ("Content"));
  gtk_window_set_child (GTK_WINDOW (window), toast);
  gtk_window_present (GTK_WINDOW (window));
  settle (window);
  g_signal_connect (overlay, "dismissed", G_CALLBACK (dismissed_cb),
                    &dismissed);

  /* Backward compatible message toasts never show the action button. */
  awra_toast_overlay_show_message (overlay, "Saved", 0);
  g_assert_true (awra_toast_overlay_get_revealed (overlay));
  button = find_descendant (toast, GTK_TYPE_BUTTON, "awra-toast-action");
  g_assert_nonnull (button);
  g_assert_false (gtk_widget_get_visible (button));
  g_assert_cmpuint (awra_toast_overlay_get_current_toast_id (overlay), !=, 0);

  first = awra_toast_overlay_show_with_action (overlay, "Sound removed",
                                               "Undo", "test.undo", 0);
  g_assert_cmpuint (first, !=, 0);
  g_assert_cmpuint (dismissed.count, ==, 1);
  g_assert_true (gtk_widget_get_visible (button));
  g_assert_cmpstr (gtk_button_get_label (GTK_BUTTON (button)), ==, "Undo");
  second = awra_toast_overlay_show_with_action (overlay, "Track removed",
                                                "Undo", "test.undo", 0);
  g_assert_cmpuint (second, !=, first);
  g_assert_cmpuint (dismissed.count, ==, 2);
  g_assert_cmpfloat (dismissed.last_value, ==, first);
  awra_toast_overlay_dismiss (overlay, first);
  g_assert_true (awra_toast_overlay_get_revealed (overlay));
  g_assert_cmpuint (awra_toast_overlay_get_current_toast_id (overlay), ==,
                    second);

  g_signal_emit_by_name (button, "clicked");
  g_assert_cmpuint (activated.count, ==, 1);
  g_assert_false (awra_toast_overlay_get_revealed (overlay));
  g_assert_cmpuint (dismissed.count, ==, 3);
  g_assert_cmpfloat (dismissed.last_value, ==, second);
  g_assert_cmpuint (awra_toast_overlay_get_current_toast_id (overlay), ==, 0);

  first = awra_toast_overlay_show_with_action (overlay, "Removed", "Dismiss",
                                               NULL, 0);
  awra_toast_overlay_dismiss (overlay, first);
  g_assert_false (awra_toast_overlay_get_revealed (overlay));
  awra_toast_overlay_dismiss (overlay, first);
  g_assert_cmpuint (dismissed.count, ==, 4);

  gtk_window_set_child (GTK_WINDOW (window), NULL);
  gtk_window_destroy (GTK_WINDOW (window));
}

static void
test_builder (void)
{
  static const char ui[] =
    "<interface>"
    "  <object class='GtkBox'>"
    "    <child><object class='AwraKeyboardView' id='keyboard'>"
    "      <property name='physical-layout'>iso</property>"
    "      <property name='show-numpad'>true</property>"
    "      <property name='selection-mode'>multiple</property>"
    "    </object></child>"
    "    <child><object class='AwraKeyCap' id='cap'>"
    "      <property name='key-code'>KeyA</property>"
    "      <property name='label'>A</property>"
    "      <property name='width-units'>1.5</property>"
    "    </object></child>"
    "    <child><object class='AwraShortcutCapture' id='capture'>"
    "      <property name='placeholder'>None</property>"
    "      <property name='allow-chords'>true</property>"
    "    </object></child>"
    "    <child><object class='AwraWaveformView' id='waveform'>"
    "      <property name='duration'>12</property>"
    "      <property name='marker-editable'>true</property>"
    "    </object></child>"
    "    <child><object class='AwraMediaRow' id='row'>"
    "      <property name='title'>Rain</property>"
    "      <property name='show-volume'>true</property>"
    "    </object></child>"
    "    <child><object class='AwraVolumeControl' id='volume'>"
    "      <property name='volume'>0.5</property>"
    "    </object></child>"
    "    <child><object class='AwraDropZone' id='drop'>"
    "      <property name='title'>Drop</property>"
    "      <property name='show-browse-button'>true</property>"
    "    </object></child>"
    "  </object>"
    "</interface>";
  g_autoptr (GtkBuilder) builder = gtk_builder_new_from_string (ui, -1);

  g_assert_cmpint (awra_keyboard_view_get_physical_layout (AWRA_KEYBOARD_VIEW (
                     gtk_builder_get_object (builder, "keyboard"))), ==,
                   AWRA_KEYBOARD_PHYSICAL_LAYOUT_ISO);
  g_assert_cmpfloat (awra_key_cap_get_width_units (AWRA_KEY_CAP (
                       gtk_builder_get_object (builder, "cap"))), ==, 1.5);
  g_assert_true (awra_shortcut_capture_get_allow_chords (AWRA_SHORTCUT_CAPTURE (
    gtk_builder_get_object (builder, "capture"))));
  g_assert_cmpfloat (awra_waveform_view_get_duration (AWRA_WAVEFORM_VIEW (
                       gtk_builder_get_object (builder, "waveform"))), ==, 12.0);
  g_assert_true (awra_media_row_get_show_volume (AWRA_MEDIA_ROW (
    gtk_builder_get_object (builder, "row"))));
  g_assert_cmpfloat (awra_volume_control_get_volume (AWRA_VOLUME_CONTROL (
                       gtk_builder_get_object (builder, "volume"))), ==, 0.5);
  g_assert_cmpstr (awra_drop_zone_get_title (AWRA_DROP_ZONE (
                     gtk_builder_get_object (builder, "drop"))), ==, "Drop");
}

int
main (int   argc,
      char *argv[])
{
  g_test_init (&argc, &argv, NULL);
  if (!gtk_init_check ()) {
    g_test_message ("No display available; skipping GTK widget tests");
    return 77;
  }
  awra_init ();

  g_test_add_func ("/awra/media-input/key-cap", test_key_cap);
  g_test_add_func ("/awra/media-input/keyboard-view", test_keyboard_view);
  g_test_add_func ("/awra/media-input/shortcut-capture",
                   test_shortcut_capture);
  g_test_add_func ("/awra/media-input/waveform-view", test_waveform_view);
  g_test_add_func ("/awra/media-input/volume-and-media-row",
                   test_volume_and_media_row);
  g_test_add_func ("/awra/media-input/drop-zone", test_drop_zone);
  g_test_add_func ("/awra/media-input/toast-actions", test_toast_actions);
  g_test_add_func ("/awra/media-input/builder", test_builder);
  return g_test_run ();
}
