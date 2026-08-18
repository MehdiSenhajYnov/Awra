/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-split-view.h>
#include <awra/awra-sidebar.h>

#include "layout/awra-split-view-private.h"

struct _AwraSplitView {
  GtkWidget parent_instance;
  GtkPaned *paned;
  GtkWidget *sidebar;
  GtkWidget *content;
  gulong sidebar_inset_handler;
  gboolean show_sidebar;
  AwraLayoutMode layout_mode;
  guint compact_width;
  guint expanded_width;
};

typedef struct _AwraSplitLayout      AwraSplitLayout;
typedef struct _AwraSplitLayoutClass AwraSplitLayoutClass;

struct _AwraSplitLayout {
  GtkLayoutManager parent_instance;
};

struct _AwraSplitLayoutClass {
  GtkLayoutManagerClass parent_class;
};

enum {
  PROP_0, PROP_SIDEBAR, PROP_CONTENT, PROP_SHOW_SIDEBAR, PROP_LAYOUT_MODE,
  PROP_COMPACT_WIDTH, PROP_EXPANDED_WIDTH, N_PROPS
};
static GParamSpec *properties[N_PROPS];
G_DEFINE_FINAL_TYPE (AwraSplitView, awra_split_view, GTK_TYPE_WIDGET)
G_DEFINE_TYPE (AwraSplitLayout, awra_split_layout, GTK_TYPE_LAYOUT_MANAGER)

static guint
get_sidebar_inset (AwraSplitView *self)
{
  return AWRA_IS_SIDEBAR (self->sidebar)
           ? awra_sidebar_get_inset (AWRA_SIDEBAR (self->sidebar))
           : 0;
}

static void
update_for_current_width (AwraSplitView *self)
{
  int width = gtk_widget_get_width (GTK_WIDGET (self));

  /* Before the first allocation there is no responsive width yet. Keep the
   * documented expanded default instead of mistaking width 0 for compact. */
  if (width <= 0)
    width = (int) self->expanded_width;

  awra_split_view_update_for_width (self, width);
}

static void
sidebar_inset_changed_cb (AwraSidebar   *sidebar,
                          GParamSpec    *pspec,
                          AwraSplitView *self)
{
  (void) sidebar;
  (void) pspec;
  update_for_current_width (self);
}

void
awra_split_view_update_for_width (AwraSplitView *self, int width)
{
  guint inset = get_sidebar_inset (self);
  AwraLayoutMode mode = width < (int) self->compact_width
                          ? AWRA_LAYOUT_MODE_COMPACT
                          : width < (int) self->expanded_width
                              ? AWRA_LAYOUT_MODE_MEDIUM
                              : AWRA_LAYOUT_MODE_EXPANDED;
  if (self->sidebar != NULL)
    gtk_widget_set_visible (self->sidebar,
                            self->show_sidebar && mode != AWRA_LAYOUT_MODE_COMPACT);
  if (self->layout_mode != mode) {
    self->layout_mode = mode;
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LAYOUT_MODE]);
  }
  if (mode == AWRA_LAYOUT_MODE_MEDIUM) {
    if (self->sidebar != NULL)
      gtk_widget_set_size_request (self->sidebar, 210 + (int) inset * 2, -1);
    gtk_paned_set_position (self->paned, 220 + (int) inset * 2);
  } else if (mode == AWRA_LAYOUT_MODE_EXPANDED) {
    if (self->sidebar != NULL)
      gtk_widget_set_size_request (self->sidebar, 230 + (int) inset * 2, -1);
    gtk_paned_set_position (self->paned, 244 + (int) inset * 2);
  }
}

static GtkSizeRequestMode
awra_split_layout_get_request_mode (GtkLayoutManager *manager,
                                    GtkWidget        *widget)
{
  AwraSplitView *self = AWRA_SPLIT_VIEW (widget);

  (void) manager;
  return gtk_widget_get_request_mode (GTK_WIDGET (self->paned));
}

static void
awra_split_layout_measure (GtkLayoutManager *manager,
                           GtkWidget        *widget,
                           GtkOrientation    orientation,
                           int               for_size,
                           int              *minimum,
                           int              *natural,
                           int              *minimum_baseline,
                           int              *natural_baseline)
{
  AwraSplitView *self = AWRA_SPLIT_VIEW (widget);

  (void) manager;
  gtk_widget_measure (GTK_WIDGET (self->paned),
                      orientation,
                      for_size,
                      minimum,
                      natural,
                      minimum_baseline,
                      natural_baseline);
}

