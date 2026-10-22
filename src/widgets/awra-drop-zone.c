/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <string.h>

#include <awra/awra-button.h>
#include <awra/awra-context.h>
#include <awra/awra-drop-zone.h>
#include <awra/awra-layout.h>
#include <awra/awra-motion.h>
#include <awra/awra-surface.h>

#include "awra-i18n-private.h"

#define DEFAULT_ICON "document-send-symbolic"

struct _AwraDropZone {
  GtkWidget parent_instance;

  GtkOverlay *overlay;
  GtkWidget *child;
  GtkBox *empty;
  GtkImage *empty_icon;
  GtkLabel *title;
  GtkLabel *subtitle;
  GtkButton *browse;
  GtkRevealer *revealer;
  GtkImage *hint_icon;
  GtkLabel *hint_label;
  GtkDropTarget *target;

  char *icon_name;
  char *drop_message;
  char *browse_label;
  char **extensions;
  char **mime_types;

  gboolean hovering;
  gboolean rejecting;

  AwraStyleManager *style;
  gulong style_handler;
};

enum {
  PROP_0,
  PROP_CHILD,
  PROP_TITLE,
  PROP_SUBTITLE,
  PROP_ICON_NAME,
  PROP_DROP_MESSAGE,
  PROP_SHOW_BROWSE_BUTTON,
  PROP_BROWSE_LABEL,
  PROP_DROP_ACTIVE,
  N_PROPS,
};

enum {
  SIGNAL_FILES_DROPPED,
  SIGNAL_REJECTED,
  SIGNAL_BROWSE_REQUESTED,
  N_SIGNALS,
};

static GParamSpec *properties[N_PROPS];
static guint signals[N_SIGNALS];

G_DEFINE_FINAL_TYPE (AwraDropZone, awra_drop_zone, GTK_TYPE_WIDGET)

static void
update_motion (AwraDropZone *self)
{
  guint duration = self->style != NULL
                     ? awra_motion_get_duration (self->style,
                                                 AWRA_MOTION_PRESET_FAST)
                     : 0;

  gtk_revealer_set_transition_duration (self->revealer, duration);
  gtk_revealer_set_transition_type (self->revealer,
                                    duration == 0
                                      ? GTK_REVEALER_TRANSITION_TYPE_NONE
                                      : GTK_REVEALER_TRANSITION_TYPE_CROSSFADE);
}

static void
style_notify_cb (AwraStyleManager *style,
                 GParamSpec       *pspec,
                 AwraDropZone     *self)
{
  (void) style;
  (void) pspec;
  update_motion (self);
}

static void
awra_drop_zone_map (GtkWidget *widget)
{
  AwraDropZone *self = AWRA_DROP_ZONE (widget);

  GTK_WIDGET_CLASS (awra_drop_zone_parent_class)->map (widget);
  self->style = awra_context_get_style_manager (
    awra_context_get_for_display (gtk_widget_get_display (widget)));
  self->style_handler = g_signal_connect (self->style,
                                          "notify::reduced-motion",
                                          G_CALLBACK (style_notify_cb), self);
  update_motion (self);
}

static void
awra_drop_zone_unmap (GtkWidget *widget)
{
  AwraDropZone *self = AWRA_DROP_ZONE (widget);

  if (self->style != NULL)
    g_clear_signal_handler (&self->style_handler, self->style);
  self->style = NULL;
  GTK_WIDGET_CLASS (awra_drop_zone_parent_class)->unmap (widget);
}

static void
update_presentation (AwraDropZone *self)
{
  GtkWidget *widget = GTK_WIDGET (self);
  const char *icon = self->icon_name != NULL ? self->icon_name : DEFAULT_ICON;

  gtk_image_set_from_icon_name (self->empty_icon, icon);
  gtk_image_set_from_icon_name (self->hint_icon,
                                self->rejecting ? "action-unavailable-symbolic"
                                                : icon);
  gtk_label_set_text (self->hint_label,
                      self->rejecting ? _("These files are not supported")
                                      : awra_drop_zone_get_drop_message (self));
  gtk_button_set_label (self->browse, awra_drop_zone_get_browse_label (self));

  if (self->hovering)
    gtk_widget_add_css_class (widget, "awra-drop-hover");
  else
    gtk_widget_remove_css_class (widget, "awra-drop-hover");
  if (self->hovering && self->rejecting)
    gtk_widget_add_css_class (widget, "awra-drop-rejecting");
  else
    gtk_widget_remove_css_class (widget, "awra-drop-rejecting");
  gtk_revealer_set_reveal_child (self->revealer,
                                 self->hovering && self->child != NULL);
}

