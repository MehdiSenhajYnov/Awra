import type { RoomDef } from '../room';

// Zone 8 — L'Horlogerie (cells x 14-18, y 10-12). Moving platforms, gears, automatons.

export const HORLOGERIE: RoomDef[] = [
  {
    id: 'h_entree', zone: 'horlogerie', at: [14, 10], title: true, bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[13, 15, 6], [6, 10, 5], [21, 10, 5]],
    ents: [['engrenage', 24, 14], ['automate', 8, 14]],
  },
  {
    id: 'h_rouages', zone: 'horlogerie', at: [15, 10], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 6, 3], [58, 15, 6, 3], [6, 17, 52, 1], [28, 12, 6, 6]],
    spike: [[6, 16, 22, 1], [34, 16, 24, 1]],
    ents: [
      ['mover', 8, 13, { w: 4, dx: 14, period: 260 }], ['mover', 36, 13, { w: 4, dx: 16, period: 300, phase: 150 }],
      ['mover', 22, 8, { w: 3, dy: 4, period: 200 }], ['automate', 30, 11], ['engrenage', 60, 14], ['chauve', 44, 5],
    ],
  },
  {
    id: 'h_lutrin', zone: 'horlogerie', at: [17, 10], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[13, 15, 6]],
    ents: [['lectern', 7, 14], ['npc', 24, 14, { who: 'fa' }], ['page', 4, 14, { value: '19' }]],
  },
  {
    id: 'h_cadran', zone: 'horlogerie', at: [18, 10], bg: 'b',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [22, 5, 10, 2]],
    spike: [[8, 14, 12, 1]],
    ents: [
      ['mover', 8, 11, { w: 3, dx: 9, period: 160 }], ['mover', 14, 8, { w: 3, dy: -3, period: 180 }],
      ['note', 28, 4, { value: 'canon', id: 'note_canon' }], ['shard', 26, 14, { id: 'shard_h1' }], ['anchor', 20, 3], ['engrenage', 26, 14],
    ],
  },
  {
    id: 'h_echap', zone: 'horlogerie', at: [17, 11], size: [1, 2], bg: 'a',
    exits: { u: [[14, 17]], l: [[29, 32]] },
    solid: [[0, 33, 32, 3], [28, 0, 4, 33]],
    plat: [[12, 4, 8], [4, 9, 6], [18, 13, 6], [4, 17, 6], [18, 21, 6], [6, 25, 6], [16, 29, 6]],
    ents: [['automate', 10, 32], ['engrenage', 20, 32], ['chauve', 14, 12], ['squelette', 6, 16]],
  },
  {
    id: 'h_balancier', zone: 'horlogerie', at: [14, 11], size: [1, 2], bg: 'b',
    exits: { u: [[14, 17]], l: [[29, 32]], r: [[29, 32]] },
    solid: [[0, 33, 32, 3]],
    ents: [
      ['mover', 14, 7, { w: 4, dx: 8, period: 220 }], ['mover', 6, 12, { w: 4, dx: 12, period: 240, phase: 120 }],
      ['mover', 16, 18, { w: 4, dx: -9, period: 200 }], ['mover', 8, 24, { w: 4, dx: 12, period: 260, phase: 60 }],
      ['mover', 14, 29, { w: 5, dy: -4, period: 180 }], ['automate', 24, 32], ['chauve', 20, 14],
    ],
  },
  {
    id: 'h_arene', zone: 'horlogerie', at: [15, 12], size: [2, 1], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    plat: [[12, 10, 6], [46, 10, 6], [28, 7, 8]],
    ents: [['arena', 32, 14, { boss: 'echappement', trigger: [10, 54], doors: [[0, 11, 1, 4], [63, 11, 1, 4]] }]],
  },
];
