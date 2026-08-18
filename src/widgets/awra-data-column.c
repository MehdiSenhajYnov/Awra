/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-data-column.h>

struct _AwraDataColumn {
  GObject parent_instance;
  GtkColumnViewColumn *delegate;
  GtkAlign alignment;
};

enum {
  PROP_0,
  PROP_TITLE,
  PROP_FACTORY,
  PROP_SORTER,
  PROP_ALIGNMENT,
  PROP_FIXED_WIDTH,
  PROP_EXPAND,
  PROP_RESIZABLE,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraDataColumn, awra_data_column, G_TYPE_OBJECT)

static void
awra_data_column_finalize (GObject *object)
{
  g_clear_object (&AWRA_DATA_COLUMN (object)->delegate);
  G_OBJECT_CLASS (awra_data_column_parent_class)->finalize (object);
}

static void
awra_data_column_get_property (GObject    *object,
                               guint       property_id,
                               GValue     *value,
                               GParamSpec *pspec)
{
  AwraDataColumn *self = AWRA_DATA_COLUMN (object);

  switch (property_id) {
  case PROP_TITLE:
    g_value_set_string (value, awra_data_column_get_title (self));
    break;
  case PROP_FACTORY:
    g_value_set_object (value, awra_data_column_get_factory (self));
    break;
  case PROP_SORTER:
    g_value_set_object (value, awra_data_column_get_sorter (self));
    break;
  case PROP_ALIGNMENT:
    g_value_set_enum (value, self->alignment);
    break;
  case PROP_FIXED_WIDTH:
    g_value_set_int (value, awra_data_column_get_fixed_width (self));
    break;
  case PROP_EXPAND:
    g_value_set_boolean (value, awra_data_column_get_expand (self));
    break;
  case PROP_RESIZABLE:
    g_value_set_boolean (value, awra_data_column_get_resizable (self));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_data_column_set_property (GObject      *object,
                               guint         property_id,
                               const GValue *value,
                               GParamSpec   *pspec)
{
  AwraDataColumn *self = AWRA_DATA_COLUMN (object);

  switch (property_id) {
  case PROP_TITLE:
    awra_data_column_set_title (self, g_value_get_string (value));
    break;
  case PROP_FACTORY:
    awra_data_column_set_factory (self, g_value_get_object (value));
    break;
  case PROP_SORTER:
    awra_data_column_set_sorter (self, g_value_get_object (value));
    break;
  case PROP_ALIGNMENT:
    awra_data_column_set_alignment (self, g_value_get_enum (value));
    break;
  case PROP_FIXED_WIDTH:
    awra_data_column_set_fixed_width (self, g_value_get_int (value));
    break;
  case PROP_EXPAND:
    awra_data_column_set_expand (self, g_value_get_boolean (value));
    break;
  case PROP_RESIZABLE:
    awra_data_column_set_resizable (self, g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_data_column_class_init (AwraDataColumnClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->finalize = awra_data_column_finalize;
  object_class->get_property = awra_data_column_get_property;
  object_class->set_property = awra_data_column_set_property;
  properties[PROP_TITLE] = g_param_spec_string (
    "title", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_FACTORY] = g_param_spec_object (
    "factory", NULL, NULL, GTK_TYPE_LIST_ITEM_FACTORY,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SORTER] = g_param_spec_object (
    "sorter", NULL, NULL, GTK_TYPE_SORTER,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ALIGNMENT] = g_param_spec_enum (
    "alignment", NULL, NULL, GTK_TYPE_ALIGN, GTK_ALIGN_FILL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_FIXED_WIDTH] = g_param_spec_int (
    "fixed-width", NULL, NULL, -1, G_MAXINT, -1,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_EXPAND] = g_param_spec_boolean (
    "expand", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_RESIZABLE] = g_param_spec_boolean (
    "resizable", NULL, NULL, FALSE,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_data_column_init (AwraDataColumn *self)
{
  self->delegate = gtk_column_view_column_new (NULL, NULL);
  self->alignment = GTK_ALIGN_FILL;
}

AwraDataColumn *
awra_data_column_new (const char         *title,
                      GtkListItemFactory *factory)
{
  return g_object_new (AWRA_TYPE_DATA_COLUMN,
                       "title", title,
                       "factory", factory,
                       NULL);
}

const char *
awra_data_column_get_title (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), NULL);
  return gtk_column_view_column_get_title (self->delegate);
}

void
awra_data_column_set_title (AwraDataColumn *self,
                            const char     *title)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  if (g_strcmp0 (gtk_column_view_column_get_title (self->delegate), title) == 0)
    return;
  gtk_column_view_column_set_title (self->delegate, title);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TITLE]);
}

GtkListItemFactory *
awra_data_column_get_factory (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), NULL);
  return gtk_column_view_column_get_factory (self->delegate);
}

