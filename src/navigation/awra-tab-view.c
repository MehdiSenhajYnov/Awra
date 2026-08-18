/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-layout.h>
#include <awra/awra-motion.h>
#include <awra/awra-tab-view.h>

#include "awra-i18n-private.h"

typedef struct {
  AwraTabView *view;
  GtkWidget *page;
  GtkWidget *tab;
  GtkToggleButton *select_button;
  GtkLabel *label;
  char *name;
  gboolean pinned;
} AwraTabPage;

struct _AwraTabView {
  GtkWidget parent_instance;
  GtkBox *box;
  GtkBox *tab_bar;
  GtkStack *stack;
  GPtrArray *pages;
  guint next_page_id;
  AwraStyleManager *style_manager;
  gulong style_handler;
};

enum {
  PROP_0,
  PROP_SELECTED_NAME,
  PROP_SELECTED_PAGE,
  PROP_CONTENT_VISIBLE,
  PROP_STACK,
  N_PROPS,
};

enum {
  SIGNAL_CLOSE_PAGE,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraTabView, awra_tab_view, GTK_TYPE_WIDGET)

static AwraTabPage *
find_page (AwraTabView *self,
           GtkWidget   *page,
           guint       *position)
{
  for (guint i = 0; i < self->pages->len; i++) {
    AwraTabPage *info = g_ptr_array_index (self->pages, i);

    if (info->page == page) {
      if (position != NULL)
        *position = i;
      return info;
    }
  }

  return NULL;
}

static void
tab_page_free (gpointer data)
{
  AwraTabPage *info = data;

  g_clear_pointer (&info->name, g_free);
  g_free (info);
}

static void
update_motion (AwraTabView *self)
{
  guint duration = 0;

  if (self->style_manager != NULL)
    duration = awra_motion_get_duration (self->style_manager,
                                         AWRA_MOTION_PRESET_NORMAL);
  gtk_stack_set_transition_duration (self->stack, duration);
  gtk_stack_set_transition_type (
    self->stack,
    duration == 0 ? GTK_STACK_TRANSITION_TYPE_NONE
                  : GTK_STACK_TRANSITION_TYPE_CROSSFADE);
}

static void
motion_changed_cb (AwraStyleManager *manager,
                   GParamSpec       *pspec,
                   AwraTabView      *self)
{
  (void) manager;
  (void) pspec;
  update_motion (self);
}

static void
update_selected_tab (AwraTabView *self)
{
  GtkWidget *selected = gtk_stack_get_visible_child (self->stack);

  for (guint i = 0; i < self->pages->len; i++) {
    AwraTabPage *info = g_ptr_array_index (self->pages, i);

    if (info->page == selected)
      gtk_widget_add_css_class (info->tab, "awra-tab-selected");
    else
      gtk_widget_remove_css_class (info->tab, "awra-tab-selected");
    gtk_toggle_button_set_active (info->select_button,
                                  info->page == selected);
  }
}

static void
selected_changed_cb (GtkStack    *stack,
                     GParamSpec  *pspec,
                     AwraTabView *self)
{
  (void) stack;
  (void) pspec;
  update_selected_tab (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED_NAME]);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_SELECTED_PAGE]);
}

static void
select_page (AwraTabPage *info)
{
  if (find_page (info->view, info->page, NULL) != NULL)
    awra_tab_view_set_selected_page (info->view, info->page);
}

static void
select_clicked_cb (GtkButton   *button,
                   AwraTabPage *info)
{
  (void) button;
  select_page (info);
}

static void
close_clicked_cb (GtkButton   *button,
                  AwraTabPage *info)
{
  AwraTabView *self = info->view;
  GtkWidget *page = info->page;

  (void) button;
  awra_tab_view_close_page (self, page);
}

