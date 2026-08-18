<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Compose a conventional page

`AwraPage` is the default root for a scrollable application screen. It centers
its content, limits the reading width to 960 logical pixels and applies the
public XXL inset token. Applications can change both values without accessing
an internal GTK child.

```c
GtkWidget *page = awra_page_new ();
GtkWidget *content = gtk_box_new (GTK_ORIENTATION_VERTICAL, 0);
GtkWidget *header = awra_page_header_new ();
GtkWidget *section = awra_section_new ();
GtkWidget *toolbar = awra_toolbar_new ();

awra_box_set_spacing (GTK_BOX (content), AWRA_SPACING_XL);
awra_page_header_set_title (AWRA_PAGE_HEADER (header), "Library");
awra_page_header_set_subtitle (AWRA_PAGE_HEADER (header),
                               "12 documents");
awra_toolbar_set_end_widget (AWRA_TOOLBAR (toolbar),
                             awra_button_new_with_label ("Create"));
awra_section_set_title (AWRA_SECTION (section), "Recent work");
awra_section_set_child (AWRA_SECTION (section), make_document_list ());
gtk_box_append (GTK_BOX (content), header);
gtk_box_append (GTK_BOX (content), toolbar);
gtk_box_append (GTK_BOX (content), section);
awra_page_set_child (AWRA_PAGE (page), content);
```

Use `AwraPageHeader:actions` for actions tied to the whole page and
`AwraSection:actions` for actions tied to one region. Neither component paints
a box by default: whitespace and typography carry the hierarchy. Use an
`AwraCard` inside a section only when the content genuinely needs a distinct
material or elevation.

`AwraToolbar` accepts independent `start-widget`, `center-widget` and
`end-widget` groups. The children may be ordinary GTK containers; use Awra
controls and public typography/layout helpers inside them to retain visual
isolation. Set `compact` for dense secondary toolbars.

For a deliberately unusual canvas, use `AwraLayoutPreset` and `AwraSpacing`
directly. Those low-level primitives remain supported and are not replaced by
the typed page family.

## Filters and master/detail

`AwraFilterBar` arranges a nullable search control, any number of filter
controls, a result summary and reset action. Below its responsive breakpoint it
wraps controls without requiring application-owned pixel values.

`AwraMasterDetail` presents both children in medium/expanded layouts and one
logical pane in compact layouts. Set `visible-pane`, or call `show_master()` /
`show_detail()`, after an activation. `AwraDetailPane` supplies a reusable
entity header (media, title, subtitle, metadata and actions) followed by typed
`AwraSection` children. The combination deliberately does not dictate whether
the application also has a window sidebar or local header.

## Forms and page states

`AwraFormRow` keeps its label, control, help and validation message related in
the accessible tree. It changes from a label/control grid to a vertical row at
its breakpoint. `AwraForm` owns the row rhythm. Empty, loading and recoverable
error views provide consistent feedback without manual placeholder boxes.

See [style-roles.md](style-roles.md) before applying a visual role to an
ordinary GTK widget, and
[migrating-from-gtk-libadwaita.md](migrating-from-gtk-libadwaita.md) for an
outside-in porting sequence.
