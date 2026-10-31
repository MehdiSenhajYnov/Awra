import { CELL_H, CELL_W, TILE } from '../engine/core';

// Rooms are written as a few rectangles rather than ASCII art: borders are generated, openings are listed,
// and the world places each room on a grid of screens so neighbours are found by position.

export const enum T {
  Empty = 0,
  Solid = 1,
  Platform = 2,
  Spikes = 3,
  Breakable = 4,
  Slam = 5,
  Gate = 6,
  Ink = 7,
  Water = 8,
}

export type ZoneId = 'beffroi' | 'gouttieres' | 'fonderie' | 'orgues' | 'crypte' | 'jardin' | 'cisternes' | 'horlogerie' | 'bourdon';
export const ZONES: ZoneId[] = ['beffroi', 'gouttieres', 'fonderie', 'orgues', 'crypte', 'jardin', 'cisternes', 'horlogerie', 'bourdon'];

/** [x, y, w, h] in tiles, local to the room. */
export type Rect = [number, number, number, number];
/** Tile ranges (inclusive) left open in a border. */
export type Span = [number, number];

/** [kind, x, y, options?]: x/y in tiles (feet position for actors). */
export type EntDef = [string, number, number, Record<string, unknown>?];

export interface RoomDef {
  id: string;
  zone: ZoneId;
  /** Position on the world grid, in screens. */
  at: [number, number];
  /** Size in screens. */
  size?: [number, number];
  exits: { l?: Span[]; r?: Span[]; u?: Span[]; d?: Span[] };
  solid?: Rect[];
  /** [x, y, w]: one-way platforms. */
  plat?: [number, number, number][];
  spike?: Rect[];
  /** Hammer-breakable walls, remembered once broken. */
  brk?: Rect[];
  /** Floors broken by the plunging strike. */
  slam?: Rect[];
  /** Iron bars that open when a flag is set. [x, y, w, h, flag] */
  gate?: [number, number, number, number, string][];
  ink?: Rect[];
  water?: Rect[];
  /** Carve empty space out of solid fill. */
  hole?: Rect[];
  ents?: EntDef[];
  /** Which painted backdrop to use. */
  bg?: 'a' | 'b';
  /** Room is lit only around the player and light sources. */
  dark?: boolean;
  /** Shown when the player enters this room for the first time. */
  title?: boolean;
}

export interface Room {
  def: RoomDef;
  id: string;
  /** Size in tiles. */
  w: number;
  h: number;
  /** Global tile offset. */
  gx: number;
  gy: number;
  tiles: Uint8Array;
  /** Flag owning each breakable/slam/gate tile (by index), for persistence. */
  owner: Map<number, string>;
}

export function roomSize(def: RoomDef): [number, number] {
  const [cw, ch] = def.size ?? [1, 1];
  return [cw * CELL_W, ch * CELL_H];
}

/** Builds the tile grid of a room. `flags` decides which breakables are already broken and which gates are open. */
export function buildRoom(def: RoomDef, flags: Record<string, unknown> = {}): Room {
  const [w, h] = roomSize(def);
  const tiles = new Uint8Array(w * h);
  const owner = new Map<number, string>();
  const set = (x: number, y: number, t: T) => {
    if (x >= 0 && y >= 0 && x < w && y < h) tiles[y * w + x] = t;
  };
  const rect = (r: Rect, t: T, flag?: string) => {
    for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) {
      set(x, y, t);
      if (flag && x >= 0 && y >= 0 && x < w && y < h) owner.set(y * w + x, flag);
    }
  };
  // Border walls with openings.
  for (let x = 0; x < w; x++) { set(x, 0, T.Solid); set(x, h - 1, T.Solid); }
  for (let y = 0; y < h; y++) { set(0, y, T.Solid); set(w - 1, y, T.Solid); }
  const open = (side: 'l' | 'r' | 'u' | 'd', s: Span) => {
    for (let i = s[0]; i <= s[1]; i++) {
      if (side === 'l') set(0, i, T.Empty);
      if (side === 'r') set(w - 1, i, T.Empty);
      if (side === 'u') set(i, 0, T.Empty);
      if (side === 'd') set(i, h - 1, T.Empty);
    }
  };
  for (const side of ['l', 'r', 'u', 'd'] as const) for (const s of def.exits[side] ?? []) open(side, s);
  for (const r of def.solid ?? []) rect(r, T.Solid);
  for (const r of def.hole ?? []) rect(r, T.Empty);
  for (const [x, y, len] of def.plat ?? []) rect([x, y, len, 1], T.Platform);
  for (const r of def.spike ?? []) rect([r[0], r[1], r[2], r[3] || 1], T.Spikes);
  for (const r of def.ink ?? []) rect(r, T.Ink);
  for (const r of def.water ?? []) rect(r, T.Water);
  (def.brk ?? []).forEach((r, i) => {
    const flag = `${def.id}:brk${i}`;
    if (!flags[flag]) rect(r, T.Breakable, flag);
  });
  (def.slam ?? []).forEach((r, i) => {
    const flag = `${def.id}:slam${i}`;
    if (!flags[flag]) rect(r, T.Slam, flag);
  });
  for (const [x, y, gw, gh, flag] of def.gate ?? []) if (!flags[flag]) rect([x, y, gw, gh], T.Gate, flag);
  return { def, id: def.id, w, h, gx: def.at[0] * CELL_W, gy: def.at[1] * CELL_H, tiles, owner };
}

export function tileAt(room: Room, tx: number, ty: number): T {
  if (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) return T.Empty;
  return room.tiles[ty * room.w + tx] as T;
}

export const isSolid = (t: T) => t === T.Solid || t === T.Breakable || t === T.Slam || t === T.Gate;
export const isHazard = (t: T) => t === T.Spikes || t === T.Ink || t === T.Water;

/** Clears every tile owned by a flag (a broken wall, an opened gate). */
export function clearOwned(room: Room, flag: string): void {
  for (const [i, f] of room.owner) if (f === flag) { room.tiles[i] = T.Empty; room.owner.delete(i); }
}

export const px = (tiles: number) => tiles * TILE;
