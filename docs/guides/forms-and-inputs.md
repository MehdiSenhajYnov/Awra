<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Forms, settings and advanced input

`AwraForm` and `AwraFormRow` are the default accessible label/control/help/
validation composition. A row switches to vertical layout when its allocation
cannot safely hold both columns; applications do not need to repeat breakpoint
logic.

Use `AwraTextArea` for multiline GTK text editing, `AwraPasswordEntry` for
secure input, `AwraTagEntry` for editable chips and `AwraChoiceGroup` for
checkbox or exclusive radio-like choices. They retain GTK IME, clipboard,
selection, reveal and keyboard behavior while Awra owns visible states.

`AwraActionRow` is the looser settings/list pattern. It accepts an icon and a
suffix control without imposing a libadwaita-style page hierarchy.
`AwraStatusBanner` provides non-modal information, success, warning and error
feedback. Empty, Loading and Error views cover whole-region state.

Awra intentionally does not yet wrap date, time, color or file pickers. The
roadmap requires two demonstrated generic scenarios before adding a wrapper;
ordinary GTK dialogs remain supported meanwhile.
