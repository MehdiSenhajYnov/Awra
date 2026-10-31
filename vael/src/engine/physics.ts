import { TILE } from './core';
import { type Room, T, bladeSolid, isHazard, isSolid, tileAt } from '../world/room';

/** An axis-aligned box moving through the tile grid; position is its top-left corner in pixels. */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** -1 / 1 when touching a wall on that side, else 0. */
  wall: number;
  dropThrough?: boolean;
  /** Ignores one-way platforms (flyers). */
  noPlatforms?: boolean;
  /** Ignores the grid entirely (ghosts, projectiles that pass walls). */
  noClip?: boolean;
}

export interface MoveResult {
  hitX: boolean;
  hitY: boolean;
  hazard: boolean;
  /** Landed this frame. */
  landed: boolean;
}

/** Extra one-way ledges that are not in the grid (the thrown blade stuck in a wall). */
export interface Ledge {
  x: number;
  y: number;
  w: number;
}

export function makeBody(cx: number, feet: number, w: number, h: number): Body {
  return { x: cx - w / 2, y: feet - h, w, h, vx: 0, vy: 0, onGround: false, wall: 0 };
}

const solidAt = (room: Room, px: number, py: number) => isSolid(tileAt(room, Math.floor(px / TILE), Math.floor(py / TILE)));

/** Moves a body by (dx, dy), resolving tile collisions axis by axis in sub-steps so nothing tunnels. */
export function move(room: Room, b: Body, dx = b.vx, dy = b.vy, ledges: Ledge[] = []): MoveResult {
  const res: MoveResult = { hitX: false, hitY: false, hazard: false, landed: false };
  if (b.noClip) {
    b.x += dx;
    b.y += dy;
    return res;
  }
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
  const wasGround = b.onGround;
  b.onGround = false;
  const stepsY = Math.max(1, Math.ceil(Math.abs(dy) / (TILE / 2)));
  for (let i = 0; i < stepsY; i++) {
    const ny = b.y + dy / stepsY;
    const left = Math.floor(b.x / TILE);
    const right = Math.floor((b.x + b.w - 0.001) / TILE);
    let blocked = false;
    if (dy > 0) {
      const prevBottom = b.y + b.h;
      const edge = ny + b.h - 0.001;
      const ty = Math.floor(edge / TILE);
      let landY = ty * TILE;
      for (let tx = left; tx <= right; tx++) {
        const t = tileAt(room, tx, ty);
        if (isSolid(t)) { blocked = true; break; }
        if (t === T.Platform && !b.noPlatforms && !b.dropThrough && prevBottom <= ty * TILE + 0.5) { blocked = true; break; }
      }
      if (!blocked && !b.noPlatforms && !b.dropThrough) {
        for (const l of ledges) {
          if (b.x + b.w > l.x && b.x < l.x + l.w && prevBottom <= l.y + 0.5 && ny + b.h >= l.y) { blocked = true; landY = l.y; break; }
        }
      }
      if (blocked) {
        b.y = landY - b.h;
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
  if (!b.onGround && dy >= 0 && (wasGround || dy === 0)) b.onGround = standing(room, b, ledges);
  res.landed = b.onGround && !wasGround;
  b.wall = 0;
  if (solidAt(room, b.x - 1, b.y + 4) && solidAt(room, b.x - 1, b.y + b.h - 6)) b.wall = -1;
  else if (solidAt(room, b.x + b.w + 0.5, b.y + 4) && solidAt(room, b.x + b.w + 0.5, b.y + b.h - 6)) b.wall = 1;
  res.hazard = touchesHazard(room, b);
  return res;
}

export function standing(room: Room, b: Body, ledges: Ledge[] = []): boolean {
  const feet = b.y + b.h;
  const ty = Math.floor((feet + 0.5) / TILE);
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - 0.001) / TILE);
  if (Math.abs(feet - ty * TILE) <= 0.6) {
    for (let tx = left; tx <= right; tx++) {
      const t = tileAt(room, tx, ty);
      if (isSolid(t)) return true;
      if (t === T.Platform && !b.noPlatforms && !b.dropThrough) return true;
    }
  }
  if (!b.noPlatforms && !b.dropThrough) {
    for (const l of ledges) if (b.x + b.w > l.x && b.x < l.x + l.w && Math.abs(feet - l.y) <= 0.6) return true;
  }
  return false;
}

export function onPlatform(room: Room, b: Body): boolean {
  const ty = Math.floor((b.y + b.h + 0.5) / TILE);
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - 0.001) / TILE);
  let plat = false;
  for (let tx = left; tx <= right; tx++) {
    const t = tileAt(room, tx, ty);
    if (isSolid(t)) return false;
    if (t === T.Platform) plat = true;
  }
  return plat;
}

/** Hazards use a shrunk box so grazing an edge is forgiven. */
export function touchesHazard(room: Room, b: Body): boolean {
  const m = 6;
  const x0 = Math.floor((b.x + m) / TILE);
  const x1 = Math.floor((b.x + b.w - m) / TILE);
  const y0 = Math.floor((b.y + m) / TILE);
  const y1 = Math.floor((b.y + b.h - 2) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isHazard(tileAt(room, tx, ty))) return true;
  return false;
}

export function inWater(room: Room, b: Body): boolean {
  return tileAt(room, Math.floor((b.x + b.w / 2) / TILE), Math.floor((b.y + b.h * 0.6) / TILE)) === T.Water;
}

export function fits(room: Room, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - 0.001) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(room, tx, ty))) return false;
  return true;
}

/** First solid tile hit along a segment (for the thrown blade and line of sight). */
export function raycast(room: Room, x0: number, y0: number, x1: number, y1: number, blade = false): { x: number; y: number; nx: number; ny: number } | null {
  const solid = blade ? bladeSolid : isSolid;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 4));
  let px = x0;
  let py = y0;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    if (solid(tileAt(room, Math.floor(x / TILE), Math.floor(y / TILE)))) {
      const nx = Math.floor(x / TILE) !== Math.floor(px / TILE) ? -Math.sign(x1 - x0) : 0;
      const ny = Math.floor(y / TILE) !== Math.floor(py / TILE) ? -Math.sign(y1 - y0) : 0;
      return { x: px, y: py, nx, ny };
    }
    px = x;
    py = y;
  }
  return null;
}
