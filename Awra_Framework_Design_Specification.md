<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

**AWRA**

**GTK4 Desktop UI Framework  
Design & Architecture Specification**

_Version 0.1 — Project Definition / Codex Reference_

**GTK4 is the engine. Awra is the visual system. The application is the content.**

# 1\. Executive Summary

Awra is an opinionated desktop UI framework built on GTK4. Its purpose is to let applications share one coherent, modern visual language without depending on libadwaita, an externally installed GTK theme, application-specific CSS hacks, or a particular KWin blur effect. GTK4 remains the low-level application and widget foundation; Awra owns the visual system, higher-level components, materials, surface behavior, motion, overlays, and compositor integration.

The initial visual target is a refined translucent / frosted-glass desktop interface. Liquid-glass rendering is explicitly not a v1 requirement, but the architecture must not prevent it. Materials must therefore be abstracted from widgets from day one.

Awra is not intended to become a replacement for GTK, GDK, Pango, GLib, accessibility infrastructure, input handling, or Wayland. It should replace the parts that currently make visual consistency painful: libadwaita-specific presentation, external themes, duplicated CSS, per-application surface hacks, inconsistent popovers, context menus, focus behavior, and compositor-specific blur setup.

# 2\. The Problem Awra Solves

- The same opacity value can produce visibly different results across the main content, sidebar, overlays, and nested surfaces.
- Focused and unfocused windows can unexpectedly receive different transparency or blur behavior.
- Popovers, context menus, tooltips, dialogs, and dropdowns may become separate native surfaces and therefore behave differently from the main window.
- A theme often styles GTK internals rather than expressing the application's actual visual architecture.
- Blur is frequently applied after the fact by a compositor effect that guesses which regions should be blurred.
- Each new application repeats the same fixes: CSS overrides, widget-tree inspection, KWin rules, special cases, and '!important' escalation.
- Changing the visual language across multiple applications requires editing multiple codebases instead of one shared source of truth.

Awra turns those recurring fixes into framework behavior. A developer should ask for an Awra surface, button, popover, or sidebar and receive the expected appearance and behavior without knowing the implementation details.

# 3\. Core Vision

Application  
↓  
Awra  
├── Components  
├── Layout & Navigation  
├── Surface / Material System  
├── Motion  
├── Overlays  
├── Design Tokens  
└── Platform / Compositor Integration  
↓  
GTK4 / GDK / GLib / Pango / Wayland

The ideal Awra application is visually dependent on GTK4 plus Awra. It should not require libadwaita, a user's GTK theme, a custom theme installed globally, a manual KWin rule, or a specific third-party blur extension merely to look correct.

# 4\. Goals

- Provide a complete and recognizable desktop visual language shared by every Awra application.
- Make frosted-glass surfaces a first-class primitive rather than a theme hack.
- Centralize transparency, tint, borders, shadows, noise, blur requests, focus states, and surface hierarchy.
- Make overlays as reliable and visually consistent as the main window.
- Allow a future Liquid Glass material without redesigning the public widget API.
- Provide high-level widgets and layouts so applications rarely need raw GTK styling.
- Retain GTK's mature input, text, accessibility, scaling, rendering, event, and platform infrastructure.
- Support graceful fallbacks when compositor effects are unavailable.
- Keep the API pleasant enough that using Awra is easier than bypassing it.
- Be suitable for dogfooding across real applications, not only showcase demos.
- Make global visual changes possible from one framework repository.
- Be friendly to AI-assisted development: predictable architecture, documented contracts, examples, tests, and a component playground.

# 5\. Non-Goals

- Reimplementing GTK or building a new Wayland client toolkit from scratch.
- Writing a custom text engine, font rasterizer, accessibility stack, input method system, clipboard stack, or layout engine.
- Perfectly cloning Apple's current visual implementation.
- Making Liquid Glass a blocker for v1.
- Supporting every GTK widget through arbitrary theme overrides.
- Guaranteeing identical compositor effects on every Linux desktop. Awra should guarantee coherent fallback behavior instead.
- Becoming a general-purpose cross-platform UI framework in the first versions.

# 6\. Architectural Principles

