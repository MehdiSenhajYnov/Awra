import { type Body, fits, move } from '../engine/body';
import { type Box, approach, clamp } from '../engine/core';
import type { Room } from '../world/room';

export type Ability = 'echo' | 'dash' | 'walljump' | 'swap' | 'double' | 'slam' | 'grapple';
export const ABILITY_ORDER: Ability[] = ['echo', 'dash', 'walljump', 'swap', 'double', 'slam', 'grapple'];

/** What the player asks for this frame. The game builds it from the input devices; tests script it. */
export interface Controls {
  x: number;
  y: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  parryPressed: boolean;
  echoPressed: boolean;
  healHeld: boolean;
  dashPressed: boolean;
}

export const NO_CONTROLS: Controls = { x: 0, y: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, parryPressed: false, echoPressed: false, healHeld: false, dashPressed: false };

/** Modifiers from equipped notes and upgrades. */
export interface Stats {
  parryWindow: number;
  attackCooldown: number;
  damage: number;
  echoFrames: number;
  echoCopies: number;
  healFrames: number;
  dashCooldown: number;
  dashInvuln: boolean;
  pogoVel: number;
  resPerHit: number;
}

export const BASE_STATS: Stats = {
  parryWindow: 9, attackCooldown: 21, damage: 1, echoFrames: 90, echoCopies: 1, healFrames: 54, dashCooldown: 36, dashInvuln: false, pogoVel: 8.7, resPerHit: 0.2,
};

// Movement tuning (pixels and frames at 60 Hz).
export const PHYS = {
  run: 3.1,
  accelGround: 0.9,
  accelAir: 0.55,
  gravity: 0.55,
  maxFall: 9,
  jump: 10.6,
  jumpCut: 0.42,
  double: 8.5,
  coyote: 6,
  dashSpeed: 6.2,
  dashFrames: 12,
  wallSlide: 2.4,
  wallJumpX: 3.4,
  wallJumpY: 10.2,
  wallLock: 7,
  grappleRange: 175,
  grappleSpeed: 9,
};

export type AttackDir = 'side' | 'up' | 'down' | 'slam';

export interface Attack {
  dir: AttackDir;
  t: number;
  combo: number;
  /** Entity ids already struck by this swing. */
  hit: Set<number>;
}

/** One recorded frame, replayed by the echo. */
export interface Frame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  attack: AttackDir | null;
  attackT: number;
  combo: number;
  pose: Pose;
}

export type Pose = 'idle' | 'run' | 'jump' | 'fall' | 'wall' | 'dash' | 'heal' | 'parry' | 'hurt' | 'slam' | 'grapple';

export const ATTACK_ACTIVE: [number, number] = [2, 8];
export const ATTACK_LENGTH = 16;

export class Player {
  body: Body = { x: 0, y: 0, w: 12, h: 26, vx: 0, vy: 0, onGround: false, wall: 0 };
  facing = 1;
  abilities = new Set<Ability>();
  stats: Stats = { ...BASE_STATS };
  hp = 5;
  maxHp = 5;
  res = 0;
  maxRes = 3;
  /** Fraction of a résonance charge earned by hitting. */
  resPartial = 0;
  coyote = 0;
  jumping = false;
  doubleUsed = false;
  airDashUsed = false;
  dashT = 0;
  dashCd = 0;
  wallLock = 0;
  attack: Attack | null = null;
  attackCd = 0;
  comboT = 0;
  combo = 0;
  parryT = 0;
  parryCd = 0;
  /** Frames left of the "perfect" glow after a successful parry (Point d'orgue). */
  perfectT = 0;
  healT = 0;
  invuln = 0;
  hurtT = 0;
  hitstop = 0;
  pose: Pose = 'idle';
  slam = false;
  grapple: { x: number; y: number } | null = null;
  /** Last ground position safe from hazards, to respawn after spikes. */
  safe = { x: 0, y: 0 };
  history: Frame[] = [];
  animT = 0;
  dead = false;

  get cx(): number {
    return this.body.x + this.body.w / 2;
  }

  get cy(): number {
    return this.body.y + this.body.h / 2;
  }

  box(): Box {
    return { x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h };
  }

