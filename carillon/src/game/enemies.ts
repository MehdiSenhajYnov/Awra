import { fits, move, standing } from '../engine/body';
import { TILE, clamp, overlap } from '../engine/core';
import { T, isSolid, tileAt } from '../world/room';
import { PALETTES } from '../world/zones';
import { type DamageSource, Entity, type Hit, type ParryKind } from './entity';
import { type Frame, attackBoxFor } from './player';
import type { Scene } from './scene';

/** Per-zone toughness: later zones hit harder and take more blows. */
export const TIER: Record<string, number> = { beffroi: 1, gouttieres: 1.2, fonderie: 1.5, orgues: 1.8, crypte: 2.1, jardin: 2.4, cisternes: 2.7, horlogerie: 3, bourdon: 3.4 };

abstract class Foe extends Entity {
  /** Colour of the glowing eyes. */
  eye = '#ffd98a';
  body2 = '#0a0a0f';
  aware = false;
  constructor(scene: Scene, x: number, y: number, w: number, h: number, hp: number, bronze: number) {
    super(scene, x, y, w, h);
    const tier = TIER[scene.room.def.zone] ?? 1;
    this.maxHp = this.hp = Math.round(hp * tier * 2) / 2;
    this.bronze = Math.round(bronze * (0.8 + tier * 0.4));
    this.eye = PALETTES[scene.room.def.zone].accent;
  }
  get player() {
    return this.scene.player;
  }
  dxToPlayer(): number {
    return this.player.cx - this.cx;
  }
  dyToPlayer(): number {
    return this.player.cy - this.cy;
  }
  /** Sees the player within a range (stealth note halves it until hit). */
  sees(range: number): boolean {
    const r = this.scene.save.notesOn.includes('silence') && this.hp === this.maxHp ? range * 0.45 : range;
    const seen = Math.hypot(this.dxToPlayer(), this.dyToPlayer()) < r && !this.player.dead;
    if (seen) this.aware = true;
    return seen;
  }
  fall(): void {
    this.body.vy = Math.min(9, this.body.vy + 0.5);
  }
  /** True if walking forward would leave the floor or hit a wall. */
  blocked(dir: number): boolean {
    const room = this.scene.room;
    const b = this.body;
    const ahead = dir > 0 ? b.x + b.w + 2 : b.x - 2;
    const tx = Math.floor(ahead / TILE);
    const feet = Math.floor((b.y + b.h + 2) / TILE);
    const wall = isSolid(tileAt(room, tx, Math.floor((b.y + b.h - 4) / TILE)));
    const floor = tileAt(room, tx, feet);
    const hazard = floor === T.Spikes || floor === T.Ink || floor === T.Water;
    return wall || (!isSolid(floor) && floor !== T.Platform) || hazard;
  }
  flashColor(base: string): string {
    return this.flash > 0 ? '#f4f0ff' : this.stun > 0 && Math.floor(this.t / 4) % 2 ? '#3a3448' : base;
  }
  eyes(ctx: CanvasRenderingContext2D, x: number, y: number, gap = 4, size = 1.6): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.stun > 0 ? '#8a8a9a' : this.eye;
    ctx.fillRect(x - gap / 2 - size / 2, y, size, size * 1.3);
    ctx.fillRect(x + gap / 2 - size / 2, y, size, size * 1.3);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- walkers

/** Ver de bronze & co: patrols, turns at walls and ledges. Variants: 'ver', 'scorie' (splits), 'eclat' (bursts into shards). */
export class Walker extends Foe {
  constructor(scene: Scene, x: number, y: number, public variant: 'ver' | 'scorie' | 'eclat' | 'petit') {
    super(scene, x, y, variant === 'petit' ? 12 : 20, variant === 'petit' ? 9 : 14, variant === 'scorie' ? 3 : variant === 'petit' ? 1 : 2, variant === 'petit' ? 1 : 3);
    this.facing = scene.rng.chance(0.5) ? 1 : -1;
  }
  update(): void {
    if (this.stun > 0) { this.body.vx *= 0.8; this.fall(); move(this.scene.room, this.body); return; }
    const speed = this.variant === 'petit' ? 1.3 : this.variant === 'eclat' ? 1.1 : 0.7;
    if (this.body.onGround && this.blocked(this.facing)) this.facing *= -1;
    this.body.vx = this.facing * speed;
    this.fall();
    move(this.scene.room, this.body);
  }
  onDeath(): void {
    super.onDeath();
    if (this.variant === 'scorie') for (const d of [-1, 1]) {
      const s = new Walker(this.scene, this.cx + d * 6, this.body.y + this.body.h, 'petit');
      s.facing = d;
      s.body.vy = -3;
      this.scene.spawn(s);
    }
    if (this.variant === 'eclat') for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      this.scene.spawn(new Bolt(this.scene, this.cx, this.cy, Math.cos(a) * 3.2, Math.sin(a) * 3.2, 'shard', 0.18));
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const pal = PALETTES[this.scene.room.def.zone];
    const c = this.flashColor(this.variant === 'scorie' ? '#2a120a' : this.variant === 'eclat' ? '#123a3a' : this.body2);
    const crawl = Math.sin(this.t * 0.25) * 1.2;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.6, w / 2 + crawl * 0.3, h * 0.55, 0, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.fill();
    // Segments with a bronze shell edge.
    ctx.strokeStyle = this.variant === 'scorie' ? '#ff7a2a' : this.variant === 'eclat' ? pal.accent : '#8a6a40';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x + (w * i) / 4, y + h * 0.65, h * 0.4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.fillStyle = c;
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * (w - 6) / 2, y + h - 2 + (i % 2 ? crawl : -crawl) * 0.5, 1.6, 2);
    this.eyes(ctx, this.facing > 0 ? x + w - 4 : x + 4, y + h * 0.35, 3, 1.4);
  }
}

