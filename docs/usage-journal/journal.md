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

## 03:19 — PokediaAwra — La finition d’un vrai produit révèle les petits contrats

La comparaison côte à côte avec Pokedia standard a montré que la matière et le
blur étaient déjà cohérents, mais que plusieurs petits contrats par défaut
restaient trop faibles : un widget central de header s’étirait verticalement,
un dropdown publiait sa sélection avant le clic, une page épinglée imposait une
icône Home, et une action réversible de tableau se transformait en gros carré
violet.

Ces défauts ont été corrigés dans Awra. Les widgets de header sont centrés par
défaut, les dropdowns ne valident qu’à l’activation, les tabs ont une identité
optionnelle et distribuent l’espace, les actions inline disposent d’un état
sélectionné discret, et les scrollbars de données se révèlent seulement quand
elles sont utiles. Pokedia ne contient toujours aucun CSS local.

## 03:19 — PokediaAwra — Densité et couleur de domaine

Les types Pokémon ont servi de test sévère aux badges : une couleur de texte
qui alternait entre noir et blanc cassait la cohérence du vocabulaire, tandis
qu’un blanc forcé sur les anciennes teintes jaunes ou cyan ne respectait pas le
contraste. La solution retenue combine un contenu blanc stable fourni par
AwraBadge et une palette Pokedia volontairement assombrie ; les dix-huit teintes
restent reconnaissables et dépassent toutes un ratio de contraste de 4,5:1.

## 03:58 — PokediaAwra — Les métriques peintes ne suffisent pas

La dernière comparaison géométrique a révélé un contrat GTK facile à manquer :
le padding CSS d’un widget final utilisant `GtkBinLayout` améliorait la peinture
du badge sans toujours augmenter sa taille mesurée. Les types semblaient donc
encore comprimés dans une vraie table. `AwraBadge` porte maintenant ses insets
sur son contenu mesuré, avec un test de taille minimale ; le blanc, le contraste
et la densité deviennent un contrat du composant plutôt qu’une heureuse
conséquence du parent.

## 03:58 — PokediaAwra — Une barre d’onglets est une géométrie complète

Partager la largeur entre onglets ne suffisait pas : le bouton interne gardait
sa taille naturelle et tassait titre et fermeture à gauche. `AwraTabView`
possède désormais une capsule continue, des séparateurs discrets et une cellule
interactive qui occupe réellement toute sa part. Pokedia ne règle que son
contenu et son shell ; les formes, le focus, le hover et la distribution restent
la responsabilité d’Awra.

Le même passage a clarifié la frontière des responsabilités : Awra fournit les
métriques stables des badges, onglets, filtres et actions inline ; Pokedia décide
que sa colonne Type comporte deux emplacements et qu’un type unique les couvre
pour être centré. C’est une composition métier, pas une règle universelle du
framework.

## 04:14 — PokediaAwra — Les tests ne remplacent pas la comparaison Dark

Une première correction des onglets passait les tests et paraissait correcte
dans la capture Xvfb claire, mais restait insuffisante face au rendu Dark réel :
le puits était trop sombre, le bouton épinglé trop serré et les séparations trop
longues. La navigation souffrait aussi d’une règle de neutralisation plus
spécifique qui annulait son hover.

La correction suivante a été validée avec des états de pointeur déterministes :
capsule translucide, bouton épinglé entièrement contenu, séparateurs verticaux
courts et hover de navigation visible. Ce cas rappelle que les gates techniques
prouvent la stabilité, mais qu’une décision esthétique doit aussi être comparée
dans l’apparence artistique de référence.

## 21:01 — PokediaAwra — Le débordement des onglets est un contrat de layout

Les captures complètes de Pokedia Standard ont montré que la barre ne se
résumait pas à une capsule et quelques séparateurs. Avec peu de pages, chaque
onglet grandit jusqu’à une largeur maximale puis laisse respirer la fin du rail.
Avec davantage de pages, les cellules se contractent uniformément jusqu’à un
minimum. Au-delà, seul le rail dynamique défile : l’onglet épinglé reste fixe et
la fenêtre ne change jamais de largeur minimale.