static void
set_hover_state (AwraDropZone *self,
                 gboolean      hovering,
                 gboolean      rejecting)
{
  gboolean was_active = awra_drop_zone_get_drop_active (self);

  if (self->hovering == hovering && self->rejecting == rejecting)
    return;
  self->hovering = hovering;
  self->rejecting = rejecting;
  update_presentation (self);
  if (was_active != awra_drop_zone_get_drop_active (self))
    g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DROP_ACTIVE]);
}

static char *
normalize_extension (const char *extension)
{
  while (*extension == '.')
    extension++;
  return g_utf8_strdown (extension, -1);
}

static gboolean
mime_matches (const char *pattern,
              const char *mime)
{
  gsize length = strlen (pattern);

  if (length >= 2 && g_str_has_suffix (pattern, "/*"))
    return g_ascii_strncasecmp (pattern, mime, length - 1) == 0;
  return g_ascii_strcasecmp (pattern, mime) == 0;
}

gboolean
awra_drop_zone_accepts_file (AwraDropZone *self,
                             GFile        *file)
{
  g_autofree char *basename = NULL;
  const char *dot;

  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), FALSE);
  g_return_val_if_fail (G_IS_FILE (file), FALSE);

  if (self->extensions == NULL && self->mime_types == NULL)
    return TRUE;
  basename = g_file_get_basename (file);
  if (basename == NULL)
    return FALSE;

  dot = strrchr (basename, '.');
  if (self->extensions != NULL && dot != NULL && dot[1] != '\0') {
    g_autofree char *extension = g_utf8_strdown (dot + 1, -1);

    if (g_strv_contains ((const char * const *) self->extensions, extension))
      return TRUE;
  }

  if (self->mime_types != NULL) {
    gboolean uncertain = FALSE;
    g_autofree char *content_type = g_content_type_guess (basename, NULL, 0,
                                                          &uncertain);
    g_autofree char *mime = content_type != NULL
                              ? g_content_type_get_mime_type (content_type)
                              : NULL;

    for (guint i = 0; mime != NULL && self->mime_types[i] != NULL; i++) {
      if (mime_matches (self->mime_types[i], mime))
        return TRUE;
    }
  }
  return FALSE;
}

static GPtrArray *
filter_files (AwraDropZone *self,
              GdkFileList  *list)
{
  g_autoptr (GSList) files = gdk_file_list_get_files (list);
  GPtrArray *accepted = g_ptr_array_new ();

  for (GSList *item = files; item != NULL; item = item->next) {
    if (awra_drop_zone_accepts_file (self, item->data))
      g_ptr_array_add (accepted, item->data);
  }
  return accepted;
}

static void
target_value_cb (GtkDropTarget *target,
                 GParamSpec    *pspec,
                 AwraDropZone  *self)
{
  const GValue *value = gtk_drop_target_get_value (target);
  g_autoptr (GPtrArray) accepted = NULL;

  (void) pspec;
  if (!self->hovering || value == NULL ||
      !G_VALUE_HOLDS (value, GDK_TYPE_FILE_LIST) ||
      g_value_get_boxed (value) == NULL)
    return;
  accepted = filter_files (self, g_value_get_boxed (value));
  set_hover_state (self, TRUE, accepted->len == 0);
}

static GdkDragAction
target_enter_cb (GtkDropTarget *target,
                 double         x,
                 double         y,
                 AwraDropZone  *self)
{
  (void) x;
  (void) y;
  set_hover_state (self, TRUE, FALSE);
  target_value_cb (target, NULL, self);
  return GDK_ACTION_COPY;
}

