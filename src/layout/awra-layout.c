/* SPDX-License-Identifier: LGPL-2.1-or-later */

#include <awra/awra-context.h>
#include <awra/awra-layout.h>

typedef struct {
  AwraSpacing inset;
  AwraSpacing gap;
} AwraLayoutRecipe;

static gboolean
spacing_is_valid (AwraSpacing spacing)
{
  return spacing == AWRA_SPACING_NONE ||
         (spacing >= AWRA_SPACING_XS && spacing <= AWRA_SPACING_XXL);
}

static AwraLayoutRecipe
get_recipe (AwraLayoutPreset preset)
{
  switch (preset) {
  case AWRA_LAYOUT_PRESET_COMPACT:
    return (AwraLayoutRecipe) { AWRA_SPACING_SM, AWRA_SPACING_XS };
  case AWRA_LAYOUT_PRESET_CONTROL_GROUP:
    return (AwraLayoutRecipe) { AWRA_SPACING_NONE, AWRA_SPACING_SM };
  case AWRA_LAYOUT_PRESET_SECTION:
    return (AwraLayoutRecipe) { AWRA_SPACING_NONE, AWRA_SPACING_XS };
  case AWRA_LAYOUT_PRESET_CONTENT:
    return (AwraLayoutRecipe) { AWRA_SPACING_LG, AWRA_SPACING_MD };
  case AWRA_LAYOUT_PRESET_PAGE:
    return (AwraLayoutRecipe) { AWRA_SPACING_XXL, AWRA_SPACING_XL };
  case AWRA_LAYOUT_PRESET_TOOLBAR:
    return (AwraLayoutRecipe) { AWRA_SPACING_MD, AWRA_SPACING_SM };
  case AWRA_LAYOUT_PRESET_OVERLAY:
    return (AwraLayoutRecipe) { AWRA_SPACING_LG, AWRA_SPACING_MD };
  default:
    g_return_val_if_reached (((AwraLayoutRecipe) {
      AWRA_SPACING_NONE, AWRA_SPACING_NONE
    }));
  }
}

int
awra_spacing_resolve (GtkWidget  *widget,
                      AwraSpacing spacing)
{
  AwraContext *context;
  AwraStyleManager *style;
  AwraTokenSet *tokens;

  g_return_val_if_fail (GTK_IS_WIDGET (widget), 0);
  g_return_val_if_fail (spacing_is_valid (spacing), 0);
  if (spacing == AWRA_SPACING_NONE)
    return 0;

  context = awra_context_get_for_display (gtk_widget_get_display (widget));
  style = awra_context_get_style_manager (context);
  tokens = awra_style_manager_get_token_set (style);
  return (int) (awra_token_set_get_spacing (tokens, spacing) + 0.5);
}

void
awra_widget_set_margin (GtkWidget  *widget,
                        AwraSpacing spacing)
{
  int pixels;

  g_return_if_fail (GTK_IS_WIDGET (widget));
  pixels = awra_spacing_resolve (widget, spacing);
  gtk_widget_set_margin_top (widget, pixels);
  gtk_widget_set_margin_bottom (widget, pixels);
  gtk_widget_set_margin_start (widget, pixels);
  gtk_widget_set_margin_end (widget, pixels);
}

void
awra_widget_set_horizontal_margin (GtkWidget  *widget,
                                   AwraSpacing spacing)
{
  int pixels;

  g_return_if_fail (GTK_IS_WIDGET (widget));
  pixels = awra_spacing_resolve (widget, spacing);
  gtk_widget_set_margin_start (widget, pixels);
  gtk_widget_set_margin_end (widget, pixels);
}

void
awra_widget_set_vertical_margin (GtkWidget  *widget,
                                 AwraSpacing spacing)
{
  int pixels;

  g_return_if_fail (GTK_IS_WIDGET (widget));
  pixels = awra_spacing_resolve (widget, spacing);
  gtk_widget_set_margin_top (widget, pixels);
  gtk_widget_set_margin_bottom (widget, pixels);
}

void
awra_box_set_spacing (GtkBox      *box,
                      AwraSpacing  spacing)
{
  g_return_if_fail (GTK_IS_BOX (box));
  gtk_box_set_spacing (box,
                       awra_spacing_resolve (GTK_WIDGET (box), spacing));
}

void
awra_grid_set_spacing (GtkGrid     *grid,
                       AwraSpacing  row_spacing,
                       AwraSpacing  column_spacing)
{
  g_return_if_fail (GTK_IS_GRID (grid));
  gtk_grid_set_row_spacing (
    grid, (guint) awra_spacing_resolve (GTK_WIDGET (grid), row_spacing));
  gtk_grid_set_column_spacing (
    grid, (guint) awra_spacing_resolve (GTK_WIDGET (grid), column_spacing));
}

void
awra_box_apply_layout_preset (GtkBox           *box,
                              AwraLayoutPreset  preset)
{
  AwraLayoutRecipe recipe;

  g_return_if_fail (GTK_IS_BOX (box));
  g_return_if_fail (preset >= AWRA_LAYOUT_PRESET_COMPACT &&
                    preset <= AWRA_LAYOUT_PRESET_OVERLAY);
  recipe = get_recipe (preset);
  awra_widget_set_margin (GTK_WIDGET (box), recipe.inset);
  awra_box_set_spacing (box, recipe.gap);
}

void
awra_grid_apply_layout_preset (GtkGrid          *grid,
                               AwraLayoutPreset  preset)
{
  AwraLayoutRecipe recipe;

  g_return_if_fail (GTK_IS_GRID (grid));
  g_return_if_fail (preset >= AWRA_LAYOUT_PRESET_COMPACT &&
                    preset <= AWRA_LAYOUT_PRESET_OVERLAY);
  recipe = get_recipe (preset);
  awra_widget_set_margin (GTK_WIDGET (grid), recipe.inset);
  awra_grid_set_spacing (grid, recipe.gap, recipe.gap);
}