static AwraTabPage *
append_page (AwraTabView *self,
             GtkWidget   *page,
             const char  *name,
             const char  *title,
             gboolean     pinned,
             gboolean     closable)
{
  AwraTabPage *info;
  GtkWidget *select_content;
  GtkWidget *icon;
  GtkWidget *close;

  g_return_val_if_fail (find_page (self, page, NULL) == NULL, NULL);

  info = g_new0 (AwraTabPage, 1);
  info->view = self;
  info->page = page;
  info->name = g_strdup (name);
  info->pinned = pinned;
  info->tab = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 6);
  info->select_button = GTK_TOGGLE_BUTTON (gtk_toggle_button_new ());
  select_content = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 6);
  info->label = GTK_LABEL (gtk_label_new (title));

  gtk_label_set_ellipsize (info->label, PANGO_ELLIPSIZE_END);
  gtk_label_set_max_width_chars (info->label, 22);
  gtk_widget_add_css_class (GTK_WIDGET (info->label), "awra-tab-label");
  gtk_widget_add_css_class (info->tab, "awra-tab-item");
  gtk_widget_add_css_class (GTK_WIDGET (info->select_button),
                            "awra-tab-button");
  gtk_accessible_update_property (GTK_ACCESSIBLE (info->select_button),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  title,
                                  -1);
  if (pinned) {
    gtk_widget_add_css_class (info->tab, "awra-tab-pinned");
    icon = gtk_image_new_from_icon_name ("go-home-symbolic");
    gtk_image_set_pixel_size (GTK_IMAGE (icon), 14);
    gtk_box_append (GTK_BOX (select_content), icon);
  }
  gtk_box_append (GTK_BOX (select_content), GTK_WIDGET (info->label));
  gtk_button_set_child (GTK_BUTTON (info->select_button), select_content);
  g_signal_connect (info->select_button, "clicked",
                    G_CALLBACK (select_clicked_cb), info);
  gtk_box_append (GTK_BOX (info->tab), GTK_WIDGET (info->select_button));

  if (closable) {
    close = gtk_button_new_from_icon_name ("window-close-symbolic");
    gtk_widget_set_tooltip_text (close, _("Close tab"));
    gtk_widget_add_css_class (close, "awra-tab-close");
    g_signal_connect (close, "clicked", G_CALLBACK (close_clicked_cb), info);
    gtk_box_append (GTK_BOX (info->tab), close);
  }

  g_ptr_array_add (self->pages, info);
  gtk_box_append (self->tab_bar, info->tab);
  gtk_stack_add_named (self->stack, page, name);
  if (self->pages->len == 1)
    gtk_stack_set_visible_child (self->stack, page);
  update_selected_tab (self);

  return info;
}

static void
awra_tab_view_map (GtkWidget *widget)
{
  AwraTabView *self = AWRA_TAB_VIEW (widget);
  AwraContext *context;

  GTK_WIDGET_CLASS (awra_tab_view_parent_class)->map (widget);
  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  self->style_manager = awra_context_get_style_manager (context);
  self->style_handler = g_signal_connect (self->style_manager,
                                          "notify::reduced-motion",
                                          G_CALLBACK (motion_changed_cb),
                                          self);
  update_motion (self);
}

static void
awra_tab_view_unmap (GtkWidget *widget)
{
  AwraTabView *self = AWRA_TAB_VIEW (widget);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
    self->style_manager = NULL;
  }
  GTK_WIDGET_CLASS (awra_tab_view_parent_class)->unmap (widget);
}

static void
awra_tab_view_dispose (GObject *object)
{
  AwraTabView *self = AWRA_TAB_VIEW (object);

  if (self->style_handler != 0) {
    g_signal_handler_disconnect (self->style_manager, self->style_handler);
    self->style_handler = 0;
  }
  if (self->box != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->box));
    self->box = NULL;
    self->tab_bar = NULL;
    self->stack = NULL;
  }
  g_clear_pointer (&self->pages, g_ptr_array_unref);
  G_OBJECT_CLASS (awra_tab_view_parent_class)->dispose (object);
}

static void
awra_tab_view_snapshot (GtkWidget   *widget,
                        GtkSnapshot *snapshot)
{
  AwraTabView *self = AWRA_TAB_VIEW (widget);

  if (self->box != NULL)
    gtk_widget_snapshot_child (widget, GTK_WIDGET (self->box), snapshot);
}