  place(feetX: number, feetY: number): void {
    this.body.x = feetX - this.body.w / 2;
    this.body.y = feetY - this.body.h;
    this.body.vx = 0;
    this.body.vy = 0;
    this.safe = { x: this.body.x, y: this.body.y };
    this.history = [];
  }

  /** Active hitbox of the current swing, if any. */
  attackBox(): Box | null {
    return attackBoxFor(this.attack ? this.attack.dir : null, this.attack?.t ?? 0, this.body.x, this.body.y, this.facing);
  }

  addRes(amount: number): void {
    if (this.res >= this.maxRes) { this.resPartial = 0; return; }
    this.resPartial += amount;
    while (this.resPartial >= 1 && this.res < this.maxRes) { this.resPartial -= 1; this.res++; }
    if (this.res >= this.maxRes) this.resPartial = 0;
  }

  canParry(): boolean {
    return this.parryT > 0;
  }

  /**
   * Advances one frame. `anchors` are grapple points in room pixels. Returns events for the scene
   * (sounds, effects, echo requests).
   */
  update(room: Room, c: Controls, anchors: { x: number; y: number }[] = []): PlayerEvent[] {
    const ev: PlayerEvent[] = [];
    const b = this.body;
    this.animT++;
    if (this.hitstop > 0) { this.hitstop--; return ev; }
    if (this.invuln > 0) this.invuln--;
    if (this.perfectT > 0) this.perfectT--;
    if (this.attackCd > 0) this.attackCd--;
    if (this.parryCd > 0) this.parryCd--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.wallLock > 0) this.wallLock--;
    if (this.comboT > 0) this.comboT--; else this.combo = 0;

