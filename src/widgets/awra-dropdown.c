/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-dropdown.h>
#include <awra/awra-layout.h>
#include <awra/awra-button.h>
#include <awra/awra-context.h>

#include "awra-i18n-private.h"

struct _AwraDropdown {
  GtkWidget parent_instance;
  GtkDropDown *delegate;
  GtkPopoverBin *popover_bin;
  GtkButton *button;
  GtkLabel *button_label;
  AwraPopover *popover;
  GtkSingleSelection *selection;
  GtkListView *list_view;
  GtkWidget *scroller;
  GtkExpression *expression;
  gboolean syncing;
};

enum {
  PROP_0,
  PROP_MODEL,
  PROP_SELECTED,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraDropdown, awra_dropdown, GTK_TYPE_WIDGET)

static char *
item_to_text (AwraDropdown *self,
              GObject      *item)
{
  GValue value = G_VALUE_INIT;
  char *text = NULL;

  if (item == NULL)
    return g_strdup (_("Select…"));

  if (self->expression != NULL &&
      gtk_expression_evaluate (self->expression, item, &value)) {
    if (G_VALUE_HOLDS_STRING (&value))
      text = g_value_dup_string (&value);
    g_value_unset (&value);
  } else if (GTK_IS_STRING_OBJECT (item)) {
    text = g_strdup (gtk_string_object_get_string (GTK_STRING_OBJECT (item)));
  }

  return text != NULL ? text : g_strdup (_("Item"));
}

static void
update_button_label (AwraDropdown *self)
{
  GObject *item = gtk_single_selection_get_selected_item (self->selection);
  g_autofree char *text = item_to_text (self, item);

  gtk_label_set_text (self->button_label, text);
  gtk_accessible_update_property (
    GTK_ACCESSIBLE (self->button),
    GTK_ACCESSIBLE_PROPERTY_LABEL, text,
    -1);
  gtk_accessible_update_property (
    GTK_ACCESSIBLE (self),
    GTK_ACCESSIBLE_PROPERTY_VALUE_TEXT, text,
    -1);
}

static void
chevron_draw_cb (GtkDrawingArea *area,
                 cairo_t        *cr,
                 int             width,
                 int             height,
                 gpointer        user_data)
{
  AwraContext *context = awra_context_get_for_display (
    gtk_widget_get_display (GTK_WIDGET (area)));
  const GdkRGBA *color = awra_token_set_get_muted_foreground (
    awra_style_manager_get_token_set (
      awra_context_get_style_manager (context)));
  double center_x = width / 2.0;
  double center_y = height / 2.0;

  (void) user_data;
  gdk_cairo_set_source_rgba (cr, color);
  cairo_set_line_width (cr, 1.7);
  cairo_set_line_cap (cr, CAIRO_LINE_CAP_ROUND);
  cairo_set_line_join (cr, CAIRO_LINE_JOIN_ROUND);
  cairo_move_to (cr, center_x - 3.0, center_y - 1.5);
  cairo_line_to (cr, center_x, center_y + 1.8);
  cairo_line_to (cr, center_x + 3.0, center_y - 1.5);
  cairo_stroke (cr);
}

static void
button_clicked_cb (GtkButton    *button,
                   AwraDropdown *self)
{
  (void) button;
  awra_dropdown_popup (self);
}

static void
list_item_selected_changed_cb (GtkListItem *list_item,
                               GParamSpec  *pspec,
                               gpointer     user_data)
{
  GtkWidget *indicator = g_object_get_data (
    G_OBJECT (list_item), "awra-dropdown-indicator");

  (void) pspec;
  (void) user_data;
  if (indicator != NULL)
    gtk_widget_set_visible (indicator,
                            gtk_list_item_get_selected (list_item));
}

static void
selection_indicator_draw_cb (GtkDrawingArea *area,
                             cairo_t        *cr,
                             int             width,
                             int             height,
                             gpointer        user_data)
{
  AwraContext *context = awra_context_get_for_display (
    gtk_widget_get_display (GTK_WIDGET (area)));
  const GdkRGBA *color = awra_token_set_get_accent_content (
    awra_style_manager_get_token_set (
      awra_context_get_style_manager (context)));

  (void) user_data;
  gdk_cairo_set_source_rgba (cr, color);
  cairo_arc (cr, width / 2.0, height / 2.0, 3.0, 0.0, 2.0 * G_PI);
  cairo_fill (cr);
}

