/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-responsive-bin.h>

typedef struct _AwraResponsiveLayout      AwraResponsiveLayout;
typedef struct _AwraResponsiveLayoutClass AwraResponsiveLayoutClass;

struct _AwraResponsiveBin {
  GtkWidget parent_instance;
  GtkWidget *child;
  AwraLayoutMode layout_mode;
  guint compact_width;
  guint expanded_width;
};

struct _AwraResponsiveLayout { GtkLayoutManager parent_instance; };
struct _AwraResponsiveLayoutClass { GtkLayoutManagerClass parent_class; };

enum {
  PROP_0,
  PROP_CHILD,
  PROP_LAYOUT_MODE,
  PROP_COMPACT_WIDTH,
  PROP_EXPANDED_WIDTH,
  N_PROPS,
};

static GParamSpec *properties[N_PROPS];

G_DEFINE_FINAL_TYPE (AwraResponsiveBin, awra_responsive_bin, GTK_TYPE_WIDGET)
G_DEFINE_TYPE (AwraResponsiveLayout, awra_responsive_layout, GTK_TYPE_LAYOUT_MANAGER)

static void
update_layout_mode (AwraResponsiveBin *self,
                    int                width)
{
  AwraLayoutMode mode;

  if (width <= 0)
    return;

  mode = width < (int) self->compact_width
           ? AWRA_LAYOUT_MODE_COMPACT
           : width < (int) self->expanded_width
               ? AWRA_LAYOUT_MODE_MEDIUM
               : AWRA_LAYOUT_MODE_EXPANDED;
  if (self->layout_mode == mode)
    return;

  self->layout_mode = mode;
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_LAYOUT_MODE]);
}

static GtkSizeRequestMode
responsive_get_request_mode (GtkLayoutManager *manager,
                             GtkWidget        *widget)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (widget);

  (void) manager;
  return self->child != NULL
           ? gtk_widget_get_request_mode (self->child)
           : GTK_SIZE_REQUEST_CONSTANT_SIZE;
}

static void
responsive_measure (GtkLayoutManager *manager,
                    GtkWidget        *widget,
                    GtkOrientation    orientation,
                    int               for_size,
                    int              *minimum,
                    int              *natural,
                    int              *minimum_baseline,
                    int              *natural_baseline)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (widget);

  (void) manager;
  if (self->child == NULL) {
    *minimum = *natural = 0;
    *minimum_baseline = *natural_baseline = -1;
    return;
  }
  gtk_widget_measure (self->child, orientation, for_size,
                      minimum, natural, minimum_baseline, natural_baseline);
}

static void
responsive_allocate (GtkLayoutManager *manager,
                     GtkWidget        *widget,
                     int               width,
                     int               height,
                     int               baseline)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (widget);

  (void) manager;
  update_layout_mode (self, width);
  if (self->child != NULL)
    gtk_widget_allocate (self->child, width, height, baseline, NULL);
}

static void
awra_responsive_layout_class_init (AwraResponsiveLayoutClass *klass)
{
  GtkLayoutManagerClass *layout_class = GTK_LAYOUT_MANAGER_CLASS (klass);

  layout_class->get_request_mode = responsive_get_request_mode;
  layout_class->measure = responsive_measure;
  layout_class->allocate = responsive_allocate;
}

static void
awra_responsive_layout_init (AwraResponsiveLayout *self)
{
  (void) self;
}

static void
awra_responsive_bin_snapshot (GtkWidget   *widget,
                              GtkSnapshot *snapshot)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (widget);

  if (self->child != NULL)
    gtk_widget_snapshot_child (widget, self->child, snapshot);
}

static void
awra_responsive_bin_dispose (GObject *object)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (object);

  if (self->child != NULL) {
    gtk_widget_unparent (self->child);
    self->child = NULL;
  }
  G_OBJECT_CLASS (awra_responsive_bin_parent_class)->dispose (object);
}

