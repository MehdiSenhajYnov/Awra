#!/usr/bin/env python3
"""Asset manifest for Refusé and prompt builder for the Codex image launcher.

Usage: python3 tools/assets_manifest.py <batch> | --list
"""
import sys

STYLE = (
    "STYLE COMMUN (strict pour toutes les images) : enluminure de marge de manuscrit médiéval (drôlerie), "
    "trait d'encre brune fin, aplats de couleurs minérales (vermillon, bleu lapis, vert de cuivre, ocre, or mat), "
    "sur parchemin crème, humour absurde et tendre, personnages aux proportions naïves. Aucun texte, aucune lettre, "
    "aucune enluminure de lettrine, aucun chiffre, aucun cadre, aucune signature."
)
PORTRAIT = ("Portrait en buste d'un personnage, cadré épaules et visage, sur un fond de parchemin uni, "
            "regardant le spectateur d'un air {mood}. ")
WINDOW = ("Vue par une fenêtre en arc gothique (on ne voit que le paysage, sans le cadre) : {desc}. "
          "Composition paysage, même point de vue pour toute la série : un village au premier plan, des champs, un château au loin. ")
ICON = "Petite vignette isolée sur fond blanc pur (#FFFFFF), sujet centré, sans ombre portée : {desc}."

CLAIMANTS = [
    ("cl_paysan", PORTRAIT.format(mood="désespéré") + "Un paysan à la barbe roussie par les flammes, chapeau de paille fumant."),
    ("cl_crapaud", PORTRAIT.format(mood="digne") + "Un gros crapaud vert coiffé d'un heaume de chevalier et portant une cape."),
    ("cl_fantome", PORTRAIT.format(mood="mélancolique") + "Un fantôme translucide et bleuté en drap, avec une petite couronne de fleurs."),
    ("cl_berger", PORTRAIT.format(mood="éploré") + "Un berger qui tient une houlette et la corde vide d'un mouton disparu."),
    ("cl_forgeron", PORTRAIT.format(mood="furieux") + "Un forgeron moustachu au tablier de cuir troué de brûlures, marteau à la main."),
    ("cl_princesse", PORTRAIT.format(mood="exaspéré") + "Une princesse couverte de suie, couronne de travers, cheveux ébouriffés."),
    ("cl_meuniere", PORTRAIT.format(mood="indigné") + "Une meunière couverte de farine dont le bonnet est roussi."),
    ("cl_dragon", PORTRAIT.format(mood="penaud") + "Un grand dragon rouge au museau de chien, qui tire une langue rouge gonflée et fumante."),
    ("cl_marchand", PORTRAIT.format(mood="geignard") + "Un marchand de caravane au turban ocre, couvert de sable jusqu'au cou."),
    ("cl_chamelier", PORTRAIT.format(mood="ahuri") + "Un chamelier maigre qui tient seulement une bride, son chameau a été avalé."),
    ("cl_potiere", PORTRAIT.format(mood="sceptique") + "Une potière du désert tenant une jarre fendue en deux."),
    ("cl_scorpion", PORTRAIT.format(mood="hautain") + "Un homme-scorpion en armure de cuivre, sa queue courbée au-dessus de la tête."),
    ("cl_oasis", PORTRAIT.format(mood="éploré") + "La gardienne d'une oasis, vêtue de vert, tenant une palme fanée."),
    ("cl_ver", PORTRAIT.format(mood="gêné") + "Un ver des sables géant à la bouche ronde pleine de dents, avec un bandage autour du ventre."),
    ("cl_pecheur", PORTRAIT.format(mood="trempé") + "Un pêcheur en ciré dont le filet est déchiré par une grosse ventouse."),
    ("cl_capitaine", PORTRAIT.format(mood="outré") + "Un capitaine au bicorne détrempé, une ventouse collée sur la joue."),
    ("cl_sirene", PORTRAIT.format(mood="boudeur") + "Une sirène aux cheveux pleins d'algues, peigne d'or à la main."),
    ("cl_pirate", PORTRAIT.format(mood="rusé") + "Un pirate borgne au perroquet, qui cache un coffre derrière son dos."),
    ("cl_noye", PORTRAIT.format(mood="résigné") + "Un marin noyé verdâtre couvert de coquillages, qui réclame poliment."),
    ("cl_kraken", PORTRAIT.format(mood="contrit") + "Un énorme kraken violet au regard triste, un tentacule bandé."),
    ("cl_cavalier", PORTRAIT.format(mood="sinistre") + "Un cavalier de l'apocalypse squelettique au chapeau pointu, sur un cheval pâle maigre."),
    ("cl_demon", PORTRAIT.format(mood="aimable") + "Un petit démon rouge en costume de notaire, cornes polies, qui tend un parchemin."),
    ("cl_roi", PORTRAIT.format(mood="impérieux") + "Un roi grassouillet à la couronne énorme, en manteau d'hermine, qui exige."),
    ("pt_grisard", PORTRAIT.format(mood="satisfait et cupide") + "M. Grisard, directeur gobelin vert aux lunettes en demi-lune, plume derrière l'oreille, en robe de clerc."),
]

