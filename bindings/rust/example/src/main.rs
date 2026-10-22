// SPDX-License-Identifier: LGPL-2.1-or-later

use awra::prelude::*;

fn assert_action_map<T: IsA<awra::gio::ActionMap>>() {}

fn exercise_projected_gtk_types() {
    let text_area = awra::TextArea::new();
    let _ = (text_area.buffer(), text_area.delegate());
    let _ = awra::SearchEntry::new().delegate();
    let _ = awra::PasswordEntry::new().delegate();
    let _ = awra::Switch::new().delegate();
    let _ = awra::SpinButton::with_range(0.0, 10.0, 1.0).delegate();
    let _ = awra::Slider::with_range(awra::gtk::Orientation::Horizontal, 0.0, 1.0, 0.1);
    let _ = awra::ProgressBar::new().delegate();
    let _ = awra::NavigationView::new().stack();
    let _ = awra::TabView::new().stack();
    let _ = awra::Dropdown::from_strings(&["One", "Two"]).delegate();

    let store = awra::gio::ListStore::new::<awra::glib::Object>();
    let selection = awra::gtk::SingleSelection::new(Some(store));
    let factory = awra::gtk::SignalListItemFactory::new();
    let _ = awra::DataView::new(Some(&selection)).delegate();
    let list = awra::ListView::new(&selection, &factory);
    let list_header = awra::gtk::Label::new(Some("Name"));
    list.set_header(Some(&list_header));
    assert_eq!(list.header(), Some(list_header.upcast()));
    let _ = list.delegate();
    let navigation_item = awra::NavigationItem::with_label("Library");
    let count = awra::Badge::new("3");
    navigation_item.set_suffix(Some(&count));
    assert!(navigation_item.suffix().is_some());
    let column = awra::DataColumn::new(Some("Name"), Some(&factory));
    column.set_alignment(awra::gtk::Align::Start);
    let _ = (column.alignment(), column.delegate(), column.sorter());

    let parent = awra::gtk::Window::new();
    let palette = awra::CommandPalette::new(Some(&parent));
    palette.connect_activate_command(|_, _, _| false);
}

fn main() {
    assert_action_map::<awra::Window>();
    awra::gtk::init().expect("Rust Awra example requires a GTK display");
    awra::init();
    exercise_projected_gtk_types();

    let header = awra::PageHeader::builder()
        .title("Safe generated bindings")
        .subtitle("Awra widgets remain ordinary gtk-rs widgets")
        .build();
    awra::set_typography(&header, awra::Typography::Title2);
    let page = awra::Page::builder().child(&header).build();
    let page_content = awra::gtk::Box::new(awra::gtk::Orientation::Vertical, 0);
    awra::apply_layout_preset(&page_content, awra::LayoutPreset::Page);
    let card = awra::Card::new();
    card.set_child(Some(&awra::gtk::Label::new(Some("Rust consumer"))));
    assert_eq!(page.child(), Some(header.upcast()));
    assert!(card.child().is_some());

    let inspector = awra::Inspector::new();
    inspector.set_target(Some(&card));
    let report_path = std::env::temp_dir().join("awra-rust-report.txt");
    inspector
        .export_report_to(&report_path)
        .expect("safe report export");
    assert!(std::fs::read_to_string(&report_path)
        .expect("read report")
        .contains("AwraCard"));
    std::fs::remove_file(report_path).expect("remove report fixture");
}
