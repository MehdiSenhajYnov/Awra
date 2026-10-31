#!/usr/bin/env python3
"""Asset manifest for Contrebande and prompt builder for the Codex image launcher.

Usage: python3 tools/assets_manifest.py <batch>   -> prints the prompt for that batch
       python3 tools/assets_manifest.py --list    -> lists batches and ids
"""
import sys

STYLE = (
    "STYLE COMMUN (à respecter strictement pour toutes les images) : illustration d'affiche des années 1970 "
    "en ligne claire, contours noirs nets d'épaisseur constante, aplats de couleurs sans dégradé ni rendu 3D, "
    "palette limitée (orange brûlé, jaune moutarde, vert olive, bleu pétrole, rouge brique, crème, brun chocolat, noir), "
    "légère texture de sérigraphie, ton burlesque et chaleureux. Aucun texte, aucune lettre, aucun chiffre, "
    "aucune étiquette lisible, aucun logo, aucun drapeau réel, aucune signature, aucun cadre."
)


def item(desc: str, w: int, h: int) -> str:
    fmt = "1536x1024 (paysage)" if w > h else "1024x1024 (carré)"
    return (
        f"Vue de dessus orthographique, à plat, comme posé au fond d'une valise : {desc}. "
        f"L'objet est seul, entier, sur fond blanc pur uniforme (#FFFFFF), sans ombre portée ni sol, "
        f"orienté horizontalement et il remplit presque tout le cadre (petite marge). Format de génération {fmt}."
    )


ITEMS_A = [
    ("it_chaussettes", item("une paire de chaussettes de laine à motifs, roulées", 1, 1)),
    ("it_pull", item("un pull jacquard plié en carré", 2, 2)),
    ("it_saucisson", item("un gros saucisson sec avec sa ficelle", 2, 1)),
    ("it_comte", item("une grosse part de meule de fromage à croûte dorée, en forme de pavé", 3, 2)),
    ("it_chou", item("un chou vert pommé", 1, 1)),
    ("it_conserves", item("une boîte de sardines en fer, fermée", 1, 1)),
    ("it_casserole", item("une casserole en fonte vue de dessus avec son manche", 2, 2)),
    ("it_thermos", item("une bouteille thermos couchée", 2, 1)),
    ("it_bottes", item("une paire de bottes en caoutchouc couchées côte à côte", 2, 2)),
    ("it_parapluie", item("un parapluie replié couché à l'horizontale", 3, 1)),
    ("it_poupee", item("une poupée russe peinte couchée", 1, 1)),
    ("it_pain", item("une miche de pain de campagne allongée", 2, 1)),
]
ITEMS_B = [
    ("it_outils", item("une boîte à outils métallique fermée, allongée", 3, 1)),
    ("it_linge", item("une serviette de toilette pliée", 1, 1)),
    ("it_oignons", item("une tresse d'oignons couchée", 2, 1)),
    ("it_bananes", item("un régime de bananes couché", 2, 1)),
    ("it_chocolat", item("deux tablettes de chocolat dans un papier doré déchiré", 2, 1)),
    ("it_chewing", item("une poignée de paquets de chewing-gum colorés", 1, 1)),
    ("it_caviar", item("une boîte ronde de caviar en métal bleu, fermée", 1, 1)),
    ("it_disque_jazz", item("un disque vinyle de jazz dans sa pochette carrée illustrée d'un saxophone", 2, 2)),
    ("it_disque_rock", item("un disque vinyle de rock dans sa pochette carrée psychédélique avec une guitare", 2, 2)),
    ("it_cassettes", item("deux cassettes audio empilées", 1, 1)),
    ("it_guitare", item("une guitare électrique rouge couchée à l'horizontale", 4, 2)),
    ("it_transistor", item("un poste de radio transistor portable à antenne repliée", 2, 1)),
]
ITEMS_C = [
    ("it_calculatrice", item("une calculatrice de poche des années 1970 à touches", 1, 1)),
    ("it_montre", item("une montre en or à bracelet doré", 1, 1)),
    ("it_bijoux", item("un écrin ouvert rempli de bijoux anciens, colliers de perles et bagues", 1, 1)),
    ("it_bas_nylon", item("une paire de bas nylon pliée dans un emballage transparent", 1, 1)),
    ("it_jean", item("un jean bleu plié en carré", 2, 2)),
    ("it_lunettes", item("une paire de lunettes de soleil d'aviateur dépliée", 2, 1)),
    ("it_eau_paris", item("un flacon de parfum de luxe à facettes avec un bouchon doré", 1, 1)),
    ("it_roman", item("deux romans reliés empilés, couvertures colorées sans titre", 2, 1)),
    ("it_magazines", item("une pile de magazines de mode colorés sans texte", 2, 2)),
    ("it_manuscrit", item("un manuscrit à la main relié par une ficelle avec une plume", 2, 1)),
    ("it_whisky", item("une bouteille de whisky couchée", 2, 1)),
]
ITEMS_D = [
    ("it_cigares", item("une boîte à cigares en bois ouverte avec des cigares alignés", 2, 1)),
    ("it_pellicule", item("deux bobines de pellicule photo", 1, 1)),
    ("it_rubik", item("un cube casse-tête coloré à facettes", 1, 1)),
    ("it_jouet", item("un robot jouet en fer-blanc couché", 2, 2)),
    ("it_plomb", item("une feuille de plomb grise pliée, épaisse et terne", 2, 1)),
    ("it_plaque_plomb", item("une plaque de plomb carrée gris sombre aux coins arrondis", 2, 2)),
    ("it_cologne", item("un flacon d'eau de Cologne bon marché vert à vaporisateur", 1, 1)),
    ("it_cafe", item("un petit sac en toile de grains de café, fermé par une ficelle", 2, 1)),
    ("it_naphtaline", item("un petit sachet de boules de naphtaline blanches", 1, 1)),
    ("it_cartes", item("un jeu de cartes à jouer dans son étui en carton ouvert", 1, 1)),
]