`AwraTabView` possède maintenant un layout privé dédié à cette règle, un
viewport horizontal sans scrollbar décorative, la conversion de la molette
verticale en déplacement horizontal et la révélation automatique de la page
sélectionnée. Les fermetures non pertinentes restent invisibles et non
cliquables, mais conservent leur espace afin que les titres ne sautent pas. Les
séparateurs adjacents au hover et à la sélection disparaissent par opacité, sans
modifier la géométrie.

Le test de sortie ouvre quinze onglets dans une fenêtre de 820 px, prouve que la
fenêtre reste bornée, que le rail déborde et que la sélection du dernier onglet
fait défiler le viewport. Cette fois, le comportement observé est devenu un
invariant mesuré plutôt qu’une simple approximation visuelle.

## 21:21 — PokediaAwra — Un grand rayon ne constitue pas un cercle

La dernière comparaison a isolé une erreur récurrente : appliquer un rayon
« pill » à un bouton rectangulaire ne le rend pas circulaire. Le Home épinglé
peignait en plus son fond sur une cellule qui contenait aussi le séparateur ; sa
surface s’étirait donc même si l’icône seule semblait correctement dimensionnée.

`AwraTabView` distingue maintenant explicitement les formes. Un onglet épinglé
icon-only reçoit une allocation carrée de 36 px et peint uniquement ce carré ;
le séparateur reste un sibling stable et visible. Les fermetures contextuelles
reçoivent une allocation carrée indépendante de 22 px. Les tests mappés
vérifient largeur égale à hauteur et les tailles exactes, afin qu’une règle GTK
ou un futur changement de padding ne puisse plus les transformer silencieusement
en ovales. Les boutons texte restent, eux, des rectangles arrondis.

## 22:02 — PokediaAwra — La capsule ne doit pas posséder le séparateur

La vérification suivante a isolé une seconde erreur structurelle dans la barre
d’onglets : même avec des tailles carrées correctes, peindre le hover et la
sélection sur la cellule complète permettait encore à la capsule de consommer
l’espace du séparateur. Deux onglets accentués côte à côte pouvaient alors
sembler collés, et les deux extrémités du rail n’obéissaient pas au même inset.

Chaque cellule d’`AwraTabView` sépare désormais trois responsabilités : une
capsule interactive interne, sa fermeture circulaire éventuelle et un
séparateur sibling qui ne participe jamais au fond hover/selected. Home reste
un repère carré de 36 px dans une zone épinglée fixe ; les onglets dynamiques
gardent une respiration explicite entre capsules ; le dernier onglet supprime
seulement l’espace de son séparateur terminal. Les tests mappés prouvent le
centrage de l’icône à un demi-pixel, un espace minimal de 6 px entre deux
capsules accentuées et des marges gauche/droite symétriques à un pixel près.

Cette passe a aussi révélé un piège de validation : lancer Pokedia avec le même
identifiant d’application activait l’instance déjà ouverte, laquelle conservait
l’ancienne bibliothèque Awra en mémoire. Les captures sont maintenant faites
sur un bus D-Bus privé et les smoke tests utilisent un répertoire de données
temporaire. Ils ne peuvent donc plus valider une ancienne instance ni modifier
le workspace réel du développeur.

## 22:25 — PokediaAwra — Le titre et le rail suivent l’intention utilisateur

La barre restait imparfaite sur deux comportements subtils. D’abord, les
transitions hover déclenchées lorsque les onglets défilaient sous le pointeur
replanifiaient la révélation de la page sélectionnée. Le rail revenait donc vers
la sélection et empêchait d’explorer les pages situées après elle. La révélation
automatique ne se produit maintenant qu’après un vrai changement de sélection ;
un geste de scroll annule immédiatement toute correction encore en attente.

Ensuite, le titre et la fermeture partageaient un layout horizontal. Même
invisible, la fermeture réservait de la largeur et décalait le texte. La capsule
utilise désormais un overlay : le titre possède le centre géométrique complet,
tandis que la fermeture carrée se superpose à son extrémité. Un renderer privé
applique un véritable masque alpha de 18 px aux titres trop longs au lieu d’une
ellipse dure. Le comportement s’inverse également en RTL.

