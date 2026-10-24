/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <math.h>

#include <awra/awra-keyboard-view.h>

#include "awra-i18n-private.h"
#include "widgets/awra-key-cap-private.h"
#include "widgets/awra-key-codes-private.h"

/* Logical pixels per keyboard unit (1u). The minimum keeps every cap above
 * AwraKeyCap's own minimum; the maximum stops very wide windows from
 * producing toy-like giant keys. */
#define UNIT_MINIMUM   22.0
#define UNIT_NATURAL   46.0
#define UNIT_MAXIMUM   64.0
#define SECTION_GAP    0.25
#define FUNCTION_GAP   0.25
#define MAIN_WIDTH     15.0
#define NAV_WIDTH      3.0
#define NUMPAD_WIDTH   4.0
#define ROW_TOLERANCE  0.5

typedef struct {
  const AwraKeyCodeInfo *info;
  AwraKeyCap *cap;
  double x;
  double y;
  double width;
  double height;
  gboolean visible;
  gboolean label_overridden;
} KeySlot;

struct _AwraKeyboardView {
  GtkWidget parent_instance;

  GPtrArray *slots;       /* KeySlot*, one per known physical key */
  GHashTable *by_code;    /* code -> KeySlot* (borrowed) */
  GPtrArray *order;       /* visible KeySlot* in reading order */
  double total_width;
  double total_height;

  AwraKeyboardPhysicalLayout physical_layout;
  gboolean show_function_row;
  gboolean show_navigation_cluster;
  gboolean show_numpad;

  GtkSelectionMode selection_mode;
  KeySlot *anchor;
  KeySlot *cursor;

  gboolean accepts_file_drops;
  KeySlot *drop_slot;

  GdkDevice *keyboard;
  gulong layout_handler;
  gulong layout_names_handler;
};

enum {
  PROP_0,
  PROP_PHYSICAL_LAYOUT,
  PROP_SHOW_FUNCTION_ROW,
  PROP_SHOW_NAVIGATION_CLUSTER,
  PROP_SHOW_NUMPAD,
  PROP_SELECTION_MODE,
  PROP_ACCEPTS_FILE_DROPS,
  N_PROPS,
};

enum {
  SIGNAL_KEY_ACTIVATED,
  SIGNAL_SELECTION_CHANGED,
  SIGNAL_FILES_DROPPED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraKeyboardView, awra_keyboard_view, GTK_TYPE_WIDGET)

/* Geometry ------------------------------------------------------------- */

static void
place (AwraKeyboardView *self,
       const char       *code,
       double            x,
       double            y,
       double            width,
       double            height)
{
  KeySlot *slot = g_hash_table_lookup (self->by_code, code);

  g_return_if_fail (slot != NULL);
  slot->x = x;
  slot->y = y;
  slot->width = width;
  slot->height = height;
  slot->visible = TRUE;
}

static void
place_row (AwraKeyboardView   *self,
           const char * const *codes,
           double              x,
           double              y)
{
  for (guint i = 0; codes[i] != NULL; i++)
    place (self, codes[i], x + i, y, 1.0, 1.0);
}

static int
compare_reading_order (gconstpointer a,
                       gconstpointer b)
{
  const KeySlot *left = *(const KeySlot * const *) a;
  const KeySlot *right = *(const KeySlot * const *) b;

  if (fabs (left->y - right->y) > 0.01)
    return left->y < right->y ? -1 : 1;
  if (fabs (left->x - right->x) > 0.01)
    return left->x < right->x ? -1 : 1;
  return 0;
}

