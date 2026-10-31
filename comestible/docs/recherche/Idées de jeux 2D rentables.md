# Visez le métier, pas le Balatro-like

**Réponse courte :** un développeur solo qui dispose d'assets 2D générés par IA devrait viser **Steam PC en premium (5 à 10 $), puis porter seulement les jeux qui ont marché** sur Switch et sur mobile en premium. Le free-to-play mobile est à écarter. Les données récentes désignent un créneau précis : des **simulations de métier en 2D de type « inspecter, classer, décider »**, et des **roguelites de systèmes**. Ces deux formes reposent sur des images fixes, que l'IA produit bien, et sur une mécanique lisible dans un clip de cinq secondes. Après vérification de la concurrence sur Steam, l'idée la mieux placée est un **« Papers, Please inversé » : on joue le contrebandier qui fait ses valises** (*Contrebande*). Viennent ensuite une **simulation d'expert en sinistres dans un monde fantastique** (*Le Sinistre*) et un **roguelite de mots croisés** (*Grille*). Sur les trois idées proposées plus tôt, seule *Contrebande* résiste à l'examen. *L'Expert* doit changer de thème : un jeu sur l'authenticité de l'art, fait avec de l'art IA, s'expose à un retour de bâton. *Bocal* arrive dans un sous-genre déjà encombré, où le taux de succès est sous la moyenne. Deux réalités pèsent sur tout le plan :

- **Le revenu « passif » n'existe qu'après un lancement réussi.** La traîne longue est proportionnelle au lancement, et le jeu Steam médian rapporte quelques centaines de dollars.
- **Déclarer des assets IA coûte cher.** Ces jeux reçoivent environ **50 % d'avis en moins** au premier mois quand le studio a un public. Il faut donc concevoir des jeux où l'art visible pèse peu, et faire réaliser la capsule par un humain.

## Steam paie la classe moyenne, le mobile paie l'acquisition

