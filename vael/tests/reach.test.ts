import { describe, expect, it } from 'vitest';
import { explore, inventory } from './reach';

describe('the kingdom can be completed', () => {
  it('every room, pickup and keeper is reachable, and the heart', () => {
    const r = explore({ verbose: true });
    const inv = inventory();
    const missingP = inv.pickups.filter((p) => !r.flags.has(p));
    const missingB = inv.bosses.filter((b) => !r.bosses.has(b));
    console.log('rooms', r.rooms.size, 'abilities', [...r.abilities].join(','), 'missing pickups', missingP, 'missing keepers', missingB);
    expect(missingB).toEqual([]);
    expect(missingP).toEqual([]);
    expect(r.heart).toBe(true);
  }, 1800000);
});
