import type { RoomDef } from '../room';

// Zone 2 — Les Gouttières (cells x 5-10, y 1-4). Needs Glissando to enter; Crampons are won here.

export const GOUTTIERES: RoomDef[] = [
  {
    id: 'g_toits', zone: 'gouttieres', at: [8, 2], size: [2, 1], title: true, bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3], [44, 12, 6, 3], [10, 12, 5, 3]],
    hole: [[26, 15, 8, 2]],
    spike: [[26, 16, 8, 1]],
    plat: [[52, 9, 6], [36, 9, 4]],
    ents: [['hint', 38, 14, { text: 'dash' }], ['gargouillette', 47, 11], ['ver', 56, 14], ['sonnaille', 18, 14], ['chauve', 30, 5]],
  },
  {
    id: 'g_cheneaux', zone: 'gouttieres', at: [7, 2], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [4, 9, 6, 2], [22, 9, 6, 2]],
    hole: [[14, 15, 4, 3]],
    plat: [[13, 6, 6]],
    ents: [['gargouillette', 6, 8], ['gargouillette', 25, 8], ['sonnaille', 24, 14], ['page', 15, 5, { value: '3' }]],
  },
  {
    id: 'g_lutrin', zone: 'gouttieres', at: [6, 2], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], u: [[14, 17]] },
    solid: [[0, 15, 32, 3], [11, 1, 2, 10], [19, 1, 2, 10], [0, 0, 14, 1], [18, 0, 14, 1]],
    ents: [['lectern', 25, 14], ['hint', 16, 14, { text: 'wall' }]],
  },
  {
    id: 'g_clocheton', zone: 'gouttieres', at: [6, 1], bg: 'b',
    exits: { d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[4, 11, 6], [22, 11, 6], [12, 7, 8]],
    ents: [['shard', 15, 6, { id: 'shard_g1' }], ['chauve', 6, 6], ['chauve', 25, 6], ['gargouillette', 26, 10]],
  },
  {
    id: 'g_fleche', zone: 'gouttieres', at: [5, 2], bg: 'b',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 11, 4, 4], [9, 12, 1, 3], [15, 11, 1, 4]],
    spike: [[4, 14, 5, 1], [10, 14, 5, 1], [16, 14, 4, 1]],
    ents: [['note', 2, 10, { value: 'tremolo', id: 'note_tremolo' }], ['hint', 22, 14, { text: 'pogo' }], ['chauve', 12, 6], ['page', 26, 14, { value: '12' }]],
  },
  {
    id: 'g_egout', zone: 'gouttieres', at: [7, 3], size: [1, 2], bg: 'a',
    exits: { u: [[14, 17]], l: [[29, 32]], r: [[29, 32]], d: [[14, 17]] },
    solid: [[0, 33, 32, 3]],
    slam: [[14, 33, 4, 2]],
    plat: [[18, 4, 8], [6, 8, 7], [19, 12, 7], [6, 16, 7], [19, 20, 7], [6, 24, 7], [17, 28, 7]],
    ents: [['gargouillette', 3, 7], ['gargouillette', 28, 19], ['sonnaille', 10, 32], ['chauve', 16, 14], ['hint', 16, 32, { text: 'slam' }]],
  },
  {
    id: 'g_bassin', zone: 'gouttieres', at: [6, 4], bg: 'b',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 2], [8, 9, 4, 2], [18, 6, 4, 2]],
    brk: [[2, 11, 2, 4]],
    plat: [[24, 11, 5]],
    ents: [['gargouillette', 10, 8], ['gargouillette', 20, 5], ['sonnaille', 14, 14], ['sonnaille', 26, 14], ['shard', 1, 14, { id: 'shard_g2' }], ['page', 26, 10, { value: '15' }]],
  },
  {
    id: 'g_arene', zone: 'gouttieres', at: [8, 4], size: [2, 1], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    plat: [[12, 10, 6], [46, 10, 6], [28, 7, 8]],
    ents: [['arena', 32, 14, { boss: 'gargouille', trigger: [12, 52], doors: [[0, 11, 1, 4], [63, 11, 1, 4]] }]],
  },
  {
    id: 'g_sortie', zone: 'gouttieres', at: [10, 4], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    plat: [[12, 10, 8]],
    ents: [['lectern', 8, 14], ['page', 16, 9, { value: '10' }], ['hint', 22, 14, { text: 'heal' }]],
  },
];