static void
rebuild_geometry (AwraKeyboardView *self)
{
  static const char * const digits[] = {
    "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6",
    "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", NULL
  };
  static const char * const top_letters[] = {
    "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO",
    "KeyP", "BracketLeft", "BracketRight", NULL
  };
  static const char * const home_letters[] = {
    "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL",
    "Semicolon", "Quote", NULL
  };
  static const char * const bottom_letters[] = {
    "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma",
    "Period", "Slash", NULL
  };
  static const char * const f1[] = { "F1", "F2", "F3", "F4", NULL };
  static const char * const f5[] = { "F5", "F6", "F7", "F8", NULL };
  static const char * const f9[] = { "F9", "F10", "F11", "F12", NULL };
  static const char * const nav_top[] = {
    "Insert", "Home", "PageUp", NULL
  };
  static const char * const nav_bottom[] = {
    "Delete", "End", "PageDown", NULL
  };
  static const char * const nav_function[] = {
    "PrintScreen", "ScrollLock", "Pause", NULL
  };
  static const char * const pad0[] = {
    "NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract", NULL
  };
  static const char * const pad1[] = { "Numpad7", "Numpad8", "Numpad9", NULL };
  static const char * const pad2[] = { "Numpad4", "Numpad5", "Numpad6", NULL };
  static const char * const pad3[] = { "Numpad1", "Numpad2", "Numpad3", NULL };
  gboolean iso = self->physical_layout == AWRA_KEYBOARD_PHYSICAL_LAYOUT_ISO;
  double main_y = self->show_function_row ? 1.0 + FUNCTION_GAP : 0.0;
  double nav_x = MAIN_WIDTH + SECTION_GAP;
  double pad_x = nav_x + (self->show_navigation_cluster
                            ? NAV_WIDTH + SECTION_GAP : 0.0);

  for (guint i = 0; i < self->slots->len; i++)
    ((KeySlot *) g_ptr_array_index (self->slots, i))->visible = FALSE;

  if (self->show_function_row) {
    place (self, "Escape", 0.0, 0.0, 1.0, 1.0);
    place_row (self, f1, 2.0, 0.0);
    place_row (self, f5, 6.5, 0.0);
    place_row (self, f9, 11.0, 0.0);
  }

  place_row (self, digits, 0.0, main_y);
  place (self, "Backspace", 13.0, main_y, 2.0, 1.0);
  place (self, "Tab", 0.0, main_y + 1, 1.5, 1.0);
  place_row (self, top_letters, 1.5, main_y + 1);
  place (self, "CapsLock", 0.0, main_y + 2, 1.75, 1.0);
  place_row (self, home_letters, 1.75, main_y + 2);
  if (iso) {
    /* The ISO Enter is approximated by its lower 1.25u stem spanning two
     * rows, which keeps every cap a rounded rectangle. */
    place (self, "Enter", 13.75, main_y + 1, 1.25, 2.0);
    place (self, "Backslash", 12.75, main_y + 2, 1.0, 1.0);
    place (self, "ShiftLeft", 0.0, main_y + 3, 1.25, 1.0);
    place (self, "IntlBackslash", 1.25, main_y + 3, 1.0, 1.0);
  } else {
    place (self, "Backslash", 13.5, main_y + 1, 1.5, 1.0);
    place (self, "Enter", 12.75, main_y + 2, 2.25, 1.0);
    place (self, "ShiftLeft", 0.0, main_y + 3, 2.25, 1.0);
  }
  place_row (self, bottom_letters, 2.25, main_y + 3);
  place (self, "ShiftRight", 12.25, main_y + 3, 2.75, 1.0);
  place (self, "ControlLeft", 0.0, main_y + 4, 1.25, 1.0);
  place (self, "MetaLeft", 1.25, main_y + 4, 1.25, 1.0);
  place (self, "AltLeft", 2.5, main_y + 4, 1.25, 1.0);
  place (self, "Space", 3.75, main_y + 4, 6.25, 1.0);
  place (self, "AltRight", 10.0, main_y + 4, 1.25, 1.0);
  place (self, "MetaRight", 11.25, main_y + 4, 1.25, 1.0);
  place (self, "ContextMenu", 12.5, main_y + 4, 1.25, 1.0);
  place (self, "ControlRight", 13.75, main_y + 4, 1.25, 1.0);

  self->total_width = MAIN_WIDTH;
  if (self->show_navigation_cluster) {
    if (self->show_function_row)
      place_row (self, nav_function, nav_x, 0.0);
    place_row (self, nav_top, nav_x, main_y);
    place_row (self, nav_bottom, nav_x, main_y + 1);
    place (self, "ArrowUp", nav_x + 1, main_y + 3, 1.0, 1.0);
    place (self, "ArrowLeft", nav_x, main_y + 4, 1.0, 1.0);
    place (self, "ArrowDown", nav_x + 1, main_y + 4, 1.0, 1.0);
    place (self, "ArrowRight", nav_x + 2, main_y + 4, 1.0, 1.0);
    self->total_width = nav_x + NAV_WIDTH;
  }
  if (self->show_numpad) {
    place_row (self, pad0, pad_x, main_y);
    place_row (self, pad1, pad_x, main_y + 1);
    place (self, "NumpadAdd", pad_x + 3, main_y + 1, 1.0, 2.0);
    place_row (self, pad2, pad_x, main_y + 2);
    place_row (self, pad3, pad_x, main_y + 3);
    place (self, "NumpadEnter", pad_x + 3, main_y + 3, 1.0, 2.0);
    place (self, "Numpad0", pad_x, main_y + 4, 2.0, 1.0);
    place (self, "NumpadDecimal", pad_x + 2, main_y + 4, 1.0, 1.0);
    self->total_width = pad_x + NUMPAD_WIDTH;
  }
  self->total_height = main_y + 5.0;

  g_ptr_array_set_size (self->order, 0);
  for (guint i = 0; i < self->slots->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->slots, i);
    gboolean was_visible = gtk_widget_get_visible (GTK_WIDGET (slot->cap));

    if (slot->visible) {
      awra_key_cap_set_width_units (slot->cap, slot->width);
      awra_key_cap_set_height_units (slot->cap, slot->height);
      g_ptr_array_add (self->order, slot);
    } else if (was_visible && awra_key_cap_get_selected (slot->cap)) {
      awra_key_cap_set_selected (slot->cap, FALSE);
    }
    gtk_widget_set_visible (GTK_WIDGET (slot->cap), slot->visible);
  }
  g_ptr_array_sort (self->order, compare_reading_order);
  if (self->anchor != NULL && !self->anchor->visible)
    self->anchor = NULL;
  if (self->cursor != NULL && !self->cursor->visible)
    self->cursor = NULL;
  gtk_widget_queue_resize (GTK_WIDGET (self));
}

/* Labels --------------------------------------------------------------- */

static void
refresh_labels (AwraKeyboardView *self)
{
  GdkDisplay *display = gtk_widget_get_display (GTK_WIDGET (self));
  int layout_index = awra_key_codes_get_layout_index (display);

  for (guint i = 0; i < self->slots->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->slots, i);
    g_autofree char *label = NULL;

    if (slot->label_overridden)
      continue;
    label = awra_key_code_info_dup_label (slot->info, display, layout_index);
    awra_key_cap_set_label (slot->cap, label);
  }
}

static void
keyboard_layout_changed_cb (GdkDevice        *device,
                            GParamSpec       *pspec,
                            AwraKeyboardView *self)
{
  (void) device;
  (void) pspec;
  refresh_labels (self);
}

static void
disconnect_keyboard (AwraKeyboardView *self)
{
  if (self->keyboard != NULL) {
    g_clear_signal_handler (&self->layout_handler, self->keyboard);
    g_clear_signal_handler (&self->layout_names_handler, self->keyboard);
    g_clear_object (&self->keyboard);
  }
}

