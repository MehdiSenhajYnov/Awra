#!/usr/bin/env python3
"""Asset manifest for Comestible ? and prompt builder for the Codex image launcher.

Usage: python3 tools/assets_manifest.py <batch>   -> prints the prompt for that batch
       python3 tools/assets_manifest.py --list    -> lists batches and ids
"""
import sys

STYLE = (
    "STYLE COMMUN (à respecter strictement pour toutes les images) : planche d'histoire naturelle "
    "de la fin du XIXe siècle, trait d'encre sépia fin, hachures délicates, aquarelle en lavis sobres "
    "et légèrement désaturés (ocres, bruns, verts mousse, rouges sang séché, violets éteints). "
    "Rendu fait main, aucune 3D, aucun texte, aucune lettre, aucune légende, aucune signature, aucun cadre, "
    "aucun filigrane."
)
WHITE = (
    "Fond blanc pur et uniforme (#FFFFFF), sans papier visible, sans ombre portée, sans sol ; "
    "le sujet est centré, entier, et occupe environ 80 % de la hauteur."
)
SPECIMEN = WHITE + " Vue de profil légèrement plongeante (trois-quarts), on voit le chapeau, un peu du dessous du chapeau, le pied et la base complète."

# id, size (w x h of the final file), prompt
BATCHES = {
    "species_a": [
        ("sp_cepe", "512x768", SPECIMEN + " Un cèpe trapu : chapeau bombé brun noisette lisse, pied ventru crème couvert d'un fin réseau blanc en relief, dessous du chapeau à pores blancs-crème. Base propre, sans sac."),
        ("sp_bolet_menteur", "512x768", SPECIMEN + " Un bolet très semblable à un cèpe : chapeau bombé brun noisette, mais pied crème couvert d'un réseau brun foncé bien visible, dessous du chapeau à pores rose pâle. Base propre."),
        ("sp_girolle", "512x768", SPECIMEN + " Une girolle jaune d'œuf en forme d'entonnoir, marge ondulée, dessous parcouru de plis fourchus épais qui descendent sur le pied (pas de vraies lames). Pied court jaune pâle."),
        ("sp_fausse_girolle", "512x768", SPECIMEN + " Un champignon orange vif en entonnoir qui imite une girolle, mais avec de vraies lames fines, serrées, orange, bien nettes, et un pied mince plus foncé."),
        ("sp_coulemelle", "512x768", SPECIMEN + " Une grande coulemelle (lépiote élevée) : très grand chapeau beige en ombrelle couvert d'écailles brunes, mamelon brun au centre, lames blanches, long pied élancé tigré de brun, anneau épais double, base renflée en bulbe sans sac."),
        ("sp_lepiote_veuve", "512x768", SPECIMEN + " Une petite lépiote élégante : chapeau plat couvert d'écailles roux-rosé disposées en cercles concentriques, lames blanches, pied fin rosé avec un petit anneau fragile, base simple."),
        ("sp_rose_pres", "512x768", SPECIMEN + " Un rosé des prés (agaric champêtre) : chapeau blanc soyeux bombé, lames rose vif à rose brun, pied blanc court avec un anneau simple, base nette coupée droite sans aucun sac."),
        ("sp_blanche_mort", "512x768", SPECIMEN + " Une amanite entièrement blanche et élégante, d'aspect pur et inquiétant : chapeau blanc lisse, lames blanches, anneau pendant en jupe, et à la base un grand sac membraneux blanc (volve) bien visible enveloppant le bulbe."),
        ("sp_pied_bleu", "512x768", SPECIMEN + " Un pied-bleu : chapeau brun-lilas charnu, lames lilas serrées, pied trapu lilas fibrilleux, aucune voile."),
        ("sp_cortinaire_sang", "512x768", SPECIMEN + " Un cortinaire violet profond : chapeau violet sombre, lames violettes tachées de rouille, une fine cortine (voile en toile d'araignée) rouillée entre la marge et le pied, pied violet à bulbe."),
    ],
    "species_b": [
        ("sp_morille", "512x768", SPECIMEN + " Une morille grise : chapeau conique gris-beige creusé d'alvéoles profondes en nid d'abeille, pied blanc granuleux."),
        ("sp_gyromitre", "512x768", SPECIMEN + " Une gyromitre : chapeau brun-rouge informe plissé en circonvolutions comme un cerveau, pied blanc trapu et sillonné."),
        ("sp_pleurote", "512x768", SPECIMEN + " Un pleurote en éventail gris-beige poussant sur un petit morceau de bois mort, lames blanches qui descendent sur un pied court latéral."),
        ("sp_lanterne", "512x768", SPECIMEN + " Une touffe de trois champignons orange vif poussant sur un petit morceau de souche, chapeaux en entonnoir, lames orange décurrentes, pieds soudés."),
        ("sp_lactaire_delicieux", "512x768", SPECIMEN + " Un lactaire délicieux : chapeau orange carotte zoné de cercles concentriques plus foncés et de taches vert-de-gris, lames orange, pied orange creux grêlé de petites fossettes."),
        ("sp_lactaire_chaux", "512x768", SPECIMEN + " Un lactaire à marge laineuse : chapeau saumon-rosé zoné de cercles, marge enroulée couverte de longs poils laineux comme une barbe, lames crème pâle, pied pâle."),
        ("sp_russule_charbon", "512x768", SPECIMEN + " Une russule charbonnière : chapeau mêlé de violet, de vert-gris et d'ardoise, lames blanches, pied blanc dur."),
        ("sp_russule_emetique", "512x768", SPECIMEN + " Une russule émétique : chapeau rouge vif écarlate brillant comme verni, lames blanches, pied blanc pur."),
        ("sp_vesse", "512x768", SPECIMEN + " Une vesse-de-loup des prés : boule blanche en forme de poire, surface couverte de petites verrues granuleuses, base étroite."),
        ("sp_amanite_oeuf", "512x768", SPECIMEN + " Un œuf blanc lisse et ovale d'amanite à peine sorti de terre, membrane blanche, légère fente au sommet, rien d'autre."),
    ],
    "anomalies": [
        ("an_doigt", "512x768", WHITE + " Un champignon fictif horrible qui ressemble à un doigt humain grisâtre sortant d'un petit tas d'humus, avec un ongle jaunâtre à son extrémité et des filaments blancs de mycélium."),
        ("an_oeil", "512x768", WHITE + " Un champignon à chapeau brun ordinaire, mais au centre du chapeau s'ouvre un œil humain humide aux paupières de chair fongique."),
        ("an_dents", "512x768", WHITE + " Un champignon dont le dessous du chapeau porte, à la place des lames, des rangées de petites dents humaines jaunies."),
        ("an_langue", "512x768", WHITE + " Une excroissance fongique rose et luisante en forme de langue, posée sur un morceau d'écorce, parcourue de veines violacées."),
        ("an_cheveux", "512x768", WHITE + " Un champignon pâle dont le pied est entièrement enveloppé de longs cheveux humains noirs emmêlés mêlés de mycélium."),
        ("an_coeur", "512x768", WHITE + " Un œuf fongique rouge sombre et veiné qui ressemble à un cœur, avec de petits filaments de mycélium à sa base."),
        ("obj_panier", "768x512", WHITE + " Un panier en osier tressé vide, ancien, avec une anse, vu de trois-quarts, quelques brins de mousse au fond."),
        ("chr_mousse", "512x512", WHITE + " Une chatte tigrée grise et maigre, assise, aux yeux verts très attentifs, oreilles dressées, qui renifle vers la gauche."),
    ],
    "portraits": [
        ("pt_gaudin", "512x512", "Portrait en buste, cadré épaules et visage, sur fond uni brun-sépia sombre et flou, éclairé à la bougie par la gauche. Une vieille paysanne joviale et ronde aux joues rouges, foulard noué sur la tête, châle de laine, fin XIXe siècle."),
        ("pt_garde", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un garde-champêtre rigide d'une cinquantaine d'années, grosse moustache grise, képi, veste bleu sombre avec plaque de cuivre, regard sévère, fin XIXe siècle."),
        ("pt_lison", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Une fillette de huit ans aux cheveux bruns en bataille, ciré jaune trop grand pour elle, joues sales, grands yeux sérieux un peu étranges, fin XIXe siècle."),
        ("pt_cure", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un curé de campagne maigre et pâle, soutane noire, col romain, lunettes rondes, air inquiet, fin XIXe siècle."),
        ("pt_institutrice", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Une institutrice d'une trentaine d'années, chignon strict, col blanc, regard intelligent et fatigué, fin XIXe siècle."),
        ("pt_bucheron", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un bûcheron massif à la barbe rousse fournie, chemise de laine, visage buriné et timide, fin XIXe siècle."),
        ("pt_valet", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un valet de château hautain, livrée bordeaux à boutons dorés, perruque poudrée démodée, lèvres pincées, fin XIXe siècle."),
        ("pt_cueilleur", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un homme au visage étrangement serein et souriant, tenue de paysan propre, de fins filaments blancs de mycélium dépassant de son col et derrière l'oreille, regard vitreux, fin XIXe siècle."),
        ("pt_cueilleuse", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Une femme encapuchonnée de laine grise, visage pâle et doux, de minuscules champignons blancs poussant à la lisière de sa capuche, yeux mi-clos, fin XIXe siècle."),
        ("pt_vieillard", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un vieillard édenté au chapeau de feutre informe, pipe éteinte, regard malicieux, fin XIXe siècle."),
        ("pt_paysanne", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Une jeune mère paysanne aux traits tirés par la faim, cheveux tirés, robe brune rapiécée, fin XIXe siècle."),
        ("pt_jeune", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un jeune homme maigre de vingt ans, casquette, foulard rouge au cou, air insolent et affamé, fin XIXe siècle."),
        ("pt_meuniere", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Une meunière robuste d'âge mûr, tablier blanchi de farine, bras croisés, air méfiant, fin XIXe siècle."),
        ("pt_docteur", "512x512", "Portrait en buste sur fond uni brun-sépia sombre, éclairé à la bougie. Un médecin de campagne d'une soixantaine d'années, favoris blancs, lorgnon, redingote noire usée, air épuisé, fin XIXe siècle."),
    ],
    "closeups": [
        ("lp_lames_blanches", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un chapeau de champignon : lames blanches fines et serrées rayonnant vers le pied. Le motif remplit toute l'image, sans fond."),
        ("lp_lames_roses", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un chapeau de champignon : lames rose vif teintées de brun chocolat, serrées, rayonnant vers le pied. Le motif remplit toute l'image, sans fond."),
        ("lp_lames_lilas", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un chapeau de champignon : lames lilas violacées serrées. Le motif remplit toute l'image, sans fond."),
        ("lp_lames_orange", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un chapeau de champignon : vraies lames fines orange vif, très serrées et régulières. Le motif remplit toute l'image, sans fond."),
        ("lp_plis", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'une girolle : plis jaunes épais, émoussés, fourchus et anastomosés, comme des veines (pas de vraies lames). Le motif remplit toute l'image, sans fond."),
        ("lp_pores_blancs", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un bolet : une éponge de petits pores ronds blanc-crème. Le motif remplit toute l'image, sans fond."),
        ("lp_pores_roses", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un bolet : une éponge de petits pores ronds rose pâle. Le motif remplit toute l'image, sans fond."),
        ("lp_alveoles", "512x512", "Gros plan rapproché, cadré plein, sur un chapeau de morille : alvéoles profondes en nid d'abeille gris-beige. Le motif remplit toute l'image, sans fond."),
        ("lp_cerveau", "512x512", "Gros plan rapproché, cadré plein, sur un chapeau de gyromitre : circonvolutions brun-rouge plissées comme un cerveau. Le motif remplit toute l'image, sans fond."),
        ("lp_granuleux", "512x512", "Gros plan rapproché, cadré plein, sur la surface blanche d'une vesse-de-loup : petites verrues granuleuses blanches. Le motif remplit toute l'image, sans fond."),
        ("lp_lisse", "512x512", "Gros plan rapproché, cadré plein, sur une membrane blanche lisse et satinée d'œuf d'amanite. Le motif remplit toute l'image, sans fond."),
        ("lp_cortine", "512x512", "Gros plan rapproché, cadré plein, sur le dessous d'un chapeau violet : lames violettes tachées de rouille, recouvertes d'un voile en toile d'araignée rouille. Le motif remplit toute l'image, sans fond."),
    ],
    "cuts_hands": [
        ("ct_chair", "512x512", WHITE + " Un champignon (bolet) coupé en deux dans la longueur, vu de face : chair blanche pleine et homogène dans le chapeau et le pied."),
        ("ct_creux", "512x512", WHITE + " Une morille coupée en deux dans la longueur : entièrement creuse d'un seul tenant, du sommet du chapeau jusqu'au bas du pied, paroi fine."),
        ("ct_chambres", "512x512", WHITE + " Une gyromitre coupée en deux : intérieur cloisonné en chambres irrégulières remplies d'une chair cotonneuse blanche."),
        ("ct_vesse", "512x512", WHITE + " Une vesse-de-loup coupée en deux : chair blanche, ferme, parfaitement homogène comme de la mie de pain."),
        ("ct_oeuf", "512x512", WHITE + " Un œuf d'amanite coupé en deux : on voit à l'intérieur la silhouette dessinée d'un petit champignon replié (chapeau, lames, pied) dans une gelée blanche."),
        ("hd_paysan", "512x512", "Deux mains calleuses de paysan, paumes vers le haut, sur fond uni brun-sépia sombre, éclairées à la bougie, ongles sales de terre."),
        ("hd_enfant", "512x512", "Deux petites mains d'enfant, paumes vers le haut, sur fond uni brun-sépia sombre, éclairées à la bougie, égratignées."),
        ("hd_fines", "512x512", "Deux mains fines et propres, paumes vers le haut, sur fond uni brun-sépia sombre, éclairées à la bougie, une bague simple."),
        ("hd_mycelium", "512x512", "Deux mains pâles paumes vers le haut sur fond uni brun-sépia sombre, éclairées à la bougie : sous les ongles et dans les plis des doigts poussent de fins filaments blancs de mycélium, discrets mais nets."),
        ("hd_mycelium2", "512x512", "Deux mains calleuses de paysan, paumes vers le haut, sur fond uni brun-sépia sombre, éclairées à la bougie : de minuscules champignons blancs poussent au bout des doigts et des filaments blancs sortent de sous les ongles."),
    ],
    "scenes": [
        ("bg_comptoir", "1536x1024", "Intérieur d'une petite officine de mycologue de village, la nuit, fin XIXe siècle, vu depuis derrière le comptoir : grand comptoir de bois usé au premier plan qui occupe le bas de l'image et reste dégagé, étagères de bocaux et de champignons séchés, une fenêtre à petits carreaux sur la brume bleutée, une porte entrouverte. Éclairage chaud de bougie, ombres profondes. Même style gravure + aquarelle, mais plus sombre et plus dense."),
        ("bg_titre", "1536x1024", "Un hameau forestier dans la brume la nuit, fin XIXe siècle, toits de chaume, une seule fenêtre éclairée à la bougie, une forêt de grands sapins noirs, et au premier plan d'immenses champignons pâles qui se dressent dans les herbes. Ambiance folk horror, poétique et inquiétante. Laisser le tiers supérieur de l'image calme (ciel brumeux) pour y placer un titre."),
        ("tx_papier", "1024x1024", "Texture de papier ancien ivoire, légèrement taché et fibreux, uniforme, sans aucun dessin ni bord, éclairage uniforme, utilisable comme fond répétable."),
        ("tx_journal", "1024x1024", "Texture de papier journal ancien jauni, grain fin, uniforme, sans aucun texte ni dessin, éclairage uniforme."),
        ("ui_loupe", "256x256", WHITE + " Une loupe ancienne à manche de bois."),
        ("ui_couteau", "256x256", WHITE + " Un petit couteau de cueillette pliant à manche de corne avec une brosse au bout."),
        ("ui_regle", "256x256", WHITE + " Une règle de bois graduée ancienne, posée en diagonale."),
        ("ui_sporee", "256x256", WHITE + " Une feuille de papier noir et blanc sous une cloche de verre."),
        ("ui_bougie", "256x256", WHITE + " Une bougie de suif à moitié consumée dans un bougeoir de fer, flamme allumée."),
        ("ui_cuillere", "256x256", WHITE + " Une petite cuillère d'étain ancienne."),
        ("ui_nez", "256x256", WHITE + " Un petit flacon de sels ancien en verre bleu avec bouchon de liège."),
    ],
    "endings": [
        ("fin_officine", "1024x768", "Illustration : l'aube dorée sur un hameau forestier, des villageois partagent un repas de champignons sur une longue table dehors, une enfant en ciré jaune rit. Apaisé, lumineux, fin XIXe siècle."),
        ("fin_mycologue", "1024x768", "Illustration : une officine de mycologue au petit matin, un registre ouvert sur le comptoir, une bougie éteinte, une rangée de tombes fraîches visible par la fenêtre dans la brume. Mélancolique, fin XIXe siècle."),
        ("fin_arrete", "1024x768", "Illustration : deux gendarmes du XIXe siècle emmènent un homme menotté hors d'une officine la nuit sous la pluie, des villageois regardent avec haine, lanternes."),
        ("fin_dette", "1024x768", "Illustration : une officine vide et saisie, des scellés de cire sur la porte, des bocaux renversés, un huissier en chapeau haut-de-forme qui s'éloigne dans la brume."),
        ("fin_cueilleur", "1024x768", "Illustration : une silhouette humaine debout dans une forêt la nuit, le corps doucement envahi de champignons pâles et de filaments de mycélium, d'autres silhouettes semblables l'accueillent, sereines."),
        ("fin_brume", "1024x768", "Illustration : un hameau entièrement englouti par une brume pâle, les maisons couvertes de champignons géants, les rues désertes, une seule bougie qui s'éteint à une fenêtre."),
        ("fin_lison", "1024x768", "Illustration : une fillette en ciré jaune s'éloigne dans une forêt de champignons géants lumineux, elle se retourne et sourit, des filaments lumineux la suivent. Merveilleux et inquiétant."),
    ],
}

COMMON = """Tu es chargé de produire des assets 2D pour un jeu vidéo (ne modifie aucun fichier existant du dépôt).
Utilise ton outil intégré de génération d'image (image_gen) pour chaque image ci-dessous, une génération par image.
{style}
Contraintes techniques :
- Crée le dossier ./assets_out/ à la racine du dépôt et enregistre chaque image en PNG sous ./assets_out/<id>.png.
- Après génération, redimensionne chaque image avec Pillow (LANCZOS) exactement à la taille indiquée (recadrage centré si le ratio diffère, jamais de déformation). Installe Pillow si besoin (pip install pillow) en dehors du dépôt.
- Ne dessine JAMAIS une image avec du code : seul le générateur d'image IA produit les visuels. Le code sert uniquement au redimensionnement/recadrage.
- Garde un style strictement cohérent entre toutes les images du lot ; si ton outil accepte une image de référence, utilise la première image du lot comme référence de style pour les suivantes.
- Aucune image ne doit contenir de texte, de lettres ou de chiffres.
- Si une génération échoue, réessaie jusqu'à 2 fois, puis passe à la suivante.
Réponds en français avec la liste des fichiers produits (id, taille) et les éventuels échecs.

Images à produire :
"""


def prompt(batch: str) -> str:
    lines = [COMMON.format(style=STYLE)]
    for ident, size, text in BATCHES[batch]:
        lines.append(f"- id `{ident}` — taille finale {size} px — {text}")
    return "\n".join(lines)


if __name__ == "__main__":
    if sys.argv[1] == "--list":
        for name, items in BATCHES.items():
            print(name, len(items), " ".join(i[0] for i in items))
    else:
        print(prompt(sys.argv[1]))
