/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once
#include <gtk/gtk.h>
#include <awra/awra-popover.h>

G_BEGIN_DECLS

#define AWRA_TYPE_TIMELINE (awra_timeline_get_type ())
G_DECLARE_FINAL_TYPE (AwraTimeline, awra_timeline, AWRA, TIMELINE, GtkWidget)

/**
 * awra_timeline_new:
 *
 * Returns: (transfer floating): a backend-independent time ruler
 */
GtkWidget *awra_timeline_new (void);
double awra_timeline_get_duration (AwraTimeline *self);
void awra_timeline_set_duration (AwraTimeline *self, double duration);
double awra_timeline_get_position (AwraTimeline *self);
void awra_timeline_set_position (AwraTimeline *self, double position);
double awra_timeline_get_view_start (AwraTimeline *self);
void awra_timeline_set_view_start (AwraTimeline *self, double start);
double awra_timeline_get_view_duration (AwraTimeline *self);
void awra_timeline_set_view_duration (AwraTimeline *self, double duration);
double awra_timeline_get_offset (AwraTimeline *self);
void awra_timeline_set_offset (AwraTimeline *self, double offset);
gboolean awra_timeline_get_editable (AwraTimeline *self);
void awra_timeline_set_editable (AwraTimeline *self, gboolean editable);
double awra_timeline_get_hover_time (AwraTimeline *self);
double awra_timeline_get_hover_x (AwraTimeline *self);
/**
 * awra_timeline_set_preview:
 * @self: a timeline
 * @preview: (nullable): backend-provided preview content; Awra owns anchoring
 *
 * The preview follows pointer and drag coordinates, including RTL and inset,
 * and disappears on leave/unmap. Updating its content never requests a seek.
 */
void awra_timeline_set_preview (AwraTimeline *self, GtkWidget *preview);
/**
 * awra_timeline_get_preview:
 * @self: a timeline
 * Returns: (transfer none) (nullable): the supplied preview content
 */
GtkWidget *awra_timeline_get_preview (AwraTimeline *self);
/**
 * awra_timeline_get_preview_popover:
 * @self: a timeline
 * Returns: (transfer none): the framework-owned preview popover
 */
AwraPopover *awra_timeline_get_preview_popover (AwraTimeline *self);
/**
 * awra_timeline_add_interval:
 * @self: a timeline
 * @start: interval start in seconds, before offset
 * @end: interval end in seconds; equal to start for a point marker
 * @label: (nullable): plain text for the interval
 *
 * Adds a clip, cue, chapter or bookmark. Intervals are copied, may overlap,
 * and are clipped to the viewport. No decoder or file format is implied.
 */
void awra_timeline_add_interval (AwraTimeline *self, double start, double end,
                                 const char *label);
void awra_timeline_clear_intervals (AwraTimeline *self);
guint awra_timeline_get_n_intervals (AwraTimeline *self);

G_END_DECLS
