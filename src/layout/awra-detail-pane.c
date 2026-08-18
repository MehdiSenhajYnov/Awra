/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-detail-pane.h>
#include <awra/awra-layout.h>
#include <awra/awra-typography.h>

struct _AwraDetailPane {
  GtkWidget parent_instance;
  GtkBox *root;
  GtkBox *identity;
  GtkBox *titles;
  GtkLabel *title_label;
  GtkLabel *subtitle_label;
  GtkBox *sections;
  GtkWidget *media;
  GtkWidget *actions;
  GtkWidget *metadata;
  GPtrArray *section_items;
  char *title;
  char *subtitle;
};

enum { PROP_0, PROP_TITLE, PROP_SUBTITLE, PROP_MEDIA, PROP_ACTIONS,
       PROP_METADATA, N_PROPS };
static GParamSpec *properties[N_PROPS];
static GtkBuildableIface *parent_buildable_iface;
static void awra_detail_pane_buildable_init (GtkBuildableIface *iface);

G_DEFINE_FINAL_TYPE_WITH_CODE (
  AwraDetailPane, awra_detail_pane, GTK_TYPE_WIDGET,
  G_IMPLEMENT_INTERFACE (GTK_TYPE_BUILDABLE,
                         awra_detail_pane_buildable_init))

static void
update_titles (AwraDetailPane *self)
{
  gboolean title = self->title != NULL && *self->title != '\0';
  gboolean subtitle = self->subtitle != NULL && *self->subtitle != '\0';
  gtk_widget_set_visible (GTK_WIDGET (self->title_label), title);
  gtk_widget_set_visible (GTK_WIDGET (self->subtitle_label), subtitle);
  gtk_widget_set_visible (GTK_WIDGET (self->titles), title || subtitle);
}

static void
awra_detail_pane_dispose (GObject *object)
{
  AwraDetailPane *self = AWRA_DETAIL_PANE (object);
  if (self->root != NULL) {
    g_ptr_array_set_size (self->section_items, 0);
    gtk_widget_unparent (GTK_WIDGET (self->root));
    self->root = NULL;
    self->identity = NULL;
    self->titles = NULL;
    self->title_label = NULL;
    self->subtitle_label = NULL;
    self->sections = NULL;
    self->media = NULL;
    self->actions = NULL;
    self->metadata = NULL;
  }
  g_clear_pointer (&self->section_items, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_detail_pane_parent_class)->dispose (object);
}

static void
awra_detail_pane_finalize (GObject *object)
{
  AwraDetailPane *self = AWRA_DETAIL_PANE (object);
  g_clear_pointer (&self->title, g_free);
  g_clear_pointer (&self->subtitle, g_free);
  G_OBJECT_CLASS (awra_detail_pane_parent_class)->finalize (object);
}

