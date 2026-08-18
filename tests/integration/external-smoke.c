/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra.h>

int
main (void)
{
  g_autoptr (AwraMaterial) material = awra_material_new_frosted ();
  g_autoptr (AwraMaterial) canvas = awra_material_new_for_preset (
    AWRA_MATERIAL_PRESET_CANVAS);
  void (*dropdown_popup) (AwraDropdown *) = awra_dropdown_popup;
  AwraPopover *(*dropdown_get_popover) (AwraDropdown *) =
    awra_dropdown_get_popover;
  void (*menu_popup) (AwraMenuButton *) = awra_menu_button_popup;
  void (*sidebar_set_inset) (AwraSidebar *, guint) = awra_sidebar_set_inset;
  guint (*sidebar_get_inset) (AwraSidebar *) = awra_sidebar_get_inset;
  void (*sidebar_set_inset_spacing) (AwraSidebar *, AwraSpacing) =
    awra_sidebar_set_inset_spacing;
  void (*box_apply_layout) (GtkBox *, AwraLayoutPreset) =
    awra_box_apply_layout_preset;
  void (*badge_set_appearance) (AwraBadge *, AwraBadgeAppearance) =
    awra_badge_set_appearance;
  void (*badge_set_custom_color) (AwraBadge *, const GdkRGBA *) =
    awra_badge_set_custom_color;
  gboolean (*add_style_role) (GtkWidget *, const char *) =
    awra_widget_add_style_role;
  GtkWidget *(*tab_append) (AwraTabView *, GtkWidget *, const char *,
                            gboolean) = awra_tab_view_append;
  void (*tab_close) (AwraTabView *, GtkWidget *) = awra_tab_view_close_page;
  void (*tab_content_visible) (AwraTabView *, gboolean) =
    awra_tab_view_set_content_visible;
  GtkWidget *(*page_new) (void) = awra_page_new;
  void (*page_set_child) (AwraPage *, GtkWidget *) = awra_page_set_child;
  void (*page_header_set_title) (AwraPageHeader *, const char *) =
    awra_page_header_set_title;
  void (*section_set_child) (AwraSection *, GtkWidget *) =
    awra_section_set_child;
  void (*toolbar_set_end) (AwraToolbar *, GtkWidget *) =
    awra_toolbar_set_end_widget;
  void (*form_append) (AwraForm *, AwraFormRow *) = awra_form_append;
  void (*form_row_set_control) (AwraFormRow *, GtkWidget *) =
    awra_form_row_set_control;
  void (*empty_set_action) (AwraEmptyState *, GtkWidget *) =
    awra_empty_state_set_action;
  void (*filter_append) (AwraFilterBar *, GtkWidget *) =
    awra_filter_bar_append_filter;
  void (*master_detail_show_detail) (AwraMasterDetail *) =
    awra_master_detail_show_detail;
  void (*detail_append_section) (AwraDetailPane *, AwraSection *) =
    awra_detail_pane_append_section;
  void (*data_append_column) (AwraDataView *, AwraDataColumn *) =
    awra_data_view_append_column;
  void (*selection_clear) (AwraSelectionToolbar *) =
    awra_selection_toolbar_clear_selection;
  gboolean (*tag_add) (AwraTagEntry *, const char *) = awra_tag_entry_add;
  AwraCheckButton *(*choice_append) (AwraChoiceGroup *, const char *) =
    awra_choice_group_append;
  AwraLayoutMode (*responsive_mode) (AwraResponsiveBin *) =
    awra_responsive_bin_get_layout_mode;
  void (*breadcrumbs_set_model) (AwraBreadcrumbBar *, GListModel *) =
    awra_breadcrumb_bar_set_model;
  void (*palette_set_model) (AwraCommandPalette *, GMenuModel *) =
    awra_command_palette_set_menu_model;
  void (*palette_set_title) (AwraCommandPalette *, const char *) =
    awra_command_palette_set_title;
  void (*selection_set_plural_title) (AwraSelectionToolbar *, const char *) =
    awra_selection_toolbar_set_plural_title;
  AwraMetricRow *(*metadata_append) (AwraMetadataGroup *, const char *,
                                     const char *) = awra_metadata_group_append;

  return awra_material_get_kind (material) == AWRA_MATERIAL_KIND_FROSTED &&
         awra_material_get_preset (canvas) == AWRA_MATERIAL_PRESET_CANVAS &&
         AWRA_TYPE_NAVIGATION_ITEM != G_TYPE_INVALID &&
         AWRA_TYPE_MATERIAL_RESOLUTION != G_TYPE_INVALID &&
         AWRA_TYPE_HEADER != G_TYPE_INVALID &&
         AWRA_TYPE_EDGE_PANEL != G_TYPE_INVALID &&
         AWRA_TYPE_ACTION_ROW != G_TYPE_INVALID &&
         AWRA_TYPE_PANEL_EDGE != G_TYPE_INVALID &&
         AWRA_TYPE_ACCENT_SOURCE != G_TYPE_INVALID &&
         AWRA_TYPE_SURFACE_CORNER != G_TYPE_INVALID &&
         AWRA_TYPE_BADGE_APPEARANCE != G_TYPE_INVALID &&
         AWRA_TYPE_PAGE != G_TYPE_INVALID &&
         AWRA_TYPE_PAGE_HEADER != G_TYPE_INVALID &&
         AWRA_TYPE_SECTION != G_TYPE_INVALID &&
         AWRA_TYPE_TOOLBAR != G_TYPE_INVALID &&
         AWRA_TYPE_FORM != G_TYPE_INVALID &&
         AWRA_TYPE_FORM_ROW != G_TYPE_INVALID &&
         AWRA_TYPE_EMPTY_STATE != G_TYPE_INVALID &&
         AWRA_TYPE_LOADING_STATE != G_TYPE_INVALID &&
         AWRA_TYPE_ERROR_STATE != G_TYPE_INVALID &&
         AWRA_TYPE_VALIDATION_STATE != G_TYPE_INVALID &&
         AWRA_TYPE_FILTER_BAR != G_TYPE_INVALID &&
         AWRA_TYPE_MASTER_DETAIL != G_TYPE_INVALID &&
         AWRA_TYPE_MASTER_DETAIL_PANE != G_TYPE_INVALID &&
         AWRA_TYPE_DETAIL_PANE != G_TYPE_INVALID &&
         AWRA_TYPE_DATA_COLUMN != G_TYPE_INVALID &&
         AWRA_TYPE_DATA_VIEW != G_TYPE_INVALID &&
         AWRA_TYPE_DATA_VIEW_STATE != G_TYPE_INVALID &&
         AWRA_TYPE_SELECTION_TOOLBAR != G_TYPE_INVALID &&
         AWRA_TYPE_TEXT_AREA != G_TYPE_INVALID &&
         AWRA_TYPE_PASSWORD_ENTRY != G_TYPE_INVALID &&
         AWRA_TYPE_TAG_ENTRY != G_TYPE_INVALID &&
         AWRA_TYPE_CHOICE_GROUP != G_TYPE_INVALID &&
         AWRA_TYPE_STATUS_BANNER != G_TYPE_INVALID &&
         AWRA_TYPE_STATUS_APPEARANCE != G_TYPE_INVALID &&
         AWRA_TYPE_RESPONSIVE_BIN != G_TYPE_INVALID &&
         AWRA_TYPE_BREADCRUMB_ITEM != G_TYPE_INVALID &&
         AWRA_TYPE_BREADCRUMB_BAR != G_TYPE_INVALID &&
         AWRA_TYPE_COMMAND_PALETTE != G_TYPE_INVALID &&
         AWRA_TYPE_METRIC_ROW != G_TYPE_INVALID &&
         AWRA_TYPE_STAT_BAR != G_TYPE_INVALID &&
         AWRA_TYPE_BADGE_GROUP != G_TYPE_INVALID &&
         AWRA_TYPE_METADATA_GROUP != G_TYPE_INVALID &&
         AWRA_TYPE_SKELETON != G_TYPE_INVALID &&
         dropdown_popup != NULL &&
         dropdown_get_popover != NULL &&
         menu_popup != NULL &&
         sidebar_set_inset != NULL &&
         sidebar_set_inset_spacing != NULL &&
         box_apply_layout != NULL &&
         badge_set_appearance != NULL &&
         badge_set_custom_color != NULL &&
         add_style_role != NULL &&
         tab_append != NULL &&
         tab_close != NULL &&
         tab_content_visible != NULL &&
         page_new != NULL &&
         page_set_child != NULL &&
         page_header_set_title != NULL &&
         section_set_child != NULL &&
         toolbar_set_end != NULL &&
         form_append != NULL &&
         form_row_set_control != NULL &&
         empty_set_action != NULL &&
         filter_append != NULL &&
         master_detail_show_detail != NULL &&
         detail_append_section != NULL &&
         data_append_column != NULL &&
         selection_clear != NULL &&
         tag_add != NULL &&
         choice_append != NULL &&
         responsive_mode != NULL &&
         breadcrumbs_set_model != NULL &&
         palette_set_model != NULL &&
         palette_set_title != NULL &&
         selection_set_plural_title != NULL &&
         metadata_append != NULL &&
         sidebar_get_inset != NULL
           ? 0
           : 1;
}
