# Refusé

*Mutuelle Royale contre les Calamités — Service des sinistres.* / *Denied — the medieval insurer who says no.*

Un incrémental satirique dans un royaume de fantasy. Les sinistres affluent : grange brûlée par le dragon, chevalier changé en crapaud, fantôme qui réclame sa propre assurance-vie. Votre métier consiste à trouver la clause qui permet de les refuser, à tamponner, et à encaisser. Par la fenêtre, le village se dégrade à mesure que le scandale monte.

## Le jeu

- **Le bureau** : un dossier sur le pupitre, une main de clauses. On choisit une clause qui s'applique (feu, métamorphose, vol, monstre, fantôme, nuit…), puis on tamponne REFUSÉ. Les séries de refus du même genre augmentent les gains.
- **Le scandale** : chaque refus le fait monter, et le village se dégrade derrière la fenêtre en 4 états par royaume. À 100, c'est l'émeute : vitre brisée, perte d'écus, grève du personnel. Approuver un dossier calme le jeu.
- **Événements** : le Roi dépose un dossier (le refuser coûte la moitié des écus), les audits de la Guilde interdisent les clauses frauduleuses, et la nuit ouvre les clauses « délai expiré ».
- **Le personnel** travaille seul, y compris jeu fermé (8 h maximum, 16 h avec le Sablier) : clercs gobelins, hiboux messagers, machine à vapeur, oracle actuariel. Les archivistes, eux, calment le village.
- **10 améliorations**, **14 clauses** à acheter à la Guilde, **3 clauses légendaires**.
- **Procès** : 10 plaignants, une main fixe, 7 refus pour monter d'étage (Bureau → Étage → Tour). Le procès final se plaide contre le boss du royaume.
- **4 royaumes** (dragon, désert, mer, enfers), reliés par des **faillites frauduleuses** qui rapportent des parts de holding. Le conseil de la holding vend des bonus permanents.
- **Fin** : refuser l'apocalypse. Ensuite, l'exercice continue sans fin.
- **16 succès**, FR/EN, sauvegarde automatique, raccourcis clavier (1–9, A, R, Échap), version bureau Electron.

Durée : environ 3 h 30 pour un joueur actif (simulation), davantage en jouant à moitié inactif.

## Développer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # équilibrage par bots (actif et lent), traductions complètes
npm run build
npm run desktop    # version bureau Electron
npm run package    # exécutable non signé dans release/
```

## Tests visuels

```bash
node tools/smoke.mjs http://localhost:5173 shots fr      # premières minutes, émeute, premier procès
node tools/autoplay.mjs http://localhost:4173 shots fr   # partie entière via l'interface (sur un build servi)
node tools/capsules.mjs store fr                         # icône et visuels Steam
```

## Assets

Les illustrations (portraits, fenêtres, icônes, écran titre, fin) ont été générées avec le modèle d'image GPT dans un style d'enluminure de marge médiévale, puis triées à la main. `tools/assets_manifest.py` contient les prompts et `tools/import_assets.py` les convertit en WebP (détourage du fond blanc pour les icônes). La musique et les sons sont synthétisés en WebAudio.