Steam fonctionne en « le gagnant rafle tout », mais il a une vraie classe moyenne. Environ **20 300 jeux sont sortis en 2025** ([Steam Page Analyzer](https://www.steampageanalyzer.com/blog/how-many-games-release-on-steam)). Environ **65,9 % ont gagné moins de 1 000 $**, et seulement **8 % ont dépassé 100 000 $ brut** ([game-developers.org](https://game-developers.org/2025-steam-game-revenue-distribution)). Sur la cohorte 2025, GameDiscoverCo compte environ **1 350 jeux au-delà de 100 000 $**, soit environ 25 par semaine ([GameDiscoverCo](https://newsletter.gamediscover.co/p/what-game-descriptions-tell-us-about)). Parmi les sorties de 2024, le 1 000e jeu a fait **118 000 $ brut**, ce qui donne environ 70 à 80 000 $ net ([GameDiscoverCo](https://newsletter.gamediscover.co/p/steams-top-grossing-games-of-2024)). C'est un objectif réaliste pour un bon petit jeu. Les leviers sont connus :

- **Conversion des wishlists :** la première semaine vend environ **0,15× le nombre de wishlists**, et seulement 0,10× au-dessus de 10 $ ([Beacon Digital PR](https://beacondigitalpr.com/indie-game-statistics-2026)).
- **Première année :** elle rapporte environ **2,6× la première semaine** ([gamedevreports](https://gamedevreports.substack.com/p/gamediscoverco-games-long-tail-revenue)).
- **Exemple chiffré :** 10 000 wishlists donnent environ 13 à 40 000 $ brut la première année. Le post-mortem d'*onlywayisdown* confirme cet ordre de grandeur : 17 821 wishlists, environ **41 000 $ net en dix mois**, ce qui n'a pas suffi à faire vivre son auteur ([onlywayisdown](https://onlywayisdown.com/post-mortem/)).
- **Sans marketing :** un jeu de 500 heures sorti sans promotion a vendu 29 copies en un an ([note.com](https://note.com/metropolis02/n/n1251c478cc75?hl=en)).

Le mobile en free-to-play est une activité d'achat d'utilisateurs, hors de portée d'un développeur solo :

- **Coût par installation :** le CPI Android casual/puzzle aux États-Unis tourne autour de **1,50 à 3,50 $**, et l'iOS coûte 3 à 4 fois plus.
- **Retour sur investissement :** à J30, il n'est que de **15 % sur Android** et 47 % sur iOS ([GameGrowthAdvisor](https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/)).
- **Rétention :** la médiane à J7, tous genres confondus, est d'environ **4 %** ([GameAnalytics](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)).
- **Qui gagne :** le puzzle hybrid-casual en croissance (Sort, Screw, Block : environ 600 M$ d'IAP au premier semestre 2026) est dominé par des éditeurs turcs qui achètent massivement de l'audience ([Gamigion](https://www.gamigion.com/top-10-hybridcasual-puzzles-in-h1-2026/)). *Survivor.io*, le clone F2P de *Vampire Survivors*, a dépassé 138 M$ quand l'original en ads gratuites restait modeste ([gameworldobserver](https://gameworldobserver.com/2023/01/17/vampire-survivors-mobile-3-million-downloads-appmagic)).

Le **premium mobile** revient, mais comme un débouché pour des succès Steam : 23 portages en 2025 contre 7 en 2024 ([gamedev.net](https://gamedev.net/news/premium-mobile-games-are-back-with-releases-up-77-in-2025-r4367/)). *Balatro* y a fait **environ 4,4 M$ en deux mois à 9,99 $** ([PocketGamer.biz](https://www.pocketgamer.biz/balatro-nears-44m-on-mobile-amid-a-sudden-spending-surge)), mais c'est l'exception qui porte tout le segment. La Switch en différé ajoute environ **10 % des ventes Steam**. Seuls 23 % des indés payants y arrivent, avec un délai médian de 13 mois ([PC Gamer](https://www.pcgamer.com/indie-veterans-on-the-state-of-indie-games-on-nintendo-switch-versus-steam/) ; [striketwo](https://striketwo.games/blog/port-indie-game-to-switch)). La réponse au « quel marché » est donc séquentielle :

1. Steam d'abord, pensé dès le départ pour pouvoir être porté : interface lisible en portrait, sessions de moins de 15 minutes.
2. Le mobile premium et la Switch seulement comme second encaissement d'un jeu qui a déjà trouvé son public.

Côté « passif », un jeu Steam premium sans serveur, porté par les soldes saisonnières, est ce qui s'en approche le plus. Le F2P mobile, avec ses live-ops et sa médiation publicitaire, en est l'opposé.

## Les hits 2D récents détournent une mécanique familière en système

Les succès 2D de 2024-2026 obtenus par 1 à 3 personnes suivent un même patron : **une mécanique connue de tous, une couche de synergies, un prix de 3 à 15 $ et des sessions courtes.**

| Jeu | Mécanique détournée | Résultat | Source |
|---|---|---|---|
| *Balatro* | poker | **5 M** d'exemplaires | [GWO](https://gameworldobserver.com/2025/01/21/balatro-another-1-5-million-copies-total-5m-units) |
| *CloverPit* | machine à sous | **750 000 en deux semaines** | [Game Developer](https://gamedeveloper.com/business/cloverpit-has-sold-500-000-units-in-eight-days) |
| *Ball x Pit* | casse-briques | **2 M+** | [Push Square](https://www.pushsquare.com/news/2026/08/devolvers-brilliant-roguelite-dopamine-factory-ball-x-pit-is-a-smash-hit-at-2-million-sales) |
| *Buckshot Roulette* | roulette russe | **8 M sur PC** | [KitGuru](https://www.kitguru.net/gaming/joao-silva/buckshot-roulette-hits-8-million-sales-console-port-gets-delayed/) |
| *Backpack Battles* | ranger un sac | **640 000 en un mois**, dont **48 % en Chine** | [GWO](https://gameworldobserver.com/tag/indieark) |

Les données de Chris Zukowski sur 2025 précisent où se trouve l'opportunité ([How To Market A Game](https://howtomarketagame.com/2026/01/27/what-the-hell-happened-in-2025/)). Le taux de « hit » se mesure ici en jeux atteignant 1 000 avis rapportés au nombre de sorties. La moyenne Steam est de 2,99 %.

| Genre | Taux de hit 2025 | Nombre de sorties |
|---|---|---|
| Roguelike deckbuilder | **5,1 %** | 212 |
| Simulation | **4,1 %** | 1 048 |
| Idle | **2,79 %** | 965 |
| Puzzle | **0,34 %** | 4 022 |
| Platformer 2D | **0,18 %** | 1 658 |

L'idle se classe pourtant 5e en nombre absolu de hits. Les job sims affichent un taux de succès de **34,7 %** selon une source secondaire, mais ce sont surtout des jeux 3D ([PokeIndie](https://pokeindie.com/blog/game-genre-study-2026-which-genres-are-worth-building)).

La recherche d'originalité change cependant la lecture. La formule « Balatro + jeu classique » est quasi épuisée. Vérification faite sur Steam, chaque ruleset testé a déjà 2 ou 3 projets :

- **Projets nombreux mais petits :** backgammon, dominos, mancala, cribbage, bingo, rummy, sudoku, hanafuda (cinq projets).
- **Saturés :** les échecs et le Yahtzee.
- **Leader déjà installé :** le coin pusher, avec *RACCOIN* et ses 461 avis « Très positives ».

Le seul trou net est **le mots croisés** ([Steam, vérifications compilées](https://store.steampowered.com/app/4054170) ; [PC Gamer, CiniCross](https://www.pcgamer.com/games/puzzle/i-can-now-say-ive-been-killed-by-a-nonogram-thanks-to-this-roguelike-that-turns-picross-into-a-dungeon-crawler)). La presse s'en moque déjà : Rock Paper Shotgun ironise sur des genres « convergés en Balatro grimdark », et Nintendo Life reproche à *Beyond Words* de « copier les devoirs de Balatro » ([Wikipedia](https://en.wikipedia.org/wiki/Beyond_Words_(video_game))).

Le deuxième gisement est moins exploité : **le métier précis, le geste « inspecter, classer, décider », dans un décor décalé.**

- *Strange Antiquities*, boutique 2D d'identification d'antiquités occultes, a atteint **environ 1,6 M$ brut sur Steam et 400 000 wishlists** ([GameDiscoverCo](https://newsletter.gamediscover.co/p/when-sequels-work-how-strange-antiquities)).
- *TCG Card Shop Simulator* dépasse **3,5 M** d'exemplaires ([GamesRadar](https://www.gamesradar.com/games/simulation/tcg-card-shop-simulator-finally-hits-1-0-on-steam-after-4-million-players-96-percent-positive-reviews-and-2-years-in-early-access/)).
- *Dispatch*, une comédie de bureau chez les super-héros, a fait **environ 68 M$ en douze mois** ([OtakuKart](https://otakukart.com/dispatch-ranks-among-steams-top-grossing-indie-games-with-68-million-in-revenue/)).

Ces deux derniers sont en 3D, mais ils prouvent l'appétit pour « un métier banal dans un monde fantastique ». C'est dans ces niches de métier que la vérification Steam a trouvé de vrais espaces libres en 2D : contrebandier, taxidermiste, horloger, archiviste, expert en assurance.

## L'étiquette IA coûte environ la moitié des avis, surtout sur l'art

Le handicap est mesuré, pas supposé. Trois analyses indépendantes convergent :

- **Game Oracle**, sur 9 879 jeux payants de 2025 avec contrôle du genre, de l'éditeur et de l'historique : les jeux déclarant de l'IA reçoivent **52,6 % d'avis en moins le premier mois**. La pénalité monte à 40-60 % pour les studios expérimentés et devient **quasi nulle pour les équipes sans public** ([Capital & Compute](https://capitalandcompute.net/md/do-ai-games-sell-on-steam.md)).
- **Sulka Haro**, recensement d'environ 53 600 sorties : un jeu marqué IA atteint 100 avis à **environ 55 % du taux d'un jeu sans IA**, sans amélioration en deux ans. Les échecs mentionnent plus souvent **l'art** dans leur déclaration (**72 % contre 57 %**), alors que les succès déclarent plutôt de la voix ou de la localisation ([fragwyz](https://fragwyz.substack.com/p/three-years-of-ai-on-steam)).
- **Next Fest d'octobre 2026 :** seulement **2 des 25 meilleures démos** déclaraient de l'IA, contre 35 % au-delà du rang 100 ([Capital & Compute](https://capitalandcompute.net/md/do-ai-games-sell-on-steam.md)).

Les déclarations explicites de refus d'achat restent minoritaires : **8 %** chez GameDiscoverCo, environ 25 % chez Circana ([Outlook Respawn](https://respawn.outlookindia.com/gaming/gaming-news/do-gamers-care-about-genai-new-data-reveals-a-silent-majority)). Mais l'hostilité monte chez ceux qui amplifient : **52 % des développeurs** jugent l'IA générative néfaste, contre 18 % deux ans plus tôt ([GDC](https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/)). Ce que l'IA ampute, c'est donc surtout **le plafond** (presse, festivals, streamers, conversion des wishlists), plus que le plancher.

La déclaration n'est pas évitable. Depuis la refonte de janvier 2026, Steam exige de déclarer tout contenu généré que le joueur voit ou entend, y compris la capsule et les assets du store. Les outils de coulisse, comme un assistant de code, en sont exemptés ([PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)). itch.io marque même l'IA retouchée à la main ([PC Gamer](https://pcgamer.com/software/platforms/indie-distribution-platform-itch-io-now-requires-asset-creators-to-disclose-the-use-of-generative-ai-in-their-work)). Les prix sont fermés aussi : les Indie Game Awards ont retiré deux trophées à *Clair Obscur* pour des textures IA provisoires ([Engadget](https://www.engadget.com/gaming/the-indie-game-awards-snatches-back-two-trophies-from-clair-obscur-over-its-use-of-generative-ai-164730842.html)). Le contre-exemple utile est *The Roottrees are Dead* : la version navigateur utilisait de l'art IA, l'auteur a fait remplacer les portraits par une illustratrice, et la version Steam est devenue un succès ([The Verge](https://hn.jakechampion.name/reader/https://www.theverge.com/ai-artificial-intelligence/686651/roottrees-ai-original-illustrator-replacement)).

L'atténuation tient en cinq règles qui guident aussi le choix des idées :

1. **Choisir des jeux où l'art est fonctionnel**, pas l'argument de vente : icônes d'objets, documents, cartes. Les publics cozy et narratifs, sensibles à l'art, sont à éviter en priorité.
2. **Verrouiller le style.** Dix images d'ancrage, une palette fixe de 16 à 32 couleurs, des gabarits de prompt par catégorie, et des références passées à GPT Image à chaque appel. OpenAI reconnaît lui-même que la cohérence « peut glisser » d'une génération à l'autre ([OpenAI](https://developers.openai.com/api/docs/guides/image-generation)).
3. **Post-traiter par script :** quantification de palette, contour uniforme, étalonnage commun.
4. **Faire réaliser par un humain la capsule, le logo et les deux ou trois visuels héros.** C'est là que le joueur juge en premier, et la retouche humaine renforce aussi la protection juridique. Le Copyright Office américain refuse la protection aux sorties purement promptées ([IPWatchdog](https://ipwatchdog.com/2025/01/29/part-two-copyright-office-ai-report-says-creative-prompting-doesnt-constitute-authorship/id=185455/)).
5. **Animer par tweens, shaders et rigs découpés, jamais image par image.** Les sprite sheets GPT ont des cadres désalignés ([r/aigamedev](https://reddit.sentinel-team.org/posts/1ss9bjz/snapshots/2026-04-25T00%3A45%3A58.465245Z)).

En cas de succès, l'option *Roottrees* reste ouverte : remplacer les assets IA par de l'art humain avant les portages. L'étiquette peut alors être retirée et le jeu redevient éligible aux vitrines curées.

## Dix idées classées, des plus solides aux plus fragiles

Le classement pondère six critères :

- la preuve de demande pour le genre parent ;
- la concurrence vérifiée sur Steam fin octobre 2026 ;
- l'adéquation aux images fixes ;
- la sensibilité du public à l'IA ;
- le périmètre réaliste pour une personne ;
- la portabilité mobile et Switch.

Les durées de développement sont des estimations de l'auteur. Seuls des repères secondaires existent : environ un an pour *CloverPit*, huit mois pour *Slots & Daggers* ([PokeIndie](https://pokeindie.com/blog/game-genre-study-2026-which-genres-are-worth-building)). Une vérification Steam qui ne trouve « aucun concurrent » ne prouve pas qu'il existe une demande. Chaque idée doit passer un test de page Steam et de wishlists avant la production.

| Rang | Nom de travail | Formule | Concurrence vérifiée | Adéquation aux assets IA fixes | Dév. estimé | Prix |
|---|---|---|---|---|---|---|
| 1 | Contrebande | Papers Please inversé + rangement Backpack Battles + scoring roguelite | Libre côté contrebandier en 2D | Excellente (icônes d'objets) | 8-10 mois | 7,99 $ |
| 2 | Le Sinistre | Inspection de sinistres dans un monde fantastique | 1-2 petits entrants | Excellente (photos, documents) | 7-9 mois | 9,99 $ |
| 3 | Grille | Roguelite de mots croisés | Libre (Letterlike tient le roguelite de mots) | Maximale (art minimal) | 6-8 mois | 5,99 $ |
| 4 | Commissaire-priseur (ex-L'Expert) | Enchères à modificateurs sur lots d'objets | Faux d'art : 2 projets non sortis | Bonne, si on évite la peinture | 8-10 mois | 7,99 $ |
| 5 | Atout | Roguelite Belote/Tarot | Plis anglo-saxons pris, angle FR libre | Excellente (cartes) | 6-8 mois | 5,99 $ |
| 6 | Empaillé | Sim de taxidermiste macabre-cosy | Libre en 2D | Bonne | 8-12 mois | 9,99 $ |
| 7 | Cueillette | Identification de champignons à enjeu mortel | Entrants faibles | Excellente (planches naturalistes) | 6-9 mois | 7,99 $ |
| 8 | Le Régleur | Sim de réparation de montres | Libre | Moyenne (pièces mécaniques précises) | 9-12 mois | 9,99 $ |
| 9 | Phare (ex-Bocal) | Idle de bureau, phare + coop asynchrone | Phare libre, terrarium à 2 entrants | Bonne | 4-6 mois | 4,99 $ |
| 10 | Tri sélectif | Roguelite de puzzle de tri (Sort) pour PC | Aucun hit PC trouvé | Excellente | 5-7 mois | 4,99 $ |

### 1. Contrebande : le Papers, Please vu depuis l'autre côté du guichet

Le joueur est un passeur dans un régime d'opérette. À chaque passage de frontière, il remplit une valise en grille avec des marchandises de formes variées. Il cache la contrebande derrière des objets légaux et doit anticiper le règlement douanier du jour, ses scanners et ses chiens.

La boucle se déroule ainsi :

1. Acheter un lot au marché noir.
2. Faire le Tetris de la valise : les objets adjacents créent des synergies (le parfum masque l'odeur, le plomb bloque le scanner).
3. Passer le contrôle.
4. Vendre, puis débloquer de nouveaux sacs et des faveurs de douaniers corrompus.

Le run se joue en dix postes-frontières, avec des « tampons » qui jouent le rôle des jokers de Balatro.

Cette idée vient de la proposition antérieure et tient debout sur pièces. Elle combine trois demandes prouvées :

- **le rangement d'inventaire spatial** : *Backpack Battles*, 640 000 ventes en un mois, dont 48 % en Chine ([GWO](https://gameworldobserver.com/tag/indieark)) ;
- **la lignée inspection-décision** de *Papers, Please*, dont le côté inspecteur est saturé en 2D comme en 3D (*Border Patrol*, *Contraband Police*, *Spud Customs*) ;
- **le roguelite de systèmes**, à 5,1 % de taux de hit.

La vérification n'a trouvé **aucun jeu 2D où l'on joue le contrebandier** ([Steam Border Patrol](https://store.steampowered.com/app/3134670)).

Pour les assets, presque tout est une icône d'objet sur fond transparent, avec quelques portraits de douaniers. C'est le point fort de GPT Image (`background: transparent`). Le thème de l'économie souterraine éloigne aussi le jeu du public cozy, le plus allergique à l'IA. Le hook tient dans un GIF, ce qui facilite les streams avec le chat qui vote « on passe ou pas ». La localisation chinoise est prioritaire, étant donné le profil de *Backpack Battles*. La grille tactile se porte bien sur mobile.

Les risques :

- **L'équilibrage** d'un système à deux couches, spatial plus probabiliste.
- **Le ton politique**, à garder burlesque.
- **La comparaison avec Backpack Battles**, qui pousse à réclamer du PvP asynchrone. Il vaut mieux le refuser pour rester passif.

### 2. Le Sinistre : expert en assurances chez les monstres

Le joueur instruit des déclarations de sinistre dans un royaume fantastique : dragon ayant brûlé une grange, golem effondré, malédiction « préexistante ». Il compare photos, constats et clauses, puis approuve, refuse ou négocie. Chaque journée ajoute des clauses et des fraudeurs plus malins. Une méta-progression fait monter le joueur de stagiaire à expert principal.

La formule reproduit celle qui a porté *Strange Antiquities* : un métier lisible, un manuel de référence et un décor décalé. Ce jeu 2D a atteint environ 1,6 M$ et 400 000 wishlists, même s'il bénéficiait de l'audience d'une suite ([GameDiscoverCo](https://newsletter.gamediscover.co/p/when-sequels-work-how-strange-antiquities)). L'appétit de *Dispatch* pour « le bureau chez les héros » confirme le ressort comique. La concurrence vérifiée se limite à *Claim Denied*, au statut flou, et à un projet de gestionnaire de sinistres santé à venir ([ModDB](https://www.moddb.com/games/claim-denied) ; [Steam 4540160](https://store.steampowered.com/app/4540160)).

Les assets sont des « photos » de dégâts, des formulaires et des portraits de demandeurs. GPT Image y excelle, et la typographie se pose à la main. Le contenu est surtout de l'écriture et des règles, ce qui dilue la part d'art IA visible.

Les risques :

- Le public narratif et puzzle est plus sensible à l'IA. Le jeu risque aussi d'être classé « puzzle », un tag à 0,34 %.
- Le contenu scénarisé se rejoue moins qu'un roguelite. La traîne repose alors sur les soldes plutôt que sur le bouche-à-oreille de streamers.
- Une parade possible : un mode « journée infinie » procédural.

### 3. Grille : le Balatro des mots croisés

Chaque manche présente une grille partiellement remplie. Le joueur pose des mots depuis une main de lettres, et les croisements multiplient le score. Des « stylos » (jokers) modifient les règles : voyelles en or, mots de plus de sept lettres doublés, cases noires mobiles.

C'est le **seul ruleset classique trouvé libre** après vérification de dizaines de candidats. Le plus proche, *Letterlike*, est un roguelite de type Scrabble venu d'un succès mobile ([communiqué](https://gamespress.westeu-v2.propressroom.com/it/Mobile-Hit-Letterlike-Brings-Chart-Topping-Word-Roguelike-to-Steam)). Son atout stratégique face à l'IA est décisif : **l'art est quasi absent.** Une interface typographique, quelques illustrations de stylos et une capsule humaine suffisent. Le jeu peut même ne déclarer aucun contenu IA visible si les rares images sont dessinées à la main. Il pourrait alors éviter l'étiquette, ce qui en fait le candidat le plus sûr pour les festivals. Le format portrait et les sessions courtes en font le meilleur candidat au portage mobile premium.

Les risques sont réels :

- **La localisation** exige un dictionnaire et un équilibrage par langue. Le chinois est impossible et le marché est d'abord anglophone.
- **Le tag puzzle** est le plus saturé de Steam.
- **La critique « copie de Balatro »** déjà subie par *Beyond Words* menace tout roguelite de lettres qui n'apporte pas une vraie mécanique de croisement.

### 4. Commissaire-priseur : ce que devient L'Expert

La proposition initiale, un Balatro-like de commissaire-priseur, reste à moitié vérifiée. L'appréciation et la détection de faux forment bien une **niche sans leader commercial**. On y trouve *Forgery Craft*, prévu au T4 2027, une app REAL/FAKE prévue en octobre 2026 et des prototypes itch.io comme *Paintings, Please* ([Steam 1540720](https://store.steampowered.com/app/1540720) ; [itch.io](https://tuckbuckk.itch.io/paintings-please)). En revanche, aucune recherche n'a porté spécifiquement sur les roguelites d'enchères.

Le point critique est ailleurs. **Un jeu dont le sujet est l'authenticité des tableaux, illustré par des tableaux générés par IA, offre à ses détracteurs le titre de leur article.** Les jeux en échec mentionnent justement l'art dans leur déclaration IA ([fragwyz](https://fragwyz.substack.com/p/three-years-of-ai-on-steam)). Le pivot recommandé :

- **Changer d'objet :** des lots d'objets (montres, vins, jouets anciens, cartes à collectionner) plutôt que des peintures.
- **Garder la boucle :** estimer, monter les enchères, « bluffer » la salle, avec des modificateurs de lots.
- **Exploiter la tendance :** le fantasme du commerce de collection, porté par *TCG Card Shop Simulator* en 3D ([GameDiscoverCo](https://newsletter.gamediscover.co/p/tcg-card-shop-simulator-the-second)), reste inoccupé en 2D, mais c'est une inférence non vérifiée.

Le risque principal est la proximité avec *Strange Antiquities* et les jeux de prêteur sur gages, déjà installés.

### 5. Atout : le roguelite de Belote et de Tarot

Le jeu propose des contrats successifs contre des tables de plus en plus retorses. Des « annonces » à collectionner modifient le scoring (belote-rebelote multipliée, atouts maudits). Les roguelites de plis existent, *Overtrick* et *Trick-Taking Rogue*, mais en Bridge, Hearts et Spades. **L'angle français n'est pas couvert** ([CogConnected](https://cogconnected.com/2026/08/overtrick-launches-on-steam-putting-a-roguelike-twist-on-classic-card-games/)). L'art des cartes est l'usage idéal de GPT Image, avec un style verrouillé.

Le plafond est en revanche structurellement bas. Le Tarot et la Belote se jouent surtout en France et dans l'espace francophone, et l'export vers la Chine est nul. *Atout* fait un excellent **deuxième jeu de catalogue** pour un développeur français, à 5,99 $ et en six mois, mais pas un pari principal.

### 6. Empaillé : la taxidermie, entre cosy et macabre

Des clients apportent des animaux, réels ou fantastiques. Le joueur choisit la pose, les yeux et le socle selon un cahier des charges, puis est jugé sur la ressemblance avec une planche de référence. Aucune sim de taxidermie 2D n'a été trouvée : *Project 13* est un walking sim 3D, *TAXIDERMY* un FPS d'horreur ([Steam 2492740](https://store.steampowered.com/app/2492740)). Le ton « cosy morbide » se démarque bien.

Deux obstacles freinent cette idée :

- La manipulation demande plus d'interaction et d'assemblage de pièces que de simples icônes.
- Son public, cozy et artistique, est celui qui pardonne le moins l'art IA.

Un demi-art humain est recommandé.

### 7. Cueillette : identifier des champignons avec un enjeu mortel

Le joueur tient un comptoir de mycologue de village. Il compare des spécimens à un guide, et une erreur empoisonne un client. La progression passe par les saisons, de nouvelles espèces et des sosies toxiques. L'enjeu létal donne au geste d'identification une tension que *Strange Horticulture* a prouvée sur les plantes. Les concurrents vérifiés sont faibles : *Spores of Fortune* (cosy, 15 espèces), *Mushroom Season* en accès anticipé, et un projet étudiant gratuit ([Steam 3769520](https://store.steampowered.com/app/3769520) ; [Steam 4078260](https://store.steampowered.com/app/4078260)).

Les planches naturalistes conviennent bien à l'IA. Elles exigent toutefois une **exactitude botanique** qui impose une vérification humaine : une erreur toxicologique serait un vrai problème de réputation. Le risque principal reste la proximité avec *Strange Horticulture*, dont le studio tient déjà cette formule.

### 8. Le Régleur : réparer des montres

Le joueur diagnostique, démonte et remplace des pièces de mouvements, de la montre de gousset à l'automate. La seule occurrence trouvée est *The Watchmaker* (2018), un puzzle-plateformes noté « Moyennes » ([Steam 504430](https://store.steampowered.com/app/504430)). Le créneau de la sim de réparation est donc libre. Mais les pièces mécaniques doivent s'emboîter avec précision, ce qui correspond exactement au point faible de GPT Image : la cohérence entre assets et le placement exact ([OpenAI](https://developers.openai.com/api/docs/guides/image-generation)). Le développement serait le plus long de la liste.

### 9. Phare : ce que devient Bocal

Le terrarium de bureau proposé plus tôt arrive tard :

- **Le sous-genre est structuré.** Le « desktop companion » est désormais un tag Steam officiel ([ComicBook](https://comicbook.com/gaming/list/5-best-desktop-companion-games-to-try-now-that-its-a-steam-tag-official-genre/)).
- **Le thème est déjà occupé.** La vérification a trouvé deux idles de terrarium, et l'aquarium est encombré.
- **Le taux de hit est sous la moyenne :** 2,79 % pour 965 sorties.
- **Le volume de joueurs ne paie pas.** *Bongo Cat*, en F2P, n'a rapporté qu'environ **670 000 $** malgré 150 000 joueurs simultanés ([AppMagic](https://appmagic.rocks/research/idle-steam-games-2026)).
- **Le public cozy est le plus sensible à l'IA.**

La catégorie a pourtant prouvé qu'elle paie quand elle est payante et hybride. *Rusty's Retirement* atteint environ 880 000 copies à 7 $. *Cast n Chill* a fait environ 6,8 M$, et *The Farmer Was Replaced* garde une **rétention à J30 supérieure à 10 %** ([AppMagic](https://appmagic.rocks/research/idle-steam-games-2026)). L'argent va à l'idle *doté d'une mécanique active originale*.

La version défendable est donc un **phare**, thème libre selon la vérification, avec un vrai mécanisme : guider des bateaux pendant les tempêtes, et un **réseau asynchrone de phares entre amis**. C'est la seule variante qui se distingue par la mécanique plutôt que par le thème, et aucun concurrent n'a été trouvé. C'est le projet le plus rapide (4 à 6 mois) et le plus « passif » une fois sorti. Les idle restent peu sensibles au contenu, ce qui laisse peu de place à l'erreur.

### 10. Tri sélectif : le puzzle de tri mobile, en roguelite PC

Les puzzles Sort, Screw et Block ont dégagé environ 600 M$ d'IAP sur mobile au premier semestre 2026 ([AppMagic](https://appmagic.rocks/research/casual-report-H12026)). Aucun équivalent PC à modificateurs n'a été trouvé, mais l'écart est explicitement spéculatif. L'intérêt est d'inverser le sens habituel du portage : la mécanique est déjà familière aux joueurs mobiles, puis le jeu passe en premium. Le risque est de cumuler le tag puzzle et l'image « jeu mobile » auprès des joueurs Steam.

### Les idées écartées et pourquoi

**Le « friendslop » coopératif en 2D** reste inexploré, mais les hits du genre sont tous en 3D physique ([Kotaku](https://kotaku.com/steam-top-selling-2025-friendslop-rpgs-sales-2000654157)). Le netcode est l'inverse du passif, et l'IA anime mal. **Les roguelites d'échecs, de Yahtzee et de coin pusher** sont saturés. **L'archiviste et le recenseur d'oiseaux** sont libres en 2D, mais aucun signal de demande n'a été trouvé pour eux.

## Lancer Contrebande d'abord, puis bâtir un catalogue de petits jeux

La recommandation finale est de **développer *Contrebande* en premier**. C'est la seule idée qui cumule une demande prouvée sur ses deux composantes, un espace vérifié libre, une production presque entièrement compatible avec l'IA fixe, un public peu cozy et un levier chinois documenté. **_Le Sinistre_ vient en deuxième**, comme jeu de capitalisation : même compétence « inspection », public narratif, prix de 9,99 $. **_Grille_ vient en troisième**, comme pari à faible exposition IA, idéal pour le mobile premium et pour tenter les festivals.

Les plans de jeu adverses méritent d'être pris au sérieux. Un développeur sans public subit peu la pénalité IA ([Capital & Compute](https://capitalandcompute.net/md/do-ai-games-sell-on-steam.md)), mais c'est justement parce qu'il touche peu de monde. Dès que le jeu marche, la pénalité mord. C'est un argument pour budgéter un illustrateur dès le premier succès.

Le calendrier de lancement découle des repères mesurés :

1. **Page Steam dès le prototype jouable, avec une capsule faite par un humain.** Viser plus de **2 000 wishlists avant Next Fest**. Les jeux sous 1 000 wishlists ne gagnent qu'environ **322 wishlists** pendant le festival. Les démos publiées bien avant le festival en gagnent environ **2,5×**, et le taux médian de conversion démo vers wishlist est de **16 %** ([How To Market A Game](https://howtomarketagame.com/2025/03/26/benchmarks-how-many-wishlists-can-i-get-from-steam-next-fest/)).
2. **Viser 7 à 10 000 wishlists ou plus au lancement.** Laisser la démo en ligne après la sortie : les jeux qui l'ont fait affichaient **94,7 % d'avis positifs contre 84,6 %**, sur un échantillon de cinq jeux seulement ([HTMAG](https://howtomarketagame.com/2025/04/11/the-hit-games-of-early-2025/)).
3. **Sortir à 7,99 $**, sous le seuil de 10 $ qui fait chuter la conversion, avec le chinois simplifié dès le premier jour.
4. **Inscrire le jeu aux fêtes thématiques de Steam.** La Farming Fest a dopé *Rusty's Retirement* à environ 20 000 ventes par jour ([GameDiscoverCo](https://newsletter.gamediscover.co/p/how-rustys-retirement-idle-farmed)).

Les ports ne viennent qu'après des seuils de traction :

- **Switch**, si le jeu dépasse environ 1 000 avis. Le portage rapporte environ 10 % des ventes Steam. La politique de Nintendo sur l'IA n'est pas vérifiée et doit être contrôlée avant d'engager un portage.
- **Mobile premium à 4,99-9,99 $**, seulement si la boucle se joue en portrait. Il faut prévoir la maintenance liée aux mises à jour d'OS, ce qui rend ce canal moins passif.

Le DLC et la bande-son sont des compléments logiques, mais aucune donnée de taux d'attache 2024-2026 n'a été trouvée. Il faut les traiter comme du bonus, pas comme un pilier du modèle.

## Conclusion

La question « quelle idée originale ? » est en réalité une question d'**intersection** entre trois contraintes que la plupart des idées évidentes violent. Ce que l'IA fait bien, ce sont les images fixes. Ce que Steam récompense, ce sont des systèmes rejouables à moins de 10 $. Ce que le public n'a pas encore vu, en vérification fin 2026, ce sont les métiers et le mots croisés, alors que les jeux de société classiques sont déjà pris. Cette intersection exclut l'essentiel des réflexes « Balatro + X » et des idles cosy, et elle fait remonter les simulations d'inspection, où l'art est un outil et non la vitrine.

Le plus contre-intuitif est que l'IA ne doit pas guider le choix du genre par ce qu'elle sait produire en masse. Elle doit le guider par **ce qu'elle laisse invisible** : moins l'art est l'argument de vente, moins l'étiquette coûte. La stratégie de revenu passif la plus crédible n'est pas un jeu, mais un **catalogue de trois ou quatre jeux de 6 à 10 mois**. Chacun est lancé avec des wishlists et alimenté par les soldes Steam, et seuls les gagnants sont portés. Le premier succès finance ensuite l'illustrateur qui permettra de retirer l'étiquette IA.
