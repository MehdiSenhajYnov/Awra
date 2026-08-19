<!-- SPDX-License-Identifier: LGPL-2.1-or-later -->

# Journal d’utilisation d’Awra

Les entrées des 17 et 18 août ci-dessous reconstruisent rétrospectivement les
enseignements conservés de la conception d’Awra, des passes successives du
Showcase et du port de Pokedia. Leur ordre est significatif, mais leur heure
n’avait pas été consignée à l’époque.

# 2026-08-17

## Heure non consignée — reconstruction — Awra — Fondation technique

Awra est parti sur une bibliothèque C17/GObject, GTK 4.22+, Meson et GIR. Ce
choix devait produire un contrat ABI naturel pour GTK, GtkBuilder, Blueprint,
C, Vala, Python/GI et de futurs bindings Rust. Les objets Wayland, le
coordinateur d’effets et les détails KWin devaient rester privés.

Le modèle initial séparait le contexte par display, les préférences de style,
les tokens, les matériaux immuables et les surfaces. `Solid`, `Translucent` et
`Frosted` exprimaient une intention ; un Frosted sans capacité native devait
devenir opaque plutôt que rester transparent sans blur.

## Heure non consignée — reconstruction — Awra — Limites honnêtes du blur

Le protocole `ext-background-effect-v1` permet de demander un effet pour une
région, mais pas de choisir son rayon, sa saturation ou son algorithme. Ces
paramètres appartiennent au compositeur. Awra devait donc promettre une
activation, une région et un fallback cohérent, jamais un résultat identique
entre tous les compositeurs.

Les popovers possèdent leur propre surface native et doivent recevoir leur
propre demande d’effet. Une surface imbriquée dans la même `GdkSurface` ne peut
pas créer un vrai backdrop-filter entre widgets frères.

## Heure non consignée — reconstruction — Showcase — Passer d’une galerie à une application

Le premier Showcase présentait beaucoup de composants mais ne répondait pas
encore à la question « à quoi ressemble une vraie application Awra ? ». La
sidebar a donc été transformée en navigation réelle vers Overview, Surfaces,
Controls, Inputs, Navigation, Overlays, Motion, Layout, Platform et
Diagnostics. Des patterns d’application complets ont été ajoutés en plus de la
galerie de composants.

La règle importante était que Showcase ne devait jamais recevoir de CSS local
ou appeler une API privée : tout problème générique devait être corrigé dans
Awra.

## Heure non consignée — reconstruction — Awra — Isolation visuelle et mode Light

Les contrôles GTK comportementaux laissaient initialement filtrer certains
styles du thème système et des providers USER, notamment dans les inputs,
switches, sliders, dropdowns et sous-widgets de scroll. L’isolation a été
reconstruite au niveau du provider Awra, sans supprimer les fonts, le scaling,
l’IME, l’accessibilité, le contraste ou les préférences système utiles.

Le mode Light manquait aussi de contraste. Les tokens de texte, contrôles,
états selected/pressed/disabled et focus ont été renforcés et couverts par des
seuils de contraste. Dark est resté la référence artistique principale.

## Heure non consignée — reconstruction — Références visuelles — Une grammaire moins « boxed »

Les captures de référence ont montré que le Showcase était trop composé de
rectangles bordés indépendants. La hiérarchie devait davantage venir de la
matière, de la profondeur, du tint, de l’espace, des highlights et de quelques
séparateurs utiles.

La sidebar ne devait plus présenter chaque destination comme une card. Les
éléments normaux devaient rester calmes ; hover et selected devaient produire
la hiérarchie. Le violet devait devenir un accent configurable et retenu, pas
l’identité entière du framework. `SYSTEM` devait être best-effort avec un
fallback `DEFAULT`.

## Heure non consignée — reconstruction — Awra — Premium Gap Audit

