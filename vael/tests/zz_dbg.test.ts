import { it } from 'vitest';
import { explore } from './reach';
it('dbg', () => {
  const r = explore({ maxRounds: 3 });
  console.log('ROOMS', [...r.rooms].join(' '));
  for (const room of (process.env.ROOMS ?? '').split(',')) {
    const ys = new Map<number, number[]>();
    for (const p of r.positions.filter((p) => p.startsWith(room + ':'))) {
      const [, x, y] = p.split(':').map(Number);
      ys.set(y, [...(ys.get(y) ?? []), x]);
    }
    console.log(room, [...ys.entries()].sort((a, b) => a[0] - b[0]).map(([y, xs]) => `y${y}: ${Math.min(...xs)}-${Math.max(...xs)}`).join(' | '));
  }
}, 900000);