static void
awra_keyboard_view_map (GtkWidget *widget)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (widget);
  GdkSeat *seat = gdk_display_get_default_seat (gtk_widget_get_display (widget));
  GdkDevice *keyboard = seat != NULL ? gdk_seat_get_keyboard (seat) : NULL;

  GTK_WIDGET_CLASS (awra_keyboard_view_parent_class)->map (widget);
  disconnect_keyboard (self);
  if (keyboard != NULL) {
    self->keyboard = g_object_ref (keyboard);
    self->layout_handler = g_signal_connect (
      keyboard, "notify::active-layout-index",
      G_CALLBACK (keyboard_layout_changed_cb), self);
    self->layout_names_handler = g_signal_connect (
      keyboard, "notify::layout-names",
      G_CALLBACK (keyboard_layout_changed_cb), self);
  }
  refresh_labels (self);
}

static void
awra_keyboard_view_unmap (GtkWidget *widget)
{
  disconnect_keyboard (AWRA_KEYBOARD_VIEW (widget));
  GTK_WIDGET_CLASS (awra_keyboard_view_parent_class)->unmap (widget);
}

/* Selection ------------------------------------------------------------ */

static gboolean
slot_selectable (KeySlot *slot)
{
  return slot != NULL && slot->visible &&
         !awra_key_cap_get_dimmed (slot->cap);
}

/* Applies @selected to every visible key; returns whether anything changed. */
static gboolean
apply_selection (AwraKeyboardView *self,
                 GHashTable       *selected)
{
  gboolean changed = FALSE;

  for (guint i = 0; i < self->slots->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->slots, i);
    gboolean value = selected != NULL &&
                     g_hash_table_contains (selected, slot);

    if (awra_key_cap_get_selected (slot->cap) != value) {
      awra_key_cap_set_selected (slot->cap, value);
      changed = TRUE;
    }
  }
  return changed;
}

static GHashTable *
current_selection (AwraKeyboardView *self)
{
  GHashTable *selected = g_hash_table_new (NULL, NULL);

  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);

    if (awra_key_cap_get_selected (slot->cap))
      g_hash_table_add (selected, slot);
  }
  return selected;
}

static guint
order_index (AwraKeyboardView *self,
             KeySlot          *slot)
{
  guint index = 0;

  if (!g_ptr_array_find (self->order, slot, &index))
    return 0;
  return index;
}

static void
add_range (AwraKeyboardView *self,
           GHashTable       *selected,
           KeySlot          *from,
           KeySlot          *to)
{
  guint start = order_index (self, from);
  guint end = order_index (self, to);

  if (start > end) {
    guint swap = start;
    start = end;
    end = swap;
  }
  for (guint i = start; i <= end && i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);

    if (slot_selectable (slot))
      g_hash_table_add (selected, slot);
  }
}

static void
commit_selection (AwraKeyboardView *self,
                  GHashTable       *selected)
{
  if (apply_selection (self, selected))
    g_signal_emit (self, signals[SIGNAL_SELECTION_CHANGED], 0);
}

/* Updates the selection for an interaction on @slot. */
static void
select_for_interaction (AwraKeyboardView *self,
                        KeySlot          *slot,
                        GdkModifierType   modifiers)
{
  g_autoptr (GHashTable) selected = NULL;
  gboolean extend = (modifiers & GDK_SHIFT_MASK) != 0;
  gboolean toggle = (modifiers & GDK_CONTROL_MASK) != 0;

  if (self->selection_mode == GTK_SELECTION_NONE || !slot_selectable (slot))
    return;

  if (self->selection_mode != GTK_SELECTION_MULTIPLE) {
    selected = g_hash_table_new (NULL, NULL);
    if (!(toggle && self->selection_mode == GTK_SELECTION_SINGLE &&
          awra_key_cap_get_selected (slot->cap)))
      g_hash_table_add (selected, slot);
    self->anchor = slot;
    commit_selection (self, selected);
    return;
  }

  if (extend && self->anchor != NULL && self->anchor->visible) {
    selected = toggle ? current_selection (self) : g_hash_table_new (NULL, NULL);
    add_range (self, selected, self->anchor, slot);
  } else if (toggle) {
    selected = current_selection (self);
    if (!g_hash_table_remove (selected, slot))
      g_hash_table_add (selected, slot);
    self->anchor = slot;
  } else {
    selected = g_hash_table_new (NULL, NULL);
    g_hash_table_add (selected, slot);
    self->anchor = slot;
  }
  commit_selection (self, selected);
}

static void
cap_activated_cb (AwraKeyCap       *cap,
                  GdkModifierType   modifiers,
                  AwraKeyboardView *self)
{
  KeySlot *slot = g_hash_table_lookup (self->by_code,
                                       awra_key_cap_get_key_code (cap));

  if (slot == NULL)
    return;
  self->cursor = slot;
  select_for_interaction (self, slot, modifiers);
  g_signal_emit (self, signals[SIGNAL_KEY_ACTIVATED], 0,
                 slot->info->code, modifiers);
}

static void
cap_focus_cb (AwraKeyCap       *cap,
              GParamSpec       *pspec,
              AwraKeyboardView *self)
{
  (void) pspec;
  if (gtk_widget_has_focus (GTK_WIDGET (cap)))
    self->cursor = g_hash_table_lookup (self->by_code,
                                        awra_key_cap_get_key_code (cap));
}

/* Keyboard navigation -------------------------------------------------- */

