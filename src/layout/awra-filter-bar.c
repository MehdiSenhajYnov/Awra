/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-filter-bar.h>
#include <awra/awra-layout.h>

struct _AwraFilterBar {
  GtkWidget parent_instance;
  GtkBox *root;
  GtkBox *leading;
  GtkBox *filters_box;
  GtkBox *trailing;
  GtkWidget *search;
  GtkWidget *summary;
  GtkWidget *reset_widget;
  GPtrArray *filters;
  gboolean compact;
};

enum { PROP_0, PROP_SEARCH, PROP_SUMMARY, PROP_RESET_WIDGET,
       PROP_COMPACT, N_PROPS };
static GParamSpec *properties[N_PROPS];
static GtkBuildableIface *parent_buildable_iface;

static void awra_filter_bar_buildable_init (GtkBuildableIface *iface);

G_DEFINE_FINAL_TYPE_WITH_CODE (
  AwraFilterBar, awra_filter_bar, GTK_TYPE_WIDGET,
  G_IMPLEMENT_INTERFACE (GTK_TYPE_BUILDABLE,
                         awra_filter_bar_buildable_init))

static void
update_layout (AwraFilterBar *self,
               int            width)
{
  gboolean compact = width < 720;

  if (self->compact == compact)
    return;
  self->compact = compact;
  gtk_orientable_set_orientation (GTK_ORIENTABLE (self->root),
                                  compact ? GTK_ORIENTATION_VERTICAL
                                          : GTK_ORIENTATION_HORIZONTAL);
  gtk_orientable_set_orientation (GTK_ORIENTABLE (self->leading),
                                  compact ? GTK_ORIENTATION_VERTICAL
                                          : GTK_ORIENTATION_HORIZONTAL);
  gtk_orientable_set_orientation (GTK_ORIENTABLE (self->filters_box),
                                  compact ? GTK_ORIENTATION_VERTICAL
                                          : GTK_ORIENTATION_HORIZONTAL);
  if (compact)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-compact");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-compact");
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_COMPACT]);
}

static GtkSizeRequestMode
awra_filter_bar_request_mode (GtkWidget *widget)
{
  return gtk_widget_get_request_mode (
    GTK_WIDGET (AWRA_FILTER_BAR (widget)->root));
}

static void
awra_filter_bar_measure (GtkWidget *widget, GtkOrientation orientation,
                         int for_size, int *minimum, int *natural,
                         int *minimum_baseline, int *natural_baseline)
{
  gtk_widget_measure (GTK_WIDGET (AWRA_FILTER_BAR (widget)->root), orientation,
                      for_size, minimum, natural, minimum_baseline,
                      natural_baseline);
}

static void
awra_filter_bar_allocate (GtkWidget *widget, int width, int height,
                          int baseline)
{
  AwraFilterBar *self = AWRA_FILTER_BAR (widget);

  update_layout (self, width);
  gtk_widget_allocate (GTK_WIDGET (self->root), width, height, baseline, NULL);
}

static void
awra_filter_bar_dispose (GObject *object)
{
  AwraFilterBar *self = AWRA_FILTER_BAR (object);

  if (self->root != NULL) {
    g_ptr_array_set_size (self->filters, 0);
    gtk_widget_unparent (GTK_WIDGET (self->root));
    self->root = NULL;
    self->leading = NULL;
    self->filters_box = NULL;
    self->trailing = NULL;
    self->search = NULL;
    self->summary = NULL;
    self->reset_widget = NULL;
  }
  g_clear_pointer (&self->filters, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_filter_bar_parent_class)->dispose (object);
}