## Composition over CSS archaeology

Prefer Awra-owned composite widgets and explicit visual primitives over reaching into undocumented GTK child nodes.

## One source of truth

Visual values live in design tokens and material definitions, not duplicated application CSS.

## Materials are not widgets

A button may use a material, but the material engine must be reusable by cards, popovers, sidebars, toolbars, and future components.

## Compositor capability is an implementation detail

Applications request an effect; Awra decides whether it is native, approximated, or replaced by a fallback.

## Progressive enhancement

A basic compositor should still produce a polished interface. Extra capabilities improve the result rather than make it functional.

## Stable public API, replaceable internals

Awra must be able to change its rendering or compositor backend without forcing applications to be rewritten.

## Dogfood early

Every architectural idea should eventually prove itself inside a real application.

# 7\. Proposed Module Structure

awra/  
├── core/ lifecycle, object model, common utilities  
├── tokens/ design tokens and semantic values  
├── material/ solid, frosted, future liquid/custom materials  
├── surface/ visual surface primitives  
├── widgets/ controls and reusable components  
├── layout/ responsive containers and split layouts  
├── navigation/ navigation model and views  
├── overlays/ popovers, menus, dialogs, tooltips, toasts  
├── motion/ animation primitives and motion tokens  
├── platform/  
│ ├── wayland/  
│ ├── kwin/  
│ └── fallback/  
├── application/ AwraApplication / AwraWindow conveniences  
├── inspector/ developer inspection tools  
├── playground/ component gallery and live token laboratory  
├── examples/  
├── tests/  
└── docs/

# 8\. The Surface Model

AwraSurface is the central visual primitive. It represents a styled region with a semantic role and a material. Most higher-level visual components should ultimately be composed from surfaces.

AwraSurface  
├── role  
├── material  
├── radius  
├── border  
├── shadow  
├── elevation  
├── clipping  
├── interaction state  
├── focus/window state  
└── optional compositor effect request

## Surface Roles

- Window — root application surface.
- Content — primary content region.
- Sidebar — navigation/supporting region.
- Card — contained content grouping.
- Toolbar — command/navigation region.
- Floating — elevated temporary or persistent element.
- Popover — anchored overlay.
- Menu — command overlay.
- Dialog — modal/semi-modal surface.
- Tooltip — lightweight transient surface.
- HUD — media controls, volume, status overlays, etc.

Roles should be semantic. They allow the default design system to decide how a surface looks without forcing every application to specify raw opacity, radius, or shadow values.

# 9\. Material System

Materials describe how a surface is visually constructed. Widgets should reference materials by semantic role rather than implement glass behavior themselves.

AwraMaterial  
├── background / tint  
├── opacity  
├── blur request  
├── saturation  
├── luminosity  
├── noise / grain  
├── border treatment  
├── highlight treatment  
├── shadow  
├── depth metadata  
├── optional refraction metadata \[future\]  
├── optional distortion metadata \[future\]  
└── quality / fallback policy

## Initial Materials

- Solid — opaque fallback and surfaces that should intentionally remain solid.
- Translucent — transparency/tint without background blur.
- Frosted — transparency + compositor blur where available + tint/saturation/noise/border treatment.
- Elevated Frosted — stronger separation for menus, dialogs, and floating controls.

## Future Material: Liquid

Liquid Glass is reserved for a later phase. The public material architecture must already permit refraction, distortion, dynamic edge highlights, depth-aware lighting, geometry-dependent effects, and animated morphing. None of those features are required for the initial framework.

AwraMaterialKind:  
SOLID  
TRANSLUCENT  
FROSTED  
LIQUID // reserved / experimental  
CUSTOM

# 10\. Blur and Compositor Integration

True background blur is compositor-dependent because the application does not own the desktop content behind its Wayland surface. Awra therefore needs a platform abstraction rather than assuming blur can be implemented entirely inside GTK.

AwraEffectBackend  
├── capability detection  
├── request_background_blur(surface, region)  
├── update_blur_region(surface, region)  
├── clear_blur(surface)  
├── request_shadow(...)  
├── report_capabilities()  
└── fallback policy