// ---------------------------------------------------------------- flyers

/** Bats, bellows and wisps: hover, then swoop at the player. */
export class Flyer extends Foe {
  phase: 'hover' | 'wind' | 'swoop' | 'recover' = 'hover';
  timer = 0;
  home: { x: number; y: number };
  target = { x: 0, y: 0 };
  constructor(scene: Scene, x: number, y: number, public variant: 'chauve' | 'feu' | 'soufflet') {
    super(scene, x, y - 30, 16, 12, variant === 'soufflet' ? 3 : 2, 3);
    this.body.noPlatforms = true;
    this.home = { x: this.body.x, y: this.body.y };
    this.timer = scene.rng.int(30, 90);
  }
  get visible(): boolean {
    // Wisps fade out while hovering.
    return this.variant !== 'feu' || this.phase !== 'hover' || this.flash > 0 || Math.sin(this.t * 0.04) > -0.2;
  }
  update(): void {
    const b = this.body;
    if (this.stun > 0) { b.vy = Math.min(4, b.vy + 0.3); b.vx *= 0.9; move(this.scene.room, b); return; }
    this.timer--;
    const sees = this.sees(this.variant === 'soufflet' ? 220 : 180);
    switch (this.phase) {
      case 'hover': {
        const tx = sees ? this.player.cx - b.w / 2 - Math.sign(this.dxToPlayer()) * 70 : this.home.x + Math.sin(this.t * 0.02) * 30;
        const ty = sees ? this.player.cy - 60 : this.home.y + Math.sin(this.t * 0.05) * 8;
        b.vx += clamp((tx - b.x) * 0.004, -0.15, 0.15);
        b.vy += clamp((ty - b.y) * 0.004, -0.15, 0.15);
        b.vx *= 0.95;
        b.vy *= 0.95;
        if (sees && this.timer <= 0) {
          this.phase = this.variant === 'soufflet' ? 'wind' : 'swoop';
          this.timer = this.variant === 'soufflet' ? 70 : 22;
          this.target = { x: this.player.cx, y: this.player.cy };
          b.vx = 0;
          b.vy = -1.2;
        }
        break;
      }
      case 'swoop': {
        if (this.timer > 10) { b.vx *= 0.8; b.vy *= 0.8; break; }
        const dx = this.target.x - this.cx;
        const dy = this.target.y - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        b.vx = (dx / d) * 4.4;
        b.vy = (dy / d) * 4.4;
        if (d < 10 || this.timer < -40) { this.phase = 'recover'; this.timer = 50; }
        break;
      }
      case 'wind': {
        // Bellows blow the player away, toward hazards.
        b.vx *= 0.9; b.vy *= 0.9;
        this.facing = Math.sign(this.dxToPlayer()) || 1;
        if (this.timer < 50 && Math.abs(this.dyToPlayer()) < 50 && Math.abs(this.dxToPlayer()) < 200 && Math.sign(this.dxToPlayer()) === this.facing) {
          this.player.body.vx += this.facing * 0.45;
          if (this.t % 6 === 0) this.scene.particles.burst(this.cx + this.facing * 10, this.cy, 2, '#c9f0b4', { speed: 4, dir: this.facing > 0 ? 0 : Math.PI, spread: 0.3, kind: 'spark', gravity: 0 });
        }
        if (this.timer <= 0) { this.phase = 'recover'; this.timer = 60; }
        break;
      }
      case 'recover': {
        b.vx *= 0.92;
        b.vy = b.vy * 0.9 - 0.12;
        if (this.timer <= 0) { this.phase = 'hover'; this.timer = this.scene.rng.int(50, 110); }
        break;
      }
    }
    if (Math.abs(b.vx) > 0.2) this.facing = Math.sign(b.vx);
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    return [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) {
      ctx.save();
      ctx.globalAlpha = 0.12;
    }
    const { x, y, w, h } = this.body;
    const cx = x + w / 2;
    const cy = y + h / 2;
    if (this.variant === 'feu') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
      g.addColorStop(0, this.flash ? '#ffffff' : '#e8d0ff');
      g.addColorStop(1, 'rgba(168,120,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 14, cy - 14, 28, 28);
      ctx.restore();
      this.eyes(ctx, cx, cy - 2, 4, 1.4);
    } else {
      const flap = Math.sin(this.t * (this.phase === 'swoop' ? 0.9 : 0.4));
      ctx.fillStyle = this.flashColor(this.variant === 'soufflet' ? '#1a2a1c' : this.body2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.32, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      if (this.variant === 'soufflet') {
        // Pleated bellows.
        ctx.strokeStyle = '#4a6a4a';
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 2.5, cy - 5); ctx.lineTo(cx + i * 2.5, cy + 5); ctx.stroke(); }
        ctx.fillStyle = this.flashColor('#1a2a1c');
        ctx.beginPath(); ctx.moveTo(cx + this.facing * 5, cy - 2); ctx.lineTo(cx + this.facing * 12, cy); ctx.lineTo(cx + this.facing * 5, cy + 2); ctx.fill();
      }
      ctx.fillStyle = this.flashColor(this.body2);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 3, cy - 2);
        ctx.quadraticCurveTo(cx + s * 12, cy - 10 * flap, cx + s * 16, cy - 2 + flap * 4);
        ctx.lineTo(cx + s * 9, cy + 2);
        ctx.fill();
      }
      this.eyes(ctx, cx + this.facing * 1.5, cy - 2, 3.5, 1.3);
    }
    if (!this.visible) ctx.restore();
  }
}