WHITE = "Fond blanc pur uniforme (#FFFFFF), sans ombre portée, sujet entier et centré."
PORTRAIT = "Portrait en buste, cadré épaules et visage, sur un fond uni de couleur {bg}, face au spectateur, expression marquée et caricaturale mais sympathique."
PEOPLE = [
    ("pt_olga", PORTRAIT.format(bg="moutarde") + " Tante Olga, receleuse plantureuse d'une soixantaine d'années, foulard à fleurs, grosses boucles d'oreilles, manteau de fourrure râpé, cigarette au bec, sourire rusé."),
    ("pt_pilsky", PORTRAIT.format(bg="vert olive") + " Le douanier Pilsky, rondouillard et moustachu, casquette d'uniforme vert sombre, cigare à la bouche, clin d'œil corruptible."),
    ("pt_vass", PORTRAIT.format(bg="rouge brique") + " Le commissaire Vass, maigre et austère, uniforme gris à épaulettes dorées, monocle, sourcils froncés, regard glacial."),
    ("pt_kolb", PORTRAIT.format(bg="bleu pétrole") + " Le brigadier Kolb, carré et chauve, uniforme bleu, gros cou, air buté de chef de poste."),
    ("pt_irina", PORTRAIT.format(bg="orange brûlé") + " L'inspectrice Irina, cheveux noirs en chignon serré, uniforme vert, regard perçant d'experte, lèvres pincées."),
    ("pt_dudek", PORTRAIT.format(bg="crème") + " L'inspecteur Dudek, vieux douanier très myope aux lunettes énormes en cul de bouteille, uniforme trop grand, air perdu."),
    ("pt_rossa", PORTRAIT.format(bg="rouge brique") + " La générale Rossa, imposante, uniforme couvert de médailles, chapka, regard terrible."),
    ("pt_ministre", PORTRAIT.format(bg="bleu pétrole") + " Le ministre des Douanes de la Principauté, petit homme chauve au costume trois pièces, écharpe officielle, moustache cirée, air suffisant."),
    ("pt_greve", PORTRAIT.format(bg="moutarde") + " Trois douaniers en grève assis les bras croisés, casquettes de travers, pancarte vierge, l'air content."),
    ("pt_stagiaire", PORTRAIT.format(bg="vert olive") + " Un jeune douanier stagiaire boutonneux, casquette trop grande, sifflet au cou, air dépassé."),
    ("chr_brutus", WHITE + " Brutus, gros chien renifleur bâtard au museau collé au sol en train de renifler, vu de profil, collier à clous, oreilles tombantes, corps entier."),
]

