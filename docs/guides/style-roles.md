<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Public style-role catalogue

Style roles let an application keep a GTK behavioral widget while Awra owns
its visual recipe. They are the right tool for data cells, charts and other
domain content; they are not a substitute for an Awra widget that owns
layout, focus, lifecycle or accessibility behavior.

Call `awra_widget_add_style_role(widget, role)`. Awra translates the public
identifier to a private `awra-role-*` CSS class, so an application must never
add the private class itself. Unknown well-formed identifiers are accepted for
forward compatibility but have no visual effect until Awra defines a recipe.

## Stable roles

| Public role | Expected GTK widget | Purpose | Prefer a typed widget when… |
| --- | --- | --- | --- |
| `data-window` | `GtkWindow` | Data-application root metrics | always use `AwraWindow` for the real window |
| `data-root` | root container | Dense application content plane | `AwraPage` fits the page |
| `app-search` | `GtkSearchEntry` | Header search field | use `AwraSearchEntry` outside legacy ports |
| `sidebar-pane` | sidebar container | Structural chrome plane | `AwraSidebar` owns the panel |
| `navigation-sidebar` | list/container | Sidebar navigation rhythm | use `AwraNavigationItem` for destinations |
| `sidebar-section` | `GtkLabel` | Sidebar eyebrow heading | use public typography for new code |
| `nav-row`, `selected-nav` | row/button | Legacy navigation state | use `AwraNavigationItem:selected` |
| `filter-dropdown` | dropdown | Dense filter sizing | use `AwraDropdown` in `AwraFilterBar` |
| `filter-toggle` | toggle button | Dense filter toggle | use `AwraToggleButton` in `AwraFilterBar` |
| `table-scroller` | `GtkScrolledWindow` | Table viewport treatment | use the data-view family when available |
| `table-header`, `table-header-cell` | box/label | Legacy manual table header | use typed Awra columns when available |
| `data-list`, `data-row`, `selected-data-row` | list/row | Dense virtualized data | keep GTK models; prefer Awra data views |
| `section-card` | container | Legacy grouped data region | use `AwraSection` or `AwraSurface` |
| `settings-row` | row/container | Legacy preference row | use `AwraFormRow` or settings rows |
| `contextual-banner` | container | Inline contextual notice | use `AwraStatusBanner` when available |
| `entity-chip`, `metric-pill` | small label/container | Compact metadata | use `AwraBadge`/metadata widgets |
| `category-text` | label | Domain category color | use `AwraBadge:custom-color` when possible |
| `data-meter` | drawing/range widget | Domain metric visualization | use `AwraStatBar` when available |
| `chart-*`, `matchup-*`, `relationship-*` | custom drawing/content | Domain visualization grammar | keep the application visualization |

Roles not listed above that occur in the reference applications are
experimental migration vocabulary. They may be replaced by typed components
before 1.0 and must not be used as a general-purpose CSS API.

## Rules

- Keep GTK models, factories, IME and selection behavior intact.
- Use a role only on the documented widget family.
- Combine at most the state role documented for a base role; do not build an
  application stylesheet out of role strings.
- Use `AwraMaterial`/`AwraSurface` for matter and depth, typed Awra widgets for
  reusable behavior, and public spacing/typography helpers for composition.
- Never inspect or modify private GTK children to make a role work.
