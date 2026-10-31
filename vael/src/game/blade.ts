import { TILE } from '../engine/core';
import { type Ledge, raycast } from '../engine/physics';
import { type Room, T, tileAt } from '../world/room';

export type BladeState = 'held' | 'flying' | 'stuck' | 'branded' | 'returning';

/** Anything the blade can lodge into. */
export interface BladeTarget {
  id: number;
  cx: number;
  cy: number;
  dead: boolean;
}

/**
 * The Bound Blade. Thrown, it flies straight and lodges in rock (becoming a foothold), in foes (branding them)
 * or in astral rings. Recalled, it flies back to the hand and pierces everything on its way.
 */
export class Blade {
  state: BladeState = 'held';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Angle of the blade for drawing. */
  angle = 0;
  /** Distance flown since the throw. */
  travelled = 0;
  t = 0;
  /** Lodged in a wall: the wall's side (-1 left wall, 1 right wall), 0 for floor or ceiling. */
  wallSide = 0;
  /** Lodged in a floor (1) or a ceiling (-1). */
  floorSide = 0;
  target: BladeTarget | null = null;
  /** Offset from the branded target's centre. */
  ox = 0;
  oy = 0;
  /** Foes already pierced during this flight. */
  pierced = new Set<number>();
  /** An astral ring the blade is lodged in (pulls the hero with Lien). */
  ring: { x: number; y: number } | null = null;
  static SPEED = 36;
  static RANGE = 640;

  held(): boolean {
    return this.state === 'held';
  }

  out(): boolean {
    return this.state !== 'held';
  }

  throw(x: number, y: number, dx: number, dy: number): void {
    this.state = 'flying';
    this.x = x;
    this.y = y;
    this.vx = dx * Blade.SPEED;
    this.vy = dy * Blade.SPEED;
    this.angle = Math.atan2(dy, dx);
    this.travelled = 0;
    this.t = 0;
    this.target = null;
    this.ring = null;
    this.pierced.clear();
  }

  recall(): void {
    if (this.state === 'held' || this.state === 'returning') return;
    this.state = 'returning';
    this.t = 0;
    this.target = null;
    this.ring = null;
    this.pierced.clear();
    this.vx = 0;
    this.vy = 0;
  }

  catchNow(): void {
    this.state = 'held';
    this.target = null;
    this.ring = null;
  }

  /** The foothold made by a blade lodged in a wall. */
  ledge(): Ledge | null {
    if (this.state !== 'stuck' || this.wallSide === 0) return null;
    // The hilt sticks out of the wall: a 64 px wide step at the blade's height.
    const w = 64;
    const x = this.wallSide < 0 ? this.x - 6 : this.x - w + 6;
    return { x, y: this.y - 4, w };
  }

  /**
   * Advances the blade. hx, hy: the hero's hand. Returns 'caught' when it reaches the hand, 'lodged' when it sticks.
   */
  update(room: Room, hx: number, hy: number): 'caught' | 'lodged' | 'expired' | 'bounced' | null {
    this.t++;
    if (this.state === 'flying') {
      const nx = this.x + this.vx;
      const ny = this.y + this.vy;
      const hit = raycast(room, this.x, this.y, nx, ny, true);
      if (hit) {
        this.x = hit.x;
        this.y = hit.y;
        // Polished rock: the blade skids off and comes home.
        const tx = Math.floor((hit.x + Math.sign(this.vx) * 6) / TILE);
        const ty = Math.floor((hit.y + Math.sign(this.vy) * 6) / TILE);
        if (tileAt(room, tx, ty) === T.Slick || tileAt(room, Math.floor((hit.x - hit.nx * 6) / TILE), Math.floor((hit.y - hit.ny * 6) / TILE)) === T.Slick) {
          this.recall();
          return 'bounced';
        }
        this.state = 'stuck';
        this.wallSide = hit.nx !== 0 ? -hit.nx : 0;
        this.floorSide = hit.nx === 0 && hit.ny !== 0 ? -hit.ny : 0;
        // Bite a little into the rock.
        this.x += Math.sign(this.vx) * 10;
        this.y += Math.sign(this.vy) * (hit.ny !== 0 ? 10 : 0);
        if (this.wallSide !== 0) this.y = Math.round(this.y);
        return 'lodged';
      }
      this.x = nx;
      this.y = ny;
      this.travelled += Blade.SPEED;
      if (this.travelled >= Blade.RANGE) {
        this.recall();
        return 'expired';
      }
      return null;
    }
    if (this.state === 'branded') {
      if (!this.target || this.target.dead) {
        this.recall();
        return null;
      }
      this.x = this.target.cx + this.ox;
      this.y = this.target.cy + this.oy;
      return null;
    }
    if (this.state === 'stuck') {
      // A blade left alone too long comes home on its own.
      if (this.t > 60 * 12) this.recall();
      return null;
    }
    if (this.state === 'returning') {
      const dx = hx - this.x;
      const dy = hy - this.y;
      const d = Math.hypot(dx, dy);
      const speed = Math.min(54, 18 + this.t * 2.4);
      if (d <= speed + 12) {
        this.catchNow();
        return 'caught';
      }
      this.vx = (dx / d) * speed;
      this.vy = (dy / d) * speed;
      this.x += this.vx;
      this.y += this.vy;
      this.angle = Math.atan2(-dy, -dx);
      return null;
    }
    return null;
  }

  brand(target: BladeTarget): void {
    this.state = 'branded';
    this.target = target;
    this.ox = this.x - target.cx;
    this.oy = this.y - target.cy;
    this.t = 0;
  }

  lodgeInRing(x: number, y: number): void {
    this.state = 'stuck';
    this.wallSide = 0;
    this.x = x;
    this.y = y;
    this.ring = { x, y };
    this.t = 0;
  }

  /** Segment covered this frame (for hit tests along the path). */
  sweep(): { x0: number; y0: number; x1: number; y1: number } {
    return { x0: this.x - this.vx, y0: this.y - this.vy, x1: this.x, y1: this.y };
  }
}

/** Distance from point to segment, for blade sweeps. */
export function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const l2 = vx * vx + vy * vy || 1;
  let t = ((px - x0) * vx + (py - y0) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + vx * t), py - (y0 + vy * t));
}

export const BLADE_TILE = TILE;
