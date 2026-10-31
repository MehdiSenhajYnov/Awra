import { move } from '../engine/body';
import { TILE, clamp, overlap } from '../engine/core';
import { isSolid, tileAt } from '../world/room';
import { Bolt, Walker } from './enemies';
import { type DamageSource, Entity, type Hit, type ParryKind } from './entity';
import type { Scene } from './scene';

// ---------------------------------------------------------------- shared hazards

/** A shockwave running along the floor: jump over it. */
export class Shockwave extends Entity {
  constructor(scene: Scene, x: number, floorY: number, public dir: number, public speed = 4, h = 16, public color = '#ffe0a8') {
    super(scene, x, floorY, 14, h);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
  }
  update(): void {
    this.body.x += this.dir * this.speed;
    const tx = Math.floor((this.cx + this.dir * 8) / TILE);
    const ty = Math.floor((this.body.y + this.body.h - 4) / TILE);
    if (isSolid(tileAt(this.scene.room, tx, ty)) || this.t > 400) this.dead = true;
  }
  hits(): Hit[] {
    return [{ box: this.box(), damage: 1, parry: 'none' }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, this.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 6, y + h);
    ctx.quadraticCurveTo(x + w / 2, y - 6 + Math.sin(this.t * 0.6) * 2, x + w + 6, y + h);
    ctx.fill();
    ctx.restore();
  }
}

/** Something dropped from above after a telegraph: a falling bell, a stalactite of glass, a drop of ink. */
export class Faller extends Entity {
  warn: number;
  constructor(scene: Scene, x: number, public look: 'bell' | 'glass' | 'ink' | 'gear', warn = 45) {
    super(scene, x, 24, 16, 18);
    this.warn = warn;
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.body.y = 4;
  }
  update(): void {
    if (this.warn > 0) { this.warn--; return; }
    this.body.vy = Math.min(10, this.body.vy + 0.6);
    const r = move(this.scene.room, this.body);
    if (r.hitY || this.body.onGround) {
      this.dead = true;
      this.scene.sfx(this.look === 'bell' ? 'bell' : 'break', 0.6);
      this.scene.particles.burst(this.cx, this.body.y + this.body.h, 12, this.look === 'ink' ? '#000' : '#c9a56a', { speed: 3, kind: 'shard' });
      this.scene.shakeBy(3);
    }
  }
  hits(): Hit[] {
    return this.warn > 0 ? [] : [{ box: this.box(), damage: 1, parry: 'none' }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const floor = findFloor(this.scene, this.cx);
    if (this.warn > 0) {
      ctx.fillStyle = `rgba(255,230,180,${0.15 + 0.25 * (1 - this.warn / 45)})`;
      ctx.beginPath();
      ctx.ellipse(this.cx, floor, 12, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,230,180,0.08)';
      ctx.fillRect(this.cx - 6, 0, 12, floor);
      return;
    }
    const { x, y, w, h } = this.body;
    ctx.fillStyle = this.look === 'glass' ? '#a8fff4' : this.look === 'ink' ? '#000' : this.look === 'gear' ? '#6a5a30' : '#8a6a3c';
    if (this.look === 'glass') { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w / 2, y + h); ctx.fill(); return; }
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.quadraticCurveTo(x + 2, y + h * 0.7, x - 2, y + h);
    ctx.lineTo(x + w + 2, y + h);
    ctx.quadraticCurveTo(x + w - 2, y + h * 0.7, x + w - 4, y);
    ctx.fill();
  }
}