// ---------------------------------------------------------------- guards

/** Bedeau: a shield in front, a telegraphed overhead blow that can be parried to stun it. */
export class Guard extends Foe {
  phase: 'walk' | 'wind' | 'strike' | 'rest' = 'walk';
  timer = 0;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 18, 28, 5, 6);
    this.heavy = false;
    this.facing = -1;
  }
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    // The shield turns frontal blows unless stunned or mid-swing.
    const front = Math.sign(fromX - this.cx) === this.facing;
    if (front && this.stun === 0 && this.phase === 'walk' && (source === 'player' || source === 'echo')) {
      this.scene.sfx('clang');
      this.scene.particles.burst(this.cx + this.facing * 10, this.cy, 6, '#ffe9b0', { speed: 3, kind: 'spark' });
      if (source === 'player') this.scene.player.body.vx = -this.facing * -3.5;
      return false;
    }
    return super.damage(amount, fromX, source);
  }
  update(): void {
    const b = this.body;
    this.fall();
    if (this.stun > 0) { b.vx *= 0.85; move(this.scene.room, b); this.phase = 'rest'; this.timer = 10; return; }
    this.timer--;
    const dx = this.dxToPlayer();
    switch (this.phase) {
      case 'walk':
        if (this.sees(200)) {
          this.facing = Math.sign(dx) || this.facing;
          b.vx = this.blocked(this.facing) ? 0 : this.facing * 0.9;
          if (Math.abs(dx) < 46 && Math.abs(this.dyToPlayer()) < 40) { this.phase = 'wind'; this.timer = 34; b.vx = 0; }
        } else {
          if (b.onGround && this.blocked(this.facing)) this.facing *= -1;
          b.vx = this.facing * 0.5;
        }
        break;
      case 'wind':
        b.vx = 0;
        if (this.timer <= 0) { this.phase = 'strike'; this.timer = 12; this.scene.sfx('swing', 0.7); b.vx = this.facing * 2.5; }
        break;
      case 'strike':
        b.vx *= 0.8;
        if (this.timer <= 0) { this.phase = 'rest'; this.timer = 40; }
        break;
      case 'rest':
        b.vx = 0;
        if (this.timer <= 0) this.phase = 'walk';
        break;
    }
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    if (this.phase !== 'strike' || this.timer < 4) return [];
    const b = this.body;
    return [{ box: { x: this.facing > 0 ? b.x + b.w - 4 : b.x - 30, y: b.y - 6, w: 34, h: b.h + 6 }, damage: 1, parry: 'stun' }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const c = this.flashColor('#0c0b10');
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing, 1);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-9, 0); ctx.lineTo(-7, -20); ctx.quadraticCurveTo(0, -30, 7, -20); ctx.lineTo(9, 0); ctx.fill();
    // Bell-shaped helm.
    ctx.fillStyle = this.flashColor('#3a3226');
    ctx.beginPath(); ctx.moveTo(-6, -20); ctx.quadraticCurveTo(-6, -31, 0, -31); ctx.quadraticCurveTo(6, -31, 6, -20); ctx.fill();
    this.eyes(ctx, 2, -24, 3.2, 1.4);
    // Shield.
    ctx.fillStyle = this.flashColor('#5a4a34');
    ctx.beginPath(); ctx.ellipse(10, -12, 4, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a56a'; ctx.lineWidth = 1; ctx.stroke();
    // Mace raised during wind-up.
    const ang = this.phase === 'wind' ? -2.4 - (34 - this.timer) * 0.01 : this.phase === 'strike' ? 0.6 : -1.2;
    ctx.save();
    ctx.translate(-2, -18);
    ctx.rotate(ang);
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(0, -1, 18, 2);
    ctx.fillStyle = this.phase === 'wind' && this.timer < 12 ? '#ffe9b0' : '#6a5a44';
    ctx.beginPath(); ctx.arc(19, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- projectiles

/** Projectiles: water arcs, molten blobs, notes, shards, rings. Parried ones fly back at enemies. */
export class Bolt extends Entity {
  reflected = false;
  constructor(scene: Scene, x: number, y: number, vx: number, vy: number, public look: 'water' | 'molten' | 'note' | 'shard' | 'ring' | 'ink', public gravity = 0, public life = 240) {
    super(scene, x, y + 4, look === 'ring' ? 10 : 7, look === 'ring' ? 10 : 7);
    this.body.vx = vx;
    this.body.vy = vy;
    this.hurtable = true;
    this.contact = 0;
    this.prop = true;
    this.body.noPlatforms = true;
  }
  update(): void {
    this.life--;
    this.body.vy += this.gravity;
    this.body.x += this.body.vx;
    this.body.y += this.body.vy;
    const tx = Math.floor(this.cx / TILE);
    const ty = Math.floor(this.cy / TILE);
    if (isSolid(tileAt(this.scene.room, tx, ty)) || this.life <= 0) {
      this.dead = true;
      this.scene.particles.burst(this.cx, this.cy, 6, this.color(), { speed: 2 });
      if (this.look === 'molten') this.scene.sfx('splash');
    }
    if (this.reflected) {
      for (const e of this.scene.entities) {
        if (e === this || e.dead || e.prop || !e.hurtable || !overlap(e.box(), this.box())) continue;
        this.scene.strike(e, 2 * this.scene.player.stats.damage, this.cx, 'reflect');
        this.dead = true;
        break;
      }
    }
  }
  color(): string {
    return { water: '#8ac8e8', molten: '#ff8a3a', note: '#c9f0b4', shard: '#a8fff4', ring: '#ffe0a8', ink: '#0a0a0a' }[this.look];
  }
  hits(): Hit[] {
    if (this.reflected) return [];
    return [{ box: this.box(), damage: 1, parry: this.look === 'ink' ? 'none' : 'reflect' }];
  }
  parried(kind: ParryKind): void {
    if (kind !== 'reflect') return;
    this.reflected = true;
    this.body.vx = -this.body.vx * 1.4;
    this.body.vy = -Math.abs(this.body.vy) * 0.5 - 1;
    this.gravity = 0;
    this.life = 120;
  }
  damage(_a: number, fromX: number, source: DamageSource): boolean {
    // Striking a projectile with the hammer bats it away, like a parry.
    if (source !== 'player' || this.reflected) return false;
    this.body.vx = Math.sign(this.cx - fromX) * Math.max(3, Math.abs(this.body.vx));
    this.reflected = true;
    this.gravity = 0;
    this.scene.sfx('clang');
    return false;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.look !== 'ink') ctx.globalCompositeOperation = 'lighter';
    const c = this.reflected ? '#ffffff' : this.color();
    if (this.look === 'ring') {
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, 5 + Math.sin(this.t * 0.4), 0, Math.PI * 2); ctx.stroke();
    } else if (this.look === 'shard') {
      ctx.fillStyle = c;
      ctx.translate(this.cx, this.cy);
      ctx.rotate(Math.atan2(this.body.vy, this.body.vx));
      ctx.fillRect(-5, -1.5, 10, 3);
    } else if (this.look === 'note') {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.ellipse(this.cx, this.cy + 2, 3.5, 2.6, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(this.cx + 2.5, this.cy - 6, 1.2, 8);
    } else {
      const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, 7);
      g.addColorStop(0, this.look === 'ink' ? '#000' : '#fff');
      g.addColorStop(0.4, c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(this.cx - 7, this.cy - 7, 14, 14);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- turrets & throwers

/** Stationary shooters: gargoyle spouts (arcs), organ pipes (bursts), choristers (rings), founders (lobs). */
export class Turret extends Foe {
  timer: number;
  constructor(scene: Scene, x: number, y: number, public variant: 'gargouille' | 'tuyau' | 'choriste' | 'fondeur') {
    super(scene, x, y, variant === 'tuyau' ? 16 : 18, variant === 'choriste' ? 28 : 22, variant === 'fondeur' ? 5 : 3, 4);
    this.timer = scene.rng.int(40, 100);
    this.heavy = variant === 'tuyau';
  }
  update(): void {
    if (this.variant === 'fondeur') { this.fall(); move(this.scene.room, this.body); }
    if (this.stun > 0) return;
    this.facing = Math.sign(this.dxToPlayer()) || this.facing;
    if (!this.sees(300)) return;
    this.timer--;
    if (this.timer > 0) return;
    const dx = this.dxToPlayer();
    const dy = this.dyToPlayer();
    const s = this.scene;
    switch (this.variant) {
      case 'gargouille': {
        // Lob an arc that lands near the player.
        const t = 50;
        s.spawn(new Bolt(s, this.cx, this.body.y + 6, dx / t, dy / t - 0.25 * t / 2, 'water', 0.25));
        this.timer = 110;
        break;
      }
      case 'fondeur': {
        const t = 44;
        for (const off of [-30, 0, 30]) s.spawn(new Bolt(s, this.cx, this.body.y, (dx + off) / t, (dy - 20) / t - 0.3 * t / 2, 'molten', 0.3));
        this.timer = 150;
        break;
      }
      case 'tuyau': {
        const d = Math.hypot(dx, dy) || 1;
        for (let i = 0; i < 3; i++) s.spawn(new Bolt(s, this.cx, this.body.y + 4 - i * 0, (dx / d) * (3.2 + i * 0.4), (dy / d) * (3.2 + i * 0.4), 'note'));
        this.timer = 120;
        break;
      }
      case 'choriste': {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.t * 0.01;
          s.spawn(new Bolt(s, this.cx, this.cy - 4, Math.cos(a) * 1.8, Math.sin(a) * 1.8, 'ring', 0, 150));
        }
        this.timer = 160;
        break;
      }
    }
    s.sfx('shoot', this.variant === 'tuyau' ? 1.4 : this.variant === 'choriste' ? 1.8 : 0.8);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const charging = this.timer < 20 && this.aware;
    ctx.fillStyle = this.flashColor(this.variant === 'fondeur' ? '#1c100a' : this.body2);
    switch (this.variant) {
      case 'gargouille':
        ctx.beginPath();
        ctx.moveTo(x, y + h); ctx.lineTo(x + 2, y + 6); ctx.quadraticCurveTo(x + w / 2, y - 4, x + w - 2, y + 6); ctx.lineTo(x + w, y + h); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w / 2 + this.facing * 4, y + 8); ctx.lineTo(x + w / 2 + this.facing * 14, y + 10); ctx.lineTo(x + w / 2 + this.facing * 4, y + 14); ctx.fill();
        // Little horns.
        ctx.beginPath(); ctx.moveTo(x + 3, y + 5); ctx.lineTo(x + 1, y - 3); ctx.lineTo(x + 7, y + 3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + w - 3, y + 5); ctx.lineTo(x + w - 1, y - 3); ctx.lineTo(x + w - 7, y + 3); ctx.fill();
        this.eyes(ctx, x + w / 2 + this.facing * 2, y + 6, 4, 1.5);
        break;
      case 'tuyau':
        ctx.fillRect(x + 2, y, w - 4, h);
        ctx.fillStyle = this.flashColor('#3a4a3a');
        ctx.fillRect(x, y, w, 5);
        ctx.fillStyle = charging ? '#c9f0b4' : '#0a0e0a';
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + 12, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case 'choriste':
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + w / 2, y - 6, x + w, y + h); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w / 2, y + 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = charging ? '#ffe0a8' : '#1a2a2a';
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + 8, 2, charging ? 3 : 1.2, 0, 0, Math.PI * 2); ctx.fill();
        this.eyes(ctx, x + w / 2, y + 3, 4, 1.2);
        break;
      case 'fondeur':
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.6, w / 2, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = charging ? '#ffb35a' : '#5a2a12';
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + 2, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        this.eyes(ctx, x + w / 2 + this.facing * 3, y + 9, 4, 1.4);
        break;
    }
  }
}