static void
awra_responsive_bin_get_property (GObject    *object,
                                  guint       property_id,
                                  GValue     *value,
                                  GParamSpec *pspec)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (object);

  switch (property_id) {
  case PROP_CHILD: g_value_set_object (value, self->child); break;
  case PROP_LAYOUT_MODE: g_value_set_enum (value, self->layout_mode); break;
  case PROP_COMPACT_WIDTH: g_value_set_uint (value, self->compact_width); break;
  case PROP_EXPANDED_WIDTH: g_value_set_uint (value, self->expanded_width); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_responsive_bin_set_property (GObject      *object,
                                  guint         property_id,
                                  const GValue *value,
                                  GParamSpec   *pspec)
{
  AwraResponsiveBin *self = AWRA_RESPONSIVE_BIN (object);

  switch (property_id) {
  case PROP_CHILD:
    awra_responsive_bin_set_child (self, g_value_get_object (value));
    break;
  case PROP_COMPACT_WIDTH:
    awra_responsive_bin_set_compact_width (self, g_value_get_uint (value));
    break;
  case PROP_EXPANDED_WIDTH:
    awra_responsive_bin_set_expanded_width (self, g_value_get_uint (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_responsive_bin_class_init (AwraResponsiveBinClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_responsive_bin_dispose;
  object_class->get_property = awra_responsive_bin_get_property;
  object_class->set_property = awra_responsive_bin_set_property;
  widget_class->snapshot = awra_responsive_bin_snapshot;
  gtk_widget_class_set_layout_manager_type (widget_class,
                                            awra_responsive_layout_get_type ());
  gtk_widget_class_set_css_name (widget_class, "awraresponsivebin");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);

  properties[PROP_CHILD] = g_param_spec_object (
    "child", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_LAYOUT_MODE] = g_param_spec_enum (
    "layout-mode", NULL, NULL, AWRA_TYPE_LAYOUT_MODE,
    AWRA_LAYOUT_MODE_EXPANDED,
    G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  properties[PROP_COMPACT_WIDTH] = g_param_spec_uint (
    "compact-width", NULL, NULL, 240, 1600, 600,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_EXPANDED_WIDTH] = g_param_spec_uint (
    "expanded-width", NULL, NULL, 360, 3200, 960,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
}

static void
awra_responsive_bin_init (AwraResponsiveBin *self)
{
  self->layout_mode = AWRA_LAYOUT_MODE_EXPANDED;
  self->compact_width = 600;
  self->expanded_width = 960;
}

GtkWidget *
awra_responsive_bin_new (void)
{
  return g_object_new (AWRA_TYPE_RESPONSIVE_BIN, NULL);
}

GtkWidget *
awra_responsive_bin_get_child (AwraResponsiveBin *self)
{
  g_return_val_if_fail (AWRA_IS_RESPONSIVE_BIN (self), NULL);
  return self->child;
}

void
awra_responsive_bin_set_child (AwraResponsiveBin *self,
                               GtkWidget         *child)
{
  g_return_if_fail (AWRA_IS_RESPONSIVE_BIN (self));
  g_return_if_fail (child == NULL || gtk_widget_get_parent (child) == NULL);
  if (self->child == child)
    return;
  if (self->child != NULL)
    gtk_widget_unparent (self->child);
  self->child = child;
  if (child != NULL)
    gtk_widget_set_parent (child, GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]);
}

AwraLayoutMode
awra_responsive_bin_get_layout_mode (AwraResponsiveBin *self)
{
  g_return_val_if_fail (AWRA_IS_RESPONSIVE_BIN (self), AWRA_LAYOUT_MODE_COMPACT);
  return self->layout_mode;
}

guint
awra_responsive_bin_get_compact_width (AwraResponsiveBin *self)
{
  g_return_val_if_fail (AWRA_IS_RESPONSIVE_BIN (self), 0);
  return self->compact_width;
}

void
awra_responsive_bin_set_compact_width (AwraResponsiveBin *self,
                                       guint              width)
{
  g_return_if_fail (AWRA_IS_RESPONSIVE_BIN (self));
  g_return_if_fail (width >= 240 && width < self->expanded_width);
  if (self->compact_width == width)
    return;
  self->compact_width = width;
  gtk_widget_queue_allocate (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_COMPACT_WIDTH]);
}

guint
awra_responsive_bin_get_expanded_width (AwraResponsiveBin *self)
{
  g_return_val_if_fail (AWRA_IS_RESPONSIVE_BIN (self), 0);
  return self->expanded_width;
}

void
awra_responsive_bin_set_expanded_width (AwraResponsiveBin *self,
                                        guint              width)
{
  g_return_if_fail (AWRA_IS_RESPONSIVE_BIN (self));
  g_return_if_fail (width > self->compact_width && width <= 3200);
  if (self->expanded_width == width)
    return;
  self->expanded_width = width;
  gtk_widget_queue_allocate (GTK_WIDGET (self));
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_EXPANDED_WIDTH]);
}
