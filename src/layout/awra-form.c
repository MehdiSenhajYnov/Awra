/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-form.h>
#include <awra/awra-layout.h>

struct _AwraForm {
  GtkWidget parent_instance;
  GtkBox *rows_box;
  GPtrArray *rows;
};

static GtkBuildableIface *parent_buildable_iface;

static void awra_form_buildable_init (GtkBuildableIface *iface);

G_DEFINE_FINAL_TYPE_WITH_CODE (
  AwraForm, awra_form, GTK_TYPE_WIDGET,
  G_IMPLEMENT_INTERFACE (GTK_TYPE_BUILDABLE, awra_form_buildable_init))

static void
awra_form_buildable_add_child (GtkBuildable *buildable,
                               GtkBuilder   *builder,
                               GObject      *child,
                               const char   *type)
{
  if (AWRA_IS_FORM_ROW (child) &&
      (type == NULL || g_str_equal (type, "row"))) {
    awra_form_append (AWRA_FORM (buildable), AWRA_FORM_ROW (child));
    return;
  }
  parent_buildable_iface->add_child (buildable, builder, child, type);
}

static void
awra_form_buildable_init (GtkBuildableIface *iface)
{
  parent_buildable_iface = g_type_interface_peek_parent (iface);
  iface->add_child = awra_form_buildable_add_child;
}

static void
awra_form_dispose (GObject *object)
{
  AwraForm *self = AWRA_FORM (object);

  if (self->rows_box != NULL) {
    g_ptr_array_set_size (self->rows, 0);
    gtk_widget_unparent (GTK_WIDGET (self->rows_box));
    self->rows_box = NULL;
  }
  g_clear_pointer (&self->rows, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_form_parent_class)->dispose (object);
}

static void
awra_form_snapshot (GtkWidget   *widget,
                    GtkSnapshot *snapshot)
{
  AwraForm *self = AWRA_FORM (widget);

  if (self->rows_box != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->rows_box), snapshot);
}

static void
awra_form_class_init (AwraFormClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_form_dispose;
  widget_class->snapshot = awra_form_snapshot;
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awraform");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_form_init (AwraForm *self)
{
  self->rows = g_ptr_array_new ();
  self->rows_box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  awra_box_set_spacing (self->rows_box, AWRA_SPACING_LG);
  gtk_widget_set_parent (GTK_WIDGET (self->rows_box), GTK_WIDGET (self));
}

GtkWidget *
awra_form_new (void)
{
  return g_object_new (AWRA_TYPE_FORM, NULL);
}

void
awra_form_append (AwraForm    *self,
                  AwraFormRow *row)
{
  g_return_if_fail (AWRA_IS_FORM (self));
  g_return_if_fail (AWRA_IS_FORM_ROW (row));
  awra_form_insert (self, row, self->rows->len);
}

void
awra_form_insert (AwraForm    *self,
                  AwraFormRow *row,
                  guint        position)
{
  GtkWidget *sibling = NULL;

  g_return_if_fail (AWRA_IS_FORM (self));
  g_return_if_fail (AWRA_IS_FORM_ROW (row));
  g_return_if_fail (gtk_widget_get_parent (GTK_WIDGET (row)) == NULL);
  g_return_if_fail (position <= self->rows->len);
  if (position > 0)
    sibling = g_ptr_array_index (self->rows, position - 1);
  gtk_box_insert_child_after (self->rows_box, GTK_WIDGET (row), sibling);
  g_ptr_array_insert (self->rows, position, row);
}

void
awra_form_remove (AwraForm    *self,
                  AwraFormRow *row)
{
  guint position;

  g_return_if_fail (AWRA_IS_FORM (self));
  g_return_if_fail (AWRA_IS_FORM_ROW (row));
  if (!g_ptr_array_find (self->rows, row, &position))
    return;
  g_ptr_array_remove_index (self->rows, position);
  gtk_box_remove (self->rows_box, GTK_WIDGET (row));
}

guint
awra_form_get_n_rows (AwraForm *self)
{
  g_return_val_if_fail (AWRA_IS_FORM (self), 0);
  return self->rows->len;
}

AwraFormRow *
awra_form_get_row (AwraForm *self,
                   guint     position)
{
  g_return_val_if_fail (AWRA_IS_FORM (self), NULL);
  if (position >= self->rows->len)
    return NULL;
  return g_ptr_array_index (self->rows, position);
}
