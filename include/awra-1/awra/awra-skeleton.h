/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
G_BEGIN_DECLS
#define AWRA_TYPE_SKELETON (awra_skeleton_get_type ())
G_DECLARE_FINAL_TYPE (AwraSkeleton, awra_skeleton, AWRA, SKELETON, GtkWidget)
GtkWidget *awra_skeleton_new          (void);
guint      awra_skeleton_get_lines    (AwraSkeleton *self);
void       awra_skeleton_set_lines    (AwraSkeleton *self, guint lines);
gboolean   awra_skeleton_get_animated (AwraSkeleton *self);
void       awra_skeleton_set_animated (AwraSkeleton *self, gboolean animated);
G_END_DECLS