static void
target_leave_cb (GtkDropTarget *target,
                 AwraDropZone  *self)
{
  (void) target;
  set_hover_state (self, FALSE, FALSE);
}

static gboolean
target_drop_cb (GtkDropTarget *target,
                const GValue  *value,
                double         x,
                double         y,
                AwraDropZone  *self)
{
  g_autoptr (GPtrArray) accepted = NULL;
  GdkFileList *delivered;

  (void) target;
  (void) x;
  (void) y;
  set_hover_state (self, FALSE, FALSE);
  if (!G_VALUE_HOLDS (value, GDK_TYPE_FILE_LIST) ||
      g_value_get_boxed (value) == NULL)
    return FALSE;
  accepted = filter_files (self, g_value_get_boxed (value));
  if (accepted->len == 0) {
    g_signal_emit (self, signals[SIGNAL_REJECTED], 0);
    return FALSE;
  }
  delivered = gdk_file_list_new_from_array ((GFile **) accepted->pdata,
                                            accepted->len);
  g_signal_emit (self, signals[SIGNAL_FILES_DROPPED], 0, delivered);
  g_boxed_free (GDK_TYPE_FILE_LIST, delivered);
  return TRUE;
}

static void
browse_clicked_cb (GtkButton    *button,
                   AwraDropZone *self)
{
  (void) button;
  g_signal_emit (self, signals[SIGNAL_BROWSE_REQUESTED], 0);
}

static void
awra_drop_zone_dispose (GObject *object)
{
  AwraDropZone *self = AWRA_DROP_ZONE (object);

  if (self->style != NULL)
    g_clear_signal_handler (&self->style_handler, self->style);
  self->style = NULL;
  if (self->overlay != NULL) {
    gtk_widget_unparent (GTK_WIDGET (self->overlay));
    self->overlay = NULL;
  }
  g_clear_object (&self->empty);
  self->child = NULL;
  G_OBJECT_CLASS (awra_drop_zone_parent_class)->dispose (object);
}

static void
awra_drop_zone_finalize (GObject *object)
{
  AwraDropZone *self = AWRA_DROP_ZONE (object);

  g_free (self->icon_name);
  g_free (self->drop_message);
  g_free (self->browse_label);
  g_strfreev (self->extensions);
  g_strfreev (self->mime_types);
  G_OBJECT_CLASS (awra_drop_zone_parent_class)->finalize (object);
}

