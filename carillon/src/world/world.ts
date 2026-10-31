import { CELL_H, CELL_W } from '../engine/core';
import { type RoomDef, roomSize } from './room';
import { ALL_ROOMS } from './rooms';

export const ROOMS: RoomDef[] = ALL_ROOMS;
const BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

export function roomDef(id: string): RoomDef {
  const r = BY_ID.get(id);
  if (!r) throw new Error(`unknown room ${id}`);
  return r;
}

export function hasRoom(id: string): boolean {
  return BY_ID.has(id);
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

/** Bounds of every room in global tiles, for the map. */
export function bounds(r: RoomDef): { x: number; y: number; w: number; h: number } {
  const [w, h] = roomSize(r);
  return { x: r.at[0] * CELL_W, y: r.at[1] * CELL_H, w, h };
}
