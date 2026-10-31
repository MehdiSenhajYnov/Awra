import { describe, expect, it } from 'vitest';
import { CELL_H, CELL_W } from '../src/engine/core';
import { type RoomDef, roomSize } from '../src/world/room';
import { ROOMS, bounds, roomAt } from '../src/world/world';

const KINDS = new Set([
  'lectern', 'npc', 'hint', 'lamp', 'bell', 'plate', 'anchor', 'wind', 'mover', 'crumble', 'arena', 'gatebells',
  'shard', 'vessel', 'tin', 'page', 'note', 'ability', 'key', 'slot',
  'ver', 'scorie', 'eclat', 'chauve', 'feu', 'soufflet', 'bedeau', 'gargouillette', 'tuyau', 'choriste', 'fondeur', 'sonnaille', 'squelette', 'automate', 'muet', 'anguille', 'engrenage', 'ombre',
]);

/** Global tile cells just outside an exit span, and the side the neighbour must open. */
function outside(r: RoomDef, side: 'l' | 'r' | 'u' | 'd', span: [number, number]): { cells: [number, number][]; back: 'l' | 'r' | 'u' | 'd' } {
  const b = bounds(r);
  const cells: [number, number][] = [];
  for (let i = span[0]; i <= span[1]; i++) {
    if (side === 'l') cells.push([b.x - 1, b.y + i]);
    if (side === 'r') cells.push([b.x + b.w, b.y + i]);
    if (side === 'u') cells.push([b.x + i, b.y - 1]);
    if (side === 'd') cells.push([b.x + i, b.y + b.h]);
  }
  return { cells, back: ({ l: 'r', r: 'l', u: 'd', d: 'u' } as const)[side] };
}

describe('world', () => {
  it('has unique room ids and no overlapping rooms', () => {
    const ids = new Set<string>();
    for (const r of ROOMS) {
      expect(ids.has(r.id), r.id).toBe(false);
      ids.add(r.id);
      const b = bounds(r);
      for (const o of ROOMS) {
        if (o === r) continue;
        const c = bounds(o);
        const hit = b.x < c.x + c.w && b.x + b.w > c.x && b.y < c.y + c.h && b.y + b.h > c.y;
        expect(hit, `${r.id} overlaps ${o.id}`).toBe(false);
      }
    }
  });

  it('every opening leads to a matching opening next door', () => {
    const problems: string[] = [];
    for (const r of ROOMS) {
      for (const side of ['l', 'r', 'u', 'd'] as const) {
        for (const span of r.exits[side] ?? []) {
          const { cells, back } = outside(r, side, span);
          const n = roomAt(cells[0][0], cells[0][1]);
          if (!n) { problems.push(`${r.id} ${side}${span} leads nowhere`); continue; }
          const nb = bounds(n);
          // The neighbour's span along the shared edge, in its local coordinates.
          const local: [number, number] = side === 'l' || side === 'r'
            ? [cells[0][1] - nb.y, cells[cells.length - 1][1] - nb.y]
            : [cells[0][0] - nb.x, cells[cells.length - 1][0] - nb.x];
          const ok = (n.exits[back] ?? []).some((s) => s[0] === local[0] && s[1] === local[1]);
          if (!ok) problems.push(`${r.id} ${side}[${span}] → ${n.id} needs ${back}[${local}]`);
          if (cells.some(([x, y]) => roomAt(x, y) !== n)) problems.push(`${r.id} ${side}[${span}] straddles two rooms`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('rooms are whole screens and entities are known kinds inside bounds', () => {
    for (const r of ROOMS) {
      const [w, h] = roomSize(r);
      expect(w % CELL_W, r.id).toBe(0);
      expect(h % CELL_H, r.id).toBe(0);
      for (const [k, x, y] of r.ents ?? []) {
        expect(KINDS.has(k), `${r.id}: ${k}`).toBe(true);
        expect(x >= 0 && x < w && y >= 0 && y < h, `${r.id}: ${k} at ${x},${y}`).toBe(true);
      }
    }
  });
});
