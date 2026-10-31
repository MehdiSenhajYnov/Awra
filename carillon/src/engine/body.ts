import { TILE } from './core';
import { type Room, T, isHazard, isSolid, tileAt } from '../world/room';

/** An axis-aligned box that moves through the tile grid. Position is the top-left corner, in pixels. */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** -1 / 1 when pressed against a wall this frame, else 0. */
  wall: number;
  /** Set to fall through one-way platforms this frame. */
  dropThrough?: boolean;
  /** Ignores one-way platforms entirely (flyers). */
  noPlatforms?: boolean;
}

export interface MoveResult {
  hitX: boolean;
  hitY: boolean;
  /** Touched a hazard tile (spikes, ink, black water). */
  hazard: boolean;
}

function solidAt(room: Room, px: number, py: number): boolean {
  return isSolid(tileAt(room, Math.floor(px / TILE), Math.floor(py / TILE)));
}

/** Moves a body by its velocity, resolving tile collisions axis by axis. */
export function move(room: Room, b: Body, dx = b.vx, dy = b.vy): MoveResult {
  const res: MoveResult = { hitX: false, hitY: false, hazard: false };
  // Horizontal, in sub-steps of at most half a tile so fast moves never tunnel.
  const stepsX = Math.max(1, Math.ceil(Math.abs(dx) / (TILE / 2)));
  for (let i = 0; i < stepsX; i++) {
    const nx = b.x + dx / stepsX;
    const edge = dx > 0 ? nx + b.w - 0.001 : nx;
    const top = Math.floor(b.y / TILE);
    const bot = Math.floor((b.y + b.h - 0.001) / TILE);
    let blocked = false;
    for (let ty = top; ty <= bot; ty++) {
      if (isSolid(tileAt(room, Math.floor(edge / TILE), ty))) { blocked = true; break; }
    }
    if (blocked) {
      b.x = dx > 0 ? Math.floor(edge / TILE) * TILE - b.w : (Math.floor(edge / TILE) + 1) * TILE;
      b.vx = 0;
      res.hitX = true;
      break;
    }
    b.x = nx;
  }
  // Vertical.
  const wasGround = b.onGround;
  b.onGround = false;
  const stepsY = Math.max(1, Math.ceil(Math.abs(dy) / (TILE / 2)));
  for (let i = 0; i < stepsY; i++) {
    const ny = b.y + dy / stepsY;
    const left = Math.floor(b.x / TILE);
    const right = Math.floor((b.x + b.w - 0.001) / TILE);
    let blocked = false;
    if (dy > 0) {
      const edge = ny + b.h - 0.001;
      const ty = Math.floor(edge / TILE);
      const prevBottom = b.y + b.h;
      for (let tx = left; tx <= right; tx++) {
        const t = tileAt(room, tx, ty);
        if (isSolid(t)) { blocked = true; break; }
        // One-way platforms only stop a body coming from above.
        if (t === T.Platform && !b.noPlatforms && !b.dropThrough && prevBottom <= ty * TILE + 0.5) { blocked = true; break; }
      }
      if (blocked) {
        b.y = ty * TILE - b.h;
        b.vy = 0;
        b.onGround = true;
        res.hitY = true;
        break;
      }
    } else if (dy < 0) {
      const ty = Math.floor(ny / TILE);
      for (let tx = left; tx <= right; tx++) if (isSolid(tileAt(room, tx, ty))) { blocked = true; break; }
      if (blocked) {
        b.y = (ty + 1) * TILE;
        b.vy = 0;
        res.hitY = true;
        break;
      }
    }
    b.y = ny;
  }
  // Still standing (no vertical motion this frame)?
  if (!b.onGround && dy >= 0 && wasGround) b.onGround = standing(room, b);
  else if (!b.onGround && dy === 0) b.onGround = standing(room, b);
  // Walls touched.
  b.wall = 0;
  if (solidAt(room, b.x - 1, b.y + 2) && solidAt(room, b.x - 1, b.y + b.h - 3)) b.wall = -1;
  else if (solidAt(room, b.x + b.w + 0.5, b.y + 2) && solidAt(room, b.x + b.w + 0.5, b.y + b.h - 3)) b.wall = 1;
  res.hazard = touchesHazard(room, b);
  return res;
}

export function standing(room: Room, b: Body): boolean {
  const ty = Math.floor((b.y + b.h + 0.5) / TILE);
  if (Math.abs(b.y + b.h - ty * TILE) > 0.6) return false;
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - 0.001) / TILE);
  for (let tx = left; tx <= right; tx++) {
    const t = tileAt(room, tx, ty);
    if (isSolid(t)) return true;
    if (t === T.Platform && !b.noPlatforms && !b.dropThrough) return true;
  }
  return false;
}

/** Hazards are checked with a slightly shrunk box so grazing a spike edge is forgiven. */
export function touchesHazard(room: Room, b: Body): boolean {
  const m = 3;
  const x0 = Math.floor((b.x + m) / TILE);
  const x1 = Math.floor((b.x + b.w - m) / TILE);
  const y0 = Math.floor((b.y + m) / TILE);
  const y1 = Math.floor((b.y + b.h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isHazard(tileAt(room, tx, ty))) return true;
  return false;
}

/** True when a box fits at a position without overlapping solid tiles. */
export function fits(room: Room, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - 0.001) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(room, tx, ty))) return false;
  return true;
}
