/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <awra/awra-version.h>
#include <awra/awra-enums.h>
#include <awra/awra-token-set.h>
#include <awra/awra-style-manager.h>
#include <awra/awra-material.h>
#include <awra/awra-diagnostics.h>
#include <awra/awra-context.h>
#include <awra/awra-surface.h>
#include <awra/awra-button.h>
#include <awra/awra-window.h>
#include <awra/awra-popover.h>
#include <awra/awra-menu-button.h>
#include <awra/awra-card.h>
#include <awra/awra-header.h>
#include <awra/awra-sidebar.h>
#include <awra/awra-split-view.h>
#include <awra/awra-toggle-button.h>
#include <awra/awra-entry.h>
#include <awra/awra-search-entry.h>
#include <awra/awra-switch.h>
#include <awra/awra-slider.h>
#include <awra/awra-check-button.h>
#include <awra/awra-spin-button.h>
#include <awra/awra-dropdown.h>
#include <awra/awra-dialog.h>
#include <awra/awra-toast-overlay.h>
#include <awra/awra-navigation-view.h>
#include <awra/awra-motion.h>
#include <awra/awra-badge.h>
#include <awra/awra-progress-bar.h>
#include <awra/awra-segmented-control.h>
#include <awra/awra-tab-view.h>
#include <awra/awra-list-view.h>
#include <awra/awra-inspector.h>

G_BEGIN_DECLS

void awra_init (void);
void awra_widget_set_tooltip_text (GtkWidget  *widget,
                                   const char *text);

G_END_DECLS