static void
awra_filter_bar_get_property (GObject *object, guint id, GValue *value,
                              GParamSpec *pspec)
{
  AwraFilterBar *self = AWRA_FILTER_BAR (object);
  switch (id) {
  case PROP_SEARCH: g_value_set_object (value, self->search); break;
  case PROP_SUMMARY: g_value_set_object (value, self->summary); break;
  case PROP_RESET_WIDGET: g_value_set_object (value, self->reset_widget); break;
  case PROP_COMPACT: g_value_set_boolean (value, self->compact); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_filter_bar_set_property (GObject *object, guint id, const GValue *value,
                              GParamSpec *pspec)
{
  AwraFilterBar *self = AWRA_FILTER_BAR (object);
  switch (id) {
  case PROP_SEARCH: awra_filter_bar_set_search (self, g_value_get_object (value)); break;
  case PROP_SUMMARY: awra_filter_bar_set_summary (self, g_value_get_object (value)); break;
  case PROP_RESET_WIDGET: awra_filter_bar_set_reset_widget (self, g_value_get_object (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_filter_bar_class_init (AwraFilterBarClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_filter_bar_dispose;
  object_class->get_property = awra_filter_bar_get_property;
  object_class->set_property = awra_filter_bar_set_property;
  properties[PROP_SEARCH] = g_param_spec_object (
    "search", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SUMMARY] = g_param_spec_object (
    "summary", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_RESET_WIDGET] = g_param_spec_object (
    "reset-widget", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_COMPACT] = g_param_spec_boolean (
    "compact", NULL, NULL, FALSE,
    G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_css_name (widget_class, "awrafilterbar");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_SEARCH);
}

static void
awra_filter_bar_init (AwraFilterBar *self)
{
  gtk_widget_set_layout_manager (
    GTK_WIDGET (self),
    gtk_custom_layout_new (awra_filter_bar_request_mode,
                           awra_filter_bar_measure,
                           awra_filter_bar_allocate));
  self->filters = g_ptr_array_new ();
  self->root = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->leading = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->filters_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->trailing = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  awra_box_set_spacing (self->root, AWRA_SPACING_MD);
  awra_box_set_spacing (self->leading, AWRA_SPACING_SM);
  awra_box_set_spacing (self->filters_box, AWRA_SPACING_SM);
  awra_box_set_spacing (self->trailing, AWRA_SPACING_SM);
  awra_widget_set_margin (GTK_WIDGET (self->root), AWRA_SPACING_MD);
  gtk_widget_set_hexpand (GTK_WIDGET (self->leading), TRUE);
  gtk_widget_set_halign (GTK_WIDGET (self->trailing), GTK_ALIGN_END);
  gtk_box_append (self->leading, GTK_WIDGET (self->filters_box));
  gtk_box_append (self->root, GTK_WIDGET (self->leading));
  gtk_box_append (self->root, GTK_WIDGET (self->trailing));
  gtk_widget_set_parent (GTK_WIDGET (self->root), GTK_WIDGET (self));
}

static void
awra_filter_bar_buildable_add_child (GtkBuildable *buildable,
                                     GtkBuilder   *builder,
                                     GObject      *child,
                                     const char   *type)
{
  AwraFilterBar *self = AWRA_FILTER_BAR (buildable);

  if (GTK_IS_WIDGET (child) && g_strcmp0 (type, "search") == 0)
    awra_filter_bar_set_search (self, GTK_WIDGET (child));
  else if (GTK_IS_WIDGET (child) &&
           (type == NULL || g_str_equal (type, "filter")))
    awra_filter_bar_append_filter (self, GTK_WIDGET (child));
  else if (GTK_IS_WIDGET (child) && g_str_equal (type, "summary"))
    awra_filter_bar_set_summary (self, GTK_WIDGET (child));
  else if (GTK_IS_WIDGET (child) && g_str_equal (type, "reset"))
    awra_filter_bar_set_reset_widget (self, GTK_WIDGET (child));
  else
    parent_buildable_iface->add_child (buildable, builder, child, type);
}

static void
awra_filter_bar_buildable_init (GtkBuildableIface *iface)
{
  parent_buildable_iface = g_type_interface_peek_parent (iface);
  iface->add_child = awra_filter_bar_buildable_add_child;
}

GtkWidget *awra_filter_bar_new (void) { return g_object_new (AWRA_TYPE_FILTER_BAR, NULL); }
GtkWidget *awra_filter_bar_get_search (AwraFilterBar *self) { g_return_val_if_fail (AWRA_IS_FILTER_BAR (self), NULL); return self->search; }
void awra_filter_bar_set_search (AwraFilterBar *self, GtkWidget *search) { g_return_if_fail (AWRA_IS_FILTER_BAR (self)); g_return_if_fail (search == NULL || GTK_IS_WIDGET (search)); if (self->search == search) return; if (self->search != NULL) gtk_box_remove (self->leading, self->search); self->search = search; if (search != NULL) { gtk_widget_set_hexpand (search, TRUE); gtk_box_prepend (self->leading, search); } g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SEARCH]); }
void awra_filter_bar_append_filter (AwraFilterBar *self, GtkWidget *filter) { g_return_if_fail (AWRA_IS_FILTER_BAR (self)); g_return_if_fail (GTK_IS_WIDGET (filter)); awra_filter_bar_insert_filter (self, filter, self->filters->len); }
void awra_filter_bar_insert_filter (AwraFilterBar *self, GtkWidget *filter, guint position) { GtkWidget *sibling = NULL; g_return_if_fail (AWRA_IS_FILTER_BAR (self)); g_return_if_fail (GTK_IS_WIDGET (filter)); g_return_if_fail (gtk_widget_get_parent (filter) == NULL); g_return_if_fail (position <= self->filters->len); if (position > 0) sibling = g_ptr_array_index (self->filters, position - 1); gtk_box_insert_child_after (self->filters_box, filter, sibling); g_ptr_array_insert (self->filters, position, filter); }
void awra_filter_bar_remove_filter (AwraFilterBar *self, GtkWidget *filter) { guint position; g_return_if_fail (AWRA_IS_FILTER_BAR (self)); g_return_if_fail (GTK_IS_WIDGET (filter)); if (!g_ptr_array_find (self->filters, filter, &position)) return; g_ptr_array_remove_index (self->filters, position); gtk_box_remove (self->filters_box, filter); }
guint awra_filter_bar_get_n_filters (AwraFilterBar *self) { g_return_val_if_fail (AWRA_IS_FILTER_BAR (self), 0); return self->filters->len; }
GtkWidget *awra_filter_bar_get_filter (AwraFilterBar *self, guint position) { g_return_val_if_fail (AWRA_IS_FILTER_BAR (self), NULL); return position < self->filters->len ? g_ptr_array_index (self->filters, position) : NULL; }
GtkWidget *awra_filter_bar_get_summary (AwraFilterBar *self) { g_return_val_if_fail (AWRA_IS_FILTER_BAR (self), NULL); return self->summary; }
void awra_filter_bar_set_summary (AwraFilterBar *self, GtkWidget *summary) { g_return_if_fail (AWRA_IS_FILTER_BAR (self)); g_return_if_fail (summary == NULL || GTK_IS_WIDGET (summary)); if (self->summary == summary) return; if (self->summary != NULL) gtk_box_remove (self->trailing, self->summary); self->summary = summary; if (summary != NULL) gtk_box_prepend (self->trailing, summary); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SUMMARY]); }
GtkWidget *awra_filter_bar_get_reset_widget (AwraFilterBar *self) { g_return_val_if_fail (AWRA_IS_FILTER_BAR (self), NULL); return self->reset_widget; }
void awra_filter_bar_set_reset_widget (AwraFilterBar *self, GtkWidget *reset) { g_return_if_fail (AWRA_IS_FILTER_BAR (self)); g_return_if_fail (reset == NULL || GTK_IS_WIDGET (reset)); if (self->reset_widget == reset) return; if (self->reset_widget != NULL) gtk_box_remove (self->trailing, self->reset_widget); self->reset_widget = reset; if (reset != NULL) gtk_box_append (self->trailing, reset); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_RESET_WIDGET]); }
gboolean awra_filter_bar_get_compact (AwraFilterBar *self) { g_return_val_if_fail (AWRA_IS_FILTER_BAR (self), FALSE); return self->compact; }
