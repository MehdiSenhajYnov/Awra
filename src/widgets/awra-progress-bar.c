/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-progress-bar.h>

struct _AwraProgressBar {
  GtkWidget parent_instance;
  GtkProgressBar *delegate;
};

enum {
  PROP_0,
  PROP_FRACTION,
  PROP_TEXT,
  PROP_SHOW_TEXT,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraProgressBar, awra_progress_bar, GTK_TYPE_WIDGET)

static void
delegate_notify_cb (GtkProgressBar *delegate,
                    GParamSpec     *pspec,
                    AwraProgressBar *self)
{
  guint property_id = PROP_FRACTION;

  (void) delegate;
  if (g_str_equal (pspec->name, "text"))
    property_id = PROP_TEXT;
  else if (g_str_equal (pspec->name, "show-text"))
    property_id = PROP_SHOW_TEXT;
  g_object_notify_by_pspec (G_OBJECT (self), properties[property_id]);
}

static void
awra_progress_bar_dispose (GObject *object)
{
  AwraProgressBar *self = AWRA_PROGRESS_BAR (object);

  if (self->delegate != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->delegate));
    self->delegate = NULL;
  }
  G_OBJECT_CLASS (awra_progress_bar_parent_class)->dispose (object);
}

static void
awra_progress_bar_snapshot (GtkWidget   *widget,
                            GtkSnapshot *snapshot)
{
  AwraProgressBar *self = AWRA_PROGRESS_BAR (widget);

  if (self->delegate != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->delegate), snapshot);
}

static void
awra_progress_bar_get_property (GObject    *object,
                                guint       property_id,
                                GValue     *value,
                                GParamSpec *pspec)
{
  AwraProgressBar *self = AWRA_PROGRESS_BAR (object);

  switch (property_id) {
  case PROP_FRACTION:
    g_value_set_double (value, awra_progress_bar_get_fraction (self));
    break;
  case PROP_TEXT:
    g_value_set_string (value, awra_progress_bar_get_text (self));
    break;
  case PROP_SHOW_TEXT:
    g_value_set_boolean (value, awra_progress_bar_get_show_text (self));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_progress_bar_set_property (GObject      *object,
                                guint         property_id,
                                const GValue *value,
                                GParamSpec   *pspec)
{
  AwraProgressBar *self = AWRA_PROGRESS_BAR (object);

  switch (property_id) {
  case PROP_FRACTION:
    awra_progress_bar_set_fraction (self, g_value_get_double (value));
    break;
  case PROP_TEXT:
    awra_progress_bar_set_text (self, g_value_get_string (value));
    break;
  case PROP_SHOW_TEXT:
    awra_progress_bar_set_show_text (self, g_value_get_boolean (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_progress_bar_class_init (AwraProgressBarClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_progress_bar_dispose;
  object_class->get_property = awra_progress_bar_get_property;
  object_class->set_property = awra_progress_bar_set_property;
  widget_class->snapshot = awra_progress_bar_snapshot;
  properties[PROP_FRACTION] =
    g_param_spec_double ("fraction", NULL, NULL, 0.0, 1.0, 0.0,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_TEXT] =
    g_param_spec_string ("text", NULL, NULL, NULL,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_SHOW_TEXT] =
    g_param_spec_boolean ("show-text", NULL, NULL, FALSE,
                          G_PARAM_READWRITE |
                          G_PARAM_EXPLICIT_NOTIFY |
                          G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awraprogressbar");
}

static void
awra_progress_bar_init (AwraProgressBar *self)
{
  self->delegate = GTK_PROGRESS_BAR (gtk_progress_bar_new ());
  gtk_widget_add_css_class (GTK_WIDGET (self->delegate), "awra-progress");
  gtk_widget_set_parent (GTK_WIDGET (self->delegate), GTK_WIDGET (self));
  g_signal_connect (self->delegate,
                    "notify::fraction",
                    G_CALLBACK (delegate_notify_cb),
                    self);
  g_signal_connect (self->delegate,
                    "notify::text",
                    G_CALLBACK (delegate_notify_cb),
                    self);
  g_signal_connect (self->delegate,
                    "notify::show-text",
                    G_CALLBACK (delegate_notify_cb),
                    self);
}

GtkWidget *
awra_progress_bar_new (void)
{
  return g_object_new (AWRA_TYPE_PROGRESS_BAR, NULL);
}

double
awra_progress_bar_get_fraction (AwraProgressBar *self)
{
  g_return_val_if_fail (AWRA_IS_PROGRESS_BAR (self), 0.0);
  return gtk_progress_bar_get_fraction (self->delegate);
}

void
awra_progress_bar_set_fraction (AwraProgressBar *self,
                                double           fraction)
{
  g_return_if_fail (AWRA_IS_PROGRESS_BAR (self));
  gtk_progress_bar_set_fraction (self->delegate, CLAMP (fraction, 0.0, 1.0));
}

const char *
awra_progress_bar_get_text (AwraProgressBar *self)
{
  g_return_val_if_fail (AWRA_IS_PROGRESS_BAR (self), NULL);
  return gtk_progress_bar_get_text (self->delegate);
}

void
awra_progress_bar_set_text (AwraProgressBar *self,
                            const char      *text)
{
  g_return_if_fail (AWRA_IS_PROGRESS_BAR (self));
  gtk_progress_bar_set_text (self->delegate, text);
}

gboolean
awra_progress_bar_get_show_text (AwraProgressBar *self)
{
  g_return_val_if_fail (AWRA_IS_PROGRESS_BAR (self), FALSE);
  return gtk_progress_bar_get_show_text (self->delegate);
}

void
awra_progress_bar_set_show_text (AwraProgressBar *self,
                                 gboolean         show_text)
{
  g_return_if_fail (AWRA_IS_PROGRESS_BAR (self));
  gtk_progress_bar_set_show_text (self->delegate, show_text);
}

GtkProgressBar *
awra_progress_bar_get_delegate (AwraProgressBar *self)
{
  g_return_val_if_fail (AWRA_IS_PROGRESS_BAR (self), NULL);
  return self->delegate;
}