La sensation premium ne devait pas venir de davantage de glow, de gradients
décoratifs, d’ombres ou de bordures. Les axes retenus étaient la qualité de la
matière, la lumière, la quantité de wallpaper visible, les proportions, la
densité, la typographie, les formes de contrôle, la profondeur entre canvas,
chrome, contenu et surfaces flottantes, ainsi que des interactions plus
retenues.

Button, Switch, Slider, SegmentedControl, Input, NavigationItem et Floating
devaient acquérir une signature Awra reconnaissable sans perdre leur
comportement GTK accessible.

## Heure non consignée — reconstruction — Showcase — Unifier le header et la fenêtre

Une bande visuelle distincte entre la partie haute et l’application cassait
l’unité observée dans les références. `AwraHeader:blend-with-window` a été
introduit pour résoudre le même matériau que la fenêtre, sans verrouiller Awra
sur une composition unique de header ou de sidebar.

## Heure non consignée — reconstruction — Showcase — Calibration du Canvas

Le laboratoire Platform & Blur a permis d’ajuster les paramètres en temps
réel. La calibration adoptée comme point de départ a été un tint Canvas
`#232323`, une opacité de 60 %, environ 40 % de contribution du wallpaper et
un grain à 20 % du preset, soit un alpha effectif très faible d’environ
`0,0033`. Le blur natif reste simplement activé ou désactivé ; sa force demeure
contrôlée par le compositeur.

Ces valeurs sont des défauts de travail, pas des constantes artistiques
définitives.

## Heure non consignée — reconstruction — Showcase — Édition sémantique des matériaux

Chaque preset de Surfaces & Materials a reçu un éditeur public permettant de
modifier tint, alpha, radius, grain, outline, highlight et intention de blur.
Une modification de Floating doit mettre à jour toutes les surfaces Floating,
pas seulement la carte de démonstration. Les primitives bas niveau sont
restées disponibles pour préserver l’extensibilité.

Le rôle Chrome a reçu des coins sémantiques arrondis afin que les sidebars et
rails inset ne paraissent pas découpés à angle vif.

## Heure non consignée — reconstruction — Overlays — Les widgets étrangers cassent l’immersion

Un `GtkDropDown` natif rendait un popup qui ne ressemblait pas aux surfaces
Floating d’Awra. Le dropdown visible a été remplacé par une composition Awra
reposant sur un bouton et un `AwraPopover`, tout en conservant le modèle et
l’expression GTK comme delegates comportementaux.

Les menus imbriqués ont également révélé des problèmes de fermeture, de double
contour focus, de sous-menu persistant et de clic extérieur. Leur cycle de vie
a été centralisé et testé avec ouverture, réouverture, Escape, activation,
second clic et destruction du parent.

## Heure non consignée — reconstruction — Showcase — Sidebars, panels et contrôles

Les sidebars inset ont gagné un décalage par rapport au bord, de l’espace en
bas et une silhouette Floating plus proche des références. Les variantes
persistent, floating et edge-revealed ont été distinguées. Une sidebar qui
disparaissait complètement en responsive a montré qu’un layout adaptatif doit
toujours laisser un moyen explicite de navigation.

Les différentes implémentations visuelles de Switch ont été réunifiées. Les
panels Layers, dialogs, dropdowns et boutons ont été retravaillés pour éviter
les éléments superposés, les contrôles inexplicablement plus noirs et les
compositions sans intention claire.

## Heure non consignée — reconstruction — Awra — Le spacing doit être un système

L’objectif est qu’un nouveau composant soit raisonnablement beau avant tout
ajustement applicatif. Les espacements, insets, radii, typographies et recettes
de layout ont donc été centralisés dans des tokens et helpers publics. Une
application peut encore composer librement, mais elle ne devrait pas recopier
une collection de valeurs magiques.

## Heure non consignée — reconstruction — PokediaAwra — Le premier test externe n’était pas suffisant

