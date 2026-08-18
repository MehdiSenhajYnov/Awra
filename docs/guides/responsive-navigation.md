<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Responsive layout and navigation

`AwraResponsiveBin` observes its allocated width and exposes a read-only
`layout-mode` property with Compact, Medium and Expanded values. Bind this
property to application-specific presentation decisions; do not read window
pixel sizes throughout the widget tree.

`AwraSplitView` supplies a persistent responsive sidebar, `AwraSidebar:inset`
selects docked or visually floating chrome, and `AwraEdgePanel` supplies a
Floating overlay that may remain pinned or reveal from a logical start/end
edge. These are separate primitives so Awra supports a full-height sidebar,
sidebar below a header, local content header or minimal chrome without
changing the Canvas material.

`AwraNavigationView` owns push/pop/replace history and restores the previous
page's keyboard focus on pop. `AwraBreadcrumbBar` consumes a `GListModel` of
`AwraBreadcrumbItem`; activation tells the application which stable item name
was selected. `AwraTabView` handles pinned and closable peer pages.

`AwraCommandPalette` consumes the same `GMenuModel`/actions used by menus. It
filters commands, closes on Escape or activation and returns focus to its
transient parent. It is a native Floating surface and therefore follows the
same blur capability and opaque fallback as dialogs and popovers.