static void
awra_detail_pane_get_property (GObject *object, guint id, GValue *value,
                               GParamSpec *pspec)
{
  AwraDetailPane *self = AWRA_DETAIL_PANE (object);
  switch (id) {
  case PROP_TITLE: g_value_set_string (value, self->title); break;
  case PROP_SUBTITLE: g_value_set_string (value, self->subtitle); break;
  case PROP_MEDIA: g_value_set_object (value, self->media); break;
  case PROP_ACTIONS: g_value_set_object (value, self->actions); break;
  case PROP_METADATA: g_value_set_object (value, self->metadata); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_detail_pane_set_property (GObject *object, guint id, const GValue *value,
                               GParamSpec *pspec)
{
  AwraDetailPane *self = AWRA_DETAIL_PANE (object);
  switch (id) {
  case PROP_TITLE: awra_detail_pane_set_title (self, g_value_get_string (value)); break;
  case PROP_SUBTITLE: awra_detail_pane_set_subtitle (self, g_value_get_string (value)); break;
  case PROP_MEDIA: awra_detail_pane_set_media (self, g_value_get_object (value)); break;
  case PROP_ACTIONS: awra_detail_pane_set_actions (self, g_value_get_object (value)); break;
  case PROP_METADATA: awra_detail_pane_set_metadata (self, g_value_get_object (value)); break;
  default: G_OBJECT_WARN_INVALID_PROPERTY_ID (object, id, pspec);
  }
}

static void
awra_detail_pane_class_init (AwraDetailPaneClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  object_class->dispose = awra_detail_pane_dispose;
  object_class->finalize = awra_detail_pane_finalize;
  object_class->get_property = awra_detail_pane_get_property;
  object_class->set_property = awra_detail_pane_set_property;
  properties[PROP_TITLE] = g_param_spec_string (
    "title", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_SUBTITLE] = g_param_spec_string (
    "subtitle", NULL, NULL, NULL,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_MEDIA] = g_param_spec_object (
    "media", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_ACTIONS] = g_param_spec_object (
    "actions", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  properties[PROP_METADATA] = g_param_spec_object (
    "metadata", NULL, NULL, GTK_TYPE_WIDGET,
    G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awradetailpane");
  gtk_widget_class_set_accessible_role (widget_class, GTK_ACCESSIBLE_ROLE_GROUP);
}

static void
awra_detail_pane_init (AwraDetailPane *self)
{
  self->section_items = g_ptr_array_new ();
  self->root = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  self->identity = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0));
  self->titles = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  self->sections = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  self->title_label = GTK_LABEL (gtk_label_new (NULL));
  self->subtitle_label = GTK_LABEL (gtk_label_new (NULL));
  awra_box_set_spacing (self->root, AWRA_SPACING_XL);
  awra_box_set_spacing (self->identity, AWRA_SPACING_LG);
  awra_box_set_spacing (self->titles, AWRA_SPACING_XS);
  awra_box_set_spacing (self->sections, AWRA_SPACING_XL);
  awra_widget_set_typography (GTK_WIDGET (self->title_label),
                              AWRA_TYPOGRAPHY_TITLE_1);
  awra_widget_set_typography (GTK_WIDGET (self->subtitle_label),
                              AWRA_TYPOGRAPHY_MUTED);
  gtk_label_set_xalign (self->title_label, 0.0f);
  gtk_label_set_xalign (self->subtitle_label, 0.0f);
  gtk_label_set_wrap (self->subtitle_label, TRUE);
  gtk_widget_set_hexpand (GTK_WIDGET (self->titles), TRUE);
  gtk_box_append (self->titles, GTK_WIDGET (self->title_label));
  gtk_box_append (self->titles, GTK_WIDGET (self->subtitle_label));
  gtk_box_append (self->identity, GTK_WIDGET (self->titles));
  gtk_box_append (self->root, GTK_WIDGET (self->identity));
  gtk_box_append (self->root, GTK_WIDGET (self->sections));
  gtk_widget_set_parent (GTK_WIDGET (self->root), GTK_WIDGET (self));
  update_titles (self);
}

static void
awra_detail_pane_buildable_add_child (GtkBuildable *buildable,
                                      GtkBuilder *builder, GObject *child,
                                      const char *type)
{
  if (AWRA_IS_SECTION (child) &&
      (type == NULL || g_str_equal (type, "section"))) {
    awra_detail_pane_append_section (AWRA_DETAIL_PANE (buildable),
                                     AWRA_SECTION (child));
    return;
  }
  parent_buildable_iface->add_child (buildable, builder, child, type);
}

static void
awra_detail_pane_buildable_init (GtkBuildableIface *iface)
{
  parent_buildable_iface = g_type_interface_peek_parent (iface);
  iface->add_child = awra_detail_pane_buildable_add_child;
}

GtkWidget *awra_detail_pane_new (void) { return g_object_new (AWRA_TYPE_DETAIL_PANE, NULL); }
const char *awra_detail_pane_get_title (AwraDetailPane *self) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), NULL); return self->title; }
void awra_detail_pane_set_title (AwraDetailPane *self, const char *title) { g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); if (g_strcmp0 (self->title, title) == 0) return; g_free (self->title); self->title = g_strdup (title); gtk_label_set_text (self->title_label, title != NULL ? title : ""); gtk_accessible_update_property (GTK_ACCESSIBLE (self), GTK_ACCESSIBLE_PROPERTY_LABEL, title != NULL ? title : "", -1); update_titles (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_TITLE]); }
const char *awra_detail_pane_get_subtitle (AwraDetailPane *self) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), NULL); return self->subtitle; }
void awra_detail_pane_set_subtitle (AwraDetailPane *self, const char *subtitle) { g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); if (g_strcmp0 (self->subtitle, subtitle) == 0) return; g_free (self->subtitle); self->subtitle = g_strdup (subtitle); gtk_label_set_text (self->subtitle_label, subtitle != NULL ? subtitle : ""); update_titles (self); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SUBTITLE]); }
GtkWidget *awra_detail_pane_get_media (AwraDetailPane *self) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), NULL); return self->media; }
void awra_detail_pane_set_media (AwraDetailPane *self, GtkWidget *media) { g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); g_return_if_fail (media == NULL || GTK_IS_WIDGET (media)); if (self->media == media) return; if (self->media != NULL) gtk_box_remove (self->identity, self->media); self->media = media; if (media != NULL) gtk_box_prepend (self->identity, media); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_MEDIA]); }
GtkWidget *awra_detail_pane_get_actions (AwraDetailPane *self) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), NULL); return self->actions; }
void awra_detail_pane_set_actions (AwraDetailPane *self, GtkWidget *actions) { g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); g_return_if_fail (actions == NULL || GTK_IS_WIDGET (actions)); if (self->actions == actions) return; if (self->actions != NULL) gtk_box_remove (self->identity, self->actions); self->actions = actions; if (actions != NULL) { gtk_widget_set_valign (actions, GTK_ALIGN_CENTER); gtk_box_append (self->identity, actions); } g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ACTIONS]); }
GtkWidget *awra_detail_pane_get_metadata (AwraDetailPane *self) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), NULL); return self->metadata; }
void awra_detail_pane_set_metadata (AwraDetailPane *self, GtkWidget *metadata) { g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); g_return_if_fail (metadata == NULL || GTK_IS_WIDGET (metadata)); if (self->metadata == metadata) return; if (self->metadata != NULL) gtk_box_remove (self->root, self->metadata); self->metadata = metadata; if (metadata != NULL) gtk_box_insert_child_after (self->root, metadata, GTK_WIDGET (self->identity)); g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_METADATA]); }
void awra_detail_pane_append_section (AwraDetailPane *self, AwraSection *section) { g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); g_return_if_fail (AWRA_IS_SECTION (section)); g_return_if_fail (gtk_widget_get_parent (GTK_WIDGET (section)) == NULL); g_ptr_array_add (self->section_items, section); gtk_box_append (self->sections, GTK_WIDGET (section)); }
void awra_detail_pane_remove_section (AwraDetailPane *self, AwraSection *section) { guint position; g_return_if_fail (AWRA_IS_DETAIL_PANE (self)); g_return_if_fail (AWRA_IS_SECTION (section)); if (!g_ptr_array_find (self->section_items, section, &position)) return; g_ptr_array_remove_index (self->section_items, position); gtk_box_remove (self->sections, GTK_WIDGET (section)); }
guint awra_detail_pane_get_n_sections (AwraDetailPane *self) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), 0); return self->section_items->len; }
AwraSection *awra_detail_pane_get_section (AwraDetailPane *self, guint position) { g_return_val_if_fail (AWRA_IS_DETAIL_PANE (self), NULL); return position < self->section_items->len ? g_ptr_array_index (self->section_items, position) : NULL; }
