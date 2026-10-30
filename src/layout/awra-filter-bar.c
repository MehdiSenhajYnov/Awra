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

/* Narrower than this, or than its side-by-side minimum, the bar stacks. */
#define COMPACT_BELOW 720

static gboolean
flips (AwraFilterBar *self,
       GtkWidget     *widget)
{
  return widget == GTK_WIDGET (self->root) || widget == GTK_WIDGET (self->leading) ||
         widget == GTK_WIDGET (self->filters_box);
}

/* Measures @widget as it is laid out stacked (@compact) or side by side,
 * whichever its boxes are in now: the layout only changes once allocated,
 * and parents must measure the one that their width will give. */
static void
measure_as (AwraFilterBar  *self,
            GtkWidget      *widget,
            gboolean        compact,
            GtkOrientation  orientation,
            int             for_size,
            int            *minimum,
            int            *natural)
{
  GtkOrientation axis = compact ? GTK_ORIENTATION_VERTICAL : GTK_ORIENTATION_HORIZONTAL;
  int along, across, inner, count = 0;

  *minimum = *natural = 0;
  if (!gtk_widget_should_layout (widget))
    return;
  if (compact == self->compact || !flips (self, widget)) {
    if (for_size >= 0) {
      int opposite_min, opposite_nat;

      /* Never measured for less than it can take. */
      gtk_widget_measure (widget,
                          orientation == GTK_ORIENTATION_HORIZONTAL
                            ? GTK_ORIENTATION_VERTICAL
                            : GTK_ORIENTATION_HORIZONTAL,
                          -1, &opposite_min, &opposite_nat, NULL, NULL);
      for_size = MAX (for_size, opposite_min);
    }
    gtk_widget_measure (widget, orientation, for_size, minimum, natural, NULL, NULL);
    return;
  }

  if (orientation == GTK_ORIENTATION_HORIZONTAL) {
    along = gtk_widget_get_margin_start (widget) + gtk_widget_get_margin_end (widget);
    across = gtk_widget_get_margin_top (widget) + gtk_widget_get_margin_bottom (widget);
  } else {
    along = gtk_widget_get_margin_top (widget) + gtk_widget_get_margin_bottom (widget);
    across = gtk_widget_get_margin_start (widget) + gtk_widget_get_margin_end (widget);
  }
  inner = for_size >= 0 ? MAX (for_size - across, 0) : -1;
  for (GtkWidget *child = gtk_widget_get_first_child (widget); child != NULL;
       child = gtk_widget_get_next_sibling (child)) {
    int child_min, child_nat;

    if (!gtk_widget_should_layout (child))
      continue;
    /* Across the box, each child gets the whole size; along it, they share
     * it, and are measured as if alone. */
    measure_as (self, child, compact, orientation, orientation == axis ? inner : -1,
                &child_min, &child_nat);
    if (orientation == axis) {
      *minimum += child_min;
      *natural += child_nat;
      count++;
    } else {
      *minimum = MAX (*minimum, child_min);
      *natural = MAX (*natural, child_nat);
    }
  }
  if (orientation == axis && count > 1) {
    *minimum += gtk_box_get_spacing (GTK_BOX (widget)) * (count - 1);
    *natural += gtk_box_get_spacing (GTK_BOX (widget)) * (count - 1);
  }
  *minimum += along;
  *natural += along;
}

static gboolean
compact_for_width (AwraFilterBar *self,
                   int            width)
{
  int side_min, side_nat;

  if (width < COMPACT_BELOW)
    return TRUE;
  measure_as (self, GTK_WIDGET (self->root), FALSE, GTK_ORIENTATION_HORIZONTAL, -1,
              &side_min, &side_nat);
  return width < side_min;
}

static void
update_layout (AwraFilterBar *self,
               int            width)
{
  gboolean compact = compact_for_width (self, width);

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

/* Its height depends on its width at least through its layout. */
static GtkSizeRequestMode
awra_filter_bar_request_mode (G_GNUC_UNUSED GtkWidget *widget)
{
  return GTK_SIZE_REQUEST_HEIGHT_FOR_WIDTH;
}

static void
awra_filter_bar_measure (GtkWidget *widget, GtkOrientation orientation,
                         int for_size, int *minimum, int *natural,
                         int *minimum_baseline, int *natural_baseline)
{
  AwraFilterBar *self = AWRA_FILTER_BAR (widget);
  GtkWidget *root = GTK_WIDGET (self->root);

  *minimum_baseline = *natural_baseline = -1;
  if (orientation == GTK_ORIENTATION_HORIZONTAL) {
    int stacked_min, stacked_nat;

    /* As narrow as stacked, as wide as side by side. */
    measure_as (self, root, TRUE, orientation, for_size, &stacked_min, &stacked_nat);
    measure_as (self, root, FALSE, orientation, for_size, minimum, natural);
    *minimum = MIN (*minimum, stacked_min);
    return;
  }
  measure_as (self, root,
              for_size >= 0 ? compact_for_width (self, for_size) : self->compact,
              orientation, for_size, minimum, natural);
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