    // Hurt recoil: no control for a few frames.
    if (this.hurtT > 0) {
      this.hurtT--;
      b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity);
      const r = move(room, b);
      if (r.hazard) ev.push({ kind: 'hazard' });
      this.pose = 'hurt';
      this.record();
      return ev;
    }

    // Healing (Accord): stand still and hold.
    if (c.healHeld && b.onGround && this.res >= 1 && this.hp < this.maxHp && !this.attack && this.dashT === 0) {
      this.healT++;
      b.vx = approach(b.vx, 0, PHYS.accelGround);
      if (this.healT === 1) ev.push({ kind: 'healStart' });
      if (this.healT >= this.stats.healFrames) {
        this.healT = 0;
        this.res--;
        this.hp = Math.min(this.maxHp, this.hp + 1);
        ev.push({ kind: 'healed' });
      }
      this.pose = 'heal';
      move(room, b, b.vx, 0);
      this.record();
      return ev;
    }
    this.healT = 0;

    // Echo / swap request.
    if (c.echoPressed && this.abilities.has('echo')) ev.push({ kind: 'echo' });

    // Parry (Note juste).
    if (this.parryT > 0) this.parryT--;
    if (c.parryPressed && this.parryCd === 0 && !this.attack) {
      this.parryT = this.stats.parryWindow;
      this.parryCd = this.stats.parryWindow + 16;
      ev.push({ kind: 'parry' });
    }

    // Grapple pull (Appel).
    if (this.grapple) {
      const dx = this.grapple.x - this.cx;
      const dy = this.grapple.y - (b.y + 6);
      const d = Math.hypot(dx, dy);
      if (d < 14 || c.jumpPressed) {
        this.grapple = null;
        b.vx = (dx / (d || 1)) * PHYS.run * 1.6;
        b.vy = c.jumpPressed ? -PHYS.jump * 0.9 : -4;
        this.airDashUsed = false;
        this.doubleUsed = false;
        if (c.jumpPressed) ev.push({ kind: 'jump' });
      } else {
        b.vx = (dx / d) * PHYS.grappleSpeed;
        b.vy = (dy / d) * PHYS.grappleSpeed;
        const r = move(room, b);
        if (r.hitX || r.hitY) this.grapple = null;
        this.pose = 'grapple';
        this.record();
        return ev;
      }
    }

    // Dash (Glissando), or grapple when an anchor is in reach.
    if (this.dashT > 0) {
      this.dashT--;
      b.vy = 0;
      b.vx = this.facing * PHYS.dashSpeed;
      const r = move(room, b);
      if (r.hazard) ev.push({ kind: 'hazard' });
      if (r.hitX) this.dashT = 0;
      if (this.dashT === 0) b.vx = this.facing * PHYS.run;
      this.pose = 'dash';
      this.record();
      return ev;
    }
    // Plunging strike (Frappe): down + dash in the air.
    if (c.dashPressed && c.y > 0 && !b.onGround && this.abilities.has('slam') && !this.attack) {
      this.attack = { dir: 'slam', t: 0, combo: 0, hit: new Set() };
      this.attackCd = 30;
      ev.push({ kind: 'swing', dir: 'slam' });
      c = { ...c, dashPressed: false };
    }
    if (c.dashPressed) {
      const anchor = this.abilities.has('grapple') ? targetAnchor(this, anchors, c) : null;
      if (anchor) {
        this.grapple = anchor;
        this.attack = null;
        ev.push({ kind: 'grapple' });
        this.record();
        return ev;
      }
      if (this.abilities.has('dash') && this.dashCd === 0 && !(this.airDashUsed && !b.onGround)) {
        if (c.x !== 0) this.facing = Math.sign(c.x);
        this.dashT = PHYS.dashFrames;
        this.dashCd = this.stats.dashCooldown;
        if (!b.onGround) this.airDashUsed = true;
        this.attack = null;
        if (this.stats.dashInvuln) this.invuln = Math.max(this.invuln, PHYS.dashFrames);
        ev.push({ kind: 'dash' });
        this.record();
        return ev;
      }
    }

    // Horizontal movement.
    const slamming = this.attack?.dir === 'slam';
    const target = this.wallLock > 0 || slamming ? b.vx : c.x * PHYS.run;
    b.vx = approach(b.vx, target, b.onGround ? PHYS.accelGround : PHYS.accelAir);
    if (c.x !== 0 && !this.attack && this.wallLock === 0) this.facing = Math.sign(c.x);

    // Ground, coyote time and resets.
    if (b.onGround) {
      this.coyote = PHYS.coyote;
      this.doubleUsed = false;
      this.airDashUsed = false;
    } else if (this.coyote > 0) this.coyote--;

    // Wall slide / wall jump (Crampons).
    const onWall = this.abilities.has('walljump') && !b.onGround && b.wall !== 0 && c.x === b.wall && b.vy > 0;
    if (onWall) {
      b.vy = Math.min(b.vy, PHYS.wallSlide);
      this.doubleUsed = false;
      this.airDashUsed = false;
      this.facing = -b.wall;
    }

    // Jumps.
    if (c.jumpPressed) {
      if (b.onGround || this.coyote > 0) {
        if (c.y > 0 && onPlatform(room, b)) {
          b.dropThrough = true;
        } else {
          b.vy = -PHYS.jump;
          this.jumping = true;
          this.coyote = 0;
          ev.push({ kind: 'jump' });
        }
      } else if (this.abilities.has('walljump') && b.wall !== 0) {
        b.vy = -PHYS.wallJumpY;
        b.vx = -b.wall * PHYS.wallJumpX;
        this.facing = -b.wall;
        this.wallLock = PHYS.wallLock;
        this.jumping = true;
        ev.push({ kind: 'jump' });
      } else if (this.abilities.has('double') && !this.doubleUsed) {
        b.vy = -PHYS.double;
        this.doubleUsed = true;
        this.jumping = true;
        ev.push({ kind: 'double' });
      }
    }
    if (this.jumping && !c.jumpHeld && b.vy < 0) {
      b.vy *= PHYS.jumpCut;
      this.jumping = false;
    }
    if (b.vy >= 0) this.jumping = false;

    // Attacks.
    if (this.attack) {
      this.attack.t++;
      if (this.attack.dir === 'slam') {
        b.vx = 0;
        b.vy = 11;
        if (b.onGround) {
          ev.push({ kind: 'slamLand' });
          this.attack = null;
          this.attackCd = 14;
        }
      } else if (this.attack.t >= ATTACK_LENGTH) this.attack = null;
    } else if (c.attackPressed && this.attackCd === 0) {
      let dir: AttackDir = 'side';
      if (c.y < 0) dir = 'up';
      else if (c.y > 0 && !b.onGround) dir = 'down';
      this.combo = this.comboT > 0 ? (this.combo + 1) % 3 : 0;
      this.comboT = 34;
      this.attack = { dir, t: 0, combo: this.combo, hit: new Set() };
      this.attackCd = this.stats.attackCooldown;
      ev.push({ kind: 'swing', dir });
    }

    // Gravity.
    if (!this.attack || this.attack.dir !== 'slam') b.vy = Math.min(PHYS.maxFall, b.vy + PHYS.gravity);
    const r = move(room, b);
    b.dropThrough = false;
    if (r.hazard) ev.push({ kind: 'hazard' });
    if (b.onGround && b.vy === 0 && !r.hazard && fits(room, b.x, b.y, b.w, b.h) && groundIsSafe(room, b)) this.safe = { x: b.x, y: b.y };

    this.pose = this.attack?.dir === 'slam' ? 'slam'
      : this.parryT > 0 ? 'parry'
      : onWall ? 'wall'
      : !b.onGround ? (b.vy < 0 ? 'jump' : 'fall')
      : Math.abs(b.vx) > 0.4 ? 'run' : 'idle';
    this.record();
    return ev;
  }

  /** Pogo off something struck by a downward swing. */
  pogo(): void {
    this.body.vy = -this.stats.pogoVel;
    this.jumping = false;
    this.airDashUsed = false;
    this.doubleUsed = false;
  }

  private record(): void {
    const a = this.attack;
    this.history.push({
      x: this.body.x, y: this.body.y, vx: this.body.vx, vy: this.body.vy, facing: this.facing,
      attack: a ? a.dir : null, attackT: a ? a.t : 0, combo: a ? a.combo : 0, pose: this.pose,
    });
    const max = 240;
    if (this.history.length > max) this.history.splice(0, this.history.length - max);
  }
}