Les tests couvrent maintenant le centre avant/après sélection, le débordement
du titre, le maintien du rail à son extrémité pendant un hover et l’isolation
face à un thème hostile. Une capture Dark avec vingt-deux onglets a confirmé
les mêmes proportions dans Pokedia.

## 23:12 — PokediaAwra — La respiration prime sur le nombre d’onglets visibles

Une comparaison à géométrie de fenêtre comparable avec Pokedia Standard a
montré pourquoi la nouvelle mécanique, pourtant plus robuste, paraissait encore
moins premium :
son pas minimal de 118 px faisait entrer un onglet supplémentaire dans le même
espace. Les séparateurs formaient alors une palissade, les noms ordinaires
atteignaient trop tôt leur fondu et la capsule sélectionnée perdait de la
présence. Le minimum est désormais de 132 px. Le rail défile donc légèrement
plus tôt, mais la fenêtre reste strictement bornée et l’exploration au-delà de
la sélection reste libre.

La même comparaison a révélé une réservation fantôme dans `AwraHeader` : le
groupe `GtkWindowControls` de début occupait de la largeur même lorsqu’il était
vide, et le conteneur de titres vide ajoutait encore un espacement. Awra retire
désormais ces groupes de la mesure, centre réellement le widget médian et lui
donne une largeur confortable qui se contracte sans imposer de nouvelle largeur
minimale à la fenêtre. Le bouton de workspace a aussi retrouvé la largeur
compacte de la référence.

Des tests mappés figent à présent le pas des onglets, le centrage du titre malgré
la fermeture superposée, le scroll libre après sélection et le centrage du
contrôle de header à un pixel près. Cette passe confirme qu’une sensation
premium dépend souvent de la quantité d’espace volontairement laissée vide,
pas d’un effet supplémentaire.

# 2026-08-24

## 02:19 — PokediaAwra — Le bord du viewport fait partie du composant

La comparaison finale avec la barre de Pokedia Standard a mis en évidence trois
écarts encore liés à la primitive Awra : Home conservait une faible capsule au
repos, le rail réservait trop d’air vertical autour des onglets et une capsule
partiellement visible se terminait sur la coupe dure du `GtkScrolledWindow`.
Ces détails indépendants donnaient ensemble l’impression que les onglets
étaient posés dans la barre plutôt qu’intégrés à celle-ci.

Home est désormais totalement transparent au repos ; seuls hover et selected
font apparaître son cercle de 36 px. L’inset interne du rail est ramené à 1 px,
soit 2 px visibles par bord autour du repère Home une fois la bordure comprise.
Enfin, un wrapper de rendu privé applique un masque alpha de 20 px uniquement
aux bords où du contenu reste à parcourir. Une capsule hover ou selected peut
donc entrer et sortir du viewport sans créer de tranche verticale, y compris en
RTL, tandis que le scroller GTK conserve son comportement natif.

Le test géométrique échoue maintenant si l’inset vertical dépasse 3 px et
vérifie la présence du masque autour du scroller. La suite Awra (27 tests), les
tests et le lint Rust de Pokedia ainsi que la frontière d’API publique restent
valides. Aucun style local n’a été ajouté à Pokedia pour obtenir ce résultat.

## 02:41 — PokediaAwra — La couleur d’une catégorie se suffit à elle-même

Les badges de types révélaient un liseré clair que `AwraBadge` ajoutait
systématiquement aux couleurs personnalisées. Sur une suite dense de capsules,
ce rim fragmentait les aplats et donnait à chaque type l’aspect d’un petit
bouton. La référence Pokedia montre au contraire que la silhouette, la couleur
pleine et le texte blanc suffisent à identifier la catégorie.

Le rendu `custom-color` est désormais entièrement borderless. La couleur et
les métriques restent contrôlées par Awra, le texte reste blanc et stable en
Light/Dark, mais aucun outline ou highlight décoratif n’est ajouté. Ce choix
vaut pour tous les vocabulaires de catégories utilisant la primitive publique,
pas seulement pour les types Pokémon.

## 02:56 — PokediaAwra — Une miniature de domaine reste une primitive d’onglet