static KeySlot *
find_neighbor (AwraKeyboardView *self,
               KeySlot          *from,
               GtkDirectionType  direction)
{
  double cx = from->x + from->width / 2.0;
  double cy = from->y + from->height / 2.0;
  KeySlot *best = NULL;
  double best_primary = G_MAXDOUBLE;
  double best_secondary = G_MAXDOUBLE;

  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);
    double x = slot->x + slot->width / 2.0;
    double y = slot->y + slot->height / 2.0;
    double primary;
    double secondary;

    if (slot == from)
      continue;
    switch (direction) {
    case GTK_DIR_LEFT:
    case GTK_DIR_RIGHT:
      /* Stay on the same physical row; tall keys belong to every row they
       * cover. */
      if (cy < slot->y - 0.01 || cy > slot->y + slot->height + 0.01)
        continue;
      primary = direction == GTK_DIR_LEFT ? cx - x : x - cx;
      secondary = fabs (y - cy);
      break;
    case GTK_DIR_UP:
    case GTK_DIR_DOWN:
      primary = direction == GTK_DIR_UP ? cy - y : y - cy;
      if (primary < ROW_TOLERANCE)
        continue;
      /* Prefer the nearest row, then the key under the same column. */
      primary = floor (primary + 0.25);
      secondary = fabs (x - cx);
      if (cx < slot->x || cx > slot->x + slot->width)
        secondary += 0.5;
      break;
    default:
      return NULL;
    }
    if (primary <= 0.01)
      continue;
    if (primary < best_primary - 0.01 ||
        (fabs (primary - best_primary) <= 0.01 && secondary < best_secondary)) {
      best = slot;
      best_primary = primary;
      best_secondary = secondary;
    }
  }
  return best;
}

static KeySlot *
row_edge (AwraKeyboardView *self,
          KeySlot          *from,
          gboolean          last)
{
  KeySlot *edge = NULL;
  double cy = from->y + from->height / 2.0;

  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);

    if (cy < slot->y || cy > slot->y + slot->height)
      continue;
    if (edge == NULL || (last ? slot->x > edge->x : slot->x < edge->x))
      edge = slot;
  }
  return edge;
}

/* Roving focus target: the remembered cursor while it is selected, then the
 * first selected key, then the remembered cursor, then the first key. */
static KeySlot *
initial_cursor (AwraKeyboardView *self)
{
  gboolean cursor_valid = self->cursor != NULL && self->cursor->visible;

  if (cursor_valid && awra_key_cap_get_selected (self->cursor->cap))
    return self->cursor;
  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);

    if (awra_key_cap_get_selected (slot->cap))
      return slot;
  }
  if (cursor_valid)
    return self->cursor;
  return self->order->len > 0 ? g_ptr_array_index (self->order, 0) : NULL;
}

static void
move_cursor (AwraKeyboardView *self,
             KeySlot          *target,
             GdkModifierType   modifiers)
{
  if (target == NULL)
    return;
  self->cursor = target;
  gtk_widget_grab_focus (GTK_WIDGET (target->cap));
  /* Selection follows the cursor unless Ctrl moves it independently. */
  if ((modifiers & GDK_CONTROL_MASK) == 0 &&
      self->selection_mode != GTK_SELECTION_NONE)
    select_for_interaction (self, target, modifiers & GDK_SHIFT_MASK);
}

static KeySlot *
navigation_origin (AwraKeyboardView *self)
{
  if (self->cursor != NULL && self->cursor->visible)
    return self->cursor;
  return initial_cursor (self);
}

static gboolean
key_pressed_cb (GtkEventControllerKey *controller,
                guint                  keyval,
                guint                  keycode,
                GdkModifierType        state,
                AwraKeyboardView      *self)
{
  KeySlot *cursor = navigation_origin (self);
  KeySlot *target = NULL;

  (void) controller;
  (void) keycode;
  state &= gtk_accelerator_get_default_mod_mask ();
  if (cursor == NULL)
    return FALSE;
  /* Physical keyboards are never mirrored, so arrows stay physical in RTL. */
  switch (keyval) {
  case GDK_KEY_Left:
  case GDK_KEY_KP_Left:
    target = find_neighbor (self, cursor, GTK_DIR_LEFT);
    break;
  case GDK_KEY_Right:
  case GDK_KEY_KP_Right:
    target = find_neighbor (self, cursor, GTK_DIR_RIGHT);
    break;
  case GDK_KEY_Up:
  case GDK_KEY_KP_Up:
    target = find_neighbor (self, cursor, GTK_DIR_UP);
    break;
  case GDK_KEY_Down:
  case GDK_KEY_KP_Down:
    target = find_neighbor (self, cursor, GTK_DIR_DOWN);
    break;
  case GDK_KEY_Home:
  case GDK_KEY_KP_Home:
    target = (state & GDK_CONTROL_MASK) != 0 && self->order->len > 0
               ? g_ptr_array_index (self->order, 0)
               : row_edge (self, cursor, FALSE);
    state &= ~GDK_CONTROL_MASK;
    break;
  case GDK_KEY_End:
  case GDK_KEY_KP_End:
    target = (state & GDK_CONTROL_MASK) != 0 && self->order->len > 0
               ? g_ptr_array_index (self->order, self->order->len - 1)
               : row_edge (self, cursor, TRUE);
    state &= ~GDK_CONTROL_MASK;
    break;
  case GDK_KEY_a:
  case GDK_KEY_A:
    if ((state & GDK_CONTROL_MASK) != 0 &&
        self->selection_mode == GTK_SELECTION_MULTIPLE) {
      awra_keyboard_view_select_all (self);
      return TRUE;
    }
    return FALSE;
  default:
    return FALSE;
  }
  if (target != NULL)
    move_cursor (self, target, state);
  return TRUE;
}