Le premier essai de reproduction de Pokedia ressemblait à une maquette
incomplète : densité trop faible, vues manquantes et structures très éloignées
du produit de référence. Le test a été repris comme un vrai port complet, avec
les données, huit pages, les détails Pokémon/attaques/talents/objets, la
comparaison, les types, les espaces de travail, les onglets et les dialogs.

Cette exigence a été utile : une bibliothèque n’est pas validée parce qu’elle
sait dessiner quelques cards, mais parce qu’elle peut soutenir un produit
dense sans obliger l’application à la contourner.

# 2026-08-18

## Heure non consignée — reconstruction — PokediaAwra — Un port public complet

PokediaAwra a conservé la logique métier, SQLite, les datasets, les modèles,
les recherches et les factories GTK. La couche d’interface a été recomposée
avec les seules API publiques d’Awra et GTK, sans libadwaita, provider CSS
applicatif, API Wayland/KWin ou header privé.

Le port a déclenché des primitives réutilisables plutôt que des exceptions
locales : FilterBar, badges à couleurs de domaine, tabs dynamiques, fusion du
chrome et du canvas, rôles de données isolés et meilleurs overlays.

## Heure non consignée — reconstruction — PokediaAwra — Focus et thème utilisateur

Une règle réelle du thème utilisateur visant `.sidebar-pane:first-child`
créait une ombre opaque de 9 000 pixels uniquement lorsque la fenêtre était
active. Les rôles publics sont désormais traduits en classes privées
`awra-role-*`, ce qui évite les collisions avec les thèmes GTK.

La comparaison active/inactive de Pokedia a ensuite été rendue strictement
identique. Awra a finalement choisi l’invariant le plus fort : fill, tint,
grain, radius, border, highlight, shadow et demande de blur ne changent pas
avec le focus.

## Heure non consignée — reconstruction — Awra — Ce que sont les rôles

Un rôle est une intention de présentation appliquée à un widget GTK existant,
par exemple une cellule de table ou une ligne de sidebar. Il permet de garder
le comportement GTK sans CSS applicatif. Il ne remplace ni un matériau, qui
décrit la matière d’une surface, ni un composant typé, qui possède une
structure et un comportement réutilisables.

Les rôles sont utiles comme pont, mais une composition répétée doit devenir un
widget Awra typé plutôt qu’une accumulation de chaînes de rôles.

## Heure non consignée — reconstruction — Awra — Roadmap issue de l’usage réel

L’expérience Showcase/Pokedia a produit une roadmap couvrant stabilité,
lifecycle natif, isolation, ergonomie de construction, données, navigation,
accessibilité, performances, diagnostics, documentation, bindings, packaging
et gouvernance du design system.

La Phase A a durci les fondations, l’ownership, le backend natif, GIR et les
consumers. La Phase B a ajouté Page, PageHeader, Section, Toolbar, Form,
FormRow, états d’application, FilterBar, MasterDetail et DetailPane, puis a
migré Showcase et une première composition réelle de Pokedia.

# 2026-08-19

## Heure non consignée — reconstruction — Awra — Données, navigation et contrôles stabilisés

La Phase C a ajouté DataView/DataColumn, SelectionToolbar, inputs avancés,
StatusBanner, ResponsiveBin, breadcrumbs, command palette, composants de
métriques et de métadonnées, Skeleton, audits RTL/accessibilité et budgets de
rendu. Showcase est devenu la documentation vivante de ces familles.

Les tests visuels couvrent Dark, Light, accent bleu et niveaux de gris. Le test
en niveaux de gris est important : l’identité doit survivre sans dépendre du
violet ou d’une autre couleur d’accent.

## Heure non consignée — reconstruction — Awra — Bindings Rust et projection sûre

Un consumer Rust expérimental permanent a été ajouté tôt pour détecter les API
qui se projetaient mal. La Phase D a ensuite généré `awra-sys` et la couche
gtk-rs sûre depuis le GIR officiel.