The application should never directly call KWin-specific APIs. It should request a frosted material. Awra's platform layer decides whether to use a supported Wayland/KDE protocol, another compositor mechanism, or a visual fallback.

## Blur Region Strategy

- Prefer one coherent root blur region for a continuous glass window instead of stacking multiple blurred translucent children.
- Use child surfaces primarily for tint, separation, borders, highlights, and semantic elevation.
- Track native overlay surfaces separately when GTK/Wayland creates them as distinct surfaces.
- Recompute blur regions when windows resize, rounded corners change, sidebars collapse, or overlays move.
- Never require the user to configure KWin rules for normal operation.

# 11\. Focus and State Model

Focus behavior must be explicit. A compositor or GTK state change should not accidentally change transparency. Awra should define semantic state tokens.

AwraVisualState  
├── normal  
├── hover  
├── pressed  
├── selected  
├── disabled  
├── keyboard-focus  
└── window-inactive

Each material/component may opt into state changes, but the defaults should avoid unexplained opacity shifts. Window inactive behavior must be centrally configurable.

# 12\. Design Tokens

All applications should inherit a semantic token set. Raw magic numbers in app code should be exceptional.

- Color: background, foreground, muted, accent, destructive, warning, success, selection.
- Material: tint, opacity, blur strength hint, saturation, luminosity, grain.
- Geometry: corner radius scale, border widths, separator widths.
- Spacing: compact through spacious semantic steps.
- Typography: display, title, heading, body, caption, monospace.
- Motion: durations, easing/spring presets, reduced-motion alternatives.
- Elevation: shadow/effect presets for base, raised, floating, modal.
- Interaction: hover/pressed/disabled/focus treatments.
- Touch targets: minimum interactive dimensions.

awra.tokens.radius.medium  
awra.tokens.spacing.large  
awra.tokens.material.window  
awra.tokens.motion.fast  
awra.tokens.typography.title

# 13\. Theme / Appearance Profiles

Awra may expose Light and Dark appearance profiles plus an accent system, but these are internal Awra profiles rather than external GTK themes. Applications should remain visually controlled by Awra even if the system GTK theme changes.

- Dark / Light / System preference.
- Accent color.
- Glass intensity.
- Contrast level.
- Corner style/radius scale.
- Motion preference.
- Reduced transparency mode.
- Reduced motion mode.

# 14\. Widget Library

The first stable widget set should cover ordinary desktop application needs without forcing developers back into raw GTK styling.

## Inputs

- Button
- ToggleButton
- Entry
- SearchEntry
- TextArea wrapper
- Checkbox
- Radio
- Switch
- Slider
- Spin control

## Display

- Label styles
- Icon
- Avatar
- Badge
- Status pill
- Progress bar
- Spinner
- Separator
- Empty state

## Containers

- Card
- Group
- Section
- Toolbar
- Header
- Scroll container
- Clamp/maximum-width container

## Selection

- Segmented control
- Tabs
- Dropdown
- Combo selection
- List row
- Grid item

## Media

- Media button
- Transport controls
- Volume control
- Seek/progress control
- Artwork surface

# 15\. Layout and Responsive System

- AwraSplitView for sidebar/content layouts.
- AwraSidebar with consistent material behavior.
- AwraNavigationView for page stacks.
- AwraToolbarView / header composition.
- Breakpoint or adaptive layout helpers.
- Compact / medium / expanded semantic layout states.
- Optional collapsible sidebar and overlay sidebar behavior.
- Safe handling of minimum sizes and very wide desktop windows.

Responsive behavior should be independent from visual material behavior. Collapsing a sidebar must not unexpectedly change the root glass treatment.

# 16\. Overlay System

Overlays are a priority area because they are currently one of the most fragile parts of translucent GTK applications. Awra should treat them as a coherent subsystem, not a collection of unrelated widgets.

- AwraPopover — anchored floating surface.
- AwraContextMenu — pointer/keyboard context actions.
- AwraMenu — structured actions, icons, shortcuts, submenus.
- AwraDropdown — selection surface.
- AwraTooltip — lightweight explanatory surface.
- AwraDialog — modal and non-modal dialog shell.
- AwraToast — transient notification.
- AwraCommandPalette — searchable command overlay.
- AwraHUD — temporary media/status overlay.

