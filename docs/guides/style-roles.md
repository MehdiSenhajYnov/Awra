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

## Current roles

The reference applications use typed widgets for every reusable composition.
PokediaAwra keeps roles only for domain visualizations and GTK data rows whose
model, activation and selection remain application-owned. Its boundary gate
forbids reintroducing the compatibility roles listed below.

| Public role | Expected GTK widget | Purpose | Prefer a typed widget when… |
| --- | --- | --- | --- |
| `data-window` | `GtkWindow` | Data-application root metrics | always use `AwraWindow` for the real window |
| `data-root` | root container | Dense application content plane | `AwraPage` fits the page |
| `app-header` | `AwraHeader` | Compact data-application chrome; header children remain vertically centered | use on a custom start/center/end header composition |
| `app-search` | `GtkSearchEntry` | Header search field | use `AwraSearchEntry` outside legacy ports |
| `sidebar-pane` | sidebar container | Structural chrome plane | `AwraSidebar` owns the panel |
| `navigation-sidebar` | list/container | Sidebar navigation rhythm | use `AwraNavigationItem` for destinations |
| `sidebar-section` | `GtkLabel` | Sidebar eyebrow heading | use public typography for new code |
| `nav-row`, `selected-nav` | row/button | Legacy navigation state | use `AwraNavigationItem:selected` |
| `filter-dropdown` | dropdown | Dense filter sizing | use `AwraDropdown` in `AwraFilterBar` |
| `filter-toggle` | toggle button | Dense filter toggle | use `AwraToggleButton` in `AwraFilterBar` |
| `collection-view` | `GtkGridView` or `GtkListView` | Virtualized collections with a transparent plane, cell spacing and visible focus; GTK retains the model and selection | use when a card or row factory is application-owned |
| `data-list`, `data-row`, `selected-data-row` | list/row | Dense GTK data presentation | keep only when a GTK behavioral row is deliberate; prefer Awra list/data views |
| `category-text` | label | Domain category color | use `AwraBadge:custom-color` when possible |
| `chart-*`, `matchup-*`, `relationship-*` | custom drawing/content | Domain visualization grammar | keep the application visualization |

## Compatibility roles

The earlier Pokedia port used roles such as `page`, `section-card`,
`toolbar-card`, `settings-*`, `table-*`, `inline-toggle`, `contextual-banner`,
`metric-pill`, `entity-*` and `data-meter`. They remain recognized during the
0.x transition so existing consumers do not lose their styling abruptly, but
new code must use the typed replacements: `AwraPage`, `AwraSection`,
`AwraCard`, `AwraFilterBar`, `AwraFormRow`, `AwraListView`, typed button
appearances, `AwraStatusBanner`, `AwraBadge`, `AwraMetricRow` and
`AwraStatBar`.

Neither Showcase nor PokediaAwra uses these compatibility roles. Pokedia's
consumer-boundary test rejects their reintroduction, including calls formatted
over multiple source lines.

## Rules

- Keep GTK models, factories, IME and selection behavior intact.
- Use a role only on the documented widget family.
- Combine at most the state role documented for a base role; do not build an
  application stylesheet out of role strings.
- Use `AwraMaterial`/`AwraSurface` for matter and depth, typed Awra widgets for
  reusable behavior, and public spacing/typography helpers for composition.
- Never inspect or modify private GTK children to make a role work.
