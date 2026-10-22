/* SPDX-License-Identifier: LGPL-2.1-or-later */
#pragma once

#include <gtk/gtk.h>

G_BEGIN_DECLS

#define AWRA_TYPE_WAVEFORM_VIEW (awra_waveform_view_get_type ())
G_DECLARE_FINAL_TYPE (AwraWaveformView, awra_waveform_view, AWRA, WAVEFORM_VIEW, GtkWidget)

GtkWidget   *awra_waveform_view_new                  (void);
/**
 * awra_waveform_view_set_peaks:
 * @self: an Awra waveform view
 * @peaks: (array length=n_peaks) (nullable): normalized peak amplitudes in
 *   the 0..1 range, evenly spaced over the duration
 * @n_peaks: the number of peaks
 *
 * Replaces the waveform. When the new peaks extend the previous ones, for
 * example while a decoder streams its analysis, only the new bars animate
 * in; reduced motion shows them immediately.
 */
void         awra_waveform_view_set_peaks            (AwraWaveformView *self,
                                                      const float      *peaks,
                                                      gsize             n_peaks);
/**
 * awra_waveform_view_get_peaks:
 * @self: an Awra waveform view
 * @n_peaks: (out): the number of peaks
 *
 * Returns: (transfer none) (array length=n_peaks) (nullable): the peaks
 */
const float *awra_waveform_view_get_peaks            (AwraWaveformView *self,
                                                      gsize            *n_peaks);
double       awra_waveform_view_get_duration         (AwraWaveformView *self);
void         awra_waveform_view_set_duration         (AwraWaveformView *self,
                                                      double            duration);
double       awra_waveform_view_get_position         (AwraWaveformView *self);
void         awra_waveform_view_set_position         (AwraWaveformView *self,
                                                      double            position);
double       awra_waveform_view_get_marker_position  (AwraWaveformView *self);
void         awra_waveform_view_set_marker_position  (AwraWaveformView *self,
                                                      double            position);
double       awra_waveform_view_get_hint_position    (AwraWaveformView *self);
void         awra_waveform_view_set_hint_position    (AwraWaveformView *self,
                                                      double            position);
guint        awra_waveform_view_get_expected_peaks   (AwraWaveformView *self);
void         awra_waveform_view_set_expected_peaks   (AwraWaveformView *self,
                                                      guint             expected_peaks);
gboolean     awra_waveform_view_get_marker_editable  (AwraWaveformView *self);
void         awra_waveform_view_set_marker_editable  (AwraWaveformView *self,
                                                      gboolean          editable);

G_END_DECLS
