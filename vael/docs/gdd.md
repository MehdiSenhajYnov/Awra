# Vael — document de conception

*L'étoile est tombée. On l'a enchaînée. Elle rêve encore.*

Action-exploration 2D en vue de côté, exigeant et spectaculaire. Peinture numérique, lumière dynamique, effets lumineux (bloom, ondes de choc, ralentis).

## Univers

Il y a mille ans, une étoile est tombée. Les premiers rois de Vael ne l'ont pas laissée mourir : ils ont bâti leur royaume **dans son cadavre** et l'ont **enchaînée** pour boire sa lumière. Pendant des siècles, Vael a brillé.

Aujourd'hui l'étoile s'éteint. Sa lumière pourrit en **Pénombre**, une encre violette qui ronge les créatures et les pierres. Les habitants sont devenus des coquilles. Les chaînes grincent.

Vous êtes **la Porte-Étoile** : un éclat du cœur de l'étoile, détaché d'elle, qui s'est donné un corps. Votre arme est la **Lame Liée**, forgée dans une côte de l'étoile, reliée à vous par un fil de lumière. Vous descendez jusqu'au Cœur pour comprendre ce que l'étoile veut, et décider de ce qu'il faut faire des chaînes.

Le récit se lit dans le monde : stèles, fresques, personnages, objets. Trois fins selon ce que vous aurez compris et choisi.

## Le cœur du jeu : la Lame Liée

Votre épée n'est pas seulement une arme de corps à corps.

- **Lancer** : la lame part en ligne droite (horizontale, en diagonale ou vers le haut). Elle se plante dans les murs, les ennemis et les cristaux-ancres.
- **Plantée dans un mur**, elle devient une **prise** : on peut se tenir dessus. Dès le début, on grimpe des parois en lançant la lame.
- **Rappel** : la lame revient vers vous et **transperce tout sur son chemin**. Placer les ennemis entre soi et la lame, c'est le cœur du combat avancé.
- **Plantée dans un ennemi**, elle le **marque** : le rappel l'arrache avec de gros dégâts.
- **Saut d'Étoile** (déblocage) : vous vous téléportez sur la lame. Contre un ennemi marqué : **Exécution**.
- **Lien** (déblocage) : la lame plantée dans un anneau astral vous tire jusqu'à lui.

Sans la lame en main, vos coups sont des frappes de paume plus faibles : chaque lancer est un choix.

## Combat

- Combo de 3 coups, rapide, annulable par saut, dash ou lancer. Coup vers le haut, coup vers le bas en l'air (rebond).
- **Esquive parfaite** : un dash qui traverse une attaque au dernier moment déclenche l'**Éclipse**, un ralenti de 1,5 s, monde désaturé, vous en couleur.
- **Lumen** : jauge remplie en frappant (beaucoup plus avec l'Éclipse et l'Exécution). Elle sert à **se soigner** (maintenir) ou à lancer des **Arts**.
- **Arts** (bouton Art + direction) :
  - neutre — **Comète** : la lame part chargée et explose ;
  - haut — **Ascension** : tourbillon ascendant ;
  - bas — **Chute d'Astre** : plongeon et onde de choc.
  Chacun a une version supérieure à trouver. Plus tard : **Constellation**, l'art ultime à jauge pleine (temps figé, sept coups qui traversent l'écran).
- Arrêts sur image, ondes de choc, aberration chromatique, flash : chaque coup doit se sentir.

## Progression

| Zone | Capacité obtenue | Gardien |
|---|---|---|
| 1. La Couronne | Lame Liée (dès le départ), Sillage (dash) | Le Gardien Brisé |
| 2. Les Jardins Suspendus | Griffes (saut mural) | La Mère-Racine |
| 3. La Forge Éteinte | Saut d'Étoile (téléportation sur la lame) | Le Forgeron Creux |
| 4. Les Archives Englouties | Second Souffle (double saut) | Le Bibliothécaire Noyé |
| 5. Le Bastion des Chaînes | Lien (anneaux astraux) | Les Geôliers |
| 6. Le Firmament Inversé | Comète-Sillage (super dash qui brise le cristal) | L'Oiseau-Comète |
| 7. La Pénombre | — | La Reine de Pénombre |
| 8. Le Cœur | — | L'Enchaîneur, puis l'Étoile |

Objets : éclats de vie (4 = +1 vie), fioles de Lumen, **Sceaux** (équipements passifs à emplacements), forge de la lame (dégâts), Arts et leurs versions supérieures, cartes, fresques de récit.

## Économie

La **poussière d'étoile** tombe des ennemis. Elle s'achète chez les marchands (sceaux, cartes, éclats). À la mort, elle reste dans une **étoile filante** à l'endroit de la chute : il faut la frapper ou y lancer la lame pour la récupérer.

## Caméra et lisibilité

- Caméra douce : zone morte, anticipation dans la direction du regard, regard vers le bas en chute, jamais de zoom subit sauf mises en scène.
- Tremblements courts et directionnels, réglables (0 à 100 %).
- Ennemis : toute attaque a une anticipation visible (au moins 20 images) et un son.
