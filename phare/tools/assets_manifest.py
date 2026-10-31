#!/usr/bin/env python3
"""Asset manifest for Phare and prompt builder for the Codex image launcher.

Usage: python3 tools/assets_manifest.py <batch> | --list
"""
import sys

STYLE = (
    "STYLE COMMUN (strict pour toutes les images) : aquarelle de peintre de marine bretonne, lavis transparents, "
    "trait de crayon léger, palette marine (bleus ardoise, gris perle, blanc d'écume, rouge brique, ocre de goémon), "
    "ambiance douce et mélancolique. Aucun texte, aucune lettre, aucun chiffre, aucun nom de bateau lisible, "
    "aucun drapeau réel, aucune signature, aucun cadre."
)
SHIP = ("Vu exactement de profil (côté tribord, proue vers la gauche), le navire entier flottant sur une mince ligne d'eau, "
        "seul sur fond blanc pur uniforme (#FFFFFF), sans ciel ni décor, format paysage : {desc}.")
OBJ = "Objet seul, entier et centré, sur fond blanc pur uniforme (#FFFFFF), sans ombre portée, format carré : {desc}."

SHIPS = [
    ("sh_thonier", "un petit thonier breton en bois à coque bleue avec ses longues perches de pêche relevées"),
    ("sh_sardinier", "un sardinier à moteur à coque verte et cabine blanche"),
    ("sh_chalutier", "un chalutier rouge et noir avec son portique arrière"),
    ("sh_langoustier", "un langoustier à voile rouge et coque noire"),
    ("sh_caboteur", "un petit caboteur de marchandises à coque grise et cheminée noire"),
    ("sh_ferry", "un ferry blanc et bleu des îles avec ses ponts à passagers"),
    ("sh_remorqueur", "un remorqueur trapu rouge à pare-battages en pneus"),
    ("sh_pilote", "une vedette de pilote orange et noire, fine et rapide"),
    ("sh_voilier", "un voilier de plaisance blanc à une voile"),
    ("sh_goelette", "une goélette à deux mâts aux voiles ocre"),
    ("sh_dundee", "un dundee thonier à deux mâts et voiles brunes"),
    ("sh_canot", "un canot de sauvetage orange avec ses sauveteurs en ciré"),
    ("sh_cargo", "un cargo bananier blanc à quatre mâts de charge"),
    ("sh_petrolier", "un long pétrolier noir et rouge très bas sur l'eau"),
    ("sh_conteneurs", "un porte-conteneurs chargé de conteneurs colorés"),
    ("sh_paquebot", "un grand paquebot noir et blanc à trois cheminées rouges"),
    ("sh_brise_glace", "un brise-glace rouge à l'étrave renforcée, quelques glaçons autour"),
    ("sh_hydro", "un navire hydrographique blanc avec un mât d'antennes"),
    ("sh_trois_mats", "un grand trois-mâts école aux voiles blanches gonflées"),
    ("sh_aviso", "un aviso militaire gris avec un canon à l'avant"),
    ("sh_peniche", "une péniche de canal égarée en mer, avec du linge qui sèche"),
    ("sh_yacht", "un yacht de luxe blanc très élancé"),
    ("sh_sous_marin", "un sous-marin noir en surface, kiosque émergé"),
    ("sh_hydravion", "un hydravion rouge et blanc posé sur l'eau"),
    ("sh_baleine", "une baleine bleue qui fait surface en soufflant un jet d'eau"),
    ("sh_dauphins", "trois dauphins qui sautent au-dessus des vagues"),
    ("sh_fantome", "un vaisseau fantôme pâle et translucide aux voiles déchirées dans la brume verdâtre"),
    ("sh_drakkar", "un drakkar viking à voile rayée rouge et blanche et boucliers"),
]

WRECKS = [
    ("ep_bouteille", "une bouteille à la mer en verre vert avec un message roulé et un bouchon"),
    ("ep_figure", "une figure de proue sculptée en bois d'une femme aux cheveux dorés"),
    ("ep_coffre", "un coffre de marin scellé, bardé de fer, couvert de coquillages"),
    ("ep_carte", "une carte marine ancienne déchirée et roulée"),
    ("ep_longue_vue", "une longue-vue en laiton dépliée"),
    ("ep_bouee", "une bouée couronne rouge et blanche"),
    ("ep_cloche", "une cloche de navire en bronze verdi"),
    ("ep_ancre", "une petite ancre rouillée avec un bout de chaîne"),
    ("ep_casier", "un casier à homard en osier"),
    ("ep_flotteur", "un flotteur de pêche en verre bleu dans son filet"),
    ("ep_boussole", "une boussole de marine en cuivre"),
    ("ep_lanterne", "une lanterne de bateau à verre rouge"),
    ("ep_rame", "une rame en bois peinte en bleu"),
    ("ep_chapeau", "un chapeau de capitaine détrempé"),
    ("ep_bananes", "une caisse en bois pleine de bananes"),
    ("ep_medaillon", "un médaillon en argent ouvert"),
]

OTHER = [
    ("pt_yann", "Portrait en buste, fond de lavis gris-bleu : Yann, vieux gardien de phare breton taiseux, barbe blanche, pull marin rayé, casquette de marin, pipe, regard doux. Format carré."),
    ("chr_bernique", OBJ.format(desc="Bernique, une chatte tricolore dodue assise, l'air sérieux")),
    ("bg_titre", "Grande aquarelle : un phare blanc et rouge sur un rocher au bout d'une côte bretonne au crépuscule, le faisceau balaie une mer grise, un petit thonier passe au large, maison du gardien éclairée. Laisser le ciel du tiers supérieur calme pour un titre. Format paysage 1536x1024."),
    ("bg_registre", "Texture de papier aquarelle ivoire légèrement grenu, uniforme, sans aucun dessin ni bord. Format carré."),
]

BATCHES = {
    "ships_a": [(i, SHIP.format(desc=d)) for i, d in SHIPS[:14]],
    "ships_b": [(i, SHIP.format(desc=d)) for i, d in SHIPS[14:]],
    "wrecks": [(i, OBJ.format(desc=d)) for i, d in WRECKS],
    "other": OTHER,
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
    return "\n".join([COMMON.format(style=STYLE)] + [f"- id `{i}` — {t}" for i, t in BATCHES[batch]])


if __name__ == "__main__":
    if sys.argv[1] == "--list":
        for name, items in BATCHES.items():
            print(name, len(items), " ".join(i[0] for i in items))
    else:
        print(prompt(sys.argv[1]))
