import type { RoomDef } from '../room';

// Zone 1 — Le Beffroi (cells x 10-14, y 0-3). Tutorial, the Echo, and the first great bell.
// Floors sit on row 15 (rows 15-17 solid) unless noted; side exits use rows 11-14 above the floor.

export const BEFFROI: RoomDef[] = [
  {
    id: 'b_cloche', zone: 'beffroi', at: [11, 0], title: true, bg: 'a',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 3, 15], [16, 13, 3, 2], [22, 12, 5, 3]],
    plat: [[6, 10, 5]],
    ents: [['lectern', 6, 14], ['hint', 10, 14, { text: 'move' }], ['hint', 17, 12, { text: 'jump' }], ['hint', 24, 11, { text: 'attack' }], ['page', 7, 9, { value: '1' }]],
  },
  {
    id: 'b_charpente', zone: 'beffroi', at: [12, 0], size: [2, 1], bg: 'b',
    exits: { l: [[11, 14]], d: [[54, 57]] },
    solid: [[0, 15, 64, 3], [0, 0, 64, 2]],
    hole: [[18, 15, 5, 1], [54, 15, 4, 3]],
    spike: [[18, 16, 5, 1]],
    plat: [[28, 11, 6], [38, 9, 5], [47, 11, 5]],
    brk: [[60, 11, 3, 4]],
    ents: [['hint', 15, 14, { text: 'pogo' }], ['ver', 10, 14], ['ver', 31, 14], ['chauve', 40, 6], ['ver', 46, 14], ['shard', 61, 14, { id: 'shard_b1' }]],
  },
  {
    id: 'b_puits', zone: 'beffroi', at: [13, 1], size: [1, 2], bg: 'a',
    exits: { u: [[22, 25]], l: [[11, 14], [29, 32]], r: [[29, 32]] },
    solid: [[0, 33, 32, 3]],
    plat: [[0, 15, 6], [5, 12, 3], [19, 5, 9], [9, 9, 7], [20, 13, 7], [7, 17, 7], [19, 21, 8], [8, 25, 7], [18, 29, 8]],
    ents: [['chauve', 14, 11], ['chauve', 22, 23], ['ver', 12, 32], ['hint', 15, 32, { text: 'down' }]],
  },
  {
    id: 'b_echo', zone: 'beffroi', at: [14, 2], bg: 'b',
    exits: { l: [[11, 14]], u: [[4, 7]] },
    solid: [[0, 15, 32, 3], [28, 0, 4, 11]],
    plat: [[12, 11, 3], [4, 5, 4]],
    gate: [[28, 11, 1, 4, 'b_duo']],
    ents: [
      ['npc', 4, 14, { who: 'glas' }], ['ability', 13, 9, { value: 'echo', id: 'has_echo' }],
      ['bell', 8, 9, { flag: 'b_duo', group: 'b_duo' }], ['bell', 22, 9, { flag: 'b_duo', group: 'b_duo' }],
      ['shard', 30, 14, { id: 'shard_b2' }], ['hint', 15, 14, { text: 'echo' }],
    ],
  },
  {
    id: 'b_nef', zone: 'beffroi', at: [11, 2], size: [2, 1], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[30, 33]] },
    solid: [[0, 15, 64, 3], [10, 12, 4, 3], [50, 12, 4, 3]],
    hole: [[30, 15, 4, 3]],
    gate: [[30, 15, 4, 1, 'has_echo']],
    plat: [[18, 10, 6], [40, 10, 6], [28, 6, 8]],
    ents: [['bedeau', 22, 14], ['ver', 44, 14], ['chauve', 32, 4], ['hint', 32, 14, { text: 'parry' }], ['page', 31, 5, { value: '2' }]],
  },
  {
    id: 'b_lutrin', zone: 'beffroi', at: [10, 2], bg: 'b',
    exits: { l: [[11, 14]], r: [[11, 14]], u: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    plat: [[8, 11, 5], [12, 4, 8]],
    ents: [['lectern', 15, 14], ['npc', 24, 14, { who: 'tierce' }], ['hint', 9, 10, { text: 'double' }]],
  },
  {
    id: 'b_grenier', zone: 'beffroi', at: [10, 1], bg: 'a',
    exits: { d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[4, 10, 6], [24, 9, 5]],
    ents: [['note', 6, 9, { value: 'fermata', id: 'note_fermata' }], ['shard', 26, 8, { id: 'shard_b3' }], ['chauve', 10, 6], ['chauve', 22, 6], ['sonnaille', 20, 14]],
  },
  {
    id: 'b_arene', zone: 'beffroi', at: [11, 3], size: [2, 1], bg: 'b',
    exits: { u: [[30, 33]], r: [[11, 14]] },
    solid: [[0, 15, 64, 3]],
    plat: [[22, 11, 5], [37, 8, 5], [29, 4, 6], [12, 10, 4], [48, 10, 4]],
    ents: [['arena', 32, 14, { boss: 'dechu', trigger: [14, 50], doors: [[30, 0, 4, 1], [63, 11, 1, 4]] }]],
  },
  {
    id: 'b_base', zone: 'beffroi', at: [13, 3], bg: 'a',
    exits: { l: [[11, 14]], r: [[11, 14]], d: [[14, 17]] },
    solid: [[0, 15, 32, 3]],
    hole: [[14, 15, 4, 3]],
    plat: [[13, 15, 6]],
    ents: [['lectern', 7, 14], ['npc', 24, 14, { who: 'fa' }], ['hint', 16, 14, { text: 'platform' }]],
  },
];