static gboolean
awra_keyboard_view_focus (GtkWidget        *widget,
                          GtkDirectionType  direction)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (widget);
  GtkWidget *focus_child = gtk_widget_get_focus_child (widget);
  KeySlot *cursor;

  if (focus_child == NULL) {
    /* Roving focus: Tab enters on the remembered key only. */
    cursor = initial_cursor (self);
    return cursor != NULL && gtk_widget_grab_focus (GTK_WIDGET (cursor->cap));
  }
  if (direction == GTK_DIR_TAB_FORWARD || direction == GTK_DIR_TAB_BACKWARD)
    return FALSE;
  cursor = navigation_origin (self);
  if (cursor != NULL) {
    KeySlot *target = find_neighbor (self, cursor, direction);

    if (target != NULL)
      move_cursor (self, target, 0);
  }
  return TRUE;
}

static gboolean
awra_keyboard_view_grab_focus (GtkWidget *widget)
{
  KeySlot *cursor = initial_cursor (AWRA_KEYBOARD_VIEW (widget));

  return cursor != NULL && gtk_widget_grab_focus (GTK_WIDGET (cursor->cap));
}

/* File drops ----------------------------------------------------------- */

static void
set_drop_slot (AwraKeyboardView *self,
               KeySlot          *slot)
{
  if (self->drop_slot == slot)
    return;
  if (self->drop_slot != NULL)
    awra_key_cap_set_drop_highlight (self->drop_slot->cap, FALSE);
  self->drop_slot = slot;
  if (slot != NULL)
    awra_key_cap_set_drop_highlight (slot->cap, TRUE);
}

/* Each key has its own drop target: a GtkDropTarget claims every drop
 * released over its widget, so one on the whole view would swallow drops
 * between keys that the widgets around the keyboard could take. */
static KeySlot *
drop_target_slot (GtkDropTarget *target)
{
  return g_object_get_data (G_OBJECT (target), "awra-key-slot");
}

static gboolean
key_drop_accept_cb (GtkDropTarget    *target,
                    GdkDrop          *drop,
                    AwraKeyboardView *self)
{
  if (!self->accepts_file_drops || !slot_selectable (drop_target_slot (target)))
    return FALSE;
  if ((gdk_drop_get_actions (drop) & GDK_ACTION_COPY) == 0)
    return FALSE;
  return gdk_content_formats_match_gtype (gtk_drop_target_get_formats (target),
                                          gdk_drop_get_formats (drop))
         != G_TYPE_INVALID;
}

static GdkDragAction
key_drop_enter_cb (GtkDropTarget    *target,
                   double            x,
                   double            y,
                   AwraKeyboardView *self)
{
  (void) x;
  (void) y;
  set_drop_slot (self, drop_target_slot (target));
  return GDK_ACTION_COPY;
}

static void
key_drop_leave_cb (GtkDropTarget    *target,
                   AwraKeyboardView *self)
{
  if (self->drop_slot == drop_target_slot (target))
    set_drop_slot (self, NULL);
}

static gboolean
key_drop_cb (GtkDropTarget    *target,
             const GValue     *value,
             double            x,
             double            y,
             AwraKeyboardView *self)
{
  KeySlot *slot = drop_target_slot (target);
  GdkFileList *files;

  (void) x;
  (void) y;
  set_drop_slot (self, NULL);
  if (!self->accepts_file_drops || !slot_selectable (slot) ||
      !G_VALUE_HOLDS (value, GDK_TYPE_FILE_LIST))
    return FALSE;
  files = g_value_get_boxed (value);
  if (files == NULL)
    return FALSE;
  g_signal_emit (self, signals[SIGNAL_FILES_DROPPED], 0,
                 slot->info->code, files);
  return TRUE;
}

static void
add_key_drop_target (AwraKeyboardView *self,
                     KeySlot          *slot)
{
  GtkDropTarget *target = gtk_drop_target_new (GDK_TYPE_FILE_LIST,
                                               GDK_ACTION_COPY);

  g_object_set_data (G_OBJECT (target), "awra-key-slot", slot);
  g_signal_connect (target, "accept", G_CALLBACK (key_drop_accept_cb), self);
  g_signal_connect (target, "enter", G_CALLBACK (key_drop_enter_cb), self);
  g_signal_connect (target, "leave", G_CALLBACK (key_drop_leave_cb), self);
  g_signal_connect (target, "drop", G_CALLBACK (key_drop_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (slot->cap),
                             GTK_EVENT_CONTROLLER (target));
}

/* GtkWidget ------------------------------------------------------------ */

static GtkSizeRequestMode
awra_keyboard_view_get_request_mode (GtkWidget *widget)
{
  (void) widget;
  return GTK_SIZE_REQUEST_HEIGHT_FOR_WIDTH;
}

static void
awra_keyboard_view_measure (GtkWidget      *widget,
                            GtkOrientation  orientation,
                            int             for_size,
                            int            *minimum,
                            int            *natural,
                            int            *minimum_baseline,
                            int            *natural_baseline)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (widget);

  if (orientation == GTK_ORIENTATION_HORIZONTAL) {
    *minimum = (int) ceil (self->total_width * UNIT_MINIMUM);
    *natural = (int) ceil (self->total_width * UNIT_NATURAL);
  } else if (for_size >= 0) {
    double unit = CLAMP ((double) for_size / self->total_width,
                         UNIT_MINIMUM, UNIT_MAXIMUM);

    *minimum = *natural = (int) ceil (self->total_height * unit);
  } else {
    *minimum = (int) ceil (self->total_height * UNIT_MINIMUM);
    *natural = (int) ceil (self->total_height * UNIT_NATURAL);
  }
  *minimum_baseline = -1;
  *natural_baseline = -1;
}

