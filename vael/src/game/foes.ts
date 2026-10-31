import { type Box, TILE, approach, clamp } from '../engine/core';
import { fits } from '../engine/physics';
import { isSolid, tileAt } from '../world/room';
import { Entity, type Hit } from './entity';
import type { Scene } from './scene';

const GRAV = 1.2;

/** Common helpers for foes: gravity, facing the hero, ledges, a small state machine with timers. */
export abstract class Foe extends Entity {
  state = 'idle';
  st = 0;
  home: number;
  /** Hitboxes active this frame. */
  protected active: Hit[] = [];

  constructor(scene: Scene, x: number, feet: number, w: number, h: number) {
    super(scene, x, feet, w, h);
    this.home = x;
  }

  get p() {
    return this.scene.player;
  }

  dx(): number {
    return this.p.cx - this.cx;
  }

  dy(): number {
    return this.p.cy - this.cy;
  }

  near(rx: number, ry = 200): boolean {
    return Math.abs(this.dx()) < rx && Math.abs(this.dy()) < ry && !this.p.dead;
  }

  face(): void {
    const d = this.dx();
    if (Math.abs(d) > 4) this.facing = Math.sign(d);
  }

  to(state: string): void {
    this.state = state;
    this.st = 0;
  }

  hits(): Hit[] {
    return this.active;
  }

  /** Gravity and collisions; returns the move result. */
  fall(): ReturnType<Scene['moveBody']> {
    const b = this.body;
    b.vy = Math.min(b.vy + GRAV, 22);
    return this.scene.moveBody(this);
  }

  /** Ground ahead in the facing direction (to avoid walking off ledges). */
  groundAhead(dir = this.facing, dist = 24): boolean {
    const b = this.body;
    const x = dir > 0 ? b.x + b.w + dist : b.x - dist;
    const t = tileAt(this.scene.room, Math.floor(x / TILE), Math.floor((b.y + b.h + 4) / TILE));
    return isSolid(t) || t === 2;
  }

  wallAhead(dir = this.facing): boolean {
    const b = this.body;
    return !fits(this.scene.room, b.x + dir * 8, b.y, b.w, b.h - 4);
  }

  telegraph(dy = -0.25, big = false): void {
    this.scene.emit({ t: 'telegraph', x: this.cx + this.facing * this.body.w * 0.3, y: this.cy + this.body.h * dy, big });
  }

  /** A hitbox in front of the foe. */
  front(reach: number, h: number, dy = 0, dmg = 1): Hit {
    const y = this.cy - h / 2 + dy;
    const box: Box = this.facing > 0 ? { x: this.cx, y, w: reach, h } : { x: this.cx - reach, y, w: reach, h };
    return { box, damage: dmg };
  }
}

/** Husk soldier with a spear: patrols, then a readable lunge. */
export class Coquille extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 50, 118);
    this.hp = this.maxHp = 32;
    this.dust = 6;
    this.sprite = 'coquille';
  }

  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) {
      b.vx = approach(b.vx, 0, 0.8);
      this.fall();
      return;
    }
    switch (this.state) {
      case 'idle':
      case 'walk': {
        this.setAnim('move');
        if (this.near(520, 160)) this.face();
        else if (this.wallAhead() || !this.groundAhead() || Math.abs(this.cx - this.home) > 260) this.facing *= -1;
        const speed = this.near(520, 160) ? 2.6 : 1.4;
        b.vx = approach(b.vx, this.groundAhead() && !this.wallAhead() ? this.facing * speed : 0, 0.4);
        if (this.near(250, 110) && this.st > 30) {
          this.to('windup');
          this.face();
          this.telegraph(-0.2);
        }
        break;
      }
      case 'windup':
        this.setAnim('windup');
        b.vx = approach(b.vx, -this.facing * 1.5, 0.5);
        if (this.st >= 28) this.to('lunge');
        break;
      case 'lunge':
        this.setAnim('strike');
        b.vx = this.groundAhead() ? this.facing * 15 : 0;
        this.active = [this.front(150, 40, -14, 1)];
        if (this.st >= 9) this.to('recover');
        break;
      case 'recover':
        this.setAnim('strike');
        b.vx = approach(b.vx, 0, 1.2);
        if (this.st >= 36) this.to('walk');
        break;
    }
    this.fall();
  }
}