// ---------------------------------------------------------------- hoppers

/** Sonnaille: a small bell on legs that bounds toward the player. */
export class Hopper extends Foe {
  timer = 40;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 16, 16, 3, 4);
  }
  update(): void {
    const b = this.body;
    this.fall();
    if (this.stun > 0) { b.vx *= 0.8; move(this.scene.room, b); return; }
    if (b.onGround) {
      b.vx *= 0.7;
      this.timer--;
      if (this.timer <= 0 && this.sees(220)) {
        this.facing = Math.sign(this.dxToPlayer()) || 1;
        b.vx = this.facing * clamp(Math.abs(this.dxToPlayer()) / 34, 1.5, 3.4);
        b.vy = -7.5;
        this.timer = 50;
        this.scene.sfx('chime', 0.8);
      }
    }
    move(this.scene.room, b);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const squash = this.body.onGround ? Math.max(0, 10 - this.timer) * 0.03 : 0;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(1 + squash, 1 - squash);
    ctx.fillStyle = this.flashColor('#2a2018');
    ctx.beginPath(); ctx.moveTo(-3, -h); ctx.quadraticCurveTo(-6, -4, -9, -3); ctx.lineTo(9, -3); ctx.quadraticCurveTo(6, -4, 3, -h); ctx.fill();
    ctx.fillStyle = '#b8874a';
    ctx.fillRect(-9, -4, 18, 1.4);
    ctx.fillStyle = this.flashColor(this.body2);
    ctx.fillRect(-5, -3, 1.6, 3);
    ctx.fillRect(3.4, -3, 1.6, 3);
    ctx.restore();
    this.eyes(ctx, x + w / 2 + this.facing * 2, y + 6, 3.4, 1.3);
  }
}