export type PlayerEvent =
  | { kind: 'jump' | 'double' | 'dash' | 'parry' | 'healStart' | 'healed' | 'echo' | 'hazard' | 'slamLand' | 'grapple' }
  | { kind: 'swing'; dir: AttackDir };

export function attackBoxFor(dir: AttackDir | null, t: number, x: number, y: number, facing: number): Box | null {
  if (!dir) return null;
  if (dir === 'slam') return { x: x - 6, y: y + 12, w: 24, h: 22 };
  if (t < ATTACK_ACTIVE[0] || t > ATTACK_ACTIVE[1]) return null;
  if (dir === 'side') return facing > 0 ? { x: x + 10, y: y + 1, w: 34, h: 24 } : { x: x - 32, y: y + 1, w: 34, h: 24 };
  if (dir === 'up') return { x: x - 10, y: y - 30, w: 32, h: 34 };
  return { x: x - 10, y: y + 18, w: 32, h: 32 };
}

function onPlatform(room: Room, b: Body): boolean {
  const ty = Math.floor((b.y + b.h + 1) / 20);
  const x0 = Math.floor(b.x / 20);
  const x1 = Math.floor((b.x + b.w - 0.01) / 20);
  let any = false;
  for (let tx = x0; tx <= x1; tx++) {
    const t = room.tiles[ty * room.w + tx];
    if (t === 1 || t === 4 || t === 5 || t === 6) return false;
    if (t === 2) any = true;
  }
  return any;
}

/** Ground counts as safe when both feet are over solid tiles (not the edge of a pit). */
function groundIsSafe(room: Room, b: Body): boolean {
  const ty = Math.floor((b.y + b.h + 1) / 20);
  const l = room.tiles[ty * room.w + Math.floor((b.x + 1) / 20)];
  const r = room.tiles[ty * room.w + Math.floor((b.x + b.w - 1) / 20)];
  const ok = (t: number) => t === 1 || t === 2 || t === 4 || t === 5 || t === 6;
  return ok(l) && ok(r);
}

export function targetAnchor(p: Player, anchors: { x: number; y: number }[], c: Controls): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (const a of anchors) {
    const dx = a.x - p.cx;
    const dy = a.y - p.cy;
    const d = Math.hypot(dx, dy);
    if (d > PHYS.grappleRange || d < 18) continue;
    // Prefer anchors in the held direction, or in front when no direction is held.
    const dir = c.x !== 0 ? c.x : p.facing;
    if (dx * dir < -20 && !(c.y < 0 && dy < 0)) continue;
    const score = d - (dy < 0 ? 30 : 0);
    if (score < bestD) { bestD = score; best = a; }
  }
  return best;
}

export const clampHp = (p: Player) => { p.hp = clamp(p.hp, 0, p.maxHp); };
