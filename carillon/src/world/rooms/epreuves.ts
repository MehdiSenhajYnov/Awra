import type { RoomDef } from '../room';

// Optional trials (one per ability, each a precise test of skill) and three Variations: faster, tougher
// rematches of earlier keepers. They hold the best rewards of the game.

export const EPREUVES: RoomDef[] = [
  {
    // Pogo across a long bed of spikes: down-strikes only.
    id: 'e_rebond', zone: 'beffroi', at: [12, 1], bg: 'b',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 2], [0, 2, 4, 7], [26, 12, 2, 3]],
    spike: [[4, 14, 22, 1]],
    plat: [[0, 11, 4]],
    ents: [
      ['chauve', 18, 9], ['chauve', 10, 8], ['hint', 28, 14, { text: 'pogo' }],
      ['note', 1, 10, { value: 'glas', id: 'note_glas' }], ['shard', 2, 10, { id: 'shard_e1' }],
    ],
  },
  {
    // Dashes between crumbling ledges over spikes.
    id: 'e_glissando', zone: 'gouttieres', at: [8, 3], bg: 'a',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 4, 3], [28, 15, 4, 3], [0, 0, 32, 2], [4, 17, 24, 1]],
    spike: [[4, 16, 24, 1]],
    ents: [
      ['crumble', 9, 13, { w: 2 }], ['crumble', 16, 11, { w: 2 }], ['crumble', 23, 13, { w: 2 }],
      ['chauve', 14, 6], ['slot', 30, 14, { id: 'slot_e2' }],
    ],
  },
  {
    // A chimney climb, then a run over spikes along the ceiling.
    id: 'e_crampons', zone: 'fonderie', at: [19, 4], bg: 'b',
    exits: { d: [[14, 17]] },
    solid: [[0, 15, 32, 3], [0, 0, 3, 15], [7, 4, 2, 11], [24, 6, 8, 2], [12, 0, 20, 2]],
    hole: [[14, 15, 4, 3]],
    spike: [[9, 14, 5, 1], [18, 14, 6, 1]],
    plat: [[13, 15, 6]],
    ents: [['crumble', 12, 8, { w: 2 }], ['crumble', 18, 7, { w: 2 }], ['fondeur', 27, 5], ['vessel', 29, 5, { id: 'vessel_e3' }]],
  },
  {
    // Two timed gates back to back: only Contretemps is fast enough.
    id: 'e_contretemps', zone: 'orgues', at: [10, 5], bg: 'a',
    exits: { u: [[4, 7]] },
    solid: [[0, 15, 32, 3], [12, 0, 1, 11], [24, 0, 1, 11]],
    ents: [
      ['bell', 6, 12, { flag: 'e4_a', timed: 40, bars: [[12, 11, 1, 4]] }],
      ['bell', 20, 12, { flag: 'e4_b', timed: 40, bars: [[24, 11, 1, 4]] }],
      ['tuyau', 18, 14], ['tin', 28, 14, { id: 'tin_e4' }],
    ],
  },
  {
    // Floating ledges far apart: double jumps and dashes, no walls to lean on.
    id: 'e_envolee', zone: 'crypte', at: [5, 6], dark: true, bg: 'a',
    exits: { r: [[11, 14]] },
    solid: [[24, 15, 8, 3], [0, 17, 24, 1]],
    spike: [[0, 16, 24, 1]],
    plat: [[16, 11, 3], [8, 8, 3], [1, 11, 3]],
    ents: [['lamp', 17, 9], ['lamp', 9, 6], ['feu', 12, 5], ['shard', 2, 10, { id: 'shard_e5' }], ['page', 9, 7, { value: '2' }]],
  },
  {
    // Three cracked floors stacked: plunge through each, keepers waiting between.
    id: 'e_frappe', zone: 'fonderie', at: [16, 6], bg: 'a',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 2], [10, 5, 22, 1], [10, 10, 22, 1], [8, 6, 2, 9]],
    slam: [[18, 5, 4, 1], [24, 10, 4, 1]],
    plat: [[3, 11, 4], [4, 7, 4], [3, 3, 4]],
    ents: [['scorie', 16, 9], ['fondeur', 28, 9], ['scorie', 20, 14], ['shard', 26, 14, { id: 'shard_e6' }]],
  },
  {
    // Anchor to anchor over a sea of glass.
    id: 'e_appel', zone: 'jardin', at: [19, 8], bg: 'b',
    exits: { u: [[4, 7]] },
    solid: [[0, 15, 9, 3], [27, 13, 5, 5], [9, 17, 18, 1]],
    spike: [[9, 16, 18, 1]],
    ents: [['anchor', 12, 6], ['anchor', 18, 4], ['anchor', 24, 6], ['chauve', 18, 9], ['vessel', 29, 12, { id: 'vessel_e7' }]],
  },
  {
    id: 'v_dechu', zone: 'beffroi', at: [14, 1], bg: 'a',
    exits: { d: [[4, 7]] },
    solid: [[0, 15, 32, 3], [0, 0, 32, 1]],
    hole: [[4, 15, 4, 3]],
    plat: [[3, 15, 6], [12, 10, 5], [22, 10, 5]],
    ents: [['arena', 18, 14, { boss: 'dechu', variant: 'v', trigger: [9, 29], doors: [[4, 16, 4, 1]] }]],
  },
  {
    id: 'v_jumeaux', zone: 'crypte', at: [5, 7], bg: 'b',
    exits: { r: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    plat: [[6, 10, 5], [21, 10, 5], [13, 6, 6]],
    ents: [['arena', 14, 14, { boss: 'jumeaux', variant: 'v', trigger: [3, 26], doors: [[31, 11, 1, 4]] }]],
  },
  {
    id: 'v_echappement', zone: 'horlogerie', at: [18, 11], bg: 'b',
    exits: { l: [[11, 14]] },
    solid: [[0, 15, 32, 3]],
    plat: [[8, 10, 5], [20, 10, 5]],
    ents: [['arena', 18, 14, { boss: 'echappement', variant: 'v', trigger: [5, 28], doors: [[0, 11, 1, 4]] }]],
  },
];