static void
awra_drop_zone_get_property (GObject    *object,
                             guint       property_id,
                             GValue     *value,
                             GParamSpec *pspec)
{
  AwraDropZone *self = AWRA_DROP_ZONE (object);

  switch (property_id) {
  case PROP_CHILD:
    g_value_set_object (value, self->child);
    break;
  case PROP_TITLE:
    g_value_set_string (value, awra_drop_zone_get_title (self));
    break;
  case PROP_SUBTITLE:
    g_value_set_string (value, awra_drop_zone_get_subtitle (self));
    break;
  case PROP_ICON_NAME:
    g_value_set_string (value, self->icon_name);
    break;
  case PROP_DROP_MESSAGE:
    g_value_set_string (value, awra_drop_zone_get_drop_message (self));
    break;
  case PROP_SHOW_BROWSE_BUTTON:
    g_value_set_boolean (value, awra_drop_zone_get_show_browse_button (self));
    break;
  case PROP_BROWSE_LABEL:
    g_value_set_string (value, awra_drop_zone_get_browse_label (self));
    break;
  case PROP_DROP_ACTIVE:
    g_value_set_boolean (value, awra_drop_zone_get_drop_active (self));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_drop_zone_set_property (GObject      *object,
                             guint         property_id,
                             const GValue *value,
                             GParamSpec   *pspec)
{
  AwraDropZone *self = AWRA_DROP_ZONE (object);

  switch (property_id) {
  case PROP_CHILD:
    awra_drop_zone_set_child (self, g_value_get_object (value));
    break;
  case PROP_TITLE:
    awra_drop_zone_set_title (self, g_value_get_string (value));
    break;
  case PROP_SUBTITLE:
    awra_drop_zone_set_subtitle (self, g_value_get_string (value));
    break;
  case PROP_ICON_NAME:
    awra_drop_zone_set_icon_name (self, g_value_get_string (value));
    break;
  case PROP_DROP_MESSAGE:
    awra_drop_zone_set_drop_message (self, g_value_get_string (value));
    break;
  case PROP_SHOW_BROWSE_BUTTON:
    awra_drop_zone_set_show_browse_button (self, g_value_get_boolean (value));
    break;
  case PROP_BROWSE_LABEL:
    awra_drop_zone_set_browse_label (self, g_value_get_string (value));
    break;
  default:
    G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
  }
}

static void
awra_drop_zone_class_init (AwraDropZoneClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);
  GtkWidgetClass *widget_class = GTK_WIDGET_CLASS (klass);
  const GParamFlags flags = G_PARAM_READWRITE | G_PARAM_EXPLICIT_NOTIFY |
                            G_PARAM_STATIC_STRINGS;

  object_class->dispose = awra_drop_zone_dispose;
  object_class->finalize = awra_drop_zone_finalize;
  object_class->get_property = awra_drop_zone_get_property;
  object_class->set_property = awra_drop_zone_set_property;
  widget_class->map = awra_drop_zone_map;
  widget_class->unmap = awra_drop_zone_unmap;

  properties[PROP_CHILD] =
    g_param_spec_object ("child", NULL, NULL, GTK_TYPE_WIDGET, flags);
  properties[PROP_TITLE] =
    g_param_spec_string ("title", NULL, NULL, NULL, flags);
  properties[PROP_SUBTITLE] =
    g_param_spec_string ("subtitle", NULL, NULL, NULL, flags);
  properties[PROP_ICON_NAME] =
    g_param_spec_string ("icon-name", NULL, NULL, NULL, flags);
  properties[PROP_DROP_MESSAGE] =
    g_param_spec_string ("drop-message", NULL, NULL, NULL, flags);
  properties[PROP_SHOW_BROWSE_BUTTON] =
    g_param_spec_boolean ("show-browse-button", NULL, NULL, FALSE, flags);
  properties[PROP_BROWSE_LABEL] =
    g_param_spec_string ("browse-label", NULL, NULL, NULL, flags);
  properties[PROP_DROP_ACTIVE] =
    g_param_spec_boolean ("drop-active", NULL, NULL, FALSE,
                          G_PARAM_READABLE | G_PARAM_STATIC_STRINGS);
  g_object_class_install_properties (object_class, N_PROPS, properties);

  /**
   * AwraDropZone::files-dropped:
   * @self: the drop zone
   * @files: the dropped files accepted by the filters
   *
   * Emitted when at least one dropped file passes the filters.
   */
  signals[SIGNAL_FILES_DROPPED] =
    g_signal_new ("files-dropped", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 1,
                  GDK_TYPE_FILE_LIST);
  /**
   * AwraDropZone::rejected:
   * @self: the drop zone
   *
   * Emitted when files are dropped but none passes the filters.
   */
  signals[SIGNAL_REJECTED] =
    g_signal_new ("rejected", G_TYPE_FROM_CLASS (klass), G_SIGNAL_RUN_LAST,
                  0, NULL, NULL, NULL, G_TYPE_NONE, 0);
  /**
   * AwraDropZone::browse-requested:
   * @self: the drop zone
   *
   * Emitted by the empty state's browse button. Applications open their own
   * file chooser.
   */
  signals[SIGNAL_BROWSE_REQUESTED] =
    g_signal_new ("browse-requested", G_TYPE_FROM_CLASS (klass),
                  G_SIGNAL_RUN_LAST, 0, NULL, NULL, NULL, G_TYPE_NONE, 0);

  gtk_widget_class_set_layout_manager_type (widget_class, GTK_TYPE_BIN_LAYOUT);
  gtk_widget_class_set_css_name (widget_class, "awradropzone");
  gtk_widget_class_set_accessible_role (widget_class,
                                        GTK_ACCESSIBLE_ROLE_GROUP);
}

static GtkLabel *
make_label (const char *css_class)
{
  GtkLabel *label = GTK_LABEL (gtk_label_new (NULL));

  gtk_widget_add_css_class (GTK_WIDGET (label), css_class);
  gtk_label_set_wrap (label, TRUE);
  gtk_label_set_justify (label, GTK_JUSTIFY_CENTER);
  gtk_widget_set_visible (GTK_WIDGET (label), FALSE);
  return label;
}

static void
awra_drop_zone_init (AwraDropZone *self)
{
  GtkWidget *surface;
  GtkWidget *hint_box;
  GtkWidget *hint_frame;

  self->overlay = GTK_OVERLAY (gtk_overlay_new ());

  /* The empty-state well is kept alive while application content replaces
   * it inside the overlay. */
  self->empty = GTK_BOX (g_object_ref_sink (gtk_box_new (GTK_ORIENTATION_VERTICAL, 0)));
  awra_box_set_spacing (self->empty, AWRA_SPACING_SM);
  gtk_widget_add_css_class (GTK_WIDGET (self->empty), "awra-drop-zone-well");
  gtk_widget_set_valign (GTK_WIDGET (self->empty), GTK_ALIGN_FILL);
  gtk_widget_set_vexpand (GTK_WIDGET (self->empty), TRUE);
  self->empty_icon = GTK_IMAGE (gtk_image_new_from_icon_name (DEFAULT_ICON));
  gtk_widget_add_css_class (GTK_WIDGET (self->empty_icon),
                            "awra-drop-zone-icon");
  gtk_widget_set_valign (GTK_WIDGET (self->empty_icon), GTK_ALIGN_END);
  gtk_widget_set_vexpand (GTK_WIDGET (self->empty_icon), TRUE);
  self->title = make_label ("awra-drop-zone-title");
  self->subtitle = make_label ("awra-drop-zone-subtitle");
  self->browse = GTK_BUTTON (awra_button_new_with_label (_("Browse…")));
  awra_button_set_appearance (AWRA_BUTTON (self->browse),
                              AWRA_BUTTON_APPEARANCE_SECONDARY);
  gtk_widget_set_halign (GTK_WIDGET (self->browse), GTK_ALIGN_CENTER);
  gtk_widget_set_valign (GTK_WIDGET (self->browse), GTK_ALIGN_START);
  gtk_widget_set_visible (GTK_WIDGET (self->browse), FALSE);
  gtk_widget_set_margin_top (GTK_WIDGET (self->browse),
                             awra_spacing_resolve (GTK_WIDGET (self->browse),
                                                   AWRA_SPACING_XS));
  gtk_box_append (self->empty, GTK_WIDGET (self->empty_icon));
  gtk_box_append (self->empty, GTK_WIDGET (self->title));
  gtk_box_append (self->empty, GTK_WIDGET (self->subtitle));
  gtk_box_append (self->empty, GTK_WIDGET (self->browse));
  {
    GtkWidget *spacer = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);

    gtk_widget_set_vexpand (spacer, TRUE);
    gtk_box_append (self->empty, spacer);
  }
  gtk_overlay_set_child (self->overlay, GTK_WIDGET (self->empty));

  /* Floating hover hint above content; paint-only crossfade. */
  self->revealer = GTK_REVEALER (gtk_revealer_new ());
  gtk_revealer_set_transition_type (self->revealer,
                                    GTK_REVEALER_TRANSITION_TYPE_NONE);
  gtk_widget_set_can_target (GTK_WIDGET (self->revealer), FALSE);
  hint_frame = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
  gtk_widget_add_css_class (hint_frame, "awra-drop-zone-frame");
  surface = awra_surface_new_with_role (AWRA_SURFACE_ROLE_FLOATING);
  awra_surface_set_elevation_level (AWRA_SURFACE (surface),
                                    AWRA_ELEVATION_FLOATING);
  gtk_widget_set_halign (surface, GTK_ALIGN_CENTER);
  gtk_widget_set_valign (surface, GTK_ALIGN_CENTER);
  gtk_widget_set_vexpand (surface, TRUE);
  hint_box = gtk_box_new (GTK_ORIENTATION_HORIZONTAL, 0);
  awra_box_apply_layout_preset (GTK_BOX (hint_box),
                                AWRA_LAYOUT_PRESET_CONTROL_GROUP);
  self->hint_icon = GTK_IMAGE (gtk_image_new_from_icon_name (DEFAULT_ICON));
  gtk_widget_add_css_class (GTK_WIDGET (self->hint_icon), "awra-drop-hint-icon");
  self->hint_label = GTK_LABEL (gtk_label_new (NULL));
  gtk_widget_add_css_class (GTK_WIDGET (self->hint_label),
                            "awra-drop-hint-label");
  gtk_box_append (GTK_BOX (hint_box), GTK_WIDGET (self->hint_icon));
  gtk_box_append (GTK_BOX (hint_box), GTK_WIDGET (self->hint_label));
  awra_surface_set_child (AWRA_SURFACE (surface), hint_box);
  gtk_box_append (GTK_BOX (hint_frame), surface);
  gtk_revealer_set_child (self->revealer, hint_frame);
  gtk_overlay_add_overlay (self->overlay, GTK_WIDGET (self->revealer));
  gtk_widget_set_parent (GTK_WIDGET (self->overlay), GTK_WIDGET (self));

  self->target = gtk_drop_target_new (GDK_TYPE_FILE_LIST, GDK_ACTION_COPY);
  gtk_drop_target_set_preload (self->target, TRUE);
  g_signal_connect (self->target, "enter", G_CALLBACK (target_enter_cb), self);
  g_signal_connect (self->target, "leave", G_CALLBACK (target_leave_cb), self);
  g_signal_connect (self->target, "drop", G_CALLBACK (target_drop_cb), self);
  g_signal_connect (self->target, "notify::value",
                    G_CALLBACK (target_value_cb), self);
  gtk_widget_add_controller (GTK_WIDGET (self),
                             GTK_EVENT_CONTROLLER (self->target));
  g_signal_connect (self->browse, "clicked", G_CALLBACK (browse_clicked_cb),
                    self);
  update_presentation (self);
}

