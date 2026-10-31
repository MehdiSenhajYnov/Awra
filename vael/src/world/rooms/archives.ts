import type { RoomDef } from '../room';

// Zone 4 — Les Archives Englouties (screens x 9-16, y 9-14). Entered through a floor of bars under the Crossroads:
// throw the blade down through the bars, then Starstep to it. The Drowned Librarian gives the Second Breath.

export const ARCHIVES: RoomDef[] = [
  {
    id: 'a_puits', zone: 'archives', at: [15, 9], size: [1, 3],
    exits: { u: [[22, 27]], d: [[20, 25]] },
    solid: [[0, 0, 22, 3], [28, 0, 20, 3], [0, 3, 4, 78], [44, 3, 4, 78], [4, 25, 40, 4], [10, 40, 12, 3], [26, 54, 18, 3], [4, 68, 16, 3], [0, 78, 20, 3], [26, 78, 22, 3]],
    slick: [[4, 3, 2, 22], [42, 3, 2, 22]],
    grate: [[14, 25, 20, 2]],
    hole: [[14, 27, 20, 2]],
    plat: [[30, 18, 6], [8, 12, 6], [30, 6, 6]],
    ents: [['hint', 24, 23, { text: 'gate' }], ['lecteur', 28, 50], ['anguille', 30, 66]],
  },
  {
    id: 'a_vestibule', zone: 'archives', at: [15, 12],
    exits: { u: [[20, 25]], l: [[18, 21]], r: [[18, 21]] },
    solid: [[0, 22, 48, 5], [0, 0, 20, 3], [26, 0, 22, 3], [30, 12, 12, 3]],
    plat: [[8, 15, 6]],
    ents: [['shrine', 12, 21], ['npc', 36, 21, { who: 'orsa' }]],
  },
  {
    // A high shelf only the Second Breath reaches: the Starfall waits there.
    id: 'a_reserve', zone: 'archives', at: [16, 12],
    exits: { l: [[18, 21]] },
    solid: [[0, 22, 48, 5], [0, 0, 48, 3], [44, 3, 4, 19], [26, 6, 18, 3], [20, 9, 2, 13]],
    slick: [[20, 9, 2, 13], [44, 3, 2, 19], [0, 0, 48, 3], [26, 6, 18, 3]],
    ents: [['art', 36, 5, { value: 'chute', id: 'art_chute' }], ['lecteur', 32, 18]],
  },
  {
    id: 'a_rayons', zone: 'archives', at: [13, 12], size: [2, 1],
    exits: { l: [[18, 21]], r: [[18, 21]] },
    solid: [[0, 22, 96, 5], [0, 0, 96, 3], [16, 8, 4, 14], [44, 12, 4, 10], [72, 8, 4, 14], [24, 14, 14, 3], [52, 10, 14, 3]],
    water: [[0, 19, 16, 3], [76, 19, 20, 3]],
    plat: [[6, 14, 6], [80, 13, 6]],
    ents: [['tablet', 30, 21, { lore: 'l8' }], ['lecteur', 58, 6], ['lecteur', 30, 9], ['pretre', 84, 20], ['npc', 60, 21, { who: 'pip' }], ['shard', 32, 13, { id: 'shard_a1' }]],
  },
  {
    // The drowned nave: black water, eels, a way down to the depths.
    id: 'a_noyee', zone: 'archives', at: [11, 12], size: [2, 2],
    exits: { r: [[18, 21]], l: [[44, 47]], d: [[40, 45]] },
    solid: [[0, 48, 40, 6], [46, 48, 50, 6], [0, 0, 96, 3], [60, 22, 36, 5], [0, 22, 30, 3], [30, 36, 30, 3], [76, 30, 8, 18]],
    water: [[3, 40, 27, 8], [62, 40, 14, 8]],
    plat: [[36, 18, 6], [46, 28, 6], [14, 30, 6], [66, 34, 6]],
    ents: [['anguille', 16, 46], ['anguille', 68, 46], ['lecteur', 50, 14], ['pretre', 40, 34], ['vessel', 80, 29, { id: 'vessel_a1' }], ['lecteur', 20, 18]],
  },
  {
    id: 'a_lecture', zone: 'archives', at: [9, 13], size: [2, 1],
    exits: { r: [[17, 20]], l: [[18, 21]] },
    solid: [[0, 22, 96, 5], [0, 0, 96, 3], [80, 21, 16, 6], [36, 12, 20, 3]],
    plat: [[24, 15, 6], [60, 15, 6]],
    ents: [['shrine', 70, 20], ['tablet', 46, 11, { lore: 'l9' }], ['chant', 40, 11, { value: 'archives', id: 'chant_a' }], ['pretre', 20, 20], ['lecteur', 56, 8]],
  },
  {
    id: 'a_profond', zone: 'archives', at: [11, 14], size: [2, 1],
    exits: { u: [[40, 45]], r: [[18, 21]], d: [[60, 65]] },
    solid: [[0, 22, 60, 5], [66, 22, 30, 5], [0, 0, 40, 3], [46, 0, 50, 3], [0, 3, 3, 19], [20, 12, 12, 3]],
    plat: [[44, 15, 6], [70, 13, 6]],
    ents: [['lecteur', 24, 8], ['anguille', 80, 21], ['pretre', 54, 18], ['ore', 26, 11, { id: 'ore_a' }]],
  },
  {
    // The Librarian's reading room, half drowned.
    id: 'a_arene', zone: 'archives', at: [13, 14], size: [2, 1],
    exits: { l: [[18, 21]] },
    solid: [[0, 22, 96, 5], [0, 0, 96, 3], [93, 3, 3, 19]],
    water: [[3, 19, 90, 3]],
    plat: [[16, 14, 8], [72, 14, 8], [44, 9, 8]],
    brk: [[0, 18, 2, 4, 'seal_bibliothecaire']],
    ents: [['arena', 60, 18, { boss: 'bibliothecaire', trigger: [12, 84], door: 'seal_bibliothecaire' }]],
  },
];
