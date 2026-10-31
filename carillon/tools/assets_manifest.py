#!/usr/bin/env python3
"""Asset manifest for Carillon and prompt builder for the Codex image launcher.

Usage: python3 tools/assets_manifest.py <batch> | --list | --json <batch>
"""
import json
import sys

BG_STYLE = (
    "STYLE COMMUN (strict) : peinture numérique d'arrière-plan pour un jeu de plateforme 2D en vue de côté, dessinée à la main, "
    "atmosphère souterraine mélancolique, palette sourde et sombre avec une seule couleur de lumière par image, brume et profondeur, "
    "contraste faible pour que des personnages en silhouette noire restent lisibles devant. Vue strictement de profil, comme un décor de théâtre. "
    "Aucun personnage, aucune créature, aucun texte, aucune lettre, aucun chiffre, aucun cadre, aucune signature. Format paysage 1536x1024."
)
ICON_STYLE = (
    "STYLE COMMUN (strict) : petite icône d'objet pour un jeu vidéo, peinte à la main, bronze vieilli, laiton, verre et lueur douce, "
    "contours nets, sujet unique centré et entier, sur fond blanc pur uniforme (#FFFFFF), sans ombre portée, sans socle, format carré. "
    "Aucun texte, aucune lettre, aucun chiffre, aucun cadre."
)
ART_STYLE = (
    "STYLE COMMUN (strict) : illustration peinte à la main pour un jeu vidéo 2D sombre et poétique, univers d'un immense carillon souterrain "
    "de cloches de bronze, palette sourde (bronze, bleu nuit, gris de pierre) avec des lueurs dorées. "
    "Aucun texte, aucune lettre, aucun chiffre, aucun cadre, aucune signature."
)

ZONES = [
    ("beffroi", "le sommet d'un beffroi gothique en ruine, intérieur, charpentes de chêne, grandes cloches de bronze suspendues dans la pénombre, lumière froide de lune par des abat-sons", "les escaliers en colimaçon d'un clocher effondré, poutres brisées, cordes de cloches qui pendent, poussière dans un rayon de lune"),
    ("gouttieres", "des toits d'ardoise et des gouttières de pierre sous une pluie battante, gargouilles et chéneaux, ville gothique noyée dans la nuit bleue", "un dédale de canalisations de pierre et de chéneaux ruisselants sous les toits, flaques et cascades, lumière bleue"),
    ("fonderie", "une fonderie de cloches souterraine, moules géants, coulées de bronze en fusion orange, chaînes et creusets, fumée", "des galeries de fours à bronze, braises, cloches à moitié coulées dans des fosses, lueur rouge-orange"),
    ("orgues", "une caverne remplie d'immenses tuyaux d'orgue de métal qui montent dans l'obscurité, courants d'air et poussière en suspension, lumière verte pâle", "des soufflets de cuir géants et des tuyaux d'orgue tordus, galeries étroites, lueur vert-de-gris"),
    ("crypte", "une crypte de sonneurs morts, niches funéraires, petites cloches posées sur les tombes, bougies éteintes, brume violette", "un ossuaire gothique aux arcades basses, cloches funéraires suspendues, lumière violette spectrale"),
    ("jardin", "un jardin souterrain de cristaux et de verre qui résonnent, fleurs de verre géantes, reflets prismatiques turquoise", "une serre de verre brisée sous la terre, colonnes de cristal, lumière turquoise réfractée"),
    ("cisternes", "d'immenses citernes voûtées inondées, colonnes à moitié immergées, eau noire et reflets, lumière verdâtre sous l'eau", "un aqueduc souterrain et des vannes rouillées, chutes d'eau entre les voûtes, brume froide"),
    ("horlogerie", "l'intérieur d'une horloge monumentale, engrenages de laiton géants, balanciers, échappements, lumière dorée chaude", "des mécanismes d'horlogerie et des automates figés, chaînes et contrepoids, poussière dorée"),
    ("bourdon", "le fond du monde : une cloche colossale fêlée suspendue au-dessus d'un vide noir, le Silence qui ronge la pierre en taches d'encre, lumière blanche pâle", "un sanctuaire en ruine dévoré par une encre noire silencieuse, fragments de bronze flottants, lueur blanche"),
]