// ---------------------------------------------------------------- swordsmen

/** Squelette sonneur: two- or three-strike combos, each parryable; backsteps after. */
export class Swordsman extends Foe {
  phase: 'stalk' | 'wind' | 'cut' | 'back' = 'stalk';
  timer = 0;
  strikes = 0;
  constructor(scene: Scene, x: number, y: number, public variant: 'squelette' | 'automate') {
    super(scene, x, y, 14, 28, variant === 'automate' ? 6 : 5, 8);
  }
  update(): void {
    const b = this.body;
    this.fall();
    if (this.stun > 0) { b.vx *= 0.85; this.phase = 'back'; this.timer = 20; move(this.scene.room, b); return; }
    this.timer--;
    const dx = this.dxToPlayer();
    switch (this.phase) {
      case 'stalk':
        if (!this.sees(240)) {
          if (b.onGround && this.blocked(this.facing)) this.facing *= -1;
          b.vx = this.facing * 0.5;
          break;
        }
        this.facing = Math.sign(dx) || 1;
        b.vx = this.blocked(this.facing) ? 0 : this.facing * (this.variant === 'automate' ? 1.6 : 1.2);
        if (this.variant === 'automate' && Math.abs(dx) < 170 && Math.abs(this.dyToPlayer()) < 30 && this.timer <= 0) {
          this.phase = 'wind'; this.timer = 30; this.strikes = 1; b.vx = 0;
        } else if (Math.abs(dx) < 40 && Math.abs(this.dyToPlayer()) < 36) {
          this.phase = 'wind'; this.timer = 18; this.strikes = this.scene.rng.chance(0.5) ? 3 : 2; b.vx = 0;
        }
        break;
      case 'wind':
        b.vx = 0;
        if (this.timer <= 0) {
          this.phase = 'cut';
          this.timer = this.variant === 'automate' ? 26 : 10;
          b.vx = this.facing * (this.variant === 'automate' ? 7 : 2.4);
          this.scene.sfx('swing', 0.8);
        }
        break;
      case 'cut':
        b.vx *= this.variant === 'automate' ? 0.96 : 0.82;
        if (this.timer <= 0) {
          this.strikes--;
          if (this.strikes > 0) { this.phase = 'wind'; this.timer = 9; this.facing = Math.sign(this.dxToPlayer()) || this.facing; }
          else { this.phase = 'back'; this.timer = 34; b.vx = -this.facing * 2.6; b.vy = -3.5; }
        }
        break;
      case 'back':
        b.vx *= 0.9;
        if (this.timer <= 0) { this.phase = 'stalk'; this.timer = 40; }
        break;
    }
    move(this.scene.room, b);
  }
  hits(): Hit[] {
    if (this.phase !== 'cut') return [];
    const b = this.body;
    if (this.variant === 'automate') return [{ box: { x: b.x - 4, y: b.y + 2, w: b.w + 8, h: b.h - 2 }, damage: 1, parry: 'stun' }];
    if (this.timer < 3) return [];
    return [{ box: { x: this.facing > 0 ? b.x + b.w - 2 : b.x - 28, y: b.y + 2, w: 30, h: 20 }, damage: 1, parry: 'stun' }];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing, 1);
    const c = this.flashColor(this.variant === 'automate' ? '#2a2414' : '#14121a');
    ctx.fillStyle = c;
    ctx.fillRect(-5, -22, 10, 14);
    ctx.fillRect(-4, -8, 2.5, 8);
    ctx.fillRect(1.5, -8, 2.5, 8);
    ctx.beginPath(); ctx.arc(0, -25, 5, 0, Math.PI * 2); ctx.fill();
    if (this.variant === 'automate') {
      ctx.fillStyle = '#c9a050';
      ctx.fillRect(-5, -18, 10, 1.4);
      ctx.beginPath(); ctx.arc(-2, -14, 2.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = '#3a3448';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-4, -20 + i * 4); ctx.lineTo(4, -20 + i * 4); ctx.stroke(); }
    }
    this.eyes(ctx, 1.5, -27, 3, 1.3);
    // Blade.
    const a = this.phase === 'wind' ? -2.2 : this.phase === 'cut' ? 0.3 : -0.8;
    ctx.save();
    ctx.translate(3, -16);
    ctx.rotate(a);
    ctx.fillStyle = this.phase === 'wind' ? '#ffe9b0' : '#8a8a9a';
    ctx.fillRect(0, -1, this.variant === 'automate' ? 14 : 20, 2);
    ctx.restore();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- drainers