static void
awra_keyboard_view_size_allocate (GtkWidget *widget,
                                  int        width,
                                  int        height,
                                  int        baseline)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (widget);
  double unit = MIN ((double) width / self->total_width,
                     (double) height / self->total_height);
  double gap;
  double origin_x;
  double origin_y;

  (void) baseline;
  unit = CLAMP (unit, 1.0, UNIT_MAXIMUM);
  gap = CLAMP (round (unit * 0.09), 2.0, 6.0);
  origin_x = floor (((double) width - unit * self->total_width) / 2.0);
  origin_y = floor (((double) height - unit * self->total_height) / 2.0);

  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);
    double x0 = round (origin_x + slot->x * unit + gap / 2.0);
    double y0 = round (origin_y + slot->y * unit + gap / 2.0);
    double x1 = round (origin_x + (slot->x + slot->width) * unit - gap / 2.0);
    double y1 = round (origin_y + (slot->y + slot->height) * unit - gap / 2.0);

    gtk_widget_allocate (GTK_WIDGET (slot->cap),
                         (int) MAX (x1 - x0, 1.0),
                         (int) MAX (y1 - y0, 1.0),
                         -1,
                         gsk_transform_translate (
                           NULL, &GRAPHENE_POINT_INIT ((float) x0,
                                                       (float) y0)));
  }
}

static void
awra_keyboard_view_dispose (GObject *object)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (object);

  disconnect_keyboard (self);
  self->anchor = NULL;
  self->cursor = NULL;
  self->drop_slot = NULL;
  if (self->slots != NULL) {
    for (guint i = 0; i < self->slots->len; i++) {
      KeySlot *slot = g_ptr_array_index (self->slots, i);

      if (slot->cap != NULL) {
        g_signal_handlers_disconnect_by_data (slot->cap, self);
        gtk_widget_unparent (GTK_WIDGET (slot->cap));
        slot->cap = NULL;
      }
    }
  }
  g_clear_pointer (&self->order, g_ptr_array_unref);
  g_clear_pointer (&self->by_code, g_hash_table_unref);
  g_clear_pointer (&self->slots, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_keyboard_view_parent_class)->dispose (object);
}