static void
awra_split_layout_allocate (GtkLayoutManager *manager,
                            GtkWidget        *widget,
                            int               width,
                            int               height,
                            int               baseline)
{
  AwraSplitView *self = AWRA_SPLIT_VIEW (widget);

  (void) manager;
  awra_split_view_update_for_width (self, width);
  gtk_widget_allocate (GTK_WIDGET (self->paned),
                       width,
                       height,
                       baseline,
                       NULL);
}

static void
awra_split_layout_class_init (AwraSplitLayoutClass *klass)
{
  GtkLayoutManagerClass *layout_class = GTK_LAYOUT_MANAGER_CLASS (klass);

  layout_class->get_request_mode = awra_split_layout_get_request_mode;
  layout_class->measure = awra_split_layout_measure;
  layout_class->allocate = awra_split_layout_allocate;
}

static void
awra_split_layout_init (AwraSplitLayout *self)
{
  (void) self;
}

static void
awra_split_view_snapshot (GtkWidget *widget, GtkSnapshot *snapshot)
{
  gtk_widget_snapshot_child (widget,
                             GTK_WIDGET (AWRA_SPLIT_VIEW (widget)->paned),
                             snapshot);
}

static void
awra_split_view_dispose (GObject *object)
{
  AwraSplitView *self = AWRA_SPLIT_VIEW (object);
  if (self->sidebar_inset_handler != 0 && self->sidebar != NULL) {
    g_signal_handler_disconnect (self->sidebar,
                                 self->sidebar_inset_handler);
    self->sidebar_inset_handler = 0;
  }
  if (self->paned != NULL) {
    gtk_paned_set_start_child (self->paned, NULL);
    gtk_paned_set_end_child (self->paned, NULL);
    gtk_widget_unparent (GTK_WIDGET (self->paned));
    self->paned = NULL;
  }
  self->sidebar = NULL;
  self->content = NULL;
  G_OBJECT_CLASS (awra_split_view_parent_class)->dispose (object);
}

