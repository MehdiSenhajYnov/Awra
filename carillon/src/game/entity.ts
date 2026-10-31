import type { Body } from '../engine/body';
import type { Box } from '../engine/core';
import type { Scene } from './scene';

/** How a hit reacts to a well-timed parry (Note juste). */
export type ParryKind = 'stun' | 'reflect' | 'clash' | 'none';

export interface Hit {
  box: Box;
  damage: number;
  parry: ParryKind;
}

export type DamageSource = 'player' | 'echo' | 'slam' | 'reflect' | 'wave';

let nextId = 1;

export abstract class Entity {
  readonly id = nextId++;
  body: Body;
  hp = 1;
  maxHp = 1;
  dead = false;
  /** Frames of white flash after being hit. */
  flash = 0;
  /** Frames during which hits are ignored. */
  invuln = 0;
  /** Damage dealt to the player on contact (0: harmless). */
  contact = 1;
  /** Can be struck by attacks. */
  hurtable = true;
  /** Drawn behind actors (lecterns, gates, decor). */
  back = false;
  facing = -1;
  /** Bronze dropped on death. */
  bronze = 0;
  /** Stunned frames (after a parry). */
  stun = 0;
  /** Bosses and some foes ignore knockback. */
  heavy = false;
  /** Not counted for "room cleared" and not drawn with a health flash. */
  prop = false;
  t = 0;

  constructor(public scene: Scene, x: number, y: number, w: number, h: number) {
    // x, y: feet position in pixels.
    this.body = { x: x - w / 2, y: y - h, w, h, vx: 0, vy: 0, onGround: false, wall: 0 };
  }

  get cx(): number {
    return this.body.x + this.body.w / 2;
  }

  get cy(): number {
    return this.body.y + this.body.h / 2;
  }

  box(): Box {
    return { x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h };
  }

  /** Active attack hitboxes this frame. */
  hits(): Hit[] {
    return [];
  }

  abstract update(): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  /** Returns true if the blow landed. */
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    if (this.invuln > 0 || this.dead || !this.hurtable) return false;
    this.hp -= amount;
    this.flash = 6;
    this.invuln = source === 'echo' ? 4 : 0;
    if (!this.heavy) {
      const dir = Math.sign(this.cx - fromX) || 1;
      this.body.vx = dir * 3.2;
      if (!this.body.onGround) this.body.vy = Math.min(this.body.vy, -1.5);
    }
    this.onHurt(source);
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath();
    }
    return true;
  }

  /** The player parried one of this entity's hits. */
  parried(kind: ParryKind): void {
    if (kind === 'stun') this.stun = 70;
  }

  onHurt(_source: DamageSource): void {}

  onDeath(): void {
    this.scene.killFx(this);
  }

  tick(): void {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.stun > 0) this.stun--;
  }
}