GtkWidget *
awra_drop_zone_new (void)
{
  return g_object_new (AWRA_TYPE_DROP_ZONE, NULL);
}

GtkWidget *
awra_drop_zone_get_child (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return self->child;
}

void
awra_drop_zone_set_child (AwraDropZone *self,
                          GtkWidget    *child)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  g_return_if_fail (child == NULL || GTK_IS_WIDGET (child));
  g_return_if_fail (child == NULL || gtk_widget_get_parent (child) == NULL);
  if (self->child == child)
    return;
  self->child = child;
  gtk_overlay_set_child (self->overlay,
                         child != NULL ? child : GTK_WIDGET (self->empty));
  if (child != NULL)
    gtk_widget_add_css_class (GTK_WIDGET (self), "awra-drop-zone-has-child");
  else
    gtk_widget_remove_css_class (GTK_WIDGET (self), "awra-drop-zone-has-child");
  update_presentation (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_CHILD]);
}

static void
set_optional_label (AwraDropZone *self,
                    GtkLabel     *label,
                    const char   *text,
                    guint         prop)
{
  if (text != NULL && *text == '\0')
    text = NULL;
  if (g_strcmp0 (gtk_widget_get_visible (GTK_WIDGET (label))
                   ? gtk_label_get_text (label) : NULL, text) == 0)
    return;
  gtk_label_set_text (label, text != NULL ? text : "");
  gtk_widget_set_visible (GTK_WIDGET (label), text != NULL);
  if (label == self->title)
    gtk_accessible_update_property (GTK_ACCESSIBLE (self),
                                    GTK_ACCESSIBLE_PROPERTY_LABEL,
                                    text != NULL ? text : _("Drop zone"), -1);
  g_object_notify_by_pspec (G_OBJECT (self), properties[prop]);
}

