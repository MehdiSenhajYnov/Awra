# Phare

*Le gardien de Kerbrume.* / *Lighthouse — the keeper at the bottom of your screen.*

Un compagnon de bureau. Le phare de Kerbrume vit dans un bandeau en bas de l'écran pendant que vous travaillez. Les navires passent seuls, paient leurs droits de feu et s'inscrivent au registre. De temps en temps, un coup d'œil : huile, lentille, mécanisme. Quand la tempête arrive, c'est vous qui guidez les navires.

## Le jeu

- **Le bandeau** : ciel, mer, météo, jour et nuit, phare et maison sont dessinés par le code ; les navires, les épaves et la chatte Bernique sont des aquarelles.
- **Calendrier** : un jour de jeu dure 20 minutes, une saison deux semaines de jeu (environ 4 h 40), et le temps continue jeu fermé.
- **28 navires** avec leurs habitudes. Le ferry ne passe que le mardi et le paquebot que le dimanche. Le brise-glace ne vient qu'en hiver. Le vaisseau fantôme demande une nuit de brouillard et la lentille du 1er ordre.
- **Entretien** : huile, lentille et mécanisme s'usent. Une lampe négligée rapporte moins, mais rien de grave n'arrive jamais.
- **Tempêtes**, réglables (jamais, 30, 45 ou 90 min). On garde le faisceau sur chaque navire pour l'écarter des récifs, et la corne de brume aide. Un navire échoué laisse une épave et son équipage rentre à terre. Si personne n'est là, les navires attendent au mouillage.
- **16 épaves** à repêcher, des doubles à revendre, et 12 messages en bouteille d'autres gardiens.
- **Bouteilles entre amis**, sans serveur. Un code texte transporte un cadeau et un navire de votre registre. Le code est vérifié par une somme de contrôle et ne s'ouvre qu'une fois.
- **Atelier** : 5 lentilles de Fresnel (du 6e au 1er ordre) et 8 améliorations, dont la radio TSF avec bulletin météo et valse.
- **Maison** : 10 décorations visibles sur le bandeau, 3 veillées par jour et 9 distinctions.
- **Absences** : Yann résume ce qu'il a noté pendant que le jeu était fermé (12 h au plus). Les navires légendaires ne se montrent qu'au gardien présent.
- **Version bureau** : fenêtre sans cadre, avec un mode bandeau ancré en bas de l'écran et toujours au premier plan (réglable). Le jeu se rouvre dans la forme où on l'a quitté.

Durée : la simulation complète le registre en 20 à 30 heures de présence. Le jeu reste ouvert ensuite, sans fin.

## Développer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # rythme (joueur présent, absences), bouteilles, traductions
npm run build
npm run desktop    # version bureau Electron (ajouter -- --strip pour démarrer en bandeau)
npm run package    # exécutable non signé dans release/
```

## Tests visuels

```bash
node tools/smoke.mjs http://localhost:5173 shots fr      # premier lancement, nuit, entretien, tempête, onglets, bouteille, absence, bandeau
node tools/autoplay.mjs http://localhost:4173 shots fr   # une centaine de jours de jeu via l'interface (sur un build servi)
node tools/capsules.mjs store fr                         # icône et visuels Steam
```

## Assets

Les navires, épaves, Yann, Bernique et l'aquarelle du titre viennent du modèle d'image GPT (prompts dans `tools/assets_manifest.py`). `tools/import_assets.py` détoure les fonds blancs et convertit en WebP. Le décor du bandeau et tous les sons (mer, pluie, vent, corne, radio) sont produits par le code.