Les onglets Pokémon gagnent leur sprite avant le titre pour accélérer le
repérage visuel. L’ancien contrat d’`AwraTabView` ne savait afficher que des
icônes nommées du thème. Awra accepte maintenant une `GtkImage` applicative
optionnelle et garde la maîtrise de sa taille, de son espacement, des états et
de l’overflow. Pokedia alimente cette image avec son chargeur asynchrone sans
reconstruire la barre d’onglets.

# 2026-08-25

## 02:04 — PokediaAwra — Un dialogue court doit assumer sa hauteur naturelle

Les dialogues de workspace révélaient deux défauts génériques. Le bloc de
titres d’`AwraHeader` remplissait verticalement le header : avec un seul titre,
`GtkBox` le plaçait en haut tandis que le contrôle de fermeture restait centré.
Le texte et la croix appartenaient donc visiblement à deux lignes différentes.
Le bloc de titres possède maintenant un alignement vertical central explicite,
couvert par un test de géométrie mappée.

`AwraDialog` imposait aussi une hauteur initiale de 250 px, puis Pokedia en
imposait une de 230 px à ses formulaires. Cette valeur laissait une bande vide
sous les actions dès que le contenu était court. Awra ne fixe désormais que la
largeur par défaut ; la hauteur provient du contenu. Pokedia applique le preset
public `OVERLAY` à ses contenus et ne définit plus que la largeur souhaitée.
Des captures isolées des dialogues New Workspace et Manage Workspaces ont
confirmé des marges finales symétriques sans toucher aux données utilisateur.

## 02:23 — PokediaAwra — Une action discrète doit quand même répondre

Le formulaire Rename Workspace a révélé un conflit de spécificité dans la
grammaire des boutons. L'apparence Ghost annulait la couleur de fond après la
règle générique `:hover` : Cancel restait donc un simple texte, même sous le
pointeur. Le primaire simulait quant à lui son survol avec une ombre inset de
999 px, dont le clipping GTK produisait une seconde masse violette peu nette.

Awra définit maintenant explicitement les états hover et pressed de Ghost et
remplace le voile du primaire par un rim intérieur contenu dans sa silhouette ;
la couleur d'accent et son contraste restent stables. Dans les dialogues
Pokedia, Cancel utilise Secondary : l'action est identifiable au repos, puis
renforce son plan au survol. Ghost reste disponible pour les actions inline
réellement calmes. La décision appartient donc au vocabulaire public du
framework et non à un style local du consumer.

## 03:44 — PokediaAwra — Un binding et des composants, pas une couche de traduction

La revue finale du port a isolé deux dettes qui n'étaient plus justifiées : une
façade Rust locale de 37 appels `unsafe` et des rôles visuels qui remplaçaient
encore des composants désormais disponibles. Pokedia dépend maintenant du
crate sûr officiel `awra`; l'apparence, l'accent, les layouts, les widgets et
les rôles passent par cette projection GIR unique. Une gate interdit tout
retour de `extern "C"`, `awra-sys` ou d'un module `src/awra.rs` dans le projet.

La même passe remplace les rôles de composition par `AwraCard`, `AwraSection`,
`AwraFormRow`, `AwraFilterBar`, `AwraStatusBanner`, `AwraEmptyState`,
`AwraBadge`, `AwraStatBar` et `AwraMetricRow`. Le besoin tabulaire a conduit à
faire posséder à `AwraListView` son viewport et son header optionnel : Pokedia
ne reconstruit plus une table avec un scroller, trois rôles et un container.
Les rôles restants décrivent uniquement le domaine (types, matchups, matrice,
relations, sprites) ou une ligne GTK dont le comportement doit rester GTK.

# 2026-10-23

## 01:45 — KeyToMusicAwra — Un clavier, un lecteur et une zone de dépôt génériques

KeyToMusic est une table de sons : chaque touche du clavier déclenche des
sons, avec des pistes, des formes d'onde, un point de départ et une
découverte de morceaux. Préparer son portage natif a montré que Awra n'avait
ni touche, ni clavier physique, ni capture de raccourci, ni forme d'onde, ni
ligne de lecture. Les reconstruire dans l'application aurait exigé du CSS
local, du dessin GSK et de la sémantique clavier que le contrat des
consommateurs interdit, et ces besoins ne sont pas propres à KeyToMusic :
lanceur de macros, éditeur de raccourcis, lecteur de podcasts ou importateur
de fichiers les partagent.

