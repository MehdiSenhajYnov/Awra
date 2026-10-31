import type { RoomDef } from '../room';

// Zone 9 — Le Bourdon (cells x 9-13, y 12-14). Opens once the eight great bells ring. Liquid = silent ink.

export const BOURDON: RoomDef[] = [
  {
    id: 'bo_porte', zone: 'bourdon', at: [13, 12], title: true, bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [6, 0, 2, 11]],
    gate: [[6, 11, 2, 4, 'bourdon_open']],
    ents: [['npc', 12, 14, { who: 'muet' }], ['lectern', 22, 14]],
  },
  {
    id: 'bo_descente', zone: 'bourdon', at: [11, 12], size: [2, 1], bg: 'b',
    exits: { r: [[11, 14]], d: [[10, 13]] },
    solid: [[0, 15, 64, 3], [0, 0, 8, 12], [16, 11, 4, 4], [36, 10, 4, 5]],
    hole: [[10, 15, 4, 3]],
    ink: [[20, 15, 16, 2], [40, 15, 12, 2]],
    plat: [[24, 10, 5], [44, 10, 5], [9, 15, 6]],
    ents: [['ombre', 50, 14], ['muet', 30, 7], ['feu', 46, 6], ['chauve', 14, 6]],
  },
  {
    id: 'bo_abime', zone: 'bourdon', at: [11, 13], size: [1, 2], bg: 'a',
    exits: { u: [[10, 13]], l: [[29, 32]], r: [[29, 32]] },
    solid: [[0, 33, 32, 3]],
    ink: [[12, 33, 8, 2]],
    plat: [[8, 4, 8], [18, 9, 6], [6, 14, 6], [18, 19, 6], [6, 24, 6], [14, 28, 6]],
    ents: [['ombre', 10, 32], ['muet', 18, 12], ['muet', 10, 22], ['feu', 22, 6]],
  },
  {
    id: 'bo_lutrin', zone: 'bourdon', at: [12, 14], bg: 'b',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    ents: [['lectern', 14, 14], ['page', 24, 14, { value: '20' }]],
  },
  {
    id: 'bo_arene', zone: 'bourdon', at: [9, 14], size: [2, 1], bg: 'a',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    plat: [[6, 10, 6], [52, 10, 6], [28, 6, 8], [16, 7, 4], [44, 7, 4]],
    ents: [
      ['arena', 32, 14, { boss: 'silence', trigger: [8, 56], doors: [[63, 11, 1, 4]] }],
      ['bell', 8, 9, { flag: 'final_ring', group: 'final', ring: 100, needs: 'silence3' }],
      ['bell', 32, 5, { flag: 'final_ring', group: 'final', ring: 100, needs: 'silence3' }],
      ['bell', 55, 9, { flag: 'final_ring', group: 'final', ring: 100, needs: 'silence3' }],
    ],
  },
];
