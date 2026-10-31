import { CELL_H, CELL_W, TILE } from '../engine/core';
import type { RoomDef } from './room';
import { ALL_ROOMS } from './rooms/index';

export const ROOMS: RoomDef[] = ALL_ROOMS;
const BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

export function roomDef(id: string): RoomDef | undefined {
  return BY_ID.get(id);
}

export function roomSize(r: RoomDef): [number, number] {
  const [w, h] = r.size ?? [1, 1];
  return [w * CELL_W, h * CELL_H];
}

/** Room covering a global tile position, if any. */
export function roomAt(gtx: number, gty: number): RoomDef | null {
  for (const r of ROOMS) {
    const [w, h] = roomSize(r);
    const x0 = r.at[0] * CELL_W;
    const y0 = r.at[1] * CELL_H;
    if (gtx >= x0 && gtx < x0 + w && gty >= y0 && gty < y0 + h) return r;
  }
  return null;
}

export function bounds(r: RoomDef): { x: number; y: number; w: number; h: number } {
  const [w, h] = roomSize(r);
  return { x: r.at[0] * CELL_W, y: r.at[1] * CELL_H, w, h };
}

/**
 * The room beyond an edge, and where the hero's body (top-left, 34×84) enters it. px, py: hero centre in the
 * current room's pixels.
 */
export function neighbour(cur: RoomDef, side: 'l' | 'r' | 'u' | 'd', px: number, py: number): { def: RoomDef; x: number; y: number } | null {
  const ox = cur.at[0] * CELL_W * TILE;
  const oy = cur.at[1] * CELL_H * TILE;
  const gx = ox + px;
  const gy = oy + py;
  const probeX = side === 'l' ? gx - TILE * 2 : side === 'r' ? gx + TILE * 2 : gx;
  const probeY = side === 'u' ? gy - TILE * 3 : side === 'd' ? gy + TILE * 3 : gy;
  const next = roomAt(Math.floor(probeX / TILE), Math.floor(probeY / TILE));
  if (!next || next.id === cur.id) return null;
  const nx = next.at[0] * CELL_W * TILE;
  const ny = next.at[1] * CELL_H * TILE;
  const [nw, nh] = roomSize(next);
  let x = gx - nx - 17;
  let y = gy - ny - 42;
  if (side === 'l') x = nw * TILE - 34 - 20;
  if (side === 'r') x = 20;
  if (side === 'u') y = nh * TILE - 84 - 10;
  if (side === 'd') y = 10;
  return { def: next, x, y };
}