static void
awra_tab_view_get_property (GObject    *object,
                            guint       property_id,
                            GValue     *value,
                            GParamSpec *pspec)
{
  AwraTabView *self = AWRA_TAB_VIEW (object);

  if (property_id == PROP_SELECTED_NAME)
    g_value_set_string (value, awra_tab_view_get_selected_name (self));
  else if (property_id == PROP_SELECTED_PAGE)
    g_value_set_object (value, awra_tab_view_get_selected_page (self));
  else if (property_id == PROP_CONTENT_VISIBLE)
    g_value_set_boolean (value, awra_tab_view_get_content_visible (self));
  else if (property_id == PROP_STACK)
    g_value_set_object (value, self->stack);
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_tab_view_set_property (GObject      *object,
                            guint         property_id,
                            const GValue *value,
                            GParamSpec   *pspec)
{
  if (property_id == PROP_SELECTED_NAME)
    awra_tab_view_set_selected_name (AWRA_TAB_VIEW (object),
                                     g_value_get_string (value));
  else if (property_id == PROP_CONTENT_VISIBLE)
    awra_tab_view_set_content_visible (AWRA_TAB_VIEW (object),
                                       g_value_get_boolean (value));
  else
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
}

static void
awra_tab_view_class_init (AwraTabViewClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);

  object_class->dispose = awra_tab_view_dispose;
  object_class->get_property = awra_tab_view_get_property;
  object_class->set_property = awra_tab_view_set_property;
  widget_class->map = awra_tab_view_map;
  widget_class->unmap = awra_tab_view_unmap;
  widget_class->snapshot = awra_tab_view_snapshot;
  properties[PROP_SELECTED_NAME] =
    g_param_spec_string ("selected-name", NULL, NULL, NULL,
                         G_PARAM_READWRITE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_SELECTED_PAGE] =
    g_param_spec_object ("selected-page", NULL, NULL, GTK_TYPE_WIDGET,
                         G_PARAM_READABLE |
                         G_PARAM_EXPLICIT_NOTIFY |
                         G_PARAM_STATIC_STRINGS);
  properties[PROP_CONTENT_VISIBLE] =
    g_param_spec_boolean ("content-visible", NULL, NULL, TRUE,
                          G_PARAM_READWRITE |
                          G_PARAM_EXPLICIT_NOTIFY |
                          G_PARAM_STATIC_STRINGS);
  properties[PROP_STACK] =
    g_param_spec_object ("stack", NULL, NULL, GTK_TYPE_STACK,
                         G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);
  signals[SIGNAL_CLOSE_PAGE] =
    g_signal_new ("close-page",
                  G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST,
                  0,
                  g_signal_accumulator_true_handled,
                  NULL,
                  NULL,
                  G_TYPE_BOOLEAN,
                  1,
                  GTK_TYPE_WIDGET);
  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awratabview");
}

static void
awra_tab_view_init (AwraTabView *self)
{
  self->pages = g_ptr_array_new_with_free_func (tab_page_free);
  self->box = GTK_BOX (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0));
  self->tab_bar = GTK_BOX (gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 6));
  self->stack = GTK_STACK (gtk_stack_new ());
  gtk_widget_add_css_class (GTK_WIDGET (self->tab_bar), "awra-tab-bar");
  gtk_widget_set_halign (GTK_WIDGET (self->tab_bar), GTK_ALIGN_START);
  gtk_widget_set_hexpand (GTK_WIDGET (self->stack), TRUE);
  gtk_widget_set_vexpand (GTK_WIDGET (self->stack), TRUE);
  gtk_box_append (self->box, GTK_WIDGET (self->tab_bar));
  gtk_box_append (self->box, GTK_WIDGET (self->stack));
  gtk_widget_set_parent (GTK_WIDGET (self->box), GTK_WIDGET (self));
  g_signal_connect (self->stack,
                    "notify::visible-child-name",
                    G_CALLBACK (selected_changed_cb),
                    self);
}

GtkWidget *
awra_tab_view_new (void)
{
  return g_object_new (AWRA_TYPE_TAB_VIEW, NULL);
}

void
awra_tab_view_add (AwraTabView *self,
                   GtkWidget   *page,
                   const char  *name,
                   const char  *title)
{
  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));
  g_return_if_fail (name != NULL && *name != '\0');

  append_page (self, page, name, title != NULL ? title : name, FALSE, FALSE);
}