const char *
awra_drop_zone_get_title (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return gtk_widget_get_visible (GTK_WIDGET (self->title))
           ? gtk_label_get_text (self->title) : NULL;
}

void
awra_drop_zone_set_title (AwraDropZone *self,
                          const char   *title)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  set_optional_label (self, self->title, title, PROP_TITLE);
}

const char *
awra_drop_zone_get_subtitle (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return gtk_widget_get_visible (GTK_WIDGET (self->subtitle))
           ? gtk_label_get_text (self->subtitle) : NULL;
}

void
awra_drop_zone_set_subtitle (AwraDropZone *self,
                             const char   *subtitle)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  set_optional_label (self, self->subtitle, subtitle, PROP_SUBTITLE);
}

const char *
awra_drop_zone_get_icon_name (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return self->icon_name;
}

void
awra_drop_zone_set_icon_name (AwraDropZone *self,
                              const char   *icon_name)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  if (!g_set_str (&self->icon_name, icon_name))
    return;
  update_presentation (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_ICON_NAME]);
}

const char *
awra_drop_zone_get_drop_message (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return self->drop_message != NULL ? self->drop_message
                                    : _("Drop files to add them");
}

void
awra_drop_zone_set_drop_message (AwraDropZone *self,
                                 const char   *message)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  if (!g_set_str (&self->drop_message, message))
    return;
  update_presentation (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_DROP_MESSAGE]);
}

