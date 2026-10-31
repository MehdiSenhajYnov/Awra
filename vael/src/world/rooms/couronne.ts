import type { RoomDef } from '../room';

// Zone 1 — La Couronne. Cells x 0-9, y 0-4.

export const COURONNE: RoomDef[] = [
  {
    id: 'c_reveil', zone: 'couronne', at: [0, 0], size: [2, 1],
    exits: { r: [[19, 22]] },
    solid: [[0, 23, 96, 4], [0, 0, 3, 27], [20, 19, 10, 4], [40, 16, 6, 7], [60, 20, 14, 3], [80, 0, 16, 9]],
    plat: [[32, 15, 6], [50, 12, 6]],
    spike: [[46, 22, 14, 1]],
    ents: [['shrine', 8, 22], ['coquille', 70, 19], ['acarien', 36, 22]],
  },
  {
    id: 'c_nef', zone: 'couronne', at: [2, 0], size: [2, 2],
    exits: { l: [[19, 22]] },
    solid: [[0, 23, 30, 31], [30, 50, 66, 4], [90, 0, 6, 54], [44, 40, 10, 3], [60, 32, 10, 3], [74, 24, 10, 3]],
    plat: [[34, 45, 6], [52, 36, 5], [66, 28, 5]],
    ents: [['lampion', 50, 30], ['coquille', 50, 49]],
  },
];
