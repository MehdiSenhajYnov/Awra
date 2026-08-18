#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

import os
import gi

gi.require_version("Awra", "1.0")
gi.require_version("Gtk", "4.0")
from gi.repository import Awra, Gio, GLib, Gtk  # noqa: E402


def activate(app):
    window = Awra.Window.new(app)
    page = Awra.Page.new()
    content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
    Awra.box_apply_layout_preset(content, Awra.LayoutPreset.PAGE)
    header = Awra.PageHeader.new()
    header.set_title("Preferences")
    header.set_subtitle("Python/GI using the same typed form contract")
    form = Awra.Form.new()
    row = Awra.FormRow.new()
    row.set_label("Live preview")
    row.set_control(Awra.Switch.new())
    form.append(row)
    content.append(header)
    content.append(form)
    page.set_child(content)
    window.set_content(page)
    window.present()
    if os.getenv("AWRA_EXAMPLE_SMOKE"):
        GLib.idle_add(app.quit)


app = Gtk.Application(
    application_id="org.awra.Example.PythonSettings",
    flags=Gio.ApplicationFlags.NON_UNIQUE,
)
app.connect("activate", activate)
raise SystemExit(app.run(None))