gboolean
awra_drop_zone_get_show_browse_button (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), FALSE);
  return gtk_widget_get_visible (GTK_WIDGET (self->browse));
}

void
awra_drop_zone_set_show_browse_button (AwraDropZone *self,
                                       gboolean      show)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  show = !!show;
  if (gtk_widget_get_visible (GTK_WIDGET (self->browse)) == show)
    return;
  gtk_widget_set_visible (GTK_WIDGET (self->browse), show);
  g_object_notify_by_pspec (G_OBJECT (self),
                            properties[PROP_SHOW_BROWSE_BUTTON]);
}

const char *
awra_drop_zone_get_browse_label (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return self->browse_label != NULL ? self->browse_label : _("Browse…");
}

void
awra_drop_zone_set_browse_label (AwraDropZone *self,
                                 const char   *label)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  if (!g_set_str (&self->browse_label, label))
    return;
  update_presentation (self);
  g_object_notify_by_pspec (G_OBJECT (self), properties[PROP_BROWSE_LABEL]);
}

const char * const *
awra_drop_zone_get_accepted_extensions (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return (const char * const *) self->extensions;
}

void
awra_drop_zone_set_accepted_extensions (AwraDropZone       *self,
                                        const char * const *extensions)
{
  g_autoptr (GStrvBuilder) builder = NULL;

  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  g_clear_pointer (&self->extensions, g_strfreev);
  if (extensions == NULL || extensions[0] == NULL)
    return;
  builder = g_strv_builder_new ();
  for (guint i = 0; extensions[i] != NULL; i++) {
    g_autofree char *normalized = normalize_extension (extensions[i]);

    if (*normalized != '\0')
      g_strv_builder_add (builder, normalized);
  }
  self->extensions = g_strv_builder_end (builder);
}

const char * const *
awra_drop_zone_get_accepted_mime_types (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), NULL);
  return (const char * const *) self->mime_types;
}

void
awra_drop_zone_set_accepted_mime_types (AwraDropZone       *self,
                                        const char * const *mime_types)
{
  g_return_if_fail (AWRA_IS_DROP_ZONE (self));
  g_clear_pointer (&self->mime_types, g_strfreev);
  if (mime_types != NULL && mime_types[0] != NULL)
    self->mime_types = g_strdupv ((char **) mime_types);
}

/**
 * awra_drop_zone_get_drop_active:
 * @self: an Awra drop zone
 *
 * Returns: whether acceptable files are currently dragged over the zone
 */
gboolean
awra_drop_zone_get_drop_active (AwraDropZone *self)
{
  g_return_val_if_fail (AWRA_IS_DROP_ZONE (self), FALSE);
  return self->hovering && !self->rejecting;
}
