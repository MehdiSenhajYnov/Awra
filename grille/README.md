# Grille

*L'Écho du Soir, Paris, 1956. Bouclage à minuit.* / *Grid — the crossword roguelite.*

Vous êtes verbicruciste à l'essai. Chaque édition compte trois grilles : lundi, mercredi, et le dimanche du Masque, qui impose une contrainte. Atteignez l'objectif de score avec un nombre limité de mots, puis passez à la papeterie.

## Le jeu

- **8 éditions × 3 grilles**, puis un mode « édition spéciale » sans fin.
- **Pose des mots** : on clique une case puis on tape au clavier. Les touches suivent le caractère imprimé, donc AZERTY et QWERTY fonctionnent. Chaque mot doit croiser une lettre déjà posée, et tous les mots formés doivent exister.
- **Score** : points × mult. Les points viennent des lettres, le mult de la longueur. Chaque croisement multiplie par 1,5. **Une définition résolue multiplie par 5.**
- **24 stylos**, des jokers permanents (5 au plus).
- **8 encres** à usage unique (2 au plus).
- **8 boss du dimanche** : Censure (pas de E), grève, grand format 11×11, mots de 4 lettres minimum, coquilles, défausses gelées, le Masque (sans définitions), main de 6 lettres.
- **4 papeteries** (decks) à débloquer, **6 niveaux de bouclage**, **grille du jour** à graine fixe.
- **Grilles en français et en anglais**, indépendamment de la langue de l'interface :
  - environ 160 définitions écrites pour le jeu dans chaque langue ;
  - dictionnaires de 288 000 mots en français et 256 000 en anglais, normalisés sans accents comme dans les grilles de presse.
- **Indice de Mme Lenoir** (1 F) : il montre une case où passe un mot jouable, ou dit qu'aucun mot n'est possible.
- **Aucune image générée** : l'interface est entièrement typographique. Aucun contenu visuel ne relève de la déclaration IA de Steam ; seuls les textes ont été rédigés avec l'aide d'une IA.

## Développer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # dictionnaires, définitions, règles de pose, équilibrage par bots, traductions
npm run build
npm run desktop    # version bureau Electron
npm run package    # exécutable non signé dans release/
```

## Équilibrage

`tests/engine.test.ts` fait jouer deux bots sur 12 parties par langue. Les deux utilisent le solveur `src/game/solver.ts`.

- **Bot exhaustif** : il joue le meilleur mot possible et gagne environ un tiers des parties.
- **Bot « humain »** : il joue des mots courants de 6 lettres au plus, de valeur moyenne, et s'arrête vers l'édition 6.

## Données

- `public/dict/fr.txt` et `public/dict/en.txt` sont générés depuis `an-array-of-french-words` et `an-array-of-english-words` (MIT) : mots de 2 à 13 lettres A–Z, sans accents.
- `src/data/clues.ts` contient les définitions. Les tests vérifient que chaque réponse est au dictionnaire.

## Tests visuels

```bash
node tools/smoke.mjs http://localhost:5173 shots fr      # première grille tapée au clavier
node tools/autoplay.mjs http://localhost:5173 shots fr   # partie entière via l'interface
node tools/capsules.mjs store fr                         # icône et visuels Steam
```