NOTES = [
    ("note_fermata", "un point d'orgue (signe musical de fermata) sculpté dans le bronze, auréolé de lumière"),
    ("note_staccato", "trois petites billes de bronze alignées, vives et brillantes"),
    ("note_fortissimo", "un marteau de cloche en fer rougi, menaçant"),
    ("note_legato", "un ruban de soie argentée enroulé autour d'une petite cloche"),
    ("note_canon", "deux petites cloches jumelles reliées par une chaînette"),
    ("note_pedale", "une pédale d'orgue en bois et laiton"),
    ("note_soupir", "une plume grise légère prise dans un souffle de vent"),
    ("note_diapason", "un diapason d'acier qui vibre, ondes visibles"),
    ("note_point_orgue", "un œil doré gravé sur un médaillon de bronze"),
    ("note_bourdon", "une cloche épaisse et trapue de bronze sombre"),
    ("note_glas", "une cloche funéraire noire fêlée avec un ruban de deuil"),
    ("note_aigue", "un éclat de cristal bleu en forme de note qui scintille"),
    ("note_contrepoint", "deux marteaux croisés en laiton"),
    ("note_tremolo", "un ressort de laiton spiralé qui tremble"),
    ("note_silence", "un masque blanc sans bouche"),
    ("note_or", "une petite clochette en or massif ornée de rubis"),
]

ITEMS = [
    ("it_bronze", "une petite pile de pièces de bronze anciennes frappées d'une cloche"),
    ("it_masque", "un éclat de cloche de bronze brillant en forme de croissant"),
    ("it_vase", "une fiole de verre remplie d'une lueur blanche qui tourbillonne"),
    ("it_etain", "un lingot d'étain argenté"),
    ("it_partition", "une partition ancienne roulée et nouée d'un ruban rouge"),
    ("it_cle", "une grande clé de fer ouvragée en forme de battant de cloche"),
    ("it_marteau", "un marteau de sonneur à manche de bois et tête de bronze"),
    ("it_lutrin", "un lutrin de bois sculpté portant un livre ouvert, éclairé par une bougie"),
]

PEOPLE = [
    ("pt_glas", "Portrait en buste sur fond sombre : Maître Glas, vieux sonneur fantôme, longue barbe, capuche de bure, petite cloche pendue au cou, yeux pâles et bienveillants. Format carré."),
    ("pt_tierce", "Portrait en buste sur fond sombre : Madame Tierce, marchande aux allures de grande phalène, châle de dentelle, mains chargées de bagues en forme de notes, sourire malicieux. Format carré."),
    ("pt_fondeuse", "Portrait en buste sur fond sombre : la Fondeuse, forgeronne trapue au tablier de cuir, lunettes de protection relevées, bras couverts de suie, lueur de forge sur le visage. Format carré."),
    ("pt_fa", "Portrait en buste sur fond sombre : Fa, musicien errant maigre au chapeau pointu, une flûte en os à la main, regard rêveur. Format carré."),
    ("pt_muet", "Portrait en buste sur fond sombre : le Gardien muet, chevalier en armure ancienne dont le heaume est une cloche, aucun visage visible, cape déchirée. Format carré."),
    ("key_titre", "Illustration de titre, format paysage 1536x1024 : un minuscule sonneur encapuchonné, silhouette noire avec un marteau, debout sur une poutre au-dessus d'un abîme où pendent des centaines de cloches de bronze, une lueur dorée en bas. Laisser le tiers gauche plus sombre et calme pour un titre."),
    ("fin_cloche", "Illustration de fin, format paysage 1536x1024 : une cloche colossale réparée qui sonne au fond du monde, ondes de lumière dorée qui chassent une encre noire, un minuscule sonneur au pied de la cloche."),
    ("fin_silence", "Illustration de fin alternative, format paysage 1536x1024 : un minuscule sonneur assis seul sur une cloche fêlée, au milieu d'un silence d'encre noire qui recouvre tout, une seule petite lueur dorée dans sa main."),
]

def bg(z, a, b):
    return [(f"bg_{z}_a", a), (f"bg_{z}_b", b)]

BG = [x for z, a, b in ZONES for x in bg(z, a, b)]

BATCHES = {
    "bg_a": (BG_STYLE, BG[:9]),
    "bg_b": (BG_STYLE, BG[9:]),
    "notes": (ICON_STYLE, NOTES),
    "items_people": (ART_STYLE, [(i, ICON_STYLE + " Sujet : " + d) for i, d in ITEMS] + PEOPLE),
}

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
    style, items = BATCHES[batch]
    return "\n".join([COMMON.format(style=style)] + [f"- id `{i}` — {t}" for i, t in items])


if __name__ == "__main__":
    if sys.argv[1] == "--list":
        for name, (_, items) in BATCHES.items():
            print(name, len(items), " ".join(i[0] for i in items))
    elif sys.argv[1] == "--json":
        print(json.dumps({"ref": "main", "inputs": {"environment": "GlobalGPTIdea", "prompt": prompt(sys.argv[2]), "model": "GPT-6.1 Sol", "thinking": "Standard"}}, ensure_ascii=False))
    else:
        print(prompt(sys.argv[1]))
