# Carillon — document de conception

*Les cloches se taisent. Le Silence monte.*

Metroidvania d'action en 2D, exigeant, en vue de côté. Sous la ville de Sonne, un immense carillon souterrain tenait à distance le **Silence**, une encre qui dévore le son et la matière. Les grandes cloches se sont fêlées. Vous êtes le dernier **Sonneur** : une petite silhouette encapuchonnée armée d'un battant de cloche. Vous descendez réaccorder les sept grandes cloches, puis affronter le Silence au fond du monde.

## Ce qui le distingue

Le cœur du jeu est l'**Écho**.

- Le jeu enregistre en permanence vos 1,5 dernière seconde : positions, sauts et coups.
- Avec une charge de **Résonance**, vous libérez votre Écho. C'est un double spectral qui **rejoue exactement** ce que vous venez de faire, au même endroit. Ses coups font des dégâts et activent les mécanismes.
- Plus tard, le **Contretemps** vous laisse **échanger votre place** avec l'Écho à tout moment, avec quelques images d'invulnérabilité. Le mouvement devient une affaire de préparation : vous tracez une trajectoire, puis vous y revenez.
- La Résonance se gagne surtout par la **Note juste**, une parade à fenêtre courte, et un peu en frappant. Elle sert aussi à **se soigner**. Chaque charge pose donc la question : soigner, ou rejouer ?

Ce système crée un vrai plafond de compétence :

- coups doublés : l'Écho rejoue votre combo pendant que vous en refaites un ;
- pièges posés d'avance ;
- échanges en plein saut pour prolonger un déplacement ;
- esquives à travers les boss par échange ;
- énigmes où il faut être à deux endroits à la fois.

## Contrôles

| Action | Clavier | Manette |
|---|---|---|
| Déplacer | flèches / WASD (positions physiques) | stick, croix |
| Sauter (maintenir pour monter plus haut) | Espace / Z | A |
| Frapper (haut/bas selon la direction tenue) | X / J | X |
| Note juste (parade) | V / K | LB |
| Écho, puis Contretemps | F / L | Y |
| Accord (soin, maintenir) | C / U | B |
| Glissando (dash) ; Frappe : bas + Glissando en l’air ; Appel : Glissando près d’une cloche-ancre | Maj / I | RB / RT |
| Interagir (lutrin, personnage) | Haut | Haut |
| Carte | Tab / M | Select |
| Pause | Échap / P | Start |

Les touches du clavier sont reconfigurables dans les options.

## Physique (60 images/s, tuile de 20 px, écran de 32×18 tuiles)

| Mouvement | Valeur |
|---|---|
| Course | 3,1 px/image |
| Saut | 5 tuiles (saut variable, zoom de caméra ×1,2) |
| Glissando | 3,6 tuiles en 12 images, sans gravité, une fois en l'air |
| Double saut | 3,3 tuiles |
| Mur | glissade à 2,4 px/image ; saut mural vers l’arrière, escalade de cheminées de 4 tuiles |
| Rebond sur coup vers le bas (pogo, ennemis et pointes) | 3,4 tuiles |

## Combat

- **Combo de 3 coups** : 1 dégât de base, 2 avec les améliorations d'étain.
- **Note juste** : fenêtre de 9 images (13 avec Fermata). Elle annule le coup reçu, étourdit les ennemis au contact, renvoie certains projectiles et rend 1 charge de Résonance.
- **Coup reçu** : 1 cloche de vie perdue, 1 s d'invulnérabilité, recul, gel de 6 images.
- **Mort** : vous réapparaissez au dernier lutrin. Votre bronze reste dans un **Glas** (cloche fêlée) à l'endroit de la mort. Frapper le Glas récupère le bronze ; mourir avant le perd.
- **Vie** : 5 cloches au départ, 4 éclats en donnent une de plus, jusqu'à 9.
- **Résonance** : 3 charges au départ, jusqu'à 6 avec les fioles.

## Progression

L’Écho est donné dès le Beffroi par Maître Glas. Chaque grande cloche rendue donne la capacité qui ouvre la zone suivante. Le vérificateur de parcours (`tests/reach.test.ts`) prouve à la fois que cet ordre est faisable et que chaque capacité est réellement nécessaire.

| Zone | Accès nécessite | Grande cloche (boss) | Récompense |
|---|---|---|---|
| 1. Le Beffroi | — (Écho trouvé sur place) | Le Sonneur Déchu | Glissando |
| 2. Les Gouttières | Glissando | La Gargouille | Crampons |
| 3. La Fonderie | Crampons | Mère Coulée | Contretemps |
| 4. Les Orgues | Contretemps (grilles à minuterie) | Le Souffleur | Envolée |
| 5. La Crypte | Envolée | Les Jumeaux Glas | Frappe |
| 6. Le Jardin de Verre | Frappe (dalles fêlées) | La Cantatrice | Appel |
| 7. Les Cisternes | Appel (eau noire) | Le Noyé | Fiole de Résonance |
| 8. L’Horlogerie | Victoire sur le Noyé | L’Échappement | Portée de Notes |
| 9. Le Bourdon | Les huit grandes cloches | Le Silence | Fin |

Deux fins. La meilleure demande d’avoir écouté Maître Glas après la huitième cloche, puis de faire sonner ensemble les trois cloches de l’arène finale (avec ses Échos).

## Contenu au lancement

- **82 salles** (114 écrans) dans 9 zones, dont 7 Épreuves optionnelles (une par capacité) et 3 Variations.
- **12 combats de boss** : 9 grandes cloches à trois phases et 3 Variations plus rapides et plus résistantes (Sonneur Déchu, Jumeaux Glas, Échappement).
- **18 types d’ennemis**, avec 15 comportements : rampants, volants, gardes à bouclier, tourelles, sauteurs, bretteurs, chargeurs, drainants, plongeurs, engrenages, et l’Ombre qui marche là où vous étiez.
- **16 Notes** dans 3 à 6 emplacements : 11 cachées dans le monde, 5 vendues.
- **19 éclats de cloche** (17 à trouver, 2 en boutique) : 16 suffisent pour les 4 cloches de vie supplémentaires. 7 fioles de Résonance (6 charges au plus). 3 Portées supplémentaires (6 emplacements). 4 niveaux d’étain pour le marteau.
- **20 partitions de récit**, 5 personnages (Maître Glas, Madame Tierce, la Fondeuse, Fa, le Gardien muet).
- Carte automatique, voyage rapide entre les lutrins, Glas à récupérer après la mort.
- Ennemis qui restent morts jusqu’au prochain repos.
- Après la fin : **mode Fêlé** (dégâts doublés, pas de Glas) et **Salle des Variations** (les 9 gardiens à la suite, chronométrés).

## Durée visée

Estimation, pas une mesure :

- Chemin principal : 5 à 7 h pour un joueur qui découvre (114 écrans, 9 boss, morts et allers-retours compris).
- 100 % : 8 à 10 h (Épreuves, Variations, objets cachés).

Un robot invulnérable qui frappe sans esquiver met entre 12 s et 1 min 45 par boss : ce sont des durées planchers. Un joueur qui doit esquiver met 2 à 4 fois plus longtemps par tentative.