/** A column rising from the floor after a telegraph (glass pillars, ink geysers, steam). */
export class Pillar extends Entity {
  constructor(scene: Scene, x: number, public look: 'glass' | 'ink' | 'steam' | 'lava', public warn = 40, public stay = 34, height = 120) {
    super(scene, x, findFloor(scene, x), 22, height);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
  }
  update(): void {
    if (this.t > this.warn + this.stay) this.dead = true;
  }
  hits(): Hit[] {
    if (this.t < this.warn) return [];
    const k = Math.min(1, (this.t - this.warn) / 6);
    const { x, y, w, h } = this.body;
    return [{ box: { x, y: y + h * (1 - k), w, h: h * k }, damage: 1, parry: 'none' }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const color = { glass: '168,255,244', ink: '10,10,12', steam: '230,230,220', lava: '255,140,60' }[this.look];
    if (this.t < this.warn) {
      ctx.fillStyle = `rgba(${color},${0.2 + 0.3 * (this.t / this.warn)})`;
      ctx.fillRect(x + 2, y + h - 4, w - 4, 4);
      if (this.t % 8 < 4) ctx.fillRect(x + w / 2 - 1, y + h - 10, 2, 6);
      return;
    }
    const k = Math.min(1, (this.t - this.warn) / 6);
    const fade = Math.min(1, (this.warn + this.stay - this.t) / 8);
    ctx.save();
    if (this.look !== 'ink') ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(${color},${0.75 * fade})`;
    ctx.fillRect(x, y + h * (1 - k), w, h * k);
    ctx.restore();
  }
}

export function findFloor(scene: Scene, x: number): number {
  const tx = Math.floor(x / TILE);
  for (let ty = 2; ty < scene.room.h; ty++) if (isSolid(tileAt(scene.room, tx, ty))) return ty * TILE;
  return scene.room.h * TILE - TILE;
}

// ---------------------------------------------------------------- base

export abstract class Boss extends Entity {
  phase = 1;
  act = 'idle';
  at = 0;
  /** Hits taken since the last stagger; a stagger opens a long punish window. */
  stagger = 0;
  staggerAt = 9;
  speed = 1;
  readonly key: string;
  /** Flag set when it falls (differs from key for variations). */
  flagKey: string;
  constructor(scene: Scene, x: number, y: number, w: number, h: number, hits: number, key: string, hard = false) {
    super(scene, x, y, w, h);
    this.key = key;
    this.flagKey = key;
    const dmg = scene.player.stats.damage;
    this.maxHp = this.hp = Math.round(hits * Math.max(1, dmg) * (hard ? 1.4 : 1));
    this.speed = hard ? 1.25 : 1;
    this.heavy = true;
    this.contact = 1;
  }
  get p() {
    return this.scene.player;
  }
  get floor(): number {
    return findFloor(this.scene, this.cx);
  }
  dx(): number {
    return this.p.cx - this.cx;
  }
  setAct(a: string): void {
    this.act = a;
    this.at = 0;
  }
  /** Number of frames scaled by difficulty. */
  f(n: number): number {
    return Math.round(n / this.speed);
  }
  update(): void {
    this.at++;
    if (this.stun > 0) {
      this.body.vx *= 0.85;
      this.body.vy = Math.min(9, this.body.vy + 0.5);
      move(this.scene.room, this.body);
      if (this.stun === 1) this.setAct('idle');
      return;
    }
    this.updatePhase();
    this.think();
  }
  /** Phases follow health; none is skipped, even under a burst of blows. */
  updatePhase(): void {
    const ratio = this.hp / this.maxHp;
    const next = ratio < 0.33 ? 3 : ratio < 0.66 ? 2 : 1;
    while (this.phase < next) {
      this.phase++;
      this.onPhase(this.phase);
    }
  }

  /** Some keepers cannot fall to blows alone (the Silence waits for its bells). */
  keepAlive(): boolean {
    return false;
  }

  onPhase(_n: number): void {
    this.scene.sfx('roar');
    this.scene.shakeBy(8);
  }
  abstract think(): void;
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    // Never skip the last phase: a killing blow first lands it at the edge of phase three.
    if (this.phase < 3 && this.hp - amount <= 0) amount = Math.max(0, this.hp - this.maxHp * 0.3);
    if (this.keepAlive() && this.hp - amount < 1) amount = Math.max(0, this.hp - 1);
    const ok = super.damage(amount, fromX, source);
    if (ok && !this.dead) this.updatePhase();
    if (ok) {
      this.stagger++;
      if (this.stagger >= this.staggerAt && this.stun === 0) {
        this.stagger = 0;
        this.stun = 70;
        this.scene.sfx('hitHeavy', 0.6);
      }
    }
    return ok;
  }
  parried(kind: ParryKind): void {
    if (kind === 'stun') {
      this.stun = 55;
      this.stagger = Math.max(0, this.stagger - 2);
    }
  }
  onDeath(): void {
    this.scene.bossDefeated(this);
  }
  /** Pick from weighted options, never the same act twice in a row when avoidable. */
  choose(options: [string, number][]): string {
    const pool = options.filter(([a]) => a !== this.lastAct || options.length === 1);
    let roll = this.scene.rng.next() * pool.reduce((s, [, w]) => s + w, 0);
    for (const [a, w] of pool) { roll -= w; if (roll < 0) { this.lastAct = a; return a; } }
    return pool[0][0];
  }
  private lastAct = '';
  stunGlow(ctx: CanvasRenderingContext2D): void {
    if (this.stun <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,240,190,${0.4 + 0.3 * Math.sin(this.t * 0.4)})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = this.t * 0.1 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(this.cx + Math.cos(a) * 12, this.body.y - 6 + Math.sin(a) * 3, 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 1. Le Sonneur Déchu

export class Dechu extends Boss {
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y, 22, 40, 26, 'dechu', hard);
  }
  think(): void {
    const b = this.body;
    b.vy = Math.min(10, b.vy + 0.55);
    const dx = this.dx();
    switch (this.act) {
      case 'idle':
        b.vx *= 0.8;
        this.facing = Math.sign(dx) || this.facing;
        if (this.at > this.f(this.phase === 1 ? 40 : 24)) {
          const near = Math.abs(dx) < 70;
          this.setAct(this.choose([['dash', 3], ['leap', 2], ['combo', near ? 4 : 1], ...(this.phase >= 2 ? [['bells', 2] as [string, number]] : [])]));
        }
        break;
      case 'dash':
        // Wind-up glint, then a charge across the arena (parry to stun).
        if (this.at < this.f(30)) { b.vx = -this.facing * 0.4; break; }
        if (this.at === this.f(30)) this.scene.sfx('dash');
        b.vx = this.facing * 7.5 * this.speed;
        if (this.at > this.f(30) + 26 || Math.abs(b.vx) < 0.1) this.setAct('recover');
        break;
      case 'leap':
        if (this.at === 1) { b.vy = -11; b.vx = clamp(dx / 40, -5, 5); }
        if (this.at > 8 && b.onGround) {
          this.scene.sfx('slam');
          this.scene.shakeBy(6);
          for (const d of [-1, 1]) this.scene.spawn(new Shockwave(this.scene, this.cx + d * 12, this.floor, d, 4.2 * this.speed));
          if (this.phase === 3) for (const d of [-1, 1]) this.scene.spawn(new Shockwave(this.scene, this.cx + d * 12, this.floor, d, 2.4));
          this.setAct('recover');
        }
        break;
      case 'combo': {
        b.vx = 0;
        const n = this.phase === 1 ? 2 : 3;
        const k = Math.floor(this.at / this.f(22));
        if (this.at % this.f(22) === this.f(12)) { this.scene.sfx('swing', 0.7); b.vx = this.facing * 3; this.facing = Math.sign(dx) || this.facing; }
        if (k >= n) this.setAct('recover');
        break;
      }
      case 'bells':
        b.vx = 0;
        if (this.at === 1) this.scene.sfx('bellBig');
        if (this.at % 14 === 1 && this.at < 70) {
          const room = this.scene.room.w * TILE;
          this.scene.spawn(new Faller(this.scene, clamp(this.p.cx + (this.scene.rng.next() - 0.5) * 160, 40, room - 40), 'bell'));
        }
        if (this.at > 80) this.setAct('recover');
        break;
      case 'recover':
        b.vx *= 0.8;
        if (this.at > this.f(this.phase === 1 ? 44 : 30)) this.setAct('idle');
        break;
    }
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    const b = this.body;
    if (this.act === 'dash' && this.at > this.f(30)) return [{ box: this.box(), damage: 1, parry: 'stun' }];
    if (this.act === 'combo' && this.at % this.f(22) >= this.f(12) && this.at % this.f(22) < this.f(12) + 6) {
      return [{ box: { x: this.facing > 0 ? b.x + b.w - 4 : b.x - 40, y: b.y + 4, w: 44, h: 30 }, damage: 1, parry: 'stun' }];
    }
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing, 1);
    const c = this.flash ? '#f4f0ff' : '#08080c';
    ctx.fillStyle = c;
    // Tall tattered robe.
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    for (let i = 0; i < 6; i++) ctx.lineTo(-14 + i * 5.6, -(i % 2 ? 6 : 0) - Math.sin(this.t * 0.1 + i) * 1.5);
    ctx.lineTo(14, 0);
    ctx.lineTo(10, -30);
    ctx.quadraticCurveTo(0, -46, -10, -30);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -36, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
    // Cracked bronze mask.
    ctx.fillStyle = this.flash ? '#fff' : '#8a6a40';
    ctx.beginPath(); ctx.ellipse(3, -36, 5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#08080c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(3, -42); ctx.lineTo(1, -37); ctx.lineTo(4, -32); ctx.stroke();
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(4, -38, 1.5, 2.2);
    // Great hammer.
    const glint = this.act === 'dash' && this.at < this.f(30);
    const ang = this.act === 'combo' ? -2 + ((this.at % this.f(22)) / this.f(22)) * 3 : this.act === 'dash' ? 0.2 : this.act === 'leap' ? -2.6 : -1.1;
    ctx.save();
    ctx.translate(-2, -24);
    ctx.rotate(ang);
    ctx.fillStyle = '#2a1e14';
    ctx.fillRect(0, -1.5, 30, 3);
    ctx.fillStyle = glint && this.at % 6 < 3 ? '#fff4c8' : '#a07a44';
    ctx.beginPath(); ctx.roundRect(26, -7, 12, 14, 3); ctx.fill();
    ctx.restore();
    ctx.restore();
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 2. La Gargouille

export class Gargouille extends Boss {
  home = { x: 0, y: 0 };
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y - 80, 34, 28, 30, 'gargouille', hard);
    this.body.noPlatforms = true;
    this.home = { x: this.body.x, y: this.body.y };
    this.contact = 1;
  }
  think(): void {
    const b = this.body;
    const W = this.scene.room.w * TILE;
    const dx = this.dx();
    switch (this.act) {
      case 'idle': {
        const tx = clamp(this.p.cx - b.w / 2 - Math.sign(dx || 1) * 90, 40, W - 80);
        b.vx += clamp((tx - b.x) * 0.01, -0.3, 0.3);
        b.vy += clamp((this.home.y + Math.sin(this.t * 0.05) * 14 - b.y) * 0.01, -0.3, 0.3);
        b.vx *= 0.93; b.vy *= 0.93;
        this.facing = Math.sign(dx) || 1;
        if (this.at > this.f(this.phase === 1 ? 70 : 46)) this.setAct(this.choose([['swoop', 3], ['spit', 3], ['rain', this.phase >= 2 ? 2 : 1], ...(this.phase >= 2 ? [['dive', 2] as [string, number]] : [])]));
        break;
      }
      case 'swoop': {
        if (this.at < this.f(26)) { b.vx *= 0.8; b.vy = -1; break; }
        if (this.at === this.f(26)) {
          const tx = this.p.cx - this.cx;
          const ty = this.p.cy - this.cy;
          const d = Math.hypot(tx, ty) || 1;
          b.vx = (tx / d) * 6.5 * this.speed;
          b.vy = (ty / d) * 6.5 * this.speed;
          this.scene.sfx('dash');
        }
        const r = move(this.scene.room, b, 0, 0);
        void r;
        if (this.at > this.f(26) + 34 || b.y + b.h > this.floor - 4) { b.vy = -3; this.setAct('back'); }
        break;
      }
      case 'spit':
        b.vx *= 0.9; b.vy *= 0.9;
        if (this.at % this.f(16) === 0 && this.at <= this.f(16) * (this.phase === 1 ? 3 : 5)) {
          const t = 46;
          const tdx = this.p.cx - this.cx + (this.scene.rng.next() - 0.5) * 60;
          const tdy = this.p.cy - this.cy;
          this.scene.spawn(new Bolt(this.scene, this.cx, this.cy, tdx / t, tdy / t - 0.25 * t / 2, 'water', 0.25));
          this.scene.sfx('shoot', 0.7);
        }
        if (this.at > this.f(16) * 6) this.setAct('idle');
        break;
      case 'rain':
        // Pours a curtain of water down two columns near the player.
        b.vx *= 0.9; b.vy *= 0.9;
        if (this.at === 10) for (const off of this.phase === 1 ? [0] : [-60, 60]) this.scene.spawn(new Pillar(this.scene, clamp(this.p.cx + off, 30, W - 30), 'steam', 40, 50, 360));
        if (this.at > 100) this.setAct('idle');
        break;
      case 'dive':
        if (this.at < 30) { b.vx = (this.p.cx - this.cx) * 0.08; b.vy = -2; break; }
        b.vx = 0;
        b.vy = 10;
        if (b.y + b.h >= this.floor - 2) {
          b.y = this.floor - b.h;
          this.scene.sfx('slam');
          this.scene.shakeBy(8);
          for (const d of [-1, 1]) this.scene.spawn(new Shockwave(this.scene, this.cx + d * 18, this.floor, d, 3.6, 14, '#9ad0e8'));
          this.setAct('grounded');
        }
        break;
      case 'grounded':
        // Stuck for a moment: the punish window.
        b.vx = 0; b.vy = 0;
        if (this.at > this.f(60)) { b.vy = -4; this.setAct('back'); }
        break;
      case 'back':
        b.vy += (this.home.y - b.y) * 0.004;
        b.vy *= 0.92; b.vx *= 0.92;
        if (this.at > 40) this.setAct('idle');
        break;
    }
    if (this.act !== 'grounded') { b.x += b.vx; b.y += b.vy; }
    b.x = clamp(b.x, TILE, W - TILE - b.w);
    b.y = clamp(b.y, TILE, this.floor - b.h);
  }
  hits(): Hit[] {
    if (this.act === 'swoop' && this.at > this.f(26)) return [{ box: this.box(), damage: 1, parry: 'stun' }];
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const flap = this.act === 'grounded' ? 0 : Math.sin(this.t * 0.25);
    const c = this.flash ? '#f4f0ff' : '#1a1e24';
    ctx.fillStyle = c;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 6, cy - 4);
      ctx.quadraticCurveTo(cx + s * 30, cy - 26 * flap - 8, cx + s * 42, cy - 4 + flap * 10);
      ctx.lineTo(cx + s * 32, cy + 2);
      ctx.lineTo(cx + s * 24, cy - 2);
      ctx.lineTo(cx + s * 16, cy + 4);
      ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(cx, cy + 2, 14, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + this.facing * 8, cy - 8, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + this.facing * 2, cy - 14); ctx.lineTo(cx - this.facing * 2, cy - 26); ctx.lineTo(cx + this.facing * 8, cy - 15); ctx.fill();
    ctx.fillStyle = '#9ad0e8';
    ctx.fillRect(cx + this.facing * 11 - 1, cy - 10, 2.2, 2.4);
    ctx.fillRect(cx + this.facing * 6 - 1, cy - 10, 2.2, 2.4);
    if (this.act === 'swoop' && this.at < this.f(26) && this.at % 6 < 3) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();
    }
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 3. Mère Coulée

export class MereCoulee extends Boss {
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y, 56, 58, 34, 'mere', hard);
    this.staggerAt = 11;
  }
  think(): void {
    const b = this.body;
    b.vy = Math.min(10, b.vy + 0.5);
    const W = this.scene.room.w * TILE;
    const dx = this.dx();
    switch (this.act) {
      case 'idle':
        b.vx = clamp(dx * 0.01, -0.6, 0.6);
        this.facing = Math.sign(dx) || 1;
        if (this.at > this.f(this.phase === 1 ? 55 : 38)) this.setAct(this.choose([['lob', 3], ['sweep', 3], ['flood', this.phase >= 2 ? 2 : 1], ...(this.phase === 3 ? [['spawn', 1] as [string, number]] : [])]));
        break;
      case 'lob':
        b.vx = 0;
        if (this.at % this.f(24) === 0 && this.at <= this.f(24) * 3) {
          for (let i = -1; i <= 1; i++) {
            const t = 50;
            const tdx = this.p.cx - this.cx + i * 50;
            this.scene.spawn(new Bolt(this.scene, this.cx, b.y + 4, tdx / t, -0.3 * t / 2 - 2, 'molten', 0.3));
          }
          this.scene.sfx('shoot', 0.6);
        }
        if (this.at > this.f(24) * 4) this.setAct('idle');
        break;
      case 'sweep':
        // A molten arm sweeps the floor: jump it, or parry it to stun her.
        b.vx = 0;
        if (this.at === this.f(40)) this.scene.sfx('swing', 0.5);
        if (this.at > this.f(70)) this.setAct('rest');
        break;
      case 'flood':
        // Lava gushes at both ends; the middle stays safe, but she lobs there.
        b.vx = 0;
        if (this.at === 1) this.scene.sfx('roar', 0.8);
        if (this.at === 20) for (let x = 40; x < W - 40; x += 26) if (Math.abs(x - W / 2) > (this.phase === 1 ? 120 : 90)) this.scene.spawn(new Pillar(this.scene, x, 'lava', 36, 50, 40));
        if (this.at === 60) {
          const t = 40;
          this.scene.spawn(new Bolt(this.scene, this.cx, b.y, (W / 2 - this.cx) / t, -0.3 * t / 2 - 1, 'molten', 0.3));
        }
        if (this.at > 110) this.setAct('idle');
        break;
      case 'spawn':
        if (this.at === 10) for (const d of [-1, 1]) {
          const s = new Walker(this.scene, this.cx + d * 30, b.y + b.h, 'scorie');
          s.facing = d;
          this.scene.spawn(s);
        }
        if (this.at > 50) this.setAct('idle');
        break;
      case 'rest':
        b.vx = 0;
        if (this.at > this.f(40)) this.setAct('idle');
        break;
    }
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    if (this.act === 'sweep' && this.at >= this.f(40) && this.at < this.f(52)) {
      const reach = 150;
      const b = this.body;
      return [{ box: { x: this.facing > 0 ? b.x + b.w / 2 : b.x + b.w / 2 - reach, y: b.y + b.h - 18, w: reach, h: 18 }, damage: 1, parry: 'stun' }];
    }
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const cx = x + w / 2;
    // Crucible body.
    ctx.fillStyle = this.flash ? '#fff' : '#1c120c';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 10); ctx.lineTo(x + w + 4, y + 10); ctx.lineTo(x + w - 4, y + h); ctx.lineTo(x + 4, y + h); ctx.fill();
    // Molten matron rising from it.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bob = Math.sin(this.t * 0.07) * 2;
    const g = ctx.createRadialGradient(cx, y - 6 + bob, 3, cx, y - 6 + bob, 46);
    g.addColorStop(0, '#fff0c0');
    g.addColorStop(0.35, '#ff8a3a');
    g.addColorStop(1, 'rgba(120,30,0,0)');
    ctx.fillStyle = g;
    // Torso and head of molten bronze rising from the crucible, arms resting on its rim.
    ctx.beginPath();
    ctx.moveTo(cx - 24, y + 12);
    ctx.quadraticCurveTo(cx - 20, y - 18 + bob, cx, y - 30 + bob);
    ctx.quadraticCurveTo(cx + 20, y - 18 + bob, cx + 24, y + 12);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, y - 36 + bob, 11, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2a0a00';
    ctx.fillRect(cx - 6 + this.facing * 2, y - 38 + bob, 3, 4);
    ctx.fillRect(cx + 3 + this.facing * 2, y - 38 + bob, 3, 4);
    // Sweeping arm.
    if (this.act === 'sweep') {
      const k = clamp((this.at - this.f(30)) / this.f(20), 0, 1);
      const len = 150 * k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = this.at < this.f(40) ? `rgba(255,180,90,${0.2 + 0.3 * (this.at % 8 < 4 ? 1 : 0)})` : 'rgba(255,140,60,0.85)';
      if (this.at < this.f(40)) ctx.fillRect(this.facing > 0 ? cx : cx - 150, y + h - 4, 150, 4);
      else ctx.fillRect(this.facing > 0 ? cx : cx - len, y + h - 18, len, 18);
      ctx.restore();
    }
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 4. Le Souffleur

export class Souffleur extends Boss {
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y, 52, 38, 38, 'souffleur', hard);
  }
  think(): void {
    const b = this.body;
    b.vy = Math.min(10, b.vy + 0.5);
    const dx = this.dx();
    switch (this.act) {
      case 'idle':
        b.vx *= 0.85;
        this.facing = Math.sign(dx) || 1;
        if (this.at > this.f(this.phase === 1 ? 50 : 34)) this.setAct(this.choose([['blow', 3], ['inhale', 2], ['charge', 3], ['notes', 2]]));
        break;
      case 'blow':
        // A gale toward the spiked wall behind the player: dash against it or swap away.
        b.vx = 0;
        if (this.at > this.f(30) && this.at < this.f(30) + 90) {
          this.p.body.vx += this.facing * 0.5 * this.speed;
          if (this.at % 4 === 0) this.scene.particles.burst(this.cx + this.facing * 26, this.cy, 3, '#c9f0b4', { speed: 6, dir: this.facing > 0 ? 0 : Math.PI, spread: 0.4, kind: 'spark', gravity: 0 });
          if (this.at % 30 === 0) this.scene.sfx('wind');
        }
        if (this.at > this.f(30) + 100) this.setAct('rest');
        break;
      case 'inhale':
        b.vx = 0;
        if (this.at > this.f(24) && this.at < this.f(24) + 70) {
          this.p.body.vx -= Math.sign(dx) * 0.38 * this.speed;
          if (this.at % 30 === 0) this.scene.sfx('wind', 0.7);
        }
        if (this.at > this.f(24) + 80) this.setAct('chomp');
        break;
      case 'chomp':
        if (this.at === 1) this.scene.sfx('roar', 1.3);
        if (this.at > 30) this.setAct('rest');
        break;
      case 'charge':
        if (this.at < this.f(26)) { b.vx = -this.facing * 0.5; break; }
        b.vx = this.facing * 6 * this.speed;
        if (b.wall !== 0 || this.at > this.f(26) + 60) {
          this.scene.sfx('slam');
          this.scene.shakeBy(6);
          for (let i = 0; i < (this.phase >= 2 ? 6 : 3); i++) this.scene.spawn(new Faller(this.scene, 40 + this.scene.rng.next() * (this.scene.room.w * TILE - 80), 'gear', 30 + i * 6));
          this.setAct('rest');
        }
        break;
      case 'notes':
        b.vx = 0;
        if (this.at % this.f(10) === 0 && this.at < 70) {
          const a = -Math.PI / 2 + (this.scene.rng.next() - 0.5) * 2.2;
          this.scene.spawn(new Bolt(this.scene, this.cx, b.y, Math.cos(a) * 4, Math.sin(a) * 4 - 2, 'note', 0.15));
          this.scene.sfx('shoot', 1.6);
        }
        if (this.at > 90) this.setAct('idle');
        break;
      case 'rest':
        b.vx *= 0.8;
        if (this.at > this.f(46)) this.setAct('idle');
        break;
    }
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    if (this.act === 'charge' && this.at >= this.f(26)) return [{ box: this.box(), damage: 1, parry: 'stun' }];
    if (this.act === 'chomp' && this.at < 14) {
      const b = this.body;
      return [{ box: { x: this.facing > 0 ? b.x + b.w - 6 : b.x - 30, y: b.y, w: 36, h: b.h }, damage: 1, parry: 'stun' }];
    }
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const breathe = this.act === 'blow' ? -3 : this.act === 'inhale' ? 4 : Math.sin(this.t * 0.06) * 2;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing, 1);
    ctx.fillStyle = this.flash ? '#fff' : '#121c14';
    // Leather bellows body with pleats.
    ctx.beginPath();
    ctx.moveTo(-26, 0); ctx.lineTo(-26, -24 - breathe); ctx.quadraticCurveTo(0, -42 - breathe, 22, -26); ctx.lineTo(26, 0); ctx.fill();
    ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = 1.2;
    for (let i = -18; i <= 14; i += 6) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i + 2, -30 - breathe * 0.5); ctx.stroke(); }
    // Brass nozzle mouth.
    ctx.fillStyle = '#8a7a40';
    ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(34, -16 - (this.act === 'chomp' ? 6 : 0)); ctx.lineTo(34, -8 + (this.act === 'chomp' ? 6 : 0)); ctx.lineTo(20, -10); ctx.fill();
    ctx.fillStyle = '#c9f0b4';
    ctx.fillRect(12, -26, 3, 3);
    ctx.fillRect(6, -27, 3, 3);
    ctx.restore();
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 5. Les Jumeaux Glas

/** Two ghost bell-ringers; the second repeats the first's moves a beat later. */
export class Jumeau extends Boss {
  twin: Jumeau | null = null;
  log: { x: number; y: number; act: string; at: number; facing: number }[] = [];
  constructor(scene: Scene, x: number, y: number, public leader: boolean, hard = false) {
    super(scene, x, y - 30, 20, 32, 20, 'jumeaux', hard);
    this.body.noPlatforms = true;
    this.contact = 1;
  }
  think(): void {
    const b = this.body;
    const W = this.scene.room.w * TILE;
    const enraged = !this.twin || this.twin.dead;
    if (!this.leader && this.twin && !this.twin.dead) {
      // The follower replays the leader 40 frames late, mirrored across the arena.
      const rec = this.twin.log[this.twin.log.length - 40];
      if (rec) {
        b.x = W - rec.x - b.w;
        b.y = rec.y;
        this.act = rec.act;
        this.at = rec.at;
        this.facing = -rec.facing;
        this.fireFrom(rec.act, rec.at);
      }
      return;
    }
    const dx = this.dx();
    const sp = enraged ? 1.35 : 1;
    switch (this.act) {
      case 'idle':
        b.x += clamp(dx * 0.02, -1.5, 1.5) * sp;
        b.y += (this.p.cy - 60 - b.y) * 0.02;
        this.facing = Math.sign(dx) || 1;
        if (this.at > this.f(enraged ? 30 : 50)) this.setAct(this.choose([['scythe', 3], ['orbs', 2], ['blink', 2]]));
        break;
      case 'scythe':
        // Telegraphed horizontal reap at the player's height.
        if (this.at < this.f(20)) { b.y += (this.p.cy - 16 - b.y) * 0.1; break; }
        b.x += this.facing * 7 * sp;
        if (this.at > this.f(20) + 40 || b.x < TILE || b.x > W - TILE - b.w) this.setAct('idle');
        break;
      case 'orbs':
        this.fireFrom('orbs', this.at);
        if (this.at > 60) this.setAct('idle');
        break;
      case 'blink':
        if (this.at === 20) { b.x = clamp(this.p.cx + (this.scene.rng.chance(0.5) ? 90 : -90), TILE, W - TILE - b.w); this.scene.sfx('swap'); }
        if (this.at > 30) this.setAct('scythe');
        break;
    }
    b.x = clamp(b.x, TILE, W - TILE - b.w);
    b.y = clamp(b.y, TILE * 2, this.floor - b.h - 4);
    this.log.push({ x: b.x, y: b.y, act: this.act, at: this.at, facing: this.facing });
    if (this.log.length > 120) this.log.shift();
  }
  fireFrom(act: string, at: number): void {
    if (act === 'orbs' && at === 20) {
      for (let i = 0; i < 5; i++) {
        const a = Math.atan2(this.p.cy - this.cy, this.p.cx - this.cx) + (i - 2) * 0.28;
        this.scene.spawn(new Bolt(this.scene, this.cx, this.cy, Math.cos(a) * 2.6, Math.sin(a) * 2.6, 'ring', 0, 180));
      }
      this.scene.sfx('shoot', 1.3);
    }
  }
  hits(): Hit[] {
    if (this.act === 'scythe' && this.at > this.f(20)) return [{ box: { x: this.body.x - 14, y: this.body.y + 8, w: this.body.w + 28, h: 14 }, damage: 1, parry: 'stun' }];
    return [];
  }
  onDeath(): void {
    this.scene.killFx(this);
    if (this.twin && !this.twin.dead) {
      // The survivor takes over, faster, leading itself.
      this.twin.leader = true;
      this.twin.twin = null;
      this.twin.setAct('idle');
      this.scene.sfx('roar', 1.4);
      this.scene.boss = this.twin;
      return;
    }
    this.scene.bossDefeated(this);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.85;
    const col = this.leader ? '216,184,255' : '168,220,255';
    ctx.fillStyle = this.flash ? '#fff' : `rgba(${col},0.55)`;
    ctx.beginPath();
    ctx.moveTo(x - 2, y + h);
    for (let i = 0; i <= 5; i++) ctx.lineTo(x - 2 + i * (w + 4) / 5, y + h - (i % 2 ? 6 : 0) + Math.sin(this.t * 0.2 + i) * 2);
    ctx.lineTo(x + w, y + 10);
    ctx.quadraticCurveTo(x + w / 2, y - 6, x, y + 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w / 2 + this.facing * 3 - 1, y + 6, 2, 2);
    // Scythe.
    if (this.act === 'scythe') {
      ctx.strokeStyle = this.at < this.f(20) ? `rgba(${col},${this.at % 6 < 3 ? 1 : 0.3})` : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 15, 20, this.facing > 0 ? -0.6 : Math.PI - 0.6, this.facing > 0 ? 0.6 : Math.PI + 0.6);
      ctx.stroke();
    }
    ctx.restore();
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 6. La Cantatrice de Verre

/** Sings in time: her rings land on a steady beat, so parries can be timed by ear. */
export class Cantatrice extends Boss {
  beat = 0;
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y - 70, 24, 40, 40, 'cantatrice', hard);
    this.body.noPlatforms = true;
    this.contact = 1;
  }
  think(): void {
    const b = this.body;
    const W = this.scene.room.w * TILE;
    const period = this.f(this.phase === 1 ? 48 : this.phase === 2 ? 40 : 34);
    this.beat++;
    if (this.beat % period === 0) this.scene.sfx('chime', 1 + (this.beat / period) % 4 * 0.12);
    switch (this.act) {
      case 'idle':
        b.x += (W / 2 + Math.sin(this.t * 0.01) * W * 0.3 - b.x) * 0.01;
        b.y += (TILE * 7 + Math.sin(this.t * 0.03) * 10 - b.y) * 0.03;
        if (this.at > period * 2) this.setAct(this.choose([['notes', 3], ['pillars', 2], ['shards', 2], ...(this.phase >= 2 ? [['aria', 2] as [string, number]] : [])]));
        break;
      case 'notes':
        // A note aimed at the player on every beat: parry each one back at her.
        if (this.beat % period === period - 24) {
          const dx = this.p.cx - this.cx;
          const dy = this.p.cy - this.cy;
          const d = Math.hypot(dx, dy) || 1;
          const v = d / 24;
          this.scene.spawn(new Bolt(this.scene, this.cx, this.cy, (dx / d) * v, (dy / d) * v, 'note', 0, 60));
        }
        if (this.at > period * 5) this.setAct('idle');
        break;
      case 'pillars':
        if (this.at % this.f(14) === 0 && this.at < this.f(14) * 6) this.scene.spawn(new Pillar(this.scene, clamp(this.p.cx + (this.scene.rng.next() - 0.5) * 40, 30, W - 30), 'glass', 36, 30, 150));
        if (this.at > 140) this.setAct('idle');
        break;
      case 'shards':
        if (this.at % 9 === 0 && this.at < 90) this.scene.spawn(new Faller(this.scene, 30 + this.scene.rng.next() * (W - 60), 'glass', 30));
        if (this.at > 120) this.setAct('idle');
        break;
      case 'aria':
        // Expanding rings in all directions on the beat; find the gaps.
        if (this.beat % period === 0) {
          const n = 10;
          const off = (this.beat / period) * 0.3;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + off;
            this.scene.spawn(new Bolt(this.scene, this.cx, this.cy, Math.cos(a) * 2, Math.sin(a) * 2, 'ring', 0, 200));
          }
        }
        if (this.at > period * 4) this.setAct('idle');
        break;
    }
  }
  /** Her own notes, parried back, hurt her more than the hammer. */
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    return super.damage(source === 'reflect' ? amount * 1.5 : amount, fromX, source);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const cx = x + w / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.flash ? '#fff' : 'rgba(168,255,244,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.quadraticCurveTo(cx + 18, y + h * 0.6, cx + 22, y + h);
    ctx.lineTo(cx - 22, y + h);
    ctx.quadraticCurveTo(cx - 18, y + h * 0.6, cx, y);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,255,250,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, y - 2, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Open mouth on the beat.
    ctx.fillStyle = '#0a2a2a';
    const open = this.beat % this.f(40) < 8 ? 3 : 1;
    ctx.beginPath(); ctx.ellipse(cx, y, 1.6, open, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 7. Le Noyé

/** Rises from black water at a new spot each time; strike while it is out. */
export class Noye extends Boss {
  spots: number[] = [];
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y, 44, 80, 44, 'noye', hard);
    this.body.noPlatforms = true;
    this.hurtable = false;
    this.contact = 0;
    const W = scene.room.w * TILE;
    this.spots = [W * 0.2, W * 0.5, W * 0.8];
  }
  get waterY(): number {
    return this.scene.room.h * TILE - TILE * 3;
  }
  think(): void {
    const b = this.body;
    switch (this.act) {
      case 'idle':
        this.hurtable = false;
        this.contact = 0;
        b.y = this.waterY + 10;
        if (this.at > this.f(40)) {
          const spot = this.spots[this.scene.rng.int(0, 2)];
          b.x = spot - b.w / 2;
          this.setAct('rise');
          this.scene.sfx('splash');
        }
        break;
      case 'rise':
        // Rises until its upper body is level with the ledges above the water.
        b.y = this.waterY + 10 - Math.min(1, this.at / 20) * (this.waterY + 10 - (this.waterY - 120));
        if (this.at === 20) { this.hurtable = true; this.contact = 1; }
        if (this.at > 24) this.setAct(this.choose([['swipe', 3], ['spit', 2], ['wave', this.phase >= 2 ? 2 : 1]]));
        break;
      case 'swipe':
        this.facing = Math.sign(this.dx()) || 1;
        if (this.at === this.f(26)) this.scene.sfx('swing', 0.5);
        if (this.at > this.f(50)) this.setAct('sink');
        break;
      case 'spit':
        if (this.at % this.f(18) === 0 && this.at < 70) {
          const t = 40;
          this.scene.spawn(new Bolt(this.scene, this.cx, b.y + 10, (this.p.cx - this.cx) / t, (this.p.cy - b.y) / t - 0.25 * t / 2, 'water', 0.25));
          this.scene.sfx('shoot', 0.5);
        }
        if (this.at > 80) this.setAct('sink');
        break;
      case 'wave':
        if (this.at === 20) {
          for (const d of [-1, 1]) this.scene.spawn(new Shockwave(this.scene, this.cx + d * 20, this.waterY + 2, d, 2.6, 30, '#9fe0c0'));
          this.scene.sfx('splash');
        }
        if (this.at > 70) this.setAct('sink');
        break;
      case 'sink':
        b.y += 3;
        if (b.y > this.waterY + 10) this.setAct('idle');
        if (this.at === 1) { this.hurtable = this.phase < 3; this.contact = 0; }
        break;
    }
  }
  hits(): Hit[] {
    if (this.act === 'swipe' && this.at >= this.f(26) && this.at < this.f(36)) {
      const b = this.body;
      return [{ box: { x: this.facing > 0 ? b.x + b.w - 6 : b.x - 60, y: b.y, w: 66, h: 34 }, damage: 1, parry: 'stun' }];
    }
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 80, 0, w + 160, this.waterY + 6);
    ctx.clip();
    ctx.fillStyle = this.flash ? '#fff' : '#06100e';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + h);
    ctx.quadraticCurveTo(x - 6, y + 10, x + w / 2, y);
    ctx.quadraticCurveTo(x + w + 6, y + 10, x + w + 4, y + h);
    ctx.fill();
    // Weeds and a drowned lantern for a face.
    ctx.strokeStyle = '#2a4a3a'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + 6 + i * 7, y + 4); ctx.quadraticCurveTo(x + 4 + i * 7, y + 20, x + 8 + i * 7 + Math.sin(this.t * 0.1 + i) * 3, y + 34); ctx.stroke(); }
    ctx.fillStyle = '#9fe0c0';
    ctx.beginPath(); ctx.arc(x + w / 2 + this.facing * 5, y + 14, 3, 0, Math.PI * 2); ctx.fill();
    if (this.act === 'swipe') {
      const k = clamp(this.at / this.f(30), 0, 1);
      ctx.fillStyle = this.at < this.f(26) && this.at % 6 < 3 ? '#cfffe8' : '#06100e';
      ctx.save();
      ctx.translate(x + w / 2, y + 16);
      ctx.rotate(this.facing > 0 ? -1 + k * 1.4 : Math.PI + 1 - k * 1.4);
      ctx.fillRect(0, -4, 60, 8);
      ctx.restore();
    }
    ctx.restore();
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 8. L'Échappement

/** A clockwork knight that strikes on its own tick, and rewinds itself to where it stood two seconds ago. */
export class Echappement extends Boss {
  past: { x: number; y: number }[] = [];
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y, 24, 42, 52, 'echappement', hard);
  }
  think(): void {
    const b = this.body;
    b.vy = Math.min(10, b.vy + 0.55);
    const dx = this.dx();
    const tick = this.f(this.phase === 1 ? 30 : 22);
    if (this.t % tick === 0) this.scene.sfx('tick');
    this.past.push({ x: b.x, y: b.y });
    if (this.past.length > 120) this.past.shift();
    switch (this.act) {
      case 'idle':
        b.vx = clamp(dx * 0.02, -1.2, 1.2);
        this.facing = Math.sign(dx) || 1;
        if (this.at >= tick * 2 && this.t % tick === 0) this.setAct(this.choose([['lunge', 3], ['wave', 2], ['gears', 2], ...(this.phase >= 2 ? [['rewind', 2] as [string, number]] : [])]));
        break;
      case 'lunge':
        if (this.at < tick) { b.vx = 0; break; }
        if (this.at === tick) { b.vx = this.facing * 8; this.scene.sfx('dash'); }
        b.vx *= 0.93;
        if (this.at > tick + 30) this.setAct(this.phase === 3 && this.scene.rng.chance(0.5) ? 'lunge' : 'rest');
        break;
      case 'wave':
        b.vx = 0;
        if (this.at === tick) {
          this.scene.spawn(new Shockwave(this.scene, this.cx + this.facing * 16, this.floor, this.facing, 5, 26, '#ffd98a'));
          this.scene.sfx('slam');
        }
        if (this.phase >= 2 && this.at === tick * 2) this.scene.spawn(new Shockwave(this.scene, this.cx - this.facing * 16, this.floor, -this.facing, 5, 26, '#ffd98a'));
        if (this.at > tick * 3) this.setAct('idle');
        break;
      case 'gears':
        b.vx = 0;
        if (this.at % tick === 0 && this.at <= tick * 3) {
          for (const d of [-1, 1]) this.scene.spawn(new Bolt(this.scene, this.cx, b.y + 10, d * 2.6, -5, 'shard', 0.18));
          this.scene.sfx('shoot', 0.9);
        }
        if (this.at > tick * 4) this.setAct('idle');
        break;
      case 'rewind': {
        // Snaps back to its position of two seconds ago, with a trailing afterimage that hurts.
        if (this.at === 1) this.scene.sfx('swap');
        const back = this.past[0];
        if (this.at === 20 && back) { b.x = back.x; b.y = back.y; this.scene.particles.burst(this.cx, this.cy, 20, '#ffd98a', { speed: 3 }); }
        if (this.at > 30) this.setAct('lunge');
        break;
      }
      case 'rest':
        b.vx *= 0.8;
        if (this.at > this.f(34)) this.setAct('idle');
        break;
    }
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    const tick = this.f(this.phase === 1 ? 30 : 22);
    if (this.act === 'lunge' && this.at >= tick) return [{ box: { x: this.body.x - 10, y: this.body.y + 6, w: this.body.w + 20, h: 26 }, damage: 1, parry: 'stun' }];
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing, 1);
    ctx.fillStyle = this.flash ? '#fff' : '#1a160a';
    ctx.fillRect(-10, -30, 20, 22);
    ctx.fillRect(-8, -8, 5, 8);
    ctx.fillRect(3, -8, 5, 8);
    // Clock face for a head.
    ctx.beginPath(); ctx.arc(0, -36, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8d8a8';
    ctx.beginPath(); ctx.arc(0, -36, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a160a'; ctx.lineWidth = 1.2;
    const a = this.t * 0.05;
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(Math.cos(a) * 5, -36 + Math.sin(a) * 5); ctx.moveTo(0, -36); ctx.lineTo(Math.cos(a / 12) * 3.5, -36 + Math.sin(a / 12) * 3.5); ctx.stroke();
    // Pendulum sword.
    ctx.save();
    ctx.translate(8, -22);
    ctx.rotate(this.act === 'lunge' ? 0 : Math.sin(this.t * 0.1) * 0.4 + 0.6);
    ctx.fillStyle = '#c9a050';
    ctx.fillRect(0, -1.5, 28, 3);
    ctx.beginPath(); ctx.arc(28, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    if (this.act === 'rewind' && this.past[0]) {
      ctx.strokeStyle = 'rgba(255,217,138,0.5)';
      ctx.strokeRect(this.past[0].x, this.past[0].y, w, h);
    }
    this.stunGlow(ctx);
  }
}

// ---------------------------------------------------------------- 9. Le Silence

/** The final foe. Phase 1: an ink mass around a cracked bell. Phase 2: it takes the Sonneur's shape. Phase 3: ring the bell. */
export class Silence extends Boss {
  constructor(scene: Scene, x: number, y: number, hard = false) {
    super(scene, x, y - 40, 60, 60, 80, 'silence', hard);
    this.body.noPlatforms = true;
    this.staggerAt = 12;
    scene.setFlag('silence3', false);
    scene.setFlag('final_ring', false);
  }
  think(): void {
    const b = this.body;
    // The three bells rang together: the great bell sounds and the Silence breaks.
    if (this.phase === 3 && this.scene.flags.final_ring && !this.dead) {
      this.hp = 0;
      this.dead = true;
      this.onDeath();
      return;
    }
    const W = this.scene.room.w * TILE;
    const dx = this.dx();
    switch (this.act) {
      case 'idle':
        b.x += (clamp(this.p.cx - b.w / 2, TILE * 3, W - TILE * 3 - b.w) - b.x) * (this.phase === 2 ? 0.03 : 0.012);
        b.y += (TILE * (this.phase === 2 ? 9 : 7) + Math.sin(this.t * 0.03) * 12 - b.y) * 0.03;
        this.facing = Math.sign(dx) || 1;
        if (this.at > this.f(this.phase === 1 ? 46 : 30)) {
          this.setAct(this.phase === 1
            ? this.choose([['tendrils', 3], ['rain', 2], ['geysers', 2]])
            : this.choose([['mimic', 3], ['tendrils', 2], ['geysers', 2], ['rain', 1]]));
        }
        break;
      case 'tendrils':
        if (this.at === this.f(30)) this.scene.sfx('ink');
        if (this.at > this.f(70)) this.setAct('idle');
        break;
      case 'rain':
        if (this.at % 7 === 0 && this.at < 100) this.scene.spawn(new Faller(this.scene, 30 + this.scene.rng.next() * (W - 60), 'ink', 32));
        if (this.at > 130) this.setAct('idle');
        break;
      case 'geysers':
        if (this.at % this.f(18) === 0 && this.at < this.f(18) * 5) this.scene.spawn(new Pillar(this.scene, clamp(this.p.cx + (this.scene.rng.next() - 0.5) * 30, 30, W - 30), 'ink', 34, 26, 200));
        if (this.at > this.f(18) * 6 + 30) this.setAct('idle');
        break;
      case 'mimic': {
        // Copies the Sonneur's last swings at giant scale.
        const f = this.p.history[this.p.history.length - 60];
        if (f) {
          b.x += (f.x - b.w / 2 + 6 - b.x) * 0.08;
          b.y += (f.y - b.h + 26 - b.y) * 0.08;
        }
        if (this.at > 150) this.setAct('idle');
        break;
      }
    }
  }
  hits(): Hit[] {
    const b = this.body;
    if (this.act === 'tendrils' && this.at >= this.f(30) && this.at < this.f(50)) {
      const floor = findFloor(this.scene, this.cx);
      return [{ box: { x: b.x - 140, y: floor - 22, w: b.w + 280, h: 22 }, damage: 1, parry: 'none' }, { box: { x: b.x + b.w / 2 - 10, y: b.y + b.h, w: 20, h: floor - b.y - b.h }, damage: 1, parry: 'none' }];
    }
    if (this.act === 'mimic') {
      const f = this.p.history[this.p.history.length - 60];
      if (f?.attack && f.attackT > 2 && f.attackT < 9) return [{ box: { x: b.x - 30, y: b.y, w: b.w + 60, h: b.h }, damage: 1, parry: 'stun' }];
    }
    return [];
  }
  onPhase(n: number): void {
    super.onPhase(n);
    this.setAct('idle');
    if (n === 3) {
      // The cracked bell is exposed: three bells around the arena must ring together to finish it.
      this.scene.setFlag('silence3', true);
      this.scene.ui.toast(this.scene.uiText('toast.ringBells'));
    }
  }
  keepAlive(): boolean {
    // Only the great bell can end it.
    return !this.scene.flags.final_ring;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = this.flash ? '#fff' : '#000';
    if (this.phase === 2 || this.act === 'mimic') {
      // A giant hooded shape: the Sonneur, inverted.
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.quadraticCurveTo(x + 4, y + h * 0.3, cx, y);
      ctx.quadraticCurveTo(x + w - 4, y + h * 0.3, x + w, y + h);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx + this.facing * 4 - 2, y + 14, 3, 5);
      ctx.fillRect(cx + this.facing * 4 + 5, y + 14, 3, 5);
    } else {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + this.t * 0.01;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 18 + Math.sin(this.t * 0.05 + i) * 4, 14, a, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cracked bell at the heart.
      ctx.fillStyle = '#e8e4dc';
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 12); ctx.quadraticCurveTo(cx - 8, cy + 4, cx - 12, cy + 10); ctx.lineTo(cx + 12, cy + 10); ctx.quadraticCurveTo(cx + 8, cy + 4, cx + 4, cy - 12);
      ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 2, cy + 9); ctx.stroke();
    }
    if (this.act === 'tendrils') {
      const floor = findFloor(this.scene, this.cx);
      const warn = this.at < this.f(30);
      ctx.fillStyle = warn ? `rgba(255,255,255,${this.at % 8 < 4 ? 0.25 : 0.08})` : '#000';
      ctx.fillRect(x - 140, floor - (warn ? 3 : 22), w + 280, warn ? 3 : 22);
      if (!warn) ctx.fillRect(cx - 10, y + h, 20, floor - y - h);
    }
    this.stunGlow(ctx);
  }
}

export const BOSS_KEYS = ['dechu', 'gargouille', 'mere', 'souffleur', 'jumeaux', 'cantatrice', 'noye', 'echappement', 'silence'] as const;

export function makeBoss(scene: Scene, key: string, x: number, y: number, hard = false): Boss[] {
  switch (key) {
    case 'dechu': return [new Dechu(scene, x, y, hard)];
    case 'gargouille': return [new Gargouille(scene, x, y, hard)];
    case 'mere': return [new MereCoulee(scene, x, y, hard)];
    case 'souffleur': return [new Souffleur(scene, x, y, hard)];
    case 'jumeaux': {
      const a = new Jumeau(scene, x - 60, y, true, hard);
      const b = new Jumeau(scene, scene.room.w * TILE - (x - 60), y, false, hard);
      b.flagKey = a.flagKey;
      a.twin = b;
      b.twin = a;
      return [a, b];
    }
    case 'cantatrice': return [new Cantatrice(scene, x, y, hard)];
    case 'noye': return [new Noye(scene, x, y, hard)];
    case 'echappement': return [new Echappement(scene, x, y, hard)];
    case 'silence': return [new Silence(scene, x, y, hard)];
  }
  return [];
}

void overlap;
