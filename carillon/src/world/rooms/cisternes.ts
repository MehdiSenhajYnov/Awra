import type { RoomDef } from '../room';

// Zone 7 — Les Cisternes (cells x 7-13, y 7-10). Needs Appel to cross the black water. Liquid = black water.

export const CISTERNES: RoomDef[] = [
  {
    id: 'ci_ouest', zone: 'cisternes', at: [7, 9], title: true, bg: 'a',
    exits: { u: [[14, 17]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 14, 2], [18, 0, 14, 2]],
    ink: [[4, 15, 8, 2]],
    plat: [[13, 6, 6], [6, 11, 5], [20, 10, 5]],
    ents: [['anguille', 8, 14], ['ver', 24, 14]],
  },
  {
    id: 'ci_aqueduc', zone: 'cisternes', at: [8, 9], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 64, 3], [24, 11, 4, 4], [40, 11, 4, 4]],
    hole: [[14, 15, 4, 3]],
    ink: [[6, 15, 8, 2], [18, 15, 6, 2], [28, 15, 12, 2], [44, 15, 12, 2]],
    plat: [[13, 15, 6], [32, 10, 4], [49, 10, 4]],
    ents: [['anguille', 10, 14], ['anguille', 33, 14], ['anguille', 50, 14], ['gargouillette', 26, 10], ['gargouillette', 42, 10], ['page', 34, 9, { value: '8' }]],
  },
  {
    id: 'ci_reservoir', zone: 'cisternes', at: [8, 10], dark: true, bg: 'a',
    exits: { u: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    ink: [[6, 15, 20, 2]],
    plat: [[13, 6, 6], [6, 10, 4], [22, 10, 4], [14, 13, 4]],
    ents: [['note', 27, 14, { value: 'bourdon', id: 'note_bourdon' }], ['shard', 3, 14, { id: 'shard_ci1' }], ['lamp', 16, 12], ['anguille', 12, 14], ['anguille', 20, 14], ['muet', 16, 6]],
  },
  {
    id: 'ci_lutrin', zone: 'cisternes', at: [10, 9], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    plat: [[12, 10, 8]],
    ents: [['lectern', 16, 14], ['page', 15, 9, { value: '9' }]],
  },
  {
    id: 'ci_grande', zone: 'cisternes', at: [11, 9], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[24, 27]] },
    solid: [[0, 15, 64, 3], [0, 13, 4, 2], [22, 13, 10, 5], [58, 13, 6, 2]],
    hole: [[24, 13, 4, 5]],
    ink: [[4, 13, 18, 4], [32, 13, 26, 4]],
    ents: [
      ['anchor', 6, 5], ['anchor', 11, 5], ['anchor', 16, 6], ['anchor', 19, 5], ['anchor', 34, 5], ['anchor', 39, 4], ['anchor', 44, 5], ['anchor', 50, 6], ['anchor', 55, 6],
      ['anguille', 10, 12], ['anguille', 30, 12], ['anguille', 44, 12], ['chauve', 36, 3], ['hint', 3, 12, { text: 'grapple' }],
    ],
  },
  {
    id: 'ci_porte', zone: 'cisternes', at: [13, 9], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], u: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    plat: [[13, 4, 6], [6, 8, 5], [20, 8, 5], [12, 11, 8]],
    ents: [['anguille', 22, 14], ['ver', 8, 14]],
  },
  {
    id: 'ci_chute', zone: 'cisternes', at: [13, 7], size: [1, 2], bg: 'b',
    exits: { u: [[14, 17]], d: [[14, 17]] },
    solid: [[0, 0, 12, 1], [20, 0, 12, 1], [0, 33, 32, 3]],
    slam: [[14, 33, 4, 2]],
    plat: [[12, 5, 8], [4, 9, 6], [22, 13, 6], [4, 17, 6], [22, 21, 6], [12, 25, 8], [4, 29, 6]],
    ents: [['chauve', 10, 12], ['chauve', 20, 24], ['gargouillette', 25, 12]],
  },
  {
    id: 'ci_vannes', zone: 'cisternes', at: [11, 10], size: [2, 1], bg: 'a',
    exits: { u: [[24, 27]], l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    ink: [[34, 15, 10, 2]],
    plat: [[22, 6, 8], [36, 11, 5]],
    ents: [['lectern', 10, 14], ['anguille', 38, 14], ['automate', 52, 14], ['muet', 46, 7]],
  },
  {
    id: 'ci_arene', zone: 'cisternes', at: [9, 10], size: [2, 1], bg: 'b',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 6, 3], [58, 15, 6, 3], [6, 17, 52, 1]],
    ink: [[6, 15, 52, 2]],
    plat: [[10, 11, 6], [22, 9, 6], [36, 9, 6], [48, 11, 6], [29, 5, 6], [29, 11, 6]],
    ents: [['arena', 32, 14, { boss: 'noye', trigger: [6, 56], doors: [[63, 11, 1, 4]] }]],
  },
  {
    id: 'ci_ecluse', zone: 'cisternes', at: [13, 10], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [24, 0, 2, 11]],
    gate: [[24, 11, 2, 4, 'boss_noye']],
    ents: [['page', 10, 14, { value: '18' }]],
  },
];