Every overlay must define placement, clipping, shadow/elevation, material, keyboard navigation, dismissal, focus transfer, and compositor-effect behavior.

# 17\. Navigation

- Page stack with push/pop/replace semantics.
- Back navigation and keyboard shortcuts.
- Sidebar destinations linked to navigation state.
- Transition presets controlled by the motion system.
- State restoration hooks.
- Deep-link/action integration where useful.
- No visual dependency on libadwaita navigation widgets.

# 18\. Motion System

Motion should be designed as part of Awra rather than added independently by every app. Components use semantic motion presets.

- Fast feedback: hover/press/toggle.
- Standard transitions: page changes, dropdowns, popovers.
- Large transitions: sidebar collapse, dialogs, major layout changes.
- Spring presets for natural motion where appropriate.
- Opacity + transform choreography for floating surfaces.
- Reduced-motion equivalents for accessibility.
- Animation interruption and retargeting without visual jumps.

# 19\. Typography and Iconography

- Semantic text styles rather than arbitrary point sizes.
- Respect system font configuration by default while allowing an Awra application override.
- Correct scaling through GTK/Pango.
- Symbolic icon support with semantic sizing.
- A future Awra icon pack is possible but not required for v1.
- Icon APIs should not lock the framework to one icon source.

# 20\. Accessibility

Custom visuals must not throw away GTK's accessibility advantages. Awra widgets should expose correct accessible roles, labels, states, focus behavior, and keyboard navigation.

- Visible keyboard focus.
- Screen-reader metadata.
- Sufficient text/interactive contrast.
- Reduced transparency option.
- Reduced motion option.
- Touch-friendly hit targets.
- High-contrast-aware material fallback.
- No interaction that depends solely on color or blur.

# 21\. Scaling, HiDPI and Input

- Use GTK/GDK scaling infrastructure rather than inventing a parallel coordinate system.
- Test fractional scaling early.
- Keep borders/radii visually stable at common scale factors.
- Support mouse, keyboard, touchpad, and touch where GTK supports them.
- Make hit targets semantic and independent from the visual size of thin controls.
- Avoid material effects that become prohibitively expensive at high resolution.

# 22\. Developer-Facing API

The public API should be boring, predictable, and semantic. Applications should describe intent rather than reproduce the renderer.

AwraWindow \*window = awra_window_new();  
AwraSidebar \*sidebar = awra_sidebar_new();  
AwraButton \*play = awra_button_new("Play");  
<br/>awra_window_set_content(window, content);  
awra_window_set_sidebar(window, sidebar);  
<br/>awra_surface_set_material(  
AWRA_SURFACE(window),  
AWRA_MATERIAL_FROSTED  
);

Exact naming and language bindings may change, but the design principle is stable: normal application code should not manipulate compositor blur regions or undocumented GTK CSS nodes.

# 23\. GtkBuilder / Blueprint Integration

Awra should aim to work naturally with GtkBuilder and, where practical, Blueprint workflows. This allows declarative application UI while retaining Awra components.

Awra.Window {  
title: "Music";  
<br/>content: Awra.SplitView {  
sidebar: Awra.Sidebar {  
// navigation  
};  
<br/>content: Awra.Surface {  
// application content  
};  
};  
}

# 24\. AwraApplication and Window Lifecycle

- Optional AwraApplication subclass/wrapper over GtkApplication.
- Automatic initialization of tokens, appearance profile, platform backend, and diagnostics.
- Common app actions and shortcuts.
- Window registration and active-window tracking.
- Settings hooks.
- About/application metadata helpers.
- Optional persistence of window size/state.
- No requirement to use AwraApplication if a project needs lower-level integration.

# 25\. Platform Abstraction

AwraPlatform  
├── session/backend detection  
├── compositor capabilities  
├── background effects  
├── window effects  
├── scale/input information hooks  
└── diagnostics  
<br/>Backends:  
Wayland/KWin enhanced  
Generic Wayland  
Generic GTK fallback  
Future backends as justified

