/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gdk/gdk.h>
#include <awra/awra-token-set.h>

void awra_install_css_for_display (GdkDisplay *display);
void awra_update_css_for_display  (GdkDisplay  *display,
                                   AwraTokenSet *tokens);
