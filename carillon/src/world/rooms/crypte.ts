import type { RoomDef } from '../room';

// Zone 5 — La Crypte des Sonneurs (cells x 6-10, y 5-8). Needs Envolée; Frappe is won here. Dark rooms.

export const CRYPTE: RoomDef[] = [
  {
    id: 'c_porte', zone: 'crypte', at: [10, 6], title: true, bg: 'a',
    exits: { l: [[3, 6]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 7, 7, 2], [0, 0, 32, 1]],
    spike: [[1, 14, 15, 1]],
    plat: [[10, 9, 4]],
    ents: [['hint', 22, 14, { text: 'double' }], ['feu', 18, 8], ['page', 3, 6, { value: '17' }]],
  },
  {
    id: 'c_nef', zone: 'crypte', at: [8, 6], size: [2, 1], dark: true, bg: 'b',
    exits: { l: [[11, 14]], r: [[3, 6]], d: [[40, 43]] },
    solid: [[0, 15, 64, 3], [56, 7, 8, 8], [20, 11, 4, 4]],
    hole: [[40, 15, 4, 3]],
    plat: [[48, 11, 6], [30, 9, 6], [8, 10, 5]],
    ents: [['lamp', 34, 8], ['lamp', 10, 9], ['feu', 44, 6], ['feu', 16, 5], ['squelette', 28, 14], ['page', 31, 8, { value: '6' }]],
  },
  {
    id: 'c_ossuaire', zone: 'crypte', at: [7, 6], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], u: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    plat: [[8, 11, 5], [19, 11, 5], [13, 7, 6], [13, 3, 6]],
    ents: [['lectern', 25, 14], ['page', 15, 2, { value: '13' }]],
  },
  {
    id: 'c_cloches', zone: 'crypte', at: [7, 5], bg: 'b',
    exits: { u: [[14, 17]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [24, 0, 8, 10], [0, 0, 6, 10]],
    hole: [[14, 15, 4, 3]],
    plat: [[6, 11, 6], [20, 11, 4], [13, 7, 6], [13, 3, 6]],
    ents: [
      ['plate', 20, 14, { bars: [[26, 10, 1, 5]] }], ['shard', 29, 14, { id: 'shard_c1' }],
      ['muet', 20, 8], ['hint', 8, 14, { text: 'echo' }],
    ],
  },
  {
    id: 'c_reliquaire', zone: 'crypte', at: [6, 6], dark: true, bg: 'b',
    exits: { r: [[11, 14]], l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 8, 11]],
    gate: [[7, 11, 1, 4, 'c_duo']],
    plat: [[18, 9, 4]],
    ents: [
      ['bell', 12, 10, { flag: 'c_duo', group: 'c_duo' }], ['bell', 27, 10, { flag: 'c_duo', group: 'c_duo' }],
      ['note', 3, 14, { value: 'silence', id: 'note_silence' }], ['shard', 5, 14, { id: 'shard_c2' }], ['lamp', 20, 8], ['feu', 22, 5],
    ],
  },
  {
    id: 'c_tombes', zone: 'crypte', at: [8, 7], size: [2, 1], dark: true, bg: 'a',
    exits: { l: [[11, 14]], u: [[40, 43]], d: [[8, 11]] },
    solid: [[0, 15, 64, 3], [36, 0, 4, 9], [44, 0, 4, 9]],
    slam: [[8, 15, 4, 2]],
    plat: [[38, 9, 8], [26, 11, 6], [50, 11, 6]],
    ents: [['lamp', 40, 12], ['lamp', 18, 10], ['muet', 22, 8], ['squelette', 30, 14], ['squelette', 52, 14], ['feu', 12, 6]],
  },
  {
    id: 'c_caveau', zone: 'crypte', at: [8, 8], dark: true, bg: 'b',
    exits: { u: [[8, 11]] },
    solid: [[0, 15, 32, 3], [0, 0, 8, 3], [12, 0, 20, 3]],
    plat: [[6, 7, 8]],
    ents: [['vessel', 24, 14, { id: 'vessel_c' }], ['lamp', 24, 12], ['squelette', 18, 14], ['muet', 26, 6]],
  },
  {
    id: 'c_arene', zone: 'crypte', at: [6, 7], size: [2, 1], dark: false, bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[46, 49]] },
    solid: [[0, 15, 64, 3]],
    hole: [[46, 15, 4, 3]],
    gate: [[46, 15, 4, 1, 'boss_jumeaux']],
    plat: [[10, 10, 6], [48, 10, 6], [28, 7, 8]],
    ents: [['arena', 32, 14, { boss: 'jumeaux', trigger: [12, 52], doors: [[63, 11, 1, 4], [0, 11, 1, 4]] }]],
  },
  {
    id: 'c_sortie', zone: 'crypte', at: [7, 8], bg: 'b',
    exits: { u: [[14, 17]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[13, 15, 6], [6, 10, 6], [20, 10, 6], [13, 6, 6]],
    ents: [['lectern', 24, 14], ['page', 8, 9, { value: '11' }], ['hint', 16, 14, { text: 'platform' }]],
  },
];