The enhanced KWin path can be excellent without making KWin a hard dependency. Platform-specific code must be isolated from the component layer.

# 26\. Fallback Strategy

Every visual effect needs a defined degradation path.

| Requested           | Preferred                              | Fallback                                                   |
| ------------------- | -------------------------------------- | ---------------------------------------------------------- |
| Frosted surface     | Background blur + translucent material | Opaque/translucent tinted surface with stronger separation |
| Elevated glass      | Blur + shadow + highlight              | Solid elevated surface + shadow                            |
| Liquid (future)     | Advanced effect backend                | Frosted material                                           |
| Animated transition | Full motion preset                     | Reduced/fade-only motion                                   |
| Transparent mode    | Translucent                            | High-contrast opaque surface                               |

# 27\. Performance Model

- Avoid unnecessary stacked translucent layers and overdraw.
- Prefer a coherent root blur region where possible.
- Cache material/render data that does not change every frame.
- Only animate properties that need animation.
- Throttle or coalesce compositor region updates during resize.
- Provide a performance/debug mode that visualizes native surfaces and effect regions.
- Benchmark common app layouts at 1080p, 1440p, 4K, and fractional scale factors.
- Make expensive future Liquid effects opt-in and quality-scalable.

# 28\. Robustness

- Missing compositor capability must never crash an application.
- Backend failures fall back cleanly and emit diagnostics.
- Experimental effects stay behind capability checks or feature flags.
- Avoid relying on undocumented GTK widget internals where possible.
- Test native popup surface creation/destruction aggressively.
- Test rapid focus switching, resize, maximize/unmaximize, fullscreen, multiple windows, and monitor changes.

# 29\. Developer Tools

## Awra Inspector

- Pick a widget/surface under the pointer.
- Display Awra type, GTK type, semantic role, material, tokens, current state, allocation, scale factor, and native surface identity.
- Show whether compositor blur is active, unavailable, or falling back.
- Visualize blur/effect regions and clipping.
- Show padding/margins and layout bounds.
- Temporarily override tokens/material properties live.

## Awra Playground

- Gallery of every stable and experimental component.
- Light/dark switching.
- Accent switching.
- Glass intensity control.
- Focus/inactive simulation.
- Reduced motion/transparency simulation.
- Compositor capability/fallback simulation.
- Live token editing.
- Copyable code/Blueprint examples.

# 30\. Configuration

Most settings should be API-driven, but a project-level configuration file may be useful for defaults, feature gates, and tooling.

\[awra\]  
application = "music"  
appearance = "system"  
accent = "purple"  
<br/>\[materials\]  
glass_intensity = "standard"  
liquid = false  
<br/>\[features\]  
inspector = true  
experimental = false