Ce gate a détecté l’absence de `Gio.ActionMap` sur `AwraWindow` et plusieurs
types GTK delegates qui auraient produit des méthodes commentées. La
configuration projette désormais modèles, factories, sorters, expressions,
enums et callbacks. Un test interdit le retour de stubs générés non supportés.

## Heure non consignée — reconstruction — Awra — Gate 1.0

Awra 1.0 a figé `Awra-1.0` et le SONAME `libawra-1.so.1`. Les suites finales
ont validé le build Wayland, le backend générique, ASan/UBSan avec 200 cycles
natifs, les consumers C/Vala/Python/Rust, l’isolation hostile, l’accessibilité
AT-SPI, l’installation, le mode subproject, la documentation et deux archives
source byte-identiques.

Le test KWin a activé le blur intégré seul, désactivé tous les effets pour
prouver le fallback, puis restauré exactement Better Blur DX et le blur intégré
dans leur état initial.

## Heure non consignée — reconstruction — Repository — Publication d’Awra 1.0

L’état validé a été publié sur le dépôt GitHub officiel, branche `main`, dans
le commit `2a93c7a` intitulé `Release Awra 1.0.0`. Les builds Meson, les
dépendances GIR téléchargées et les artefacts Cargo sont exclus du dépôt.

## 02:02 — PokediaAwra — Expérience de développement face à libadwaita

Pour une application GNOME classique, libadwaita reste aujourd’hui plus simple
grâce à sa maturité, sa documentation, son écosystème et son catalogue. Pour
une application transparente et fortement identitaire comme Pokedia, Awra est
désormais plus naturel : on ne lutte plus contre des fonds opaques, des
sous-widgets privés ou des contournements CSS pour obtenir le verre, le blur et
une hiérarchie de surfaces cohérente.

Le passage libadwaita vers Awra est un travail modéré sur la couche UI, pas une
réécriture du produit. Les modèles GTK, factories, actions, sélection, IME,
données SQLite, navigation métier et callbacks peuvent rester. Il faut surtout
recomposer les fenêtres, headers, sidebars, rows, cards, overlays et pages
libadwaita avec les primitives sémantiques Awra.

Le port historique n’a pas été parfaitement fluide parce que Pokedia a servi à
construire une partie du framework. Les difficultés rencontrées ont néanmoins
été transformées en API réutilisables plutôt qu’en hacks applicatifs.

## 02:02 — PokediaAwra — Dette technique encore visible

PokediaAwra conserve actuellement un wrapper FFI Rust manuel d’environ 448
lignes, écrit avant les bindings générés. Il fonctionne et respecte l’API
publique, mais il ne représente plus le chemin recommandé. Le migrer vers le
crate Rust sûr supprimerait beaucoup de pointeurs, conversions GLib et blocs
`unsafe` locaux.

Le port contient aussi de nombreux rôles visuels publics. Ils sont isolés et
supportés, mais leur nombre montre que certaines compositions pourraient
maintenant migrer vers Page, Section, DataView, MasterDetail, DetailPane,
MetadataGroup, MetricRow et les autres composants typés ajoutés depuis.

## 02:02 — Awra — Priorité d’expérience développeur après 1.0

Le prochain gain important ne se situe plus principalement dans le blur ou le
rendu. Il consiste à rendre le chemin le plus simple également le meilleur :
bindings sûrs adoptés par les vraies applications, composants typés faciles à
découvrir, moins de rôles nécessaires, davantage d’exemples complets et une
documentation au niveau de maturité attendu d’un toolkit public.

Si Pokedia était recommencé aujourd’hui avec Awra 1.0, les modèles et la logique
métier resteraient les mêmes, mais la couche UI demanderait moins de FFI, moins
de compositions manuelles et presque aucun combat contre le thème ou la
transparence. C’est le signe le plus concret qu’Awra va dans la bonne direction.
