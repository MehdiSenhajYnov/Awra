# Carillon

*Les cloches se taisent. Le Silence monte.* / *The bells fall quiet. The Silence rises.*

Un metroidvania d’action exigeant en 2D. Sous la ville de Sonne, un carillon souterrain tenait le Silence à distance. Ses grandes cloches se sont fêlées, et vous êtes le dernier Sonneur.

Ce qui le distingue : **l’Écho**. Le jeu enregistre votre dernière seconde et demie. Avec une charge de Résonance, gagnée surtout par la parade parfaite (« Note juste »), un double spectral **rejoue exactement vos gestes** là où vous les avez faits : ses coups blessent et font sonner les cloches. Plus tard, le **Contretemps** vous laisse échanger votre place avec lui. Dans le jeu, cela sert à :

- doubler un combo ;
- poser des pièges d’avance ;
- prolonger un saut ;
- traverser un boss ;
- être à deux endroits à la fois.

La Résonance sert aussi à se soigner : chaque charge oblige à choisir entre soigner et rejouer.

Le document de conception complet est dans `docs/gdd.md`, la fiche Steam dans `docs/steam-page.md`.

## Contenu

- 82 salles (114 écrans), 9 zones, 7 Épreuves, 12 combats de boss (dont 3 Variations).
- 18 types d’ennemis, 16 Notes, 7 capacités, 20 partitions de récit.
- 2 fins, un mode Fêlé et une Salle des Variations chronométrée.
- FR/EN, clavier reconfigurable, manette, 3 emplacements de sauvegarde.
- Durée estimée : 5 à 7 h pour le chemin principal (voir le GDD).

## Développer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # monde, parcours complet, mécaniques, boss, traductions (environ 4 min)
npm run build
npm run desktop    # version bureau Electron
npm run package    # exécutable non signé dans release/
```

## Tests

- `tests/world.test.ts` vérifie que chaque ouverture de salle mène à une ouverture identique chez le voisin, qu’aucune salle ne se chevauche et que tous les éléments placés sont connus.
- `tests/reach.test.ts` fait parcourir le monde à **la vraie physique du joueur** avec des manœuvres scriptées : marche, sauts de plusieurs hauteurs, Glissando, double saut, escalade de cheminée, rebond sur les pointes, Appels enchaînés. Il prouve trois choses :
  - le jeu se termine dans l’ordre prévu ;
  - chaque objet est atteignable ;
  - chaque capacité est réellement nécessaire pour la zone suivante (pas de raccourci involontaire).
- `tests/mechanics.test.ts` couvre l’Écho, le Contretemps, la parade, le rebond, le soin, la mort et le Glas, les murs fragiles et les cloches jumelles.
- `tests/bosses.test.ts` : un robot invulnérable bat chacun des 9 boss et voit leurs 3 phases.

```bash
node tools/smoke.mjs http://localhost:5173 shots fr   # parcours de l'interface
node tools/tour.mjs http://localhost:5173 tour        # photos des zones et des boss
node tools/capsules.mjs store fr                      # icône et visuels Steam
```

## Assets

Les décors peints, portraits, icônes de Notes et d’objets et les illustrations de titre et de fin viennent du modèle d’image GPT. Les prompts sont dans `tools/assets_manifest.py`, et `tools/import_assets.py` les détoure et les convertit.

Le code produit le reste :

- le Sonneur, les ennemis et les boss, avec leurs animations ;
- le terrain ;
- les silhouettes d’arrière-plan ;
- les particules ;
- la musique et tous les sons.
