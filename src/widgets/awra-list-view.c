/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-list-view.h>

struct _AwraListView {
  GtkWidget parent_instance;
  GtkListView *delegate;
};

enum {
  PROP_0,
  PROP_MODEL,
  PROP_FACTORY,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraListView, awra_list_view, GTK_TYPE_WIDGET)

static void
delegate_notify_cb (GtkListView *delegate,
                    GParamSpec  *pspec,
                    AwraListView *self)
{
  (void) delegate;
  g_object_notify_by_pspec (G_OBJECT (self),
                            g_str_equal (pspec->name, "model")
                              ? properties[PROP_MODEL]
                              : properties[PROP_FACTORY]);
}

static void
awra_list_view_dispose (GObject *object)
{
  AwraListView *self = AWRA_LIST_VIEW (object);

  if (self->delegate != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->delegate));
    self->delegate = NULL;
  }
  G_OBJECT_CLASS (awra_list_view_parent_class)->dispose (object);
}

static void
awra_list_view_snapshot (GtkWidget   *widget,
                         GtkSnapshot *snapshot)
{
  AwraListView *self = AWRA_LIST_VIEW (widget);

  if (self->delegate != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->delegate), snapshot);
}

static void
awra_list_view_get_property (GObject    *object,
                             guint       property_id,
                             GValue     *value,
                             GParamSpec *pspec)
{
  AwraListView *self = AWRA_LIST_VIEW (object);

  if (property_id == PROP_MODEL)
    g_value_set_object (value, awra_list_view_get_model (self));
  else if (property_id == PROP_FACTORY)
    g_value_set_object (value, awra_list_view_get_factory (self));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_list_view_set_property (GObject      *object,
                             guint         property_id,
                             const GValue *value,
                             GParamSpec   *pspec)
{
  if (property_id == PROP_MODEL)
    awra_list_view_set_model (AWRA_LIST_VIEW (object),
                              g_value_get_object (value));
  else if (property_id == PROP_FACTORY)
    awra_list_view_set_factory (AWRA_LIST_VIEW (object),
                                g_value_get_object (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_list_view_class_init (AwraListViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_list_view_dispose;
  object_class->get_property = awra_list_view_get_property;
  object_class->set_property = awra_list_view_set_property;
  widget_class->snapshot = awra_list_view_snapshot;
  properties[PROP_MODEL] =
    g_param_spec_object ("model", NULL, NULL, GTK_TYPE_SELECTION_MODEL,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_FACTORY] =
    g_param_spec_object ("factory", NULL, NULL, GTK_TYPE_LIST_ITEM_FACTORY,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awralistview");
}

static void
awra_list_view_init (AwraListView *self)
{
  self->delegate = GTK_LIST_VIEW (gtk_list_view_new (NULL, NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->delegate), "awra-list");
  gtk_widget_set_parent (GTK_WIDGET (self->delegate), GTK_WIDGET (self));
  g_signal_connect (self->delegate,
                    "notify::model",
                    G_CALLBACK (delegate_notify_cb),
                    self);
  g_signal_connect (self->delegate,
                    "notify::factory",
                    G_CALLBACK (delegate_notify_cb),
                    self);
}

GtkWidget *
awra_list_view_new (GtkSelectionModel  *model,
                    GtkListItemFactory *factory)
{
  return g_object_new (AWRA_TYPE_LIST_VIEW,
                       "model", model,
                       "factory", factory,
                       NULL);
}

GtkSelectionModel *
awra_list_view_get_model (AwraListView *self)
{
  g_return_val_if_fail (AWRA_IS_LIST_VIEW (self), NULL);
  return gtk_list_view_get_model (self->delegate);
}

void
awra_list_view_set_model (AwraListView      *self,
                          GtkSelectionModel *model)
{
  g_return_if_fail (AWRA_IS_LIST_VIEW (self));
  g_return_if_fail (model == NULL || GTK_IS_SELECTION_MODEL (model));
  gtk_list_view_set_model (self->delegate, model);
}

GtkListItemFactory *
awra_list_view_get_factory (AwraListView *self)
{
  g_return_val_if_fail (AWRA_IS_LIST_VIEW (self), NULL);
  return gtk_list_view_get_factory (self->delegate);
}

void
awra_list_view_set_factory (AwraListView       *self,
                            GtkListItemFactory *factory)
{
  g_return_if_fail (AWRA_IS_LIST_VIEW (self));
  g_return_if_fail (factory == NULL || GTK_IS_LIST_ITEM_FACTORY (factory));
  gtk_list_view_set_factory (self->delegate, factory);
}

GtkListView *
awra_list_view_get_delegate (AwraListView *self)
{
  g_return_val_if_fail (AWRA_IS_LIST_VIEW (self), NULL);
  return self->delegate;
}