void
awra_data_column_set_factory (AwraDataColumn     *self,
                              GtkListItemFactory *factory)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  g_return_if_fail (factory == NULL || GTK_IS_LIST_ITEM_FACTORY (factory));
  if (gtk_column_view_column_get_factory (self->delegate) == factory)
    return;
  gtk_column_view_column_set_factory (self->delegate, factory);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_FACTORY]);
}

GtkSorter *
awra_data_column_get_sorter (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), NULL);
  return gtk_column_view_column_get_sorter (self->delegate);
}

void
awra_data_column_set_sorter (AwraDataColumn *self,
                             GtkSorter      *sorter)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  g_return_if_fail (sorter == NULL || GTK_IS_SORTER (sorter));
  if (gtk_column_view_column_get_sorter (self->delegate) == sorter)
    return;
  gtk_column_view_column_set_sorter (self->delegate, sorter);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SORTER]);
}

GtkAlign
awra_data_column_get_alignment (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), GTK_ALIGN_FILL);
  return self->alignment;
}

void
awra_data_column_set_alignment (AwraDataColumn *self,
                                GtkAlign        alignment)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  g_return_if_fail (alignment >= GTK_ALIGN_FILL && alignment <= GTK_ALIGN_BASELINE_FILL);
  if (self->alignment == alignment)
    return;
  self->alignment = alignment;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ALIGNMENT]);
}

int
awra_data_column_get_fixed_width (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), -1);
  return gtk_column_view_column_get_fixed_width (self->delegate);
}

void
awra_data_column_set_fixed_width (AwraDataColumn *self,
                                  int             width)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  g_return_if_fail (width >= -1);
  if (gtk_column_view_column_get_fixed_width (self->delegate) == width)
    return;
  gtk_column_view_column_set_fixed_width (self->delegate, width);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_FIXED_WIDTH]);
}

gboolean
awra_data_column_get_expand (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), FALSE);
  return gtk_column_view_column_get_expand (self->delegate);
}

void
awra_data_column_set_expand (AwraDataColumn *self,
                             gboolean        expand)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  expand = !!expand;
  if (gtk_column_view_column_get_expand (self->delegate) == expand)
    return;
  gtk_column_view_column_set_expand (self->delegate, expand);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EXPAND]);
}

gboolean
awra_data_column_get_resizable (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), FALSE);
  return gtk_column_view_column_get_resizable (self->delegate);
}

void
awra_data_column_set_resizable (AwraDataColumn *self,
                                gboolean        resizable)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  resizable = !!resizable;
  if (gtk_column_view_column_get_resizable (self->delegate) == resizable)
    return;
  gtk_column_view_column_set_resizable (self->delegate, resizable);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_RESIZABLE]);
}

void
awra_data_column_apply_alignment (AwraDataColumn *self,
                                  GtkWidget      *cell)
{
  g_return_if_fail (AWRA_IS_DATA_COLUMN (self));
  g_return_if_fail (GTK_IS_WIDGET (cell));
  gtk_widget_set_halign (cell, self->alignment);
  if (GTK_IS_LABEL (cell)) {
    if (self->alignment == GTK_ALIGN_END)
      gtk_label_set_xalign (GTK_LABEL (cell), 1.0f);
    else if (self->alignment == GTK_ALIGN_CENTER)
      gtk_label_set_xalign (GTK_LABEL (cell), 0.5f);
    else
      gtk_label_set_xalign (GTK_LABEL (cell), 0.0f);
  }
}

GtkColumnViewColumn *
awra_data_column_get_delegate (AwraDataColumn *self)
{
  g_return_val_if_fail (AWRA_IS_DATA_COLUMN (self), NULL);
  return self->delegate;
}