static void awra_split_view_get_property (GObject *object, guint id, GValue *value, GParamSpec *pspec) {
  AwraSplitView *self = AWRA_SPLIT_VIEW (object);
  switch (id) {
  case PROP_SIDEBAR: g_value_set_object (value, self->sidebar); break;
  case PROP_CONTENT: g_value_set_object (value, self->content); break;
  case PROP_SHOW_SIDEBAR: g_value_set_boolean (value, self->show_sidebar); break;
  case PROP_LAYOUT_MODE: g_value_set_enum (value, self->layout_mode); break;
  case PROP_COMPACT_WIDTH: g_value_set_uint (value, self->compact_width); break;
  case PROP_EXPANDED_WIDTH: g_value_set_uint (value, self->expanded_width); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}
static void awra_split_view_set_property (GObject *object, guint id, const GValue *value, GParamSpec *pspec) {
  AwraSplitView *self = AWRA_SPLIT_VIEW (object);
  switch (id) {
  case PROP_SIDEBAR: awra_split_view_set_sidebar (self, g_value_get_object (value)); break;
  case PROP_CONTENT: awra_split_view_set_content (self, g_value_get_object (value)); break;
  case PROP_SHOW_SIDEBAR: awra_split_view_set_show_sidebar (self, g_value_get_boolean (value)); break;
  case PROP_COMPACT_WIDTH: awra_split_view_set_compact_width (self, g_value_get_uint (value)); break;
  case PROP_EXPANDED_WIDTH: awra_split_view_set_expanded_width (self, g_value_get_uint (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_split_view_class_init (AwraSplitViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_split_view_dispose;
  object_class->get_property = awra_split_view_get_property;
  object_class->set_property = awra_split_view_set_property;
  widget_class->snapshot = awra_split_view_snapshot;
  properties[PROP_SIDEBAR] = g_param_spec_object ("sidebar", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_CONTENT] = g_param_spec_object ("content", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SHOW_SIDEBAR] = g_param_spec_boolean ("show-sidebar", NULL, NULL, TRUE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_LAYOUT_MODE] = g_param_spec_enum ("layout-mode", NULL, NULL, AWRA_TYPE_LAYOUT_MODE,
    AWRA_LAYOUT_MODE_EXPANDED, G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_COMPACT_WIDTH] = g_param_spec_uint ("compact-width", NULL, NULL, 320, 1200, 600,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_EXPANDED_WIDTH] = g_param_spec_uint ("expanded-width", NULL, NULL, 480, 2400, 900,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class,
                                            awra_split_layout_get_type ());
  gtk_widget_class_set_css_name (widget_class, "awrasplitview");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void awra_split_view_init (AwraSplitView *self) {
  self->show_sidebar = TRUE; self->layout_mode = AWRA_LAYOUT_MODE_EXPANDED;
  self->compact_width = 600; self->expanded_width = 900;
  self->paned = GTK_PANED (gtk_paned_new (GTK_ORIENTATION_HORIZONTAL));
  gtk_paned_set_shrink_start_child (self->paned, FALSE);
  gtk_paned_set_shrink_end_child (self->paned, FALSE);
  gtk_widget_set_parent (GTK_WIDGET (self->paned), GTK_WIDGET (self));
}
GtkWidget *awra_split_view_new (void) { return g_object_new (AWRA_TYPE_SPLIT_VIEW, NULL); }
GtkWidget *awra_split_view_get_sidebar (AwraSplitView *self) { g_return_val_if_fail (AWRA_IS_SPLIT_VIEW (self), NULL); return self->sidebar; }
void awra_split_view_set_sidebar (AwraSplitView *self, GtkWidget *sidebar) {
  g_return_if_fail (AWRA_IS_SPLIT_VIEW (self)); if (self->sidebar == sidebar) return;
  if (self->sidebar_inset_handler != 0 && self->sidebar != NULL) {
    g_signal_handler_disconnect (self->sidebar,
                                 self->sidebar_inset_handler);
    self->sidebar_inset_handler = 0;
  }
  gtk_paned_set_start_child (self->paned, sidebar); self->sidebar = sidebar;
  if (AWRA_IS_SIDEBAR (sidebar))
    self->sidebar_inset_handler = g_signal_connect (
      sidebar, "notify::inset", G_CALLBACK (sidebar_inset_changed_cb), self);
  if (sidebar != NULL) {
    gtk_widget_set_visible (sidebar, self->show_sidebar && self->layout_mode != AWRA_LAYOUT_MODE_COMPACT);
    update_for_current_width (self);
  }
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SIDEBAR]);
}
GtkWidget *awra_split_view_get_content (AwraSplitView *self) { g_return_val_if_fail (AWRA_IS_SPLIT_VIEW (self), NULL); return self->content; }
void awra_split_view_set_content (AwraSplitView *self, GtkWidget *content) {
  g_return_if_fail (AWRA_IS_SPLIT_VIEW (self)); if (self->content == content) return;
  gtk_paned_set_end_child (self->paned, content); self->content = content;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CONTENT]);
}
gboolean awra_split_view_get_show_sidebar (AwraSplitView *self) { g_return_val_if_fail (AWRA_IS_SPLIT_VIEW (self), FALSE); return self->show_sidebar; }
void awra_split_view_set_show_sidebar (AwraSplitView *self, gboolean show_sidebar) {
  g_return_if_fail (AWRA_IS_SPLIT_VIEW (self)); show_sidebar = !!show_sidebar; if (self->show_sidebar == show_sidebar) return;
  self->show_sidebar = show_sidebar; update_for_current_width (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SHOW_SIDEBAR]);
}
AwraLayoutMode awra_split_view_get_layout_mode (AwraSplitView *self) { g_return_val_if_fail (AWRA_IS_SPLIT_VIEW (self), AWRA_LAYOUT_MODE_COMPACT); return self->layout_mode; }
guint awra_split_view_get_compact_width (AwraSplitView *self) { g_return_val_if_fail (AWRA_IS_SPLIT_VIEW (self), 0); return self->compact_width; }
void awra_split_view_set_compact_width (AwraSplitView *self, guint width) {
  g_return_if_fail (AWRA_IS_SPLIT_VIEW (self)); g_return_if_fail (width < self->expanded_width); if (self->compact_width == width) return;
  self->compact_width = width; update_for_current_width (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_COMPACT_WIDTH]);
}
guint awra_split_view_get_expanded_width (AwraSplitView *self) { g_return_val_if_fail (AWRA_IS_SPLIT_VIEW (self), 0); return self->expanded_width; }
void awra_split_view_set_expanded_width (AwraSplitView *self, guint width) {
  g_return_if_fail (AWRA_IS_SPLIT_VIEW (self)); g_return_if_fail (width > self->compact_width); if (self->expanded_width == width) return;
  self->expanded_width = width; update_for_current_width (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EXPANDED_WIDTH]);
}
