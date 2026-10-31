import type { RoomDef } from '../room';

// Zone 3 — La Fonderie (cells x 14-19, y 3-6). Needs Crampons; Contretemps is won here. Liquid = molten bronze.

export const FONDERIE: RoomDef[] = [
  {
    id: 'f_porche', zone: 'fonderie', at: [14, 3], size: [2, 1], title: true, bg: 'a',
    exits: { l: [[11, 14]], r: [[2, 5]] },
    solid: [[0, 15, 64, 3], [0, 0, 64, 2], [18, 4, 6, 8], [28, 6, 36, 9]],
    ents: [['hint', 25, 14, { text: 'wall' }], ['scorie', 10, 14], ['fondeur', 40, 5], ['page', 56, 5, { value: '4' }]],
  },
  {
    id: 'f_forge', zone: 'fonderie', at: [16, 3], bg: 'b',
    exits: { l: [[2, 5]], r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [0, 6, 8, 9], [0, 0, 32, 2]],
    hole: [[14, 15, 4, 3]],
    plat: [[9, 10, 4], [13, 15, 6]],
    ents: [['lectern', 22, 14], ['npc', 27, 14, { who: 'fondeuse' }]],
  },
  {
    id: 'f_coulee', zone: 'fonderie', at: [17, 3], size: [2, 1], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3], [16, 12, 3, 3], [30, 11, 4, 4], [45, 12, 3, 3]],
    ink: [[6, 15, 10, 2], [19, 15, 11, 2], [34, 15, 11, 2], [48, 15, 10, 2]],
    plat: [[24, 9, 4], [38, 8, 4]],
    ents: [['crumble', 10, 11, { w: 3 }], ['crumble', 52, 11, { w: 3 }], ['scorie', 32, 10], ['fondeur', 46, 11], ['chauve', 20, 5], ['chauve', 40, 4]],
  },
  {
    id: 'f_moules', zone: 'fonderie', at: [19, 3], bg: 'b',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [20, 4, 12, 3]],
    brk: [[20, 7, 2, 8]],
    ink: [[8, 15, 8, 2]],
    plat: [[9, 11, 6]],
    ents: [['note', 27, 14, { value: 'fortissimo', id: 'note_fortissimo' }], ['shard', 24, 14, { id: 'shard_f1' }], ['fondeur', 4, 14], ['scorie', 14, 10]],
  },
  {
    id: 'f_puits', zone: 'fonderie', at: [16, 4], size: [1, 2], bg: 'a',
    exits: { u: [[14, 17]], l: [[29, 32]], r: [[29, 32]] },
    solid: [[0, 33, 32, 3], [0, 0, 6, 33], [26, 0, 6, 33]],
    plat: [[13, 4, 7], [7, 9, 6], [19, 13, 6], [7, 17, 6], [19, 21, 6], [7, 25, 6], [14, 29, 6]],
    hole: [[0, 29, 6, 4], [26, 29, 6, 4]],
    ents: [['chauve', 16, 10], ['chauve', 12, 22], ['scorie', 16, 32]],
  },
  {
    id: 'f_creusets', zone: 'fonderie', at: [15, 5], bg: 'b',
    exits: { r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 3], [4, 11, 5, 4]],
    hole: [[14, 15, 4, 3]],
    ink: [[20, 15, 6, 2]],
    plat: [[13, 15, 6], [19, 11, 8]],
    ents: [['fondeur', 6, 10], ['fondeur', 23, 10], ['scorie', 28, 14], ['shard', 2, 14, { id: 'shard_f2' }]],
  },
  {
    id: 'f_cave', zone: 'fonderie', at: [15, 6], bg: 'a',
    exits: { u: [[14, 17]], d: [[14, 17]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 14, 3], [18, 0, 14, 3]],
    slam: [[14, 15, 4, 2]],
    plat: [[6, 11, 5], [22, 11, 5], [13, 7, 6]],
    ents: [['hint', 16, 14, { text: 'slam' }], ['page', 8, 10, { value: '16' }], ['scorie', 24, 14]],
  },
  {
    id: 'f_arene', zone: 'fonderie', at: [17, 5], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    plat: [[10, 10, 6], [48, 10, 6], [27, 7, 10]],
    ents: [['arena', 32, 14, { boss: 'mere', trigger: [10, 54], doors: [[0, 11, 1, 4], [63, 11, 1, 4]] }]],
  },
  {
    id: 'f_sortie', zone: 'fonderie', at: [19, 5], bg: 'a',
    exits: { l: [[11, 14]], u: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    plat: [[18, 11, 6], [13, 7, 5], [14, 3, 4]],
    ents: [['vessel', 21, 10, { id: 'vessel_f' }], ['hint', 8, 14, { text: 'swap' }], ['lectern', 12, 14]],
  },
];