WINDOWS = []
REALMS = {
    "dragon": "un royaume de collines verdoyantes avec un village à toits de chaume et un château",
    "desert": "un royaume de désert avec un village de maisons d'argile, des palmiers et une oasis",
    "mer": "un royaume côtier avec un port de pêche, des maisons à colombages et des bateaux",
}
STATES = [
    ("0", "prospère, ensoleillé, des villageois heureux, des champs dorés"),
    ("1", "quelques maisons abîmées, un toit qui fume, villageois inquiets"),
    ("2", "de nombreuses maisons en ruine, des fumées noires, des pancartes de protestation vierges"),
    ("3", "dévasté et désert, ruines calcinées, ciel rouge, corbeaux"),
]
for realm, desc in REALMS.items():
    for idx, state in STATES:
        WINDOWS.append((f"win_{realm}_{idx}", WINDOW.format(desc=f"{desc}, état : {state}")))

ICONS = [
    ("ic_clerc", ICON.format(desc="un petit clerc gobelin assis qui tamponne frénétiquement des papiers")),
    ("ic_tube", ICON.format(desc="un réseau de tubes pneumatiques en cuivre par lequel volent des parchemins")),
    ("ic_machine", ICON.format(desc="une machine à vapeur médiévale fantaisiste avec un bras articulé qui tient un tampon")),
    ("ic_oracle", ICON.format(desc="une boule de cristal sur un trépied d'or avec un œil à l'intérieur")),
    ("ic_hibou", ICON.format(desc="un hibou messager qui porte un parchemin roulé dans ses serres")),
    ("ic_archives", ICON.format(desc="une haute pile de dossiers ficelés et de rouleaux de parchemin")),
    ("ic_tampon", ICON.format(desc="un gros tampon en bois et en fer avec un manche rouge")),
    ("ic_encrier", ICON.format(desc="un encrier de corne avec une plume d'oie")),
    ("ic_coffre", ICON.format(desc="un coffre-fort de fer rempli de pièces d'or")),
    ("ic_sablier", ICON.format(desc="un sablier doré")),
    ("bg_titre", "Grande illustration de marge de manuscrit : un petit fonctionnaire gobelin derrière un pupitre frappe un énorme tampon sur un parchemin, tandis qu'une file de demandeurs absurdes (crapaud en armure, fantôme, paysan roussi) attend, et qu'un dragon passe la tête par la fenêtre. Laisser le tiers supérieur clair (parchemin uni) pour un titre. Format paysage."),
    ("fin_apocalypse", "Grande illustration de marge de manuscrit : la fin du monde (pluie de feu, cavaliers dans le ciel) pendant qu'un petit gobelin tamponne joyeusement un parchemin géant au premier plan, imperturbable. Format paysage."),
]

BATCHES = {
    "claimants_a": CLAIMANTS[:12],
    "claimants_b": CLAIMANTS[12:],
    "windows": WINDOWS,
    "icons": ICONS,
}

COMMON = """Tu es chargé de produire des assets 2D pour un jeu vidéo (ne modifie aucun fichier existant du dépôt).
Utilise ton outil intégré de génération d'image (image_gen) pour chaque image ci-dessous, une génération par image.
{style}
Contraintes techniques :
- Crée le dossier ./assets_out/ à la racine du dépôt et enregistre chaque image en PNG sous ./assets_out/<id>.png, telle que générée (ne la redimensionne pas, ne la recadre pas).
- Portraits et vignettes : format carré. Fenêtres et illustrations : format paysage 1536x1024.
- Ne dessine JAMAIS une image avec du code : seul le générateur d'image IA produit les visuels.
- Garde un style strictement cohérent entre toutes les images du lot ; si ton outil accepte une image de référence, utilise la première image du lot comme référence de style pour les suivantes (pour les fenêtres d'un même royaume, utilise l'état 0 comme référence pour garder exactement le même paysage).
- Aucune image ne doit contenir de texte, de lettres ou de chiffres.
- Si une génération échoue, réessaie jusqu'à 2 fois, puis passe à la suivante.
Réponds en français avec la liste des fichiers produits et les éventuels échecs.

Images à produire :
"""


def prompt(batch: str) -> str:
    return "\n".join([COMMON.format(style=STYLE)] + [f"- id `{i}` — {t}" for i, t in BATCHES[batch]])


if __name__ == "__main__":
    if sys.argv[1] == "--list":
        for name, items in BATCHES.items():
            print(name, len(items), " ".join(i[0] for i in items))
    else:
        print(prompt(sys.argv[1]))