static void
list_factory_setup_cb (GtkSignalListItemFactory *factory,
                       GtkListItem              *list_item,
                       AwraDropdown             *self)
{
  GtkWidget *box = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0);
  GtkWidget *label = gtk_label_new (NULL);
  GtkWidget *indicator = gtk_drawing_area_new ();

  awra_box_set_spacing (GTK_BOX (box), AWRA_SPACING_MD);
  (void) factory;
  (void) self;
  gtk_widget_set_hexpand (label, TRUE);
  gtk_label_set_xalign (GTK_LABEL (label), 0.0f);
  gtk_label_set_ellipsize (GTK_LABEL (label), PANGO_ELLIPSIZE_END);
  gtk_widget_add_css_class (box, "awra-dropdown-row-content");
  gtk_widget_add_css_class (indicator, "awra-dropdown-indicator");
  gtk_widget_set_size_request (indicator, 8, 8);
  gtk_drawing_area_set_draw_func (GTK_DRAWING_AREA (indicator),
                                  selection_indicator_draw_cb,
                                  NULL, NULL);
  gtk_widget_set_visible (indicator, FALSE);
  gtk_box_append (GTK_BOX (box), label);
  gtk_box_append (GTK_BOX (box), indicator);
  g_object_set_data (G_OBJECT (list_item),
                     "awra-dropdown-label", label);
  g_object_set_data (G_OBJECT (list_item),
                     "awra-dropdown-indicator", indicator);
  g_signal_connect (list_item, "notify::selected",
                    G_CALLBACK (list_item_selected_changed_cb), NULL);
  gtk_list_item_set_child (list_item, box);
}

static void
list_factory_bind_cb (GtkSignalListItemFactory *factory,
                      GtkListItem              *list_item,
                      AwraDropdown             *self)
{
  GtkWidget *label = g_object_get_data (
    G_OBJECT (list_item), "awra-dropdown-label");
  GtkWidget *indicator = g_object_get_data (
    G_OBJECT (list_item), "awra-dropdown-indicator");
  GObject *item = gtk_list_item_get_item (list_item);
  g_autofree char *text = item_to_text (self, item);

  (void) factory;
  gtk_label_set_text (GTK_LABEL (label), text);
  gtk_widget_set_visible (indicator,
                          gtk_list_item_get_selected (list_item));
}

static GtkListItemFactory *
create_list_factory (AwraDropdown *self)
{
  GtkListItemFactory *factory = gtk_signal_list_item_factory_new ();

  g_signal_connect_object (factory, "setup",
                           G_CALLBACK (list_factory_setup_cb), self, 0);
  g_signal_connect_object (factory, "bind",
                           G_CALLBACK (list_factory_bind_cb), self, 0);
  return factory;
}

static void
selection_changed_cb (GtkSingleSelection *selection,
                      GParamSpec         *pspec,
                      AwraDropdown       *self)
{
  guint selected;

  (void) pspec;
  if (self->syncing)
    return;

  selected = gtk_single_selection_get_selected (selection);
  self->syncing = TRUE;
  gtk_drop_down_set_selected (self->delegate, selected);
  self->syncing = FALSE;
  update_button_label (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED]);
}

static void
sync_model_from_delegate (AwraDropdown *self)
{
  GListModel *model = gtk_drop_down_get_model (self->delegate);
  guint selected = gtk_drop_down_get_selected (self->delegate);

  self->syncing = TRUE;
  gtk_single_selection_set_model (self->selection, model);
  gtk_single_selection_set_selected (self->selection, selected);
  self->syncing = FALSE;
  update_button_label (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MODEL]);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED]);
}

static void
sync_expression_from_delegate (AwraDropdown *self)
{
  GtkExpression *expression = gtk_drop_down_get_expression (self->delegate);

  if (expression == self->expression)
    return;
  g_clear_pointer (&self->expression, gtk_expression_unref);
  if (expression != NULL)
    self->expression = gtk_expression_ref (expression);
  gtk_list_view_set_factory (self->list_view, create_list_factory (self));
  update_button_label (self);
}

