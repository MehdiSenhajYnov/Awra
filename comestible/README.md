# Comestible ?

*Une horreur de comptoir à Vaux-les-Brumes, 1887.* / *Edible? — a counter horror.*

Vous héritez de l'officine de votre oncle mycologue, mort dans les bois. Le village a faim. Chaque nuit, des villageois posent leur panier sur votre comptoir. À vous de dire ce qui se mange, ce qui tue, et ce qui n'est pas un champignon.

## Le jeu

- **Campagne de 10 nuits** (environ 1 h 30), une règle nouvelle par nuit, dans l'esprit de *Papers, Please*.
- **20 espèces fictives** organisées en paires de sosies (cèpe / bolet menteur, coulemelle / lépiote veuve…), toutes illustrées en planches naturalistes.
- **8 outils** :
  - la loupe ;
  - les sels (l'odeur) ;
  - le couteau (la coupe, le lait, le bleuissement) ;
  - la règle ;
  - la sporée ;
  - la bougie (ce qui luit dans le noir) ;
  - la cuillère (goûter, à vos risques) ;
  - Mousse, la chatte, qui se trompe parfois.
- **4 tampons** : Comestible, Toxique, Au feu, Saisi (pendant le décret du comte).
- **Les imitateurs** : à partir de la nuit 5, des choses prennent la forme de champignons. Un seul outil les trahit.
- **Les Cueilleurs** : à partir de la nuit 7, il faut vérifier les mains et dénoncer au garde.
- **Les conséquences arrivent au matin** :
  - la *Gazette* annonce les malades, les morts et les disparus ;
  - le registre fait les comptes : loyer croissant, chandelles, repas ;
  - les villageois morts ne reviennent plus.
- **7 fins** :
  - fins de campagne : L'Officine, Le Mycologue de Vaux, La Fille des bois, La Brume ;
  - fins par échec : La Cueillette, Arrêté, Saisi.
- **Mode Saisons** : nuits sans fin avec toutes les règles. Il se débloque après la campagne et garde un record.
- **Options** :
  - français et anglais ;
  - mode Détendu, sans bougie à surveiller ;
  - volumes séparés ;
  - secousses désactivables ;
  - grand texte ;
  - raccourcis clavier qui suivent la disposition AZERTY ou QWERTY.
- **Audio** : il est entièrement synthétisé en WebAudio, sans aucun fichier son.

Toutes les espèces sont inventées. Ne vous servez jamais d'un jeu pour identifier un vrai champignon.

## Développer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # règles, équilibrage et cohérence des traductions
npm run build      # build statique dans dist/ (jouable sur itch.io)
```

Pour la version bureau (Steam), le wrapper Electron charge `dist/` :

```bash
npm run desktop    # lance le jeu en plein écran (F11 pour basculer)
npm run package    # produit un exécutable non signé dans release/
```

Pour Steam, il faut déposer le contenu de `release/<plateforme>-unpacked/` comme dépôt dans Steamworks.

## Organisation

| Dossier | Contenu |
|---|---|
| `src/data/` | Espèces, personnages, scénario des nuits |
| `src/game/` | Règles, verdicts, économie, fins (logique pure, testée) |
| `src/i18n/` | Textes français (référence) et anglais |
| `src/ui/` | Scènes : titre, intro, nuit, guide, gazette, registre, fins |
| `src/audio.ts` | Ambiance, musique et bruitages procéduraux |
| `public/img/` | Illustrations (WebP) |
| `electron/` | Coquille bureau |
| `tools/` | Pipeline d'assets et tests visuels Playwright |

## Assets

Les illustrations sont générées avec le modèle d'image GPT, par lots, via le lanceur Codex (`recrime-cloud-launcher`). Pour régénérer un lot :

1. Afficher le prompt du lot avec `python3 tools/assets_manifest.py <lot>`. Les lots sont listés par `--list`.
2. Envoyer ce prompt au workflow `launch.yml` (environnement `GlobalGPTIdea`).
3. Récupérer l'artefact `codex-result`.
4. Importer les images :

```bash
python3 tools/import_assets.py <dossier-assets_out>
```

L'import détoure les fonds blancs par remplissage depuis les bords (les champignons blancs restent intacts), puis convertit en WebP.

Steam impose de déclarer le contenu généré par IA dans la section prévue de la page du jeu.

## Tests visuels

```bash
node tools/smoke.mjs http://localhost:5173 shots fr      # parcours titre → nuit 1 → matin
node tools/night_shot.mjs http://localhost:5173 shots 7  # saute à une nuit et utilise tous les outils
```