SCENES = [
    ("bg_poste", "Scène large : un poste-frontière de montagne des années 1970 au crépuscule, une guérite rayée, une barrière levante rouge et blanche, un comptoir de douane avec un tapis à bagages au premier plan qui reste dégagé, des sommets enneigés, une file de voitures anciennes. Format 1536x1024."),
    ("bg_cave", "Scène large : l'arrière-boutique enfumée d'une receleuse, années 1970, étagères croulant sous des marchandises (radios, bottes, bocaux, disques), une ampoule nue, un grand établi en bois au premier plan dégagé. Format 1536x1024."),
    ("bg_titre", "Affiche : un passeur moustachu en imperméable porte une valise trop pleine d'où dépassent un disque et des bas nylon, il marche sur la pointe des pieds vers une barrière de douane en montagne la nuit, un douanier dort dans sa guérite et un gros chien renifle dans la mauvaise direction. Laisser le tiers supérieur calme (ciel) pour un titre. Format 1536x1024."),
    ("fin_victoire", "Illustration : la receleuse Olga, foulard à fleurs, déchire joyeusement une reconnaissance de dette sans texte, des billets volent, une valise ouverte, un coucher de soleil sur les montagnes. Format 1536x1024."),
    ("fin_dossier", "Illustration burlesque : un passeur moustachu derrière les barreaux d'une petite cellule de poste-frontière, sa valise saisie sur une table entourée de douaniers hilares qui écoutent un disque. Format 1536x1024."),
    ("fin_dette", "Illustration burlesque : deux gros bras d'Olga portent le passeur par les bras hors de l'arrière-boutique, Olga compte des billets en hochant la tête, la valise reste derrière. Format 1536x1024."),
    ("sac_carton", WHITE + " Une valise en carton marron des années 1970, fermée, vue de trois-quarts, ceinturée d'une sangle, poignée en plastique."),
    ("sac_poussette", WHITE + " Une poussette d'enfant ancienne en osier et tissu à grandes roues, vue de trois-quarts, avec une couverture."),
    ("sac_accordeon", WHITE + " Un étui d'accordéon rigide noir et allongé, vu de trois-quarts, fermé."),
    ("sac_malle", WHITE + " Une grande malle de voyage de diplomate en cuir avec des coins en laiton, vue de trois-quarts, fermée."),
]

BATCHES = {"items_a": ITEMS_A, "items_b": ITEMS_B, "items_c": ITEMS_C, "items_d": ITEMS_D, "people": PEOPLE, "scenes": SCENES}

COMMON = """Tu es chargé de produire des assets 2D pour un jeu vidéo (ne modifie aucun fichier existant du dépôt).
Utilise ton outil intégré de génération d'image (image_gen) pour chaque image ci-dessous, une génération par image.
{style}
Contraintes techniques :
- Crée le dossier ./assets_out/ à la racine du dépôt et enregistre chaque image en PNG sous ./assets_out/<id>.png, telle que générée (ne la redimensionne pas, ne la recadre pas).
- Ne dessine JAMAIS une image avec du code : seul le générateur d'image IA produit les visuels.
- Garde un style strictement cohérent entre toutes les images du lot ; si ton outil accepte une image de référence, utilise la première image du lot comme référence de style pour les suivantes.
- Aucune image ne doit contenir de texte, de lettres ou de chiffres.
- Si une génération échoue, réessaie jusqu'à 2 fois, puis passe à la suivante.
Réponds en français avec la liste des fichiers produits et les éventuels échecs.

Images à produire :
"""


def prompt(batch: str) -> str:
    lines = [COMMON.format(style=STYLE)]
    for ident, text in BATCHES[batch]:
        lines.append(f"- id `{ident}` — {text}")
    return "\n".join(lines)


if __name__ == "__main__":
    if sys.argv[1] == "--list":
        for name, items in BATCHES.items():
            print(name, len(items), " ".join(i[0] for i in items))
    else:
        print(prompt(sys.argv[1]))