The exact format is not fixed; \`awra.toml\` is a possible direction, not a v1 requirement.

# 31\. Language and Binding Strategy

The implementation language should be chosen after a small technical spike. The framework must interoperate cleanly with GTK's GObject ecosystem.

| Option | Strength                                        | Risk                                          | Position                     |
| ------ | ----------------------------------------------- | --------------------------------------------- | ---------------------------- |
| C      | Native GTK/GObject fit, maximum compatibility   | Verbose, manual complexity                    | Safest baseline              |
| Rust   | Safety, modern tooling, strong gtk-rs ecosystem | Binding/API design complexity                 | Very attractive candidate    |
| Vala   | Concise GObject/GTK-native model                | Smaller ecosystem and long-term mindshare     | Useful prototype candidate   |
| C++    | Powerful and familiar to many developers        | GObject/binding ergonomics can be less direct | Possible, not default choice |

Recommendation for the first spike: prototype the same AwraSurface + AwraWindow + AwraButton concept in Rust/gtk-rs and in a direct GObject-friendly approach, then choose based on API cleanliness, custom widget ergonomics, Wayland protocol integration, build/distribution, and binding requirements.

# 32\. Repository and Build

awra/  
├── meson.build / chosen build metadata  
├── src/  
│ ├── core/  
│ ├── material/  
│ ├── surface/  
│ ├── widgets/  
│ ├── overlays/  
│ ├── motion/  
│ └── platform/  
├── include/ or public API modules  
├── bindings/ \[later\]  
├── playground/  
├── inspector/  
├── examples/  
├── tests/  
│ ├── unit/  
│ ├── visual/  
│ └── integration/  
├── docs/  
│ ├── architecture/  
│ ├── api/  
│ └── guides/  
└── assets/

# 33\. Testing Strategy

- Unit tests for token resolution, material inheritance, capability selection, and state transitions.
- Widget integration tests for construction, properties, signals, keyboard focus, and accessibility metadata.
- Visual regression screenshots for component states.
- Compositor integration tests where practical.
- Fallback tests that deliberately disable advanced effects.
- Multi-window and multi-monitor tests.
- Focus/unfocus regression tests — a first-class suite because this is a known pain point.
- Overlay lifecycle tests: open/close/reopen, nested menus, pointer/keyboard dismissal, rapid resize.
- Performance benchmarks for representative surfaces and animations.

# 34\. API Stability and Versioning

- Use semantic versioning once a public API is declared stable.
- Mark experimental components clearly.
- Keep internal platform APIs private unless extension is intentional.
- Deprecate before removal.
- Maintain a migration guide between breaking releases.
- Avoid exposing GTK implementation details that prevent future refactoring.

# 35\. Distribution

- Start as a source dependency/subproject for fast iteration.
- Later provide system library packaging where useful.
- Consider Flatpak-friendly integration early.
- Keep runtime assets versioned with the library.
- Applications should not require users to manually install a GTK theme.
- Document compositor enhancements as optional capabilities, not mandatory setup steps.

# 36\. Development Roadmap

## Phase 0 — Technical Spikes

1. Create a minimal transparent GTK4 window without libadwaita.
2. Prove an Awra-owned custom/composite widget can render and receive state correctly.
3. Detect native surface creation and focus changes.
4. Prototype compositor blur request on the target KDE/Wayland environment.
5. Test blur behavior for a root window and at least one overlay/native popup.
6. Compare implementation-language candidates if still undecided.

## Phase 1 — Core

1. Awra initialization and logging.
2. Design token engine.
3. AwraMaterial model.
4. AwraSurface.
5. AwraWindow.
6. Solid, Translucent, and Frosted materials.
7. Generic fallback backend.
8. KWin/Wayland enhanced backend prototype.

## Phase 2 — First Usable UI

1. Button, icon button, entry, switch, slider.
2. Card, toolbar/header, sidebar.
3. Split view and basic responsive breakpoint.
4. Popover and context menu.
5. Dialog and toast.
6. Basic motion system.

## Phase 3 — Dogfood Application

1. Choose one small real application or a deliberately limited slice of an existing app.
2. Remove libadwaita and app-specific visual hacks from that slice.
3. Rebuild the interface using only GTK4 + Awra.
4. Record every missing primitive rather than immediately bypassing the framework.
5. Promote repeated app needs into Awra components.
6. Measure visual consistency, code reduction, performance, and fallback behavior.

## Phase 4 — Developer Experience

1. Awra Playground.
2. Inspector/debug overlay.
3. Blueprint/GtkBuilder examples.
4. API documentation and component guidelines.
5. Visual regression suite.
6. Packaging and example applications.

## Phase 5 — Expansion

1. More navigation/layout components.
2. Advanced media controls.
3. Improved compositor abstraction.
4. Bindings if justified.
5. Custom iconography if desired.
6. Experimental Liquid material research behind a feature flag.

# 37\. Definition of the v1 Milestone

Awra v1 should not mean 'every possible widget exists'. It should mean the architecture is proven.

- A real desktop application can be built without libadwaita.
- It requires no external GTK theme to achieve the intended Awra appearance.
- Main window, sidebar, content, popover, context menu, and dialog are visually coherent.
- Focus/unfocus does not unexpectedly change transparency.
- Frosted surfaces work on the primary KDE/Wayland target and degrade cleanly elsewhere.
- The application does not contain compositor-specific effect code.
- Core controls are keyboard accessible.
- Design changes can be made centrally through Awra tokens/materials.
- The component playground documents stable behavior.
- There is a clear upgrade path for future materials, including Liquid Glass.

# 38\. Rules for Applications Using Awra

- Do not add application CSS to fix a framework component before determining whether the fix belongs in Awra.
- Do not call compositor-specific blur APIs from application code.
- Do not duplicate material values inside applications.
- Prefer semantic Awra components over raw GTK widgets when an Awra equivalent exists.
- Raw GTK remains allowed for content-specific widgets, but it should be wrapped/styled through Awra primitives when it becomes part of the shared visual language.
- If two applications need the same custom visual behavior, it probably belongs in Awra.
- Experimental hacks must be isolated and documented so they cannot silently become architecture.

# 39\. Codex Working Contract

When using this document as context for Codex or another coding agent, the agent should optimize for the architecture rather than the fastest one-off visual result.

- Do not solve a framework-level problem with app-local CSS unless explicitly asked for a temporary experiment.
- Do not reintroduce libadwaita as a convenience dependency.
- Do not require a third-party KWin blur effect as the normal implementation.
- Keep GTK4/GDK/GLib/Pango as infrastructure instead of reimplementing them.
- Treat surface/material/compositor boundaries as explicit modules.
- Prefer a small proven vertical slice over generating dozens of placeholder widgets.
- Add tests for every bug involving focus, native surfaces, overlays, or fallback behavior.
- Document assumptions about Wayland/compositor capabilities.
- Keep Liquid Glass hooks architectural only until the frosted-glass core is stable.

# 40\. First Codex Mission

The first implementation request should be intentionally narrow:

Build an Awra technical prototype on GTK4 with no libadwaita.  
<br/>Required:  
1\. Awra initialization.  
2\. AwraWindow.  
3\. AwraSurface.  
4\. Material abstraction with Solid, Translucent, Frosted.  
5\. Design-token object for opacity, tint, radius and border.  
6\. One AwraButton.  
7\. One AwraPopover or overlay experiment.  
8\. Detect active/inactive window state without changing opacity by accident.  
9\. Platform-effect interface with a generic fallback.  
10\. KDE/Wayland blur experiment isolated behind the platform interface.  
11\. Small demo/playground window.  
12\. Logging that reports active compositor/effect capabilities.  
<br/>Do NOT:  
\- add libadwaita;  
\- depend on an installed GTK theme for the intended appearance;  
\- create dozens of widgets;  
\- implement Liquid Glass;  
\- place compositor-specific code in AwraWindow or application code.

Only after this vertical slice works reliably should the project expand. The purpose of the prototype is to validate the hardest architectural boundary: GTK surface → Awra material → native Wayland surface → compositor effect → graceful fallback.

# 41\. Future: Liquid Glass

Liquid Glass is a planned research direction, not part of the initial implementation. Awra should reserve enough abstraction to support it later without promising a specific rendering technique.

- Possible refraction/distortion representation.
- Dynamic edge highlights.
- Geometry-aware light response.
- Depth/elevation-sensitive appearance.
- Morphing between compatible shapes.
- Quality tiers.
- Frosted fallback.
- Performance budgets and capability checks.
- Potential compositor cooperation if required.

The key requirement today is simply that 'Frosted' is not hard-coded as the definition of an Awra surface. It is one material among possible materials.

# 42\. North Star

Awra succeeds when a developer can open a new GTK4 project, add Awra, build a complete modern desktop interface, and never think about which CSS selector controls a libadwaita sidebar, why a context menu lost its transparency, whether KWin changed blur on focus, or which application copied the latest glass values.

Before Awra:  
GTK4  
\+ libadwaita  
\+ external GTK theme  
\+ app-specific CSS  
\+ compositor blur extension  
\+ KWin rules  
\+ popup hacks  
\+ sidebar hacks  
\+ focus hacks  
\+ repeated fixes across every app  
<br/>Target:  
GTK4  
└── Awra  
└── Application

GTK should become the reliable infrastructure beneath the interface. Awra should become the visible identity above it. The framework should be coherent enough that applications built with it feel like members of the same desktop ecosystem, while remaining practical GTK applications rather than a custom GUI stack.

# 43\. Project Motto

**Every app deserves some Awra.**