/** Muet: a mute shape drifting toward the player; touching it drains résonance. Echoes pass through it. */
export class Drainer extends Foe {
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y - 10, 18, 22, 5, 7);
    this.body.noPlatforms = true;
  }
  update(): void {
    const b = this.body;
    if (this.stun > 0) { b.vx *= 0.9; b.vy *= 0.9; move(this.scene.room, b); return; }
    if (this.sees(260)) {
      const dx = this.dxToPlayer();
      const dy = this.dyToPlayer();
      const d = Math.hypot(dx, dy) || 1;
      b.vx += (dx / d) * 0.05;
      b.vy += (dy / d) * 0.05;
    }
    b.vx = clamp(b.vx * 0.98, -1.1, 1.1);
    b.vy = clamp(b.vy * 0.98 + Math.sin(this.t * 0.05) * 0.02, -1.1, 1.1);
    move(this.scene.room, b);
    const p = this.player;
    if (overlap(this.box(), p.box()) && p.invuln === 0) {
      p.res = Math.max(0, p.res - 1);
      p.resPartial = 0;
    }
  }
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    if (source === 'echo') return false;
    return super.damage(amount, fromX, source);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.fillStyle = this.flashColor('#050507');
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let i = 0; i <= 4; i++) ctx.lineTo(x + (w * i) / 4, y + h - (i % 2 ? 4 : 0) + Math.sin(this.t * 0.1 + i) * 1.5);
    ctx.lineTo(x + w, y + 6);
    ctx.quadraticCurveTo(x + w / 2, y - 4, x, y + 6);
    ctx.fill();
    // A blank white mask, no mouth.
    ctx.fillStyle = this.flash ? '#fff' : '#d8d4cc';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 8, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#050507';
    ctx.fillRect(x + w / 2 - 3, y + 7, 1.6, 2);
    ctx.fillRect(x + w / 2 + 1.4, y + 7, 1.6, 2);
  }
}

