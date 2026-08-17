<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Getting started

After installing Awra, compile an application with:

```sh
cc app.c $(pkg-config --cflags --libs awra-1)
```

A minimal application creates an ordinary `GtkApplication` and an Awra window:

```c
#include <awra/awra.h>

static void
activate (GtkApplication *app)
{
  GtkWidget *window = awra_window_new (app);
  GtkWidget *button = awra_button_new_with_label ("Hello");

  gtk_window_set_title (GTK_WINDOW (window), "Awra app");
  awra_window_set_content (AWRA_WINDOW (window), button);
  gtk_window_present (GTK_WINDOW (window));
}
```

Applications do not need a CSS file or compositor calls. Set
`AWRA_FORCE_FALLBACK=1` when testing the opaque fallback path.
# Language bindings and Blueprint

Python loads `gi.repository.Awra` version `1.0`, and Vala consumers use
`--pkg awra-1`. The optional `awra-example.blp` imports `Awra 1.0`; Meson
validates it automatically when `blueprint-compiler` is available.
