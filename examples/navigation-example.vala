// SPDX-License-Identifier: LGPL-2.1-or-later

void activate (Gtk.Application app) {
  var window = new Awra.Window (app);
  var page = new Awra.Page ();
  var content = new Gtk.Box (Gtk.Orientation.VERTICAL, 0);
  var header = new Awra.PageHeader ();
  var breadcrumbs = new Awra.BreadcrumbBar ();
  var navigation = new Awra.NavigationView ();

  header.set_title ("Library");
  header.set_subtitle ("Vala navigation with public Awra primitives");
  navigation.add (new Gtk.Label ("Overview"), "overview");
  navigation.add (new Gtk.Label ("Details"), "details");
  navigation.push ("overview");
  Awra.box_apply_layout_preset (content, Awra.LayoutPreset.PAGE);
  content.append (header);
  content.append (breadcrumbs);
  content.append (navigation);
  page.set_child (content);
  window.set_content (page);
  window.present ();
  if (Environment.get_variable ("AWRA_EXAMPLE_SMOKE") != null)
    Idle.add (() => { app.quit (); return Source.REMOVE; });
}

int main (string[] args) {
  var app = new Gtk.Application (
    "org.awra.Example.ValaNavigation", ApplicationFlags.NON_UNIQUE);
  app.activate.connect (() => activate (app));
  return app.run (args);
}