// ---------------------------------------------------------------- leapers

/** Anguille: hides under black water, leaps out in an arc at the player. */
export class Leaper extends Foe {
  timer = 60;
  homeY: number;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y + 20, 14, 14, 3, 5);
    this.homeY = this.body.y;
    this.body.noPlatforms = true;
  }
  get submerged(): boolean {
    return this.body.y >= this.homeY - 1 && this.body.vy >= 0;
  }
  update(): void {
    const b = this.body;
    if (this.submerged) {
      b.y = this.homeY;
      b.vy = 0;
      b.vx = 0;
      this.timer--;
      if (this.timer <= 0 && this.sees(200)) {
        const dx = clamp(this.dxToPlayer(), -120, 120);
        b.vy = -9.5;
        b.vx = dx / 36;
        this.timer = 80;
        this.scene.sfx('splash');
        this.scene.particles.burst(this.cx, this.homeY, 10, '#9fe0c0', { speed: 3, dir: -Math.PI / 2, spread: 1.4 });
      }
      return;
    }
    b.vy += 0.5;
    b.x += b.vx;
    b.y += b.vy;
    if (b.y > this.homeY) b.y = this.homeY;
  }
  get hurtableNow(): boolean {
    return !this.submerged;
  }
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    if (this.submerged) return false;
    return super.damage(amount, fromX, source);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.submerged) {
      ctx.fillStyle = 'rgba(160,230,200,0.5)';
      ctx.fillRect(this.cx - 2, this.homeY - 1 + Math.sin(this.t * 0.2), 4, 1.5);
      return;
    }
    const a = Math.atan2(this.body.vy, this.body.vx || 0.01);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(a);
    ctx.fillStyle = this.flashColor('#0a1414');
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-17, -4); ctx.lineTo(-17, 4); ctx.fill();
    ctx.restore();
    this.eyes(ctx, this.cx + Math.cos(a) * 7, this.cy + Math.sin(a) * 7 - 1, 2.5, 1.2);
  }
}

