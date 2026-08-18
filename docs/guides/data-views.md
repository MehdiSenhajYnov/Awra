<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Virtualized data views

`AwraDataView` is a visual and state-management layer around
`GtkColumnView`. It deliberately keeps `GListModel`, `GtkSelectionModel`,
`GtkListItemFactory` and `GtkSorter` as public GTK contracts: Awra does not
copy application data or replace virtualization.

```c
GtkSelectionModel *selection = make_selection_model ();
GtkListItemFactory *name_factory = make_name_factory ();
AwraDataColumn *name = awra_data_column_new ("Name", name_factory);
GtkWidget *view = awra_data_view_new (selection);

awra_data_column_set_expand (name, TRUE);
awra_data_column_set_resizable (name, TRUE);
awra_data_view_append_column (AWRA_DATA_VIEW (view), name);
```

A column owns semantic title, factory, sorter, alignment, width, expansion and
resizability. Call `awra_data_column_apply_alignment()` from factory setup for
cells that should follow the declared alignment. The underlying GTK column and
view are exposed read-only for standard signals and advanced GTK operations;
applications must not inspect private children.

The view has Content, Empty, Loading and Error states with replaceable state
widgets. `loading-more` adds non-blocking infinite-loading feedback while
retaining the current rows. Horizontal and vertical scrolling remain GTK
owned.

`AwraSelectionToolbar` observes the same selection model, counts selected
items, optionally hides at zero and clears through `GtkSelectionModel`. Its
actions are ordinary Awra/GTK action widgets. This avoids duplicating selection
bookkeeping in an application.

## Dense data composition

Use `AwraMetricRow` for a name/value fact, `AwraStatBar` for a bounded metric,
`AwraBadgeGroup` for a wrapping set of semantic labels and
`AwraMetadataGroup` for a titled collection of facts. These components own
their spacing, typography and accessible grouping; they do not prescribe an
application data model.

```c
GtkWidget *metadata = awra_metadata_group_new ();
GtkWidget *hp = awra_stat_bar_new ("HP");
GtkWidget *types = awra_badge_group_new ();

awra_metadata_group_append (AWRA_METADATA_GROUP (metadata),
                            "Height", "0.7 m");
awra_stat_bar_set_maximum (AWRA_STAT_BAR (hp), 255.0);
awra_stat_bar_set_value (AWRA_STAT_BAR (hp), 45.0);
awra_badge_group_append (AWRA_BADGE_GROUP (types),
                         AWRA_BADGE (awra_badge_new ("GRASS")));
```

They replace repeated label/grid/progress compositions observed in both the
Showcase data workspace and Pokedia-style detail pages. Domain-specific colors
remain badge configuration, never new framework widget types.
