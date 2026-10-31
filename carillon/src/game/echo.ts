import { type Box } from '../engine/core';
import { type Frame, attackBoxFor } from './player';

/**
 * The echo replays a slice of the player's recent history, frame by frame, where it happened.
 * Its swings strike enemies and ring bells; with Contretemps the player can trade places with it.
 */
export class Echo {
  i = 0;
  /** Entity ids struck by the current recorded swing. */
  hit = new Set<number>();
  private lastAttack: string | null = null;
  done = false;

  constructor(public frames: Frame[], public delay = 0, public index = 0) {}

  get frame(): Frame {
    return this.frames[Math.min(this.i, this.frames.length - 1)];
  }

  update(): void {
    if (this.delay > 0) { this.delay--; return; }
    this.i++;
    if (this.i >= this.frames.length) this.done = true;
    const f = this.frame;
    const key = f.attack ? `${f.attack}:${f.combo}:${f.attackT < 2 ? this.i : ''}` : null;
    if (f.attack && f.attackT <= 1) this.hit.clear();
    if (key !== this.lastAttack && !f.attack) this.hit.clear();
    this.lastAttack = key;
  }

  get active(): boolean {
    return this.delay === 0 && !this.done;
  }

  box(): Box {
    const f = this.frame;
    return { x: f.x, y: f.y, w: 12, h: 26 };
  }

  attackBox(): Box | null {
    if (!this.active) return null;
    const f = this.frame;
    return attackBoxFor(f.attack, f.attackT, f.x, f.y, f.facing);
  }
}