Décisions confirmées :

- `AwraKeyCap` peint la matière depuis les tokens (puits pour une touche
  libre, cap pour une touche liée) ; teinte, bordure de catégorie, badge,
  sélection, impulsion de lecture et filtrage ne sont que des états de
  peinture, statiques en mouvement réduit.
- `AwraKeyboardView` identifie les touches par `KeyboardEvent.code`, suit la
  disposition logique active via GDK (AZERTY affiche bien `A` sur `KeyQ`),
  garde une géométrie physique non miroir en RTL et réutilise
  `GtkSelectionMode` plutôt qu'un nouvel enum.
- Les tableaux et listes passent par des `strv`, des tableaux annotés et
  `GdkFileList` : Python, Vala et Rust reçoivent des types natifs sans
  surcouche.
- `AwraDropZone` émet `browse-requested` au lieu d'embarquer un sélecteur de
  fichiers : la règle des deux scénarios démontrés reste valable pour les
  pickers.
- Les toasts gagnent une action (« Annuler ») liée à une `GAction`, sans
  changer `show_message()`.

À tester dans KeyToMusicAwra : le glisser-déposer réel sur les touches (GTK
n'offre pas de synthèse publique d'un drop) et la capture de raccourcis
lorsque des accélérateurs d'application sont actifs.

## 02:10 — KeyToMusicAwra — Premier assemblage de l'application réelle

L'application complète (clavier, inspecteur, pistes, ajout de sons, Découvrir,
Mood AI, Bibliothèque, Réglages) a été assemblée sur les nouveaux composants
puis pilotée pour de vrai sous X11 (Xvfb + XTEST) avec le profil d'un
utilisateur. Quatre défauts génériques sont apparus et ont été corrigés dans
Awra plutôt que contournés :

- **Boutons dans le suffixe d'`AwraActionRow` : confirmé, corrigé.** La rangée
  est un `GtkButton`, dont le geste de clic travaille en phase de capture : il
  réclamait chaque clic avant que les boutons du suffixe ne le voient. Un
  « + » ou une corbeille posés en suffixe ne réagissaient jamais. Le geste
  passe en phase de bouillonnement ; un test vérifie la phase.
- **Légendes de clavier sur un backend sans keymap fiable : corrigé.** Sous
  Broadway, `gdk_display_translate_key()` renvoyait des keyvals sans caractère
  et la vue affichait `0xa`, `0xb`… Une touche de disposition dont la
  traduction n'est ni imprimable ni morte garde désormais sa légende physique.
- **Traductions jamais chargées : corrigé.** Awra n'appelait pas
  `bindtextdomain()`, si bien que le domaine `awra-1` ne pouvait venir que du
  répertoire par défaut du système. `awra_init()` le lie au préfixe
  d'installation, ou à `$AWRA_LOCALEDIR` (exporté par `meson devenv`) pour un
  arbre de build. Le catalogue français est ajouté.
- **Focus volé par `GtkFlowBox` : leçon côté application.** Un
  `AwraShortcutCapture` placé dans un `GtkFlowBox` démarrait l'écoute puis
  l'annulait aussitôt : l'enfant de la flowbox prenait le focus au même clic.
  Rien à changer dans Awra, mais à retenir : pas de contrôle interactif dans un
  enfant de flowbox focusable.

Ce qui a bien marché sans retouche : `AwraEdgePanel` comme panneau d'ajout
flottant, `AwraMediaRow` pour le dock des pistes, `AwraWaveformView` en flux
progressif, les toasts avec action « Annuler » liés à `win.undo`, et la palette
de commandes construite depuis un `GMenuModel`. Aucune ligne de CSS locale
dans l'application.

Encore à vérifier sur un vrai bureau Wayland : le flou natif, le
glisser-déposer de fichiers sur les touches et la capture de raccourcis
pendant que la détection globale du clavier est active.