GtkWidget *
awra_tab_view_append (AwraTabView *self,
                      GtkWidget   *page,
                      const char  *title,
                      gboolean     pinned)
{
  g_autofree char *name = NULL;

  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  g_return_val_if_fail (GTK_IS_WIDGET (page), NULL);

  name = g_strdup_printf ("awra-page-%u", self->next_page_id++);
  if (append_page (self, page, name,
                   title != NULL ? title : _("Untitled"),
                   pinned, !pinned) == NULL)
    return NULL;
  return page;
}

void
awra_tab_view_remove (AwraTabView *self,
                      GtkWidget   *page)
{
  guint position;
  AwraTabPage *info;
  GtkWidget *selected;
  GtkWidget *replacement = NULL;

  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));

  info = find_page (self, page, &position);
  if (info == NULL)
    return;

  selected = gtk_stack_get_visible_child (self->stack);
  if (selected == page && self->pages->len > 1) {
    guint replacement_position = position > 0 ? position - 1 : 1;
    AwraTabPage *replacement_info = g_ptr_array_index (self->pages,
                                                       replacement_position);
    replacement = replacement_info->page;
  }

  gtk_box_remove (self->tab_bar, info->tab);
  gtk_stack_remove (self->stack, page);
  g_ptr_array_remove_index (self->pages, position);

  if (replacement != NULL)
    gtk_stack_set_visible_child (self->stack, replacement);
  update_selected_tab (self);
}

void
awra_tab_view_close_page (AwraTabView *self,
                          GtkWidget   *page)
{
  gboolean inhibit = FALSE;

  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));
  g_return_if_fail (find_page (self, page, NULL) != NULL);

  g_signal_emit (self, signals[SIGNAL_CLOSE_PAGE], 0, page, &inhibit);
  if (!inhibit)
    awra_tab_view_remove (self, page);
}

GtkWidget *
awra_tab_view_get_selected_page (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  return gtk_stack_get_visible_child (self->stack);
}

void
awra_tab_view_set_selected_page (AwraTabView *self,
                                 GtkWidget   *page)
{
  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));
  g_return_if_fail (find_page (self, page, NULL) != NULL);

  gtk_stack_set_visible_child (self->stack, page);
}

void
awra_tab_view_set_page_title (AwraTabView *self,
                              GtkWidget   *page,
                              const char  *title)
{
  AwraTabPage *info;

  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));

  info = find_page (self, page, NULL);
  g_return_if_fail (info != NULL);
  gtk_label_set_text (info->label, title != NULL ? title : _("Untitled"));
  gtk_accessible_update_property (GTK_ACCESSIBLE (info->select_button),
                                  GTK_ACCESSIBLE_PROPERTY_LABEL,
                                  title != NULL ? title : _("Untitled"),
                                  -1);
}

void
awra_tab_view_set_page_tooltip (AwraTabView *self,
                                GtkWidget   *page,
                                const char  *tooltip)
{
  AwraTabPage *info;

  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (GTK_IS_WIDGET (page));

  info = find_page (self, page, NULL);
  g_return_if_fail (info != NULL);
  gtk_widget_set_tooltip_text (info->tab, tooltip);
}

GtkWidget *
awra_tab_view_get_tab_bar (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  return GTK_WIDGET (self->tab_bar);
}

gboolean
awra_tab_view_get_content_visible (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), FALSE);
  return gtk_widget_get_visible (GTK_WIDGET (self->stack));
}

void
awra_tab_view_set_content_visible (AwraTabView *self,
                                   gboolean     visible)
{
  g_return_if_fail (AWRA_IS_TAB_VIEW (self));

  visible = !!visible;
  if (visible == awra_tab_view_get_content_visible (self))
    return;
  gtk_widget_set_visible (GTK_WIDGET (self->stack), visible);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_CONTENT_VISIBLE]);
}

const char *
awra_tab_view_get_selected_name (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  return gtk_stack_get_visible_child_name (self->stack);
}

void
awra_tab_view_set_selected_name (AwraTabView *self,
                                 const char  *name)
{
  g_return_if_fail (AWRA_IS_TAB_VIEW (self));
  g_return_if_fail (name != NULL);
  g_return_if_fail (gtk_stack_get_child_by_name (self->stack, name) != NULL);

  gtk_stack_set_visible_child_name (self->stack, name);
}

GtkStack *
awra_tab_view_get_stack (AwraTabView *self)
{
  g_return_val_if_fail (AWRA_IS_TAB_VIEW (self), NULL);
  return self->stack;
}
