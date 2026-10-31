import type { RoomDef } from '../room';

// Zone 7 — La Pénombre (screens x 12-18, y 15-20). Under the Archives, behind black crystal (Comet Wake).
// The living ink. The Gloam Queen guards the way to the Heart.

export const PENOMBRE: RoomDef[] = [
  {
    id: 'p_seuil', zone: 'penombre', at: [12, 15], size: [1, 2],
    exits: { u: [[12, 17]], d: [[20, 25]] },
    solid: [[0, 0, 12, 3], [18, 0, 30, 3], [0, 3, 4, 48], [44, 3, 4, 48], [4, 22, 26, 3], [30, 3, 14, 13], [30, 22, 8, 3], [20, 32, 18, 3], [0, 51, 20, 3], [26, 51, 22, 3]],
    brk: [[30, 16, 2, 6, 'crys_p2']],
    plat: [[6, 16, 5], [18, 10, 5], [8, 42, 6]],
    ents: [['ombre', 30, 31], ['etincelle', 14, 44], ['hint', 20, 21, { text: 'crystal' }]],
  },
  {
    id: 'p_cocons', zone: 'penombre', at: [12, 17], size: [2, 2],
    exits: { u: [[20, 25]], r: [[44, 47]] },
    solid: [[0, 0, 20, 3], [26, 0, 70, 3], [0, 48, 96, 6], [0, 3, 3, 45], [10, 14, 30, 3], [50, 22, 30, 3], [20, 34, 30, 3], [70, 38, 26, 3]],
    gloam: [[3, 47, 60, 1]],
    plat: [[40, 28, 6], [60, 42, 6], [82, 30, 6]],
    ents: [['ombre', 30, 13], ['ombre', 60, 21], ['pretre', 34, 30], ['chevalier', 80, 37], ['etincelle', 70, 12], ['shard', 24, 33, { id: 'shard_p1' }]],
  },
  {
    id: 'p_statues', zone: 'penombre', at: [14, 18], size: [2, 1],
    exits: { l: [[17, 20]], r: [[18, 21]] },
    solid: [[0, 21, 30, 6], [30, 22, 66, 5], [0, 0, 96, 3], [44, 12, 12, 3], [70, 16, 6, 6]],
    plat: [[30, 15, 6], [60, 10, 6]],
    ents: [['tablet', 20, 20, { lore: 'l13' }], ['npc', 50, 11, { who: 'pip' }], ['chevalier', 40, 21], ['pretre', 80, 20], ['ombre', 86, 21]],
  },
  {
    id: 'p_marche', zone: 'penombre', at: [16, 18],
    exits: { l: [[18, 21]], r: [[18, 21]] },
    solid: [[0, 22, 48, 5], [0, 0, 48, 3], [30, 14, 18, 3]],
    ents: [['npc', 22, 21, { who: 'murmure' }], ['shrine', 10, 21], ['chant', 40, 13, { value: 'penombre', id: 'chant_p' }]],
  },
  {
    id: 'p_abime', zone: 'penombre', at: [17, 18], size: [2, 2],
    exits: { l: [[18, 21]], d: [[70, 75]] },
    solid: [[0, 22, 20, 3], [0, 0, 96, 3], [93, 3, 3, 51], [0, 50, 70, 4], [76, 50, 17, 4], [30, 30, 16, 3], [56, 38, 14, 3], [76, 26, 17, 3], [10, 40, 12, 3]],
    gloam: [[0, 49, 70, 1]],
    plat: [[24, 26, 5], [48, 44, 5], [64, 32, 5]],
    ents: [['ombre', 36, 29], ['pretre', 60, 20], ['etincelle', 80, 14], ['chevalier', 64, 37], ['vessel', 14, 39, { id: 'vessel_p1' }], ['ore', 84, 25, { id: 'ore_p' }]],
  },
  {
    id: 'p_lac', zone: 'penombre', at: [17, 20], size: [2, 1],
    exits: { u: [[70, 75]], l: [[18, 21]] },
    solid: [[0, 22, 30, 5], [70, 22, 26, 5], [0, 0, 70, 3], [76, 0, 20, 3], [93, 3, 3, 19]],
    gloam: [[30, 23, 40, 4]],
    hole: [[30, 22, 40, 1]],
    plat: [[36, 16, 5], [50, 13, 5], [62, 16, 5]],
    ents: [['tablet', 80, 21, { lore: 'l14' }], ['etincelle', 50, 6], ['ombre', 16, 21], ['shrine', 88, 21]],
  },
  {
    // The Queen's hall; her fall opens the floor towards the Heart.
    id: 'p_arene', zone: 'penombre', at: [15, 20], size: [2, 1],
    exits: { r: [[18, 21]], d: [[40, 45]] },
    solid: [[0, 22, 40, 5], [46, 22, 50, 5], [0, 0, 96, 3], [0, 3, 3, 19]],
    brk: [[40, 22, 6, 5, 'seal_reine_floor'], [94, 17, 2, 5, 'seal_reine']],
    plat: [[16, 15, 8], [72, 15, 8], [42, 10, 10]],
    ents: [['arena', 30, 21, { boss: 'reine', trigger: [10, 84], door: 'seal_reine' }]],
  },
];