/** Crystal mite: scuttles, then leaps at the hero. */
export class Acarien extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 46, 34);
    this.hp = this.maxHp = 14;
    this.dust = 3;
    this.sprite = 'acarien';
  }

  update(): void {
    this.st++;
    const b = this.body;
    if (this.stun > 0) {
      b.vx = approach(b.vx, 0, 0.8);
      this.fall();
      return;
    }
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.setAnim('move');
        if (this.near(600, 200)) this.face();
        else if (this.wallAhead() || !this.groundAhead() || this.st % 140 === 0) this.facing *= -1;
        b.vx = approach(b.vx, this.groundAhead() && !this.wallAhead() ? this.facing * (this.near(600, 200) ? 4 : 1.8) : 0, 0.6);
        if (b.onGround && this.near(330, 140) && this.st > 40) {
          this.to('windup');
          this.face();
          this.telegraph(0);
        }
        break;
      case 'windup':
        this.setAnim('windup');
        b.vx = approach(b.vx, 0, 1);
        if (this.st >= 20) {
          this.to('leap');
          b.vx = this.facing * clamp(Math.abs(this.dx()) / 26, 6, 12);
          b.vy = -15;
        }
        break;
      case 'leap':
        this.setAnim('strike');
        if (b.onGround && this.st > 4) this.to('walk');
        break;
    }
    this.fall();
  }
}

/** A slow orb of corrupted light. */
export class Orb extends Entity {
  constructor(scene: Scene, x: number, y: number, vx: number, vy: number, public color = 0xb070ff, public life = 260) {
    super(scene, x, y + 14, 28, 28);
    this.body.vx = vx;
    this.body.vy = vy;
    this.body.noPlatforms = true;
    this.hurtable = false;
    this.prop = true;
    this.brandable = false;
    this.sprite = 'orb';
    this.contact = 1;
  }

  update(): void {
    const r = this.scene.moveBody(this);
    if (r.hitX || r.hitY || --this.life <= 0) {
      this.dead = true;
      this.scene.emit({ t: 'spark', x: this.cx, y: this.cy, n: 10, color: this.color });
    }
  }
}

/** Lantern wisp: keeps its distance and spits slow orbs. */
export class Lampion extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 54, 64);
    this.hp = this.maxHp = 22;
    this.dust = 5;
    this.sprite = 'lampion';
    this.body.noPlatforms = true;
    this.homeY = this.body.y;
  }

  homeY: number;

  update(): void {
    this.st++;
    const b = this.body;
    if (this.stun > 0) {
      b.vx *= 0.9;
      b.vy = Math.min(b.vy + 0.4, 6);
      this.scene.moveBody(this);
      return;
    }
    const aware = this.near(900, 600);
    let tx = this.home + Math.sin(this.t * 0.012) * 120;
    let ty = this.homeY + Math.sin(this.t * 0.03) * 30;
    if (aware) {
      this.face();
      const want = 330;
      tx = this.p.cx - Math.sign(this.dx() || 1) * want;
      ty = this.p.cy - 200;
    }
    b.vx = approach(b.vx, clamp((tx - this.cx) * 0.03, -3.5, 3.5), 0.2);
    b.vy = approach(b.vy, clamp((ty - this.cy) * 0.03, -3, 3), 0.2);
    switch (this.state) {
      case 'idle':
        this.setAnim('move');
        if (aware && this.st > 100) {
          this.to('windup');
          this.telegraph(0.1);
        }
        break;
      case 'windup':
        this.setAnim('windup');
        b.vx *= 0.9;
        b.vy *= 0.9;
        if (this.st >= 32) {
          this.to('fire');
          const dx = this.p.cx - this.cx;
          const dy = this.p.cy - this.cy;
          const d = Math.hypot(dx, dy) || 1;
          this.scene.add(new Orb(this.scene, this.cx + this.facing * 20, this.cy, (dx / d) * 6.5, (dy / d) * 6.5));
          this.scene.sfx('orb');
        }
        break;
      case 'fire':
        this.setAnim('strike');
        if (this.st >= 22) this.to('idle');
        break;
    }
    this.scene.moveBody(this);
  }
}