static void
delegate_notify_cb (GtkDropDown *delegate,
                    GParamSpec  *pspec,
                    AwraDropdown *self)
{
  if (self->syncing)
    return;

  if (g_str_equal (pspec->name, "model")) {
    sync_model_from_delegate (self);
  } else if (g_str_equal (pspec->name, "selected")) {
    self->syncing = TRUE;
    gtk_single_selection_set_selected (
      self->selection, gtk_drop_down_get_selected (delegate));
    self->syncing = FALSE;
    update_button_label (self);
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED]);
  } else if (g_str_equal (pspec->name, "expression")) {
    sync_expression_from_delegate (self);
  }
}

static void
list_activate_cb (GtkListView *list_view,
                  guint        position,
                  AwraDropdown *self)
{
  (void) list_view;
  awra_dropdown_set_selected (self, position);
  awra_dropdown_popdown (self);
}

static void
popover_map_cb (GtkWidget    *popover,
                AwraDropdown *self)
{
  int width = MAX (gtk_widget_get_width (GTK_WIDGET (self)), 160);

  (void) popover;
  gtk_widget_set_size_request (self->scroller, width, -1);
  gtk_widget_grab_focus (GTK_WIDGET (self->list_view));
  gtk_accessible_update_state (
    GTK_ACCESSIBLE (self), GTK_ACCESSIBLE_STATE_EXPANDED, TRUE, -1);
}

static void
popover_unmap_cb (GtkWidget    *popover,
                  AwraDropdown *self)
{
  (void) popover;
  gtk_accessible_update_state (
    GTK_ACCESSIBLE (self), GTK_ACCESSIBLE_STATE_EXPANDED, FALSE, -1);
}

static gboolean
key_pressed_cb (GtkEventControllerKey *controller,
                guint                  keyval,
                guint                  keycode,
                GdkModifierType        state,
                AwraDropdown          *self)
{
  guint selected;
  guint count;

  (void) controller;
  (void) keycode;
  if (gtk_widget_get_mapped (GTK_WIDGET (self->popover)))
    return GDK_EVENT_PROPAGATE;
  if (keyval == GDK_KEY_Down && (state & GDK_ALT_MASK) != 0) {
    awra_dropdown_popup (self);
    return GDK_EVENT_STOP;
  }

  count = g_list_model_get_n_items (G_LIST_MODEL (self->selection));
  if (count == 0)
    return GDK_EVENT_PROPAGATE;
  selected = awra_dropdown_get_selected (self);
  switch (keyval) {
  case GDK_KEY_Down:
    selected = selected == GTK_INVALID_LIST_POSITION
                 ? 0 : MIN (selected + 1, count - 1);
    break;
  case GDK_KEY_Up:
    selected = selected == GTK_INVALID_LIST_POSITION
                 ? count - 1 : (selected > 0 ? selected - 1 : 0);
    break;
  case GDK_KEY_Home:
    selected = 0;
    break;
  case GDK_KEY_End:
    selected = count - 1;
    break;
  default:
    return GDK_EVENT_PROPAGATE;
  }
  awra_dropdown_set_selected (self, selected);
  return GDK_EVENT_STOP;
}

static void
awra_dropdown_dispose (GObject *object)
{
  AwraDropdown *self = AWRA_DROPDOWN (object);

  g_clear_pointer (&self->expression, gtk_expression_unref);
  g_clear_object (&self->selection);
  g_clear_object (&self->delegate);
  if (self->popover_bin != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->popover_bin));
    self->popover_bin = NULL;
    self->button = NULL;
    self->button_label = NULL;
    self->popover = NULL;
    self->list_view = NULL;
    self->scroller = NULL;
  }
  G_OBJECT_CLASS (awra_dropdown_parent_class)->dispose (object);
}

static void
awra_dropdown_snapshot (GtkWidget   *widget,
                        GtkSnapshot *snapshot)
{
  AwraDropdown *self = AWRA_DROPDOWN (widget);

  if (self->popover_bin != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->popover_bin),
                               snapshot);
}

