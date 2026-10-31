import type { RoomDef } from '../room';

// Zone 6 — Le Jardin de Verre (cells x 14-19, y 7-9). Needs Frappe; Appel is won here. Spikes = glass shards.

export const JARDIN: RoomDef[] = [
  {
    id: 'j_entree', zone: 'jardin', at: [15, 7], title: true, bg: 'a',
    exits: { u: [[14, 17]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 14, 2], [18, 0, 14, 2], [0, 2, 4, 13]],
    plat: [[12, 6, 8], [6, 10, 5], [20, 10, 5]],
    ents: [['eclat', 20, 14], ['sonnaille', 10, 14], ['page', 7, 9, { value: '7' }]],
  },
  {
    id: 'j_serre', zone: 'jardin', at: [16, 7], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[46, 49]] },
    solid: [[0, 15, 64, 3], [0, 0, 64, 2], [18, 10, 3, 5], [34, 8, 3, 7]],
    hole: [[46, 15, 4, 3]],
    spike: [[21, 14, 13, 1], [37, 14, 8, 1]],
    plat: [[24, 9, 4], [29, 6, 4], [40, 9, 4], [44, 15, 8]],
    ents: [['choriste', 28, 14], ['eclat', 10, 14], ['eclat', 56, 14], ['chauve', 26, 4], ['sonnaille', 52, 14]],
  },
  {
    id: 'j_lutrin', zone: 'jardin', at: [18, 7], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    plat: [[12, 10, 8]],
    ents: [['lectern', 10, 14], ['npc', 22, 14, { who: 'tierce' }], ['page', 15, 9, { value: '14' }]],
  },
  {
    id: 'j_fleurs', zone: 'jardin', at: [19, 7], bg: 'b',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [10, 11, 2, 4], [18, 9, 2, 6], [26, 7, 6, 8]],
    spike: [[12, 14, 6, 1], [20, 14, 6, 1]],
    ents: [['note', 29, 6, { value: 'point_orgue', id: 'note_point_orgue' }], ['shard', 15, 8, { id: 'shard_j1' }], ['choriste', 22, 8], ['eclat', 4, 14]],
  },
  {
    id: 'j_cristaux', zone: 'jardin', at: [17, 8], size: [1, 2], bg: 'a',
    exits: { u: [[14, 17]], l: [[29, 32]], r: [[29, 32]] },
    solid: [[0, 33, 32, 3], [0, 0, 3, 29], [29, 0, 3, 29]],
    spike: [[3, 32, 6, 1], [23, 32, 6, 1]],
    plat: [[11, 4, 10], [4, 9, 6], [21, 13, 6], [4, 17, 6], [21, 21, 6], [9, 25, 6], [17, 29, 5]],
    ents: [['eclat', 16, 32], ['chauve', 10, 12], ['chauve', 20, 24], ['choriste', 24, 12]],
  },
  {
    id: 'j_prisme', zone: 'jardin', at: [18, 9], bg: 'b',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [22, 0, 10, 10]],
    plat: [[10, 10, 4]],
    ents: [
      ['bell', 6, 10, { flag: 'j_timed', timed: 40, bars: [[22, 10, 1, 5]] }],
      ['note', 28, 14, { value: 'diapason', id: 'note_diapason' }], ['hint', 12, 14, { text: 'timed' }], ['eclat', 16, 14],
    ],
  },
  {
    id: 'j_arene', zone: 'jardin', at: [15, 9], size: [2, 1], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    plat: [[10, 10, 6], [48, 10, 6], [28, 6, 8]],
    ents: [['arena', 32, 14, { boss: 'cantatrice', trigger: [10, 54], doors: [[0, 11, 1, 4], [63, 11, 1, 4]] }]],
  },
  {
    id: 'j_sortie', zone: 'jardin', at: [14, 9], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    plat: [[10, 10, 5]],
    ents: [['lectern', 20, 14], ['hint', 12, 14, { text: 'grapple' }], ['anchor', 12, 5]],
  },
];