static void
awra_keyboard_view_get_property (GObject    *object,
                                 guint       property_id,
                                 GValue     *value,
                                 GParamSpec *pspec)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (object);

  switch (property_id) {
  case PROP_PHYSICAL_LAYOUT:
    g_value_set_enum (value, self->physical_layout);
    break;
  case PROP_SHOW_FUNCTION_ROW:
    g_value_set_boolean (value, self->show_function_row);
    break;
  case PROP_SHOW_NAVIGATION_CLUSTER:
    g_value_set_boolean (value, self->show_navigation_cluster);
    break;
  case PROP_SHOW_NUMPAD:
    g_value_set_boolean (value, self->show_numpad);
    break;
  case PROP_SELECTION_MODE:
    g_value_set_enum (value, self->selection_mode);
    break;
  case PROP_ACCEPTS_FILE_DROPS:
    g_value_set_boolean (value, self->accepts_file_drops);
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_keyboard_view_set_property (GObject      *object,
                                 guint         property_id,
                                 const GValue *value,
                                 GParamSpec   *pspec)
{
  AwraKeyboardView *self = AWRA_KEYBOARD_VIEW (object);

  switch (property_id) {
  case PROP_PHYSICAL_LAYOUT:
    awra_keyboard_view_set_physical_layout (self, g_value_get_enum (value));
    break;
  case PROP_SHOW_FUNCTION_ROW:
    awra_keyboard_view_set_show_function_row (self,
                                              g_value_get_boolean (value));
    break;
  case PROP_SHOW_NAVIGATION_CLUSTER:
    awra_keyboard_view_set_show_navigation_cluster (
      self, g_value_get_boolean (value));
    break;
  case PROP_SHOW_NUMPAD:
    awra_keyboard_view_set_show_numpad (self, g_value_get_boolean (value));
    break;
  case PROP_SELECTION_MODE:
    awra_keyboard_view_set_selection_mode (self, g_value_get_enum (value));
    break;
  case PROP_ACCEPTS_FILE_DROPS:
    awra_keyboard_view_set_accepts_file_drops (self,
                                               g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_keyboard_view_class_init (AwraKeyboardViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  const GParamFlags flags = G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                            G_PARAM_STATIC_STRINGS;

  object_class->dispose = awra_keyboard_view_dispose;
  object_class->get_property = awra_keyboard_view_get_property;
  object_class->set_property = awra_keyboard_view_set_property;
  widget_class->map = awra_keyboard_view_map;
  widget_class->unmap = awra_keyboard_view_unmap;
  widget_class->get_request_mode = awra_keyboard_view_get_request_mode;
  widget_class->measure = awra_keyboard_view_measure;
  widget_class->size_allocate = awra_keyboard_view_size_allocate;
  widget_class->focus = awra_keyboard_view_focus;
  widget_class->grab_focus = awra_keyboard_view_grab_focus;

  properties[PROP_PHYSICAL_LAYOUT] =
    g_param_spec_enum ("physical-layout", NULL, NULL,
                       AWRA_TYPE_KEYBOARD_PHYSICAL_LAYOUT,
                       AWRA_KEYBOARD_PHYSICAL_LAYOUT_ANSI, flags);
  properties[PROP_SHOW_FUNCTION_ROW] =
    g_param_spec_boolean ("show-function-row", NULL, NULL, TRUE, flags);
  properties[PROP_SHOW_NAVIGATION_CLUSTER] =
    g_param_spec_boolean ("show-navigation-cluster", NULL, NULL, TRUE, flags);
  properties[PROP_SHOW_NUMPAD] =
    g_param_spec_boolean ("show-numpad", NULL, NULL, FALSE, flags);
  properties[PROP_SELECTION_MODE] =
    g_param_spec_enum ("selection-mode", NULL, NULL, GTK_TYPE_SELECTION_MODE,
                       GTK_SELECTION_SINGLE, flags);
  properties[PROP_ACCEPTS_FILE_DROPS] =
    g_param_spec_boolean ("accepts-file-drops", NULL, NULL, FALSE, flags);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraKeyboardView::key-activated:
   * @self: the keyboard view
   * @code: the activated physical key identifier
   * @modifiers: the modifiers held during the activation
   *
   * Emitted when a key is clicked or activated with Enter or Space, after
   * the selection has been updated.
   */
  signals[SIGNAL_KEY_ACTIVATED] =
    g_signal_new ("key-activated", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 2,
                  G_TYPE_STRING, GDK_TYPE_MODIFIER_TYPE);
  /**
   * AwraKeyboardView::selection-changed:
   * @self: the keyboard view
   *
   * Emitted whenever the set of selected keys changes.
   */
  signals[SIGNAL_SELECTION_CHANGED] =
    g_signal_new ("selection-changed", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 0);
  /**
   * AwraKeyboardView::files-dropped:
   * @self: the keyboard view
   * @code: the physical key receiving the drop
   * @files: the dropped files
   *
   * Emitted when files are dropped on a key while
   * #AwraKeyboardView:accepts-file-drops is enabled.
   */
  signals[SIGNAL_FILES_DROPPED] =
    g_signal_new ("files-dropped", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 2,
                  G_TYPE_STRING, GDK_TYPE_FILE_LIST);

  gtk_widget_class_set_css_name (widget_class, "awrakeyboardview");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_keyboard_view_init (AwraKeyboardView *self)
{
  const AwraKeyCodeInfo *infos;
  GtkEventController *keys;
  guint n_infos;

  self->physical_layout = AWRA_KEYBOARD_PHYSICAL_LAYOUT_ANSI;
  self->show_function_row = TRUE;
  self->show_navigation_cluster = TRUE;
  self->selection_mode = GTK_SELECTION_SINGLE;
  self->slots = g_ptr_array_new_with_free_func (g_free);
  self->by_code = g_hash_table_new (g_str_hash, g_str_equal);
  self->order = g_ptr_array_new ();

  infos = awra_key_code_info_get_all (&n_infos);
  for (guint i = 0; i < n_infos; i++) {
    KeySlot *slot = g_new0 (KeySlot, 1);

    slot->info = &infos[i];
    slot->cap = AWRA_KEY_CAP (awra_key_cap_new (infos[i].code, NULL));
    gtk_widget_set_parent (GTK_WIDGET (slot->cap), GTK_WIDGET (self));
    g_signal_connect (slot->cap, "activated",
                      G_CALLBACK (cap_activated_cb), self);
    g_signal_connect (slot->cap, "notify::has-focus",
                      G_CALLBACK (cap_focus_cb), self);
    add_key_drop_target (self, slot);
    g_ptr_array_add (self->slots, slot);
    g_hash_table_insert (self->by_code, (gpointer) infos[i].code, slot);
  }
  rebuild_geometry (self);
  refresh_labels (self);

  keys = gtk_event_controller_key_new ();
  g_signal_connect (keys, "key-pressed", G_CALLBACK (key_pressed_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), keys);


  gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  _("Keyboard"), -1);
}

/* Public API ----------------------------------------------------------- */

GtkWidget *
awra_keyboard_view_new (void)
{
  return g_object_new (AWRA_TYPE_KEYBOARD_VIEW, NULL);
}

AwraKeyboardPhysicalLayout
awra_keyboard_view_get_physical_layout (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self),
                        AWRA_KEYBOARD_PHYSICAL_LAYOUT_ANSI);
  return self->physical_layout;
}

static void
rebuild_preserving_selection (AwraKeyboardView *self)
{
  g_autoptr (GHashTable) before = current_selection (self);
  g_autoptr (GHashTable) after = NULL;

  rebuild_geometry (self);
  after = current_selection (self);
  if (g_hash_table_size (before) != g_hash_table_size (after))
    g_signal_emit (self, signals[SIGNAL_SELECTION_CHANGED], 0);
}

void
awra_keyboard_view_set_physical_layout (AwraKeyboardView           *self,
                                        AwraKeyboardPhysicalLayout  layout)
{
  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  g_return_if_fail (layout == AWRA_KEYBOARD_PHYSICAL_LAYOUT_ANSI ||
                    layout == AWRA_KEYBOARD_PHYSICAL_LAYOUT_ISO);
  if (self->physical_layout == layout)
    return;
  self->physical_layout = layout;
  rebuild_preserving_selection (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_PHYSICAL_LAYOUT]);
}

static void
set_section (AwraKeyboardView *self,
             gboolean         *field,
             gboolean          value,
             guint             prop)
{
  value = !!value;
  if (*field == value)
    return;
  *field = value;
  rebuild_preserving_selection (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[prop]);
}

gboolean
awra_keyboard_view_get_show_function_row (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), FALSE);
  return self->show_function_row;
}

void
awra_keyboard_view_set_show_function_row (AwraKeyboardView *self,
                                          gboolean          show)
{
  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  set_section (self, &self->show_function_row, show, PROP_SHOW_FUNCTION_ROW);
}