static void
awra_dropdown_get_property (GObject    *object,
                            guint       property_id,
                            GValue     *value,
                            GParamSpec *pspec)
{
  AwraDropdown *self = AWRA_DROPDOWN (object);

  switch (property_id) {
  case PROP_MODEL:
    g_value_set_object (value, awra_dropdown_get_model (self));
    break;
  case PROP_SELECTED:
    g_value_set_uint (value, awra_dropdown_get_selected (self));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_dropdown_set_property (GObject      *object,
                            guint         property_id,
                            const GValue *value,
                            GParamSpec   *pspec)
{
  switch (property_id) {
  case PROP_MODEL:
    awra_dropdown_set_model (AWRA_DROPDOWN (object),
                             g_value_get_object (value));
    break;
  case PROP_SELECTED:
    awra_dropdown_set_selected (AWRA_DROPDOWN (object),
                                g_value_get_uint (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_dropdown_class_init (AwraDropdownClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_dropdown_dispose;
  object_class->get_property = awra_dropdown_get_property;
  object_class->set_property = awra_dropdown_set_property;
  widget_class->snapshot = awra_dropdown_snapshot;
  properties[PROP_MODEL] = g_param_spec_object (
    "model", NULL, NULL, G_TYPE_LIST_MODEL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SELECTED] = g_param_spec_uint (
    "selected", NULL, NULL, 0, G_MAXUINT, GTK_INVALID_LIST_POSITION,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class,
                                            GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awradropdown");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_COMBO_BOX);
}

static void
awra_dropdown_init (AwraDropdown *self)
{
  GtkListItemFactory *factory;
  GtkWidget *content;
  GtkWidget *button_content;
  GtkWidget *chevron;
  GtkEventController *keys;

  self->delegate = GTK_DROP_DOWN (
    g_object_ref_sink (gtk_drop_down_new (NULL, NULL)));
  self->selection = gtk_single_selection_new (NULL);
  factory = create_list_factory (self);
  self->list_view = GTK_LIST_VIEW (gtk_list_view_new (
    GTK_SELECTION_MODEL (g_object_ref (self->selection)), factory));
  gtk_list_view_set_single_click_activate (self->list_view, TRUE);
  gtk_widget_add_css_class (GTK_WIDGET (self->list_view),
                            "awra-dropdown-list");

  self->scroller = gtk_scrolled_window_new ();
  gtk_scrolled_window_set_policy (GTK_SCROLLED_WINDOW (self->scroller),
                                  GTK_POLICY_NEVER,
                                  GTK_POLICY_AUTOMATIC);
  gtk_scrolled_window_set_propagate_natural_height (
    GTK_SCROLLED_WINDOW (self->scroller), TRUE);
  gtk_scrolled_window_set_max_content_height (
    GTK_SCROLLED_WINDOW (self->scroller), 280);
  gtk_scrolled_window_set_child (GTK_SCROLLED_WINDOW (self->scroller),
                                 GTK_WIDGET (self->list_view));
  content = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  gtk_widget_add_css_class (content, "awra-dropdown-popup");
  gtk_box_append (GTK_BOX (content), self->scroller);

  self->popover = AWRA_POPOVER (awra_popover_new ());
  awra_popover_set_child (self->popover, content);
  self->button = GTK_BUTTON (awra_button_new ());
  awra_button_set_appearance (AWRA_BUTTON (self->button),
                              AWRA_BUTTON_APPEARANCE_SECONDARY);
  gtk_widget_add_css_class (GTK_WIDGET (self->button),
                            "awra-dropdown-button");
  button_content = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0);
  awra_box_set_spacing (GTK_BOX (button_content), AWRA_SPACING_SM);
  self->button_label = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_set_hexpand (GTK_WIDGET (self->button_label), TRUE);
  gtk_label_set_xalign (self->button_label, 0.0f);
  gtk_label_set_ellipsize (self->button_label, PANGO_ELLIPSIZE_END);
  chevron = gtk_drawing_area_new ();
  gtk_widget_set_size_request (chevron, 10, 10);
  gtk_widget_add_css_class (chevron, "awra-dropdown-chevron");
  gtk_drawing_area_set_draw_func (GTK_DRAWING_AREA (chevron),
                                  chevron_draw_cb, NULL, NULL);
  gtk_box_append (GTK_BOX (button_content), GTK_WIDGET (self->button_label));
  gtk_box_append (GTK_BOX (button_content), chevron);
  gtk_button_set_child (self->button, button_content);
  g_signal_connect (self->button, "clicked",
                    G_CALLBACK (button_clicked_cb), self);

  self->popover_bin = GTK_POPOVER_BIN (gtk_popover_bin_new ());
  gtk_widget_add_css_class (GTK_WIDGET (self->popover_bin),
                            "awra-dropdown-bin");
  gtk_popover_bin_set_child (self->popover_bin, GTK_WIDGET (self->button));
  gtk_popover_bin_set_popover (self->popover_bin,
                               GTK_WIDGET (self->popover));
  gtk_widget_add_css_class (GTK_WIDGET (self), "awra-dropdown");
  gtk_widget_set_parent (GTK_WIDGET (self->popover_bin), GTK_WIDGET (self));

  keys = gtk_event_controller_key_new ();
  gtk_event_controller_set_propagation_phase (keys, GTK_PHASE_CAPTURE);
  g_signal_connect (keys, "key-pressed", G_CALLBACK (key_pressed_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self), keys);

  g_signal_connect_object (self->delegate, "notify::model",
                           G_CALLBACK (delegate_notify_cb), self, 0);
  g_signal_connect_object (self->delegate, "notify::selected",
                           G_CALLBACK (delegate_notify_cb), self, 0);
  g_signal_connect_object (self->delegate, "notify::expression",
                           G_CALLBACK (delegate_notify_cb), self, 0);
  g_signal_connect_object (self->selection, "notify::selected",
                           G_CALLBACK (selection_changed_cb), self, 0);
  g_signal_connect_object (self->list_view, "activate",
                           G_CALLBACK (list_activate_cb), self, 0);
  g_signal_connect_object (self->popover, "map",
                           G_CALLBACK (popover_map_cb), self, 0);
  g_signal_connect_object (self->popover, "unmap",
                           G_CALLBACK (popover_unmap_cb), self, 0);
  gtk_accessible_update_state (
    GTK_ACCESSIBLE (self), GTK_ACCESSIBLE_STATE_EXPANDED, FALSE, -1);
  update_button_label (self);
}

GtkWidget *
awra_dropdown_new (GListModel    *model,
                   GtkExpression *expression)
{
  AwraDropdown *self;

  g_return_val_if_fail (model == NULL || G_IS_LIST_MODEL (model), NULL);
  self = g_object_new (AWRA_TYPE_DROPDOWN, NULL);
  gtk_drop_down_set_expression (self->delegate, expression);
  gtk_drop_down_set_model (self->delegate, model);
  return GTK_WIDGET (self);
}

GtkWidget *
awra_dropdown_new_from_strings (const char *const *strings)
{
  g_autoptr (GtkStringList) model = gtk_string_list_new (strings);

  return awra_dropdown_new (G_LIST_MODEL (model), NULL);
}

GListModel *
awra_dropdown_get_model (AwraDropdown *self)
{
  g_return_val_if_fail (AWRA_IS_DROPDOWN (self), NULL);
  return gtk_drop_down_get_model (self->delegate);
}

void
awra_dropdown_set_model (AwraDropdown *self,
                         GListModel   *model)
{
  g_return_if_fail (AWRA_IS_DROPDOWN (self));
  g_return_if_fail (model == NULL || G_IS_LIST_MODEL (model));
  gtk_drop_down_set_model (self->delegate, model);
}

guint
awra_dropdown_get_selected (AwraDropdown *self)
{
  g_return_val_if_fail (AWRA_IS_DROPDOWN (self),
                        GTK_INVALID_LIST_POSITION);
  return gtk_drop_down_get_selected (self->delegate);
}

void
awra_dropdown_set_selected (AwraDropdown *self,
                            guint         position)
{
  g_return_if_fail (AWRA_IS_DROPDOWN (self));
  gtk_drop_down_set_selected (self->delegate, position);
}

GtkDropDown *
awra_dropdown_get_delegate (AwraDropdown *self)
{
  g_return_val_if_fail (AWRA_IS_DROPDOWN (self), NULL);
  return self->delegate;
}

AwraPopover *
awra_dropdown_get_popover (AwraDropdown *self)
{
  g_return_val_if_fail (AWRA_IS_DROPDOWN (self), NULL);
  return self->popover;
}

void
awra_dropdown_popup (AwraDropdown *self)
{
  g_return_if_fail (AWRA_IS_DROPDOWN (self));
  gtk_popover_bin_popup (self->popover_bin);
}

void
awra_dropdown_popdown (AwraDropdown *self)
{
  g_return_if_fail (AWRA_IS_DROPDOWN (self));
  gtk_popover_bin_popdown (self->popover_bin);
}
