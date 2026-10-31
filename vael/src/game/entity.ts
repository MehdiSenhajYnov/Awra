import type { Box } from '../engine/core';
import { type Body, makeBody } from '../engine/physics';
import type { Scene } from './scene';

export interface Hit {
  box: Box;
  damage: number;
  /** Can be dodged through with a perfectly timed dash (all can, except hazards). */
  dodgeable?: boolean;
}

export type DamageSource = 'slash' | 'palm' | 'blade' | 'rip' | 'execute' | 'art' | 'wave';

let nextId = 1;

/** Base for every live thing in a room: foes, bosses, projectiles, props. */
export abstract class Entity {
  readonly id = nextId++;
  body: Body;
  hp = 1;
  maxHp = 1;
  dead = false;
  /** Frames of white flash after a hit. */
  flash = 0;
  invuln = 0;
  /** Damage dealt by touching it (0: harmless). */
  contact = 1;
  hurtable = true;
  /** Ignores knockback. */
  heavy = false;
  facing = -1;
  /** Stardust dropped on death. */
  dust = 0;
  /** Stunned frames. */
  stun = 0;
  /** Not counted as a foe (props, projectiles). */
  prop = false;
  /** Can be branded by the blade (lodges in it). */
  brandable = true;
  t = 0;
  /** Placement key to remember slain foes until the next rest. */
  uid = '';
  /** Sprite key for the renderer. */
  sprite = '';
  /** Animation state for the renderer. */
  anim = 'idle';
  animT = 0;
  /** Visual scale and draw offset (renderer). */
  scale = 1;
  /** Hit-flash recoil for drawing (pixels). */
  shakeX = 0;

  constructor(public scene: Scene, x: number, feet: number, w: number, h: number) {
    this.body = makeBody(x, feet, w, h);
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

  setAnim(a: string): void {
    if (this.anim !== a) {
      this.anim = a;
      this.animT = 0;
    }
  }

  /** Active attack hitboxes this frame. */
  hits(): Hit[] {
    return [];
  }

  abstract update(): void;

  /** Returns true when the blow landed. */
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    if (this.invuln > 0 || this.dead || !this.hurtable) return false;
    this.hp -= amount;
    this.flash = 7;
    this.shakeX = 10;
    if (!this.heavy) {
      const dir = Math.sign(this.cx - fromX) || 1;
      this.body.vx = dir * (source === 'slash' ? 8 : 10);
      if (!this.body.onGround) this.body.vy = Math.min(this.body.vy, -4);
    }
    this.onHurt(source);
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath();
    }
    return true;
  }

  onHurt(_source: DamageSource): void {}

  onDeath(): void {
    this.scene.killFx(this);
  }

  tick(): void {
    this.t++;
    this.animT++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.stun > 0) this.stun--;
    this.shakeX *= -0.6;
    if (Math.abs(this.shakeX) < 0.5) this.shakeX = 0;
  }
}
