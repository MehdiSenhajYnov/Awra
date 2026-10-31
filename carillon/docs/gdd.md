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
| Déplacer | flèches / ZQSD | stick, croix |
| Sauter | Espace / C | A |
| Frapper (haut/bas selon la direction tenue) | X / J | X |
| Note juste (parade) | V / K | LB |
| Écho / Contretemps (maintenir) | F / L | Y |
| Accord (soin, maintenir) | A / U | B |
| Glissando (dash) | Maj / I | RB |
| Carte, inventaire | Tab / M | Select |
| Pause | Échap | Start |

Les touches sont reconfigurables.

## Physique (60 images/s, tuile de 20 px, écran de 32×18 tuiles)

| Mouvement | Valeur |
|---|---|
| Course | 3,1 px/image |
| Saut | 4,5 tuiles (saut variable) |
| Glissando | 3,6 tuiles en 12 images, sans gravité, une fois en l'air |
| Double saut | 3,3 tuiles |
| Mur | glissade à 2,5 px/image ; saut mural 3 tuiles en arrière |
| Rebond sur coup vers le bas (pogo) | 3,4 tuiles |

## Combat

- **Combo de 3 coups** : 1 dégât de base, 2 avec les améliorations d'étain.
- **Note juste** : fenêtre de 9 images (13 avec Fermata). Elle annule le coup reçu, étourdit les ennemis au contact, renvoie certains projectiles et rend 1 charge de Résonance.
- **Coup reçu** : 1 cloche de vie perdue, 1 s d'invulnérabilité, recul, gel de 6 images.
- **Mort** : vous réapparaissez au dernier lutrin. Votre bronze reste dans un **Glas** (cloche fêlée) à l'endroit de la mort. Frapper le Glas récupère le bronze ; mourir avant le perd.
- **Vie** : 5 cloches au départ, 4 éclats en donnent une de plus, jusqu'à 9.
- **Résonance** : 3 charges au départ, jusqu'à 6 avec les fioles.

## Progression

| Zone | Capacité gagnée | Grande cloche (boss) |
|---|---|---|
| 1. Le Beffroi | Écho | Le Sonneur Déchu |
| 2. Les Gouttières | Glissando | La Gargouille |
| 3. La Fonderie | Crampons (saut mural) | Mère Coulée |
| 4. Les Orgues | Contretemps | Le Souffleur |
| 5. La Crypte | Envolée (double saut) | Les Jumeaux Glas |
| 6. Le Jardin de Verre | Frappe (coup plongeant qui brise les dalles) | La Cantatrice |
| 7. Les Cisternes | Appel (traction vers les cloches-ancres) | Le Noyé |
| 8. L'Horlogerie | Clé du Bourdon | L'Échappement |
| 9. Le Bourdon | — | Le Silence (deux phases) |

## Contenu au lancement

- 9 zones et environ 100 salles.
- 9 boss principaux et 3 Variations (boss remixés, plus difficiles).
- 19 types d'ennemis.
- 16 Notes (équipements, à la manière de charmes) dans 3 à 6 emplacements.
- 12 éclats de cloche, 3 fioles de Résonance, 4 améliorations d'étain, 20 partitions de récit.
- 3 marchands et personnages, un lutrin par zone ou plus.
- Une carte automatique et des voyages rapides entre les lutrins découverts.
- Après la fin : **mode Fêlé** (dégâts doublés, pas de Glas) et **Salle des Variations** (enchaînement des boss).

## Durée visée

- Chemin principal : 5 à 6 h pour un joueur habitué au genre.
- 100 % : 8 h ou plus.
