# Contrebande

*Principauté de Grisonie, 1974. Tout est rationné, sauf l'audace.* / *Contraband — a suitcase roguelite.*

Vous êtes passeur. Vous devez de l'argent à tante Olga, receleuse. Pour la rembourser, vous passez la douane avec des valises pleines de bananes, de disques de jazz et de bas nylon. Le règlement des douaniers est affiché chaque jour : c'est un puzzle à déjouer.

## Le jeu

- **Une tournée**, c'est 8 frontières de 3 passages chacune. Le troisième passage se fait face au chef du poste (Kolb, Pilsky et Brutus, Irina, Vass, la grève, Dudek, Rossa, le Ministre). Après chaque frontière, Olga réclame une échéance qui grandit.
- **Chez Olga**, on achète des lots puis on les **range en glisser-déposer** dans la grille du bagage, avec rotation (clic droit ou R). Il y a 45 objets :
  - 16 marchandises légales, qui servent de couverture et de leurres ;
  - 24 objets de contrebande, dont 7 « gros » qui ouvrent un dossier s'ils sont saisis ;
  - 5 outils, qui restent dans le bagage d'un passage à l'autre : feuilles et plaques de plomb, eau de Cologne, sac de café, naphtaline.
- **Le bulletin des douanes** annonce les contrôles de chaque file :
  - rayons X : tout objet dense non caché par le plomb est vu ;
  - Brutus le chien : il alerte sur ce qui sent le plus après les masques, si bien qu'un fromage légal peut le détourner ;
  - fouille de cases au hasard ;
  - ouverture du plus gros objet.

  La file express est plus légère mais coûte un péage, ou fait baisser les prix de revente. Une prévision affiche les saisies certaines, et des **vues rayons X et odeurs** aident à préparer le bagage.
- **20 tampons** (les « jokers »), achetés dans l'arrière-boutique d'Olga après chaque échéance. Exemples : plaque diplomatique, os à moelle, plombier de métier, œil du douanier, fausse barbe, club de jazz.
- **4 bagages** :
  - valise en carton ;
  - poussette à double fond, débloquée en atteignant la frontière 3 ;
  - étui d'accordéon aux soufflets opaques aux rayons X, débloqué à la frontière 5 ;
  - malle de diplomate, débloquée après une tournée gagnée.
- **6 niveaux d'alerte** : chacun est débloqué en gagnant au niveau précédent. Un **passage du jour** à graine fixe permet de comparer les scores.
- **La partie est sauvegardée à chaque action.** Français et anglais. Audio synthétisé en WebAudio, sans aucun fichier son.

## Développer

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # règles des contrôles, déterminisme, équilibrage par des bots, traductions
npm run build      # build statique dans dist/
npm run desktop    # version bureau Electron (plein écran, F11)
npm run package    # exécutable non signé dans release/ (dépôt Steam)
```

## Équilibrage

`tests/sim.test.ts` fait jouer 40 tournées à un bot prudent et 30 à un bot négligent. Le bot prudent range de façon gloutonne avec `src/game/autopack.ts`.

- **Bot prudent** : il atteint en moyenne la frontière 6 et gagne environ 1 tournée sur 13.
- **Bot négligent** : il s'arrête vers la frontière 3.

Un joueur qui utilise les vues rayons X et odeurs range mieux que le bot.

## Assets

Les illustrations sont générées avec le modèle d'image GPT via le lanceur Codex (`recrime-cloud-launcher`, environnement `GlobalGPTIdea`). Le style est une affiche des années 1970 en ligne claire.

```bash
python3 tools/assets_manifest.py --list           # lots et identifiants
python3 tools/assets_manifest.py items_a          # prompt d'un lot
python3 tools/import_assets.py <dossier-assets_out>   # détourage + WebP dans public/img
```

Steam impose de déclarer le contenu généré par IA. Le texte de déclaration est dans `docs/steam-page.md`.

## Tests visuels

```bash
node tools/smoke.mjs http://localhost:5173 shots fr      # premier passage : achat, glisser-déposer, rayons X, contrôle
node tools/autoplay.mjs http://localhost:5173 shots fr   # tournée entière via l'interface
node tools/capsules.mjs store fr                         # visuels Steam
```
