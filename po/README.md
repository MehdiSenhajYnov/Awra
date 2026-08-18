<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Translations

Awra's framework-owned visible defaults use the `awra-1` gettext domain.
Applications continue to own and translate their content strings. Generate a
template with `meson compile -C build awra-1-pot`; add a locale to `LINGUAS`
when its catalog is ready.
