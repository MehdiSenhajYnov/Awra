import type { RoomDef } from '../room';

// Zone 4 — Les Orgues (cells x 11-14, y 4-6). Needs Contretemps (timed bell); Envolée is won here.

export const ORGUES: RoomDef[] = [
  {
    id: 'o_entree', zone: 'orgues', at: [13, 4], title: true, bg: 'a',
    exits: { u: [[14, 17]], l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 14, 1], [18, 0, 14, 1], [0, 0, 3, 11]],
    plat: [[18, 11, 5], [24, 7, 5], [13, 4, 6]],
    ents: [
      ['bell', 16, 12, { flag: 'o_timed', timed: 48, bars: [[3, 11, 1, 4]] }],
      ['hint', 10, 14, { text: 'timed' }], ['tuyau', 27, 14],
    ],
  },
  {
    id: 'o_tuyaux', zone: 'orgues', at: [11, 4], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[50, 53]] },
    solid: [[0, 15, 64, 3], [0, 0, 64, 2], [14, 8, 3, 7], [34, 6, 3, 9]],
    hole: [[50, 15, 4, 3]],
    spike: [[18, 14, 15, 1]],
    plat: [[48, 15, 8], [40, 9, 5]],
    ents: [
      ['wind', 25, 14, { w: 3, h: 11, s: 0.9 }], ['tuyau', 15, 7], ['tuyau', 35, 5], ['soufflet', 44, 6], ['soufflet', 8, 7],
      ['page', 25, 3, { value: '5' }],
    ],
  },
  {
    id: 'o_cheminee', zone: 'orgues', at: [12, 5], size: [1, 2], bg: 'a',
    exits: { u: [[18, 21]], l: [[29, 32]], r: [[29, 32]] },
    solid: [[0, 33, 32, 3], [0, 0, 4, 29], [28, 0, 4, 29]],
    plat: [[16, 5, 8], [6, 10, 7], [19, 15, 7], [6, 20, 7], [17, 25, 7]],
    ents: [['wind', 26, 32, { w: 2, h: 30, s: 0.85 }], ['soufflet', 14, 13], ['tuyau', 8, 32], ['chauve', 20, 22]],
  },
  {
    id: 'o_lutrin', zone: 'orgues', at: [11, 6], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], u: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    plat: [[6, 11, 5], [13, 4, 6]],
    ents: [['lectern', 22, 14], ['hint', 7, 10, { text: 'double' }]],
  },
  {
    id: 'o_secret', zone: 'orgues', at: [11, 5], bg: 'a',
    exits: { d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[4, 10, 5], [23, 10, 5]],
    ents: [['note', 6, 9, { value: 'contrepoint', id: 'note_contrepoint' }], ['shard', 25, 9, { id: 'shard_o1' }], ['wind', 16, 14, { w: 2, h: 12 }], ['soufflet', 16, 6]],
  },
  {
    id: 'o_arene', zone: 'orgues', at: [13, 6], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 64, 3]],
    spike: [[59, 14, 4, 1], [1, 14, 3, 1]],
    plat: [[14, 10, 6], [44, 10, 6], [28, 6, 8]],
    hole: [[14, 15, 4, 3]],
    gate: [[14, 15, 4, 1, 'boss_souffleur']],
    ents: [['arena', 34, 14, { boss: 'souffleur', trigger: [16, 52], doors: [[0, 11, 1, 4]] }]],
  },
];