gboolean
awra_keyboard_view_get_show_navigation_cluster (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), FALSE);
  return self->show_navigation_cluster;
}

void
awra_keyboard_view_set_show_navigation_cluster (AwraKeyboardView *self,
                                                gboolean          show)
{
  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  set_section (self, &self->show_navigation_cluster, show,
               PROP_SHOW_NAVIGATION_CLUSTER);
}

gboolean
awra_keyboard_view_get_show_numpad (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), FALSE);
  return self->show_numpad;
}

void
awra_keyboard_view_set_show_numpad (AwraKeyboardView *self,
                                    gboolean          show)
{
  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  set_section (self, &self->show_numpad, show, PROP_SHOW_NUMPAD);
}

AwraKeyCap *
awra_keyboard_view_get_key_cap (AwraKeyboardView *self,
                                const char       *code)
{
  KeySlot *slot;

  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), NULL);
  g_return_val_if_fail (code != NULL, NULL);
  slot = g_hash_table_lookup (self->by_code, code);
  return slot != NULL && slot->visible ? slot->cap : NULL;
}

static char **
codes_to_strv (AwraKeyboardView *self,
               gboolean          selected_only)
{
  g_autoptr (GStrvBuilder) builder = g_strv_builder_new ();

  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);

    if (!selected_only || awra_key_cap_get_selected (slot->cap))
      g_strv_builder_add (builder, slot->info->code);
  }
  return g_strv_builder_end (builder);
}

char **
awra_keyboard_view_get_codes (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), NULL);
  return codes_to_strv (self, FALSE);
}

void
awra_keyboard_view_set_key_label (AwraKeyboardView *self,
                                  const char       *code,
                                  const char       *label)
{
  KeySlot *slot;

  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  g_return_if_fail (code != NULL);
  slot = g_hash_table_lookup (self->by_code, code);
  if (slot == NULL)
    return;
  slot->label_overridden = label != NULL;
  if (label != NULL)
    awra_key_cap_set_label (slot->cap, label);
  else
    refresh_labels (self);
}

GtkSelectionMode
awra_keyboard_view_get_selection_mode (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), GTK_SELECTION_NONE);
  return self->selection_mode;
}

void
awra_keyboard_view_set_selection_mode (AwraKeyboardView *self,
                                       GtkSelectionMode  mode)
{
  g_autoptr (GHashTable) selected = NULL;

  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  g_return_if_fail (mode >= GTK_SELECTION_NONE &&
                    mode <= GTK_SELECTION_MULTIPLE);
  if (self->selection_mode == mode)
    return;
  self->selection_mode = mode;
  selected = current_selection (self);
  if (mode == GTK_SELECTION_NONE) {
    g_hash_table_remove_all (selected);
  } else if (mode != GTK_SELECTION_MULTIPLE &&
             g_hash_table_size (selected) > 1) {
    KeySlot *keep = self->anchor != NULL &&
                    g_hash_table_contains (selected, self->anchor)
                      ? self->anchor : NULL;

    for (guint i = 0; keep == NULL && i < self->order->len; i++) {
      if (g_hash_table_contains (selected, g_ptr_array_index (self->order, i)))
        keep = g_ptr_array_index (self->order, i);
    }
    g_hash_table_remove_all (selected);
    g_hash_table_add (selected, keep);
  }
  commit_selection (self, selected);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTION_MODE]);
}

char **
awra_keyboard_view_get_selected_codes (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), NULL);
  return codes_to_strv (self, TRUE);
}

void
awra_keyboard_view_set_selected_codes (AwraKeyboardView   *self,
                                       const char * const *codes)
{
  g_autoptr (GHashTable) selected = g_hash_table_new (NULL, NULL);

  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  for (guint i = 0;
       codes != NULL && codes[i] != NULL &&
       self->selection_mode != GTK_SELECTION_NONE;
       i++) {
    KeySlot *slot = g_hash_table_lookup (self->by_code, codes[i]);

    if (!slot_selectable (slot))
      continue;
    g_hash_table_add (selected, slot);
    if (self->anchor == NULL || g_hash_table_size (selected) == 1)
      self->anchor = slot;
    if (self->selection_mode != GTK_SELECTION_MULTIPLE)
      break;
  }
  commit_selection (self, selected);
}

void
awra_keyboard_view_select_all (AwraKeyboardView *self)
{
  g_autoptr (GHashTable) selected = g_hash_table_new (NULL, NULL);

  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  if (self->selection_mode != GTK_SELECTION_MULTIPLE)
    return;
  for (guint i = 0; i < self->order->len; i++) {
    KeySlot *slot = g_ptr_array_index (self->order, i);

    if (slot_selectable (slot))
      g_hash_table_add (selected, slot);
  }
  commit_selection (self, selected);
}

void
awra_keyboard_view_unselect_all (AwraKeyboardView *self)
{
  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  commit_selection (self, NULL);
}

gboolean
awra_keyboard_view_get_accepts_file_drops (AwraKeyboardView *self)
{
  g_return_val_if_fail (AWRA_IS_KEYBOARD_VIEW (self), FALSE);
  return self->accepts_file_drops;
}

void
awra_keyboard_view_set_accepts_file_drops (AwraKeyboardView *self,
                                           gboolean          accepts)
{
  g_return_if_fail (AWRA_IS_KEYBOARD_VIEW (self));
  accepts = !!accepts;
  if (self->accepts_file_drops == accepts)
    return;
  self->accepts_file_drops = accepts;
  if (!accepts)
    set_drop_slot (self, NULL);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_ACCEPTS_FILE_DROPS]);
}