// ---------------------------------------------------------------- gears

/** Engrenage: a rolling cog that follows floors and walls; only its hub can be struck from above. */
export class Gear extends Foe {
  angle = 0;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 22, 22, 4, 6);
    this.facing = scene.rng.chance(0.5) ? 1 : -1;
    this.heavy = true;
  }
  update(): void {
    const b = this.body;
    this.fall();
    if (this.stun > 0) { b.vx = 0; move(this.scene.room, b); return; }
    if (b.onGround && this.blocked(this.facing)) this.facing *= -1;
    const speed = this.sees(240) && Math.sign(this.dxToPlayer()) === this.facing ? 2.6 : 1.4;
    b.vx = this.facing * speed;
    this.angle += b.vx / 11;
    move(this.scene.room, b);
  }
  damage(amount: number, fromX: number, source: DamageSource): boolean {
    // Teeth deflect side blows; downward strikes and waves get through.
    const p = this.scene.player;
    const fromAbove = p.body.y + p.body.h < this.body.y + 6 && p.attack?.dir === 'down';
    if (source === 'player' && !fromAbove) {
      this.scene.sfx('clang');
      return false;
    }
    return super.damage(amount, fromX, source);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.flashColor('#2a2210');
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
      const r = i % 2 ? 9 : 12;
      const a = (i / 20) * Math.PI * 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9a050';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this.eyes(ctx, this.cx, this.cy - 2, 5, 1.4);
  }
}

// ---------------------------------------------------------------- the shadow

/** L'Ombre: walks where the Sonneur stood a second and a half ago and repeats its swings. */
export class Mirror extends Foe {
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 12, 26, 6, 12);
  }
  frame(): Frame | null {
    const h = this.player.history;
    return h.length > 90 ? h[h.length - 90] : null;
  }
  update(): void {
    const f = this.frame();
    if (!f || !this.sees(400)) return;
    if (this.stun > 0) return;
    // Walk the path the Sonneur took a moment ago.
    const tx = f.x;
    const ty = f.y;
    if (fits(this.scene.room, tx, ty, this.body.w, this.body.h)) {
      this.body.x += (tx - this.body.x) * 0.5;
      this.body.y += (ty - this.body.y) * 0.5;
    } else {
      this.fall();
      move(this.scene.room, this.body);
    }
    this.facing = f.facing;
    this.body.onGround = standing(this.scene.room, this.body);
  }
  hits(): Hit[] {
    const f = this.frame();
    if (!f || !f.attack || this.stun > 0) return [];
    const box = attackBoxFor(f.attack, f.attackT, this.body.x, this.body.y, f.facing);
    return box ? [{ box, damage: 1, parry: 'stun' }] : [];
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const f = this.frame();
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = this.flashColor('#000000');
    ctx.beginPath();
    ctx.moveTo(x - 2, y + h);
    ctx.quadraticCurveTo(x, y + 8, x + w / 2, y);
    ctx.quadraticCurveTo(x + w, y + 8, x + w + 2, y + h);
    ctx.fill();
    ctx.restore();
    this.eyes(ctx, x + w / 2 + this.facing * 2, y + 6, 3, 1.3);
    const box = f?.attack ? attackBoxFor(f.attack, f.attackT, x, y, f.facing) : null;
    if (box) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(box.x, box.y + box.h / 2 - 2, box.w, 4);
    }
  }
}
