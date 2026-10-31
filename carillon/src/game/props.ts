import { move } from '../engine/body';
import { TILE, type Box, overlap } from '../engine/core';
import { input } from '../engine/input';
import { T } from '../world/room';
import { PALETTES } from '../world/zones';
import { type DamageSource, Entity } from './entity';
import type { Ability } from './player';
import type { Scene } from './scene';

/** Things the player can stand in front of and press Up to use. */
export abstract class Interactive extends Entity {
  prompt = '';
  near = false;
  constructor(scene: Scene, x: number, y: number, w: number, h: number) {
    super(scene, x, y, w, h);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
  }
  update(): void {
    const p = this.scene.player;
    const zone: Box = { x: this.body.x - 10, y: this.body.y - 10, w: this.body.w + 20, h: this.body.h + 20 };
    this.near = overlap(zone, p.box()) && p.body.onGround && !p.dead;
    if (this.near && input.pressed('up') && !this.scene.modal) this.use();
  }
  abstract use(): void;
  drawPrompt(ctx: CanvasRenderingContext2D): void {
    if (!this.near) return;
    ctx.save();
    ctx.font = '9px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,240,210,0.9)';
    ctx.fillText(`↑ ${this.prompt}`, this.cx, this.body.y - 8 + Math.sin(this.t * 0.08) * 1.5);
    ctx.restore();
  }
}

export class Lectern extends Interactive {
  light = 90;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 22, 30);
  }
  update(): void {
    this.prompt = this.scene.uiText('prompt.rest');
    super.update();
  }
  use(): void {
    this.scene.rest();
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const pal = PALETTES[this.scene.room.def.zone];
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x + w / 2 - 2, y + 10, 4, h - 10);
    ctx.fillRect(x + 3, y + h - 3, w - 6, 3);
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 12);
    ctx.lineTo(x + w + 2, y + 6);
    ctx.lineTo(x + w + 2, y + 10);
    ctx.lineTo(x - 2, y + 16);
    ctx.fill();
    // Candle and its halo.
    const flick = 0.8 + Math.sin(this.t * 0.3) * 0.1 + Math.sin(this.t * 0.17) * 0.1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x + w, y, 1, x + w, y, 40 * flick);
    g.addColorStop(0, 'rgba(255,210,140,0.45)');
    g.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + w - 40, y - 40, 80, 80);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(x + w - 1, y - 2, 2, 4);
    ctx.restore();
    this.drawPrompt(ctx);
  }
}

export class Coin extends Entity {
  value: number;
  constructor(scene: Scene, x: number, y: number, value: number) {
    super(scene, x, y, 6, 6);
    this.value = value;
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.body.vx = (scene.rng.next() - 0.5) * 5;
    this.body.vy = -3 - scene.rng.next() * 3;
  }
  update(): void {
    const p = this.scene.player;
    const dx = p.cx - this.cx;
    const dy = p.cy - this.cy;
    const d = Math.hypot(dx, dy);
    if (this.t > 20 && d < 50) {
      this.body.x += (dx / d) * 5;
      this.body.y += (dy / d) * 5;
    } else {
      this.body.vy = Math.min(8, this.body.vy + 0.4);
      const r = move(this.scene.room, this.body);
      if (r.hitY) this.body.vx *= 0.6;
      if (this.body.onGround) this.body.vx *= 0.85;
    }
    if (d < 12 && !p.dead) {
      this.dead = true;
      this.scene.save.bronze += this.value;
      this.scene.sfx('bronze', 0.9 + this.value * 0.02);
    }
    if (this.t > 60 * 40) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.value >= 10 ? 4 : this.value >= 5 ? 3.3 : 2.6;
    ctx.fillStyle = '#c98f45';
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, s * Math.abs(Math.cos(this.t * 0.12)) + 0.8, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe1a0';
    ctx.fillRect(this.cx - 0.5, this.cy - s * 0.6, 1, 1.2);
  }
}

/** The cracked bell left where the Sonneur fell, holding the lost bronze. */
export class Glas extends Entity {
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 18, 22);
    this.contact = 0;
    this.prop = true;
    this.hp = 1;
  }
  update(): void {
    this.body.y += Math.sin(this.t * 0.05) * 0.15;
  }
  damage(_amount: number, _fromX: number, source: DamageSource): boolean {
    if (source !== 'player' && source !== 'echo') return false;
    const g = this.scene.save.glas;
    this.dead = true;
    if (g) {
      this.scene.dropBronze(this.cx, this.cy, 0);
      this.scene.save.bronze += g.bronze;
      this.scene.ui.toast(this.scene.uiText('toast.glas', { n: g.bronze }));
    }
    this.scene.save.glas = null;
    this.scene.sfx('bellBig');
    this.scene.particles.burst(this.cx, this.cy, 30, '#c98f45', { speed: 4 });
    return true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.fillStyle = '#16131a';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y);
    ctx.quadraticCurveTo(x + w * 0.1, y + h * 0.8, x - 2, y + h);
    ctx.lineTo(x + w + 2, y + h);
    ctx.quadraticCurveTo(x + w * 0.9, y + h * 0.8, x + w * 0.7, y);
    ctx.fill();
    ctx.strokeStyle = '#c98f45';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + 3);
    ctx.lineTo(x + w * 0.4, y + 10);
    ctx.lineTo(x + w * 0.6, y + 15);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(201,143,69,${0.2 + 0.15 * Math.sin(this.t * 0.1)})`;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export type ItemKind = 'shard' | 'vessel' | 'tin' | 'page' | 'note' | 'ability' | 'key' | 'slot';

/** A collectible floating in the world; picked up on contact, remembered by flag. */
export class Pickup extends Entity {
  light = 50;
  constructor(scene: Scene, x: number, y: number, public kind: ItemKind, public value: string, public flag: string) {
    // A tall pick-up zone from the floor of its tile up: touching the glow is enough.
    super(scene, x, y + 10, 18, 34);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
  }
  update(): void {
    const p = this.scene.player;
    if (!p.dead && overlap(this.box(), p.box())) {
      this.dead = true;
      this.scene.setFlag(this.flag);
      this.scene.collect(this.kind, this.value);
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const y = this.body.y + 10 + Math.sin(this.t * 0.06) * 3;
    const color = this.kind === 'ability' ? '#fff4c8' : this.kind === 'note' ? '#a8e0ff' : this.kind === 'shard' ? '#e8b86a' : this.kind === 'vessel' ? '#ffffff' : this.kind === 'page' ? '#e8d8b0' : '#c0c8d8';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.cx, y, 1, this.cx, y, 22);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.t * 0.1);
    ctx.fillStyle = g;
    ctx.fillRect(this.cx - 22, y - 22, 44, 44);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(this.cx, y);
    ctx.rotate(this.t * 0.02);
    if (this.kind === 'page') ctx.fillRect(-4, -5, 8, 10);
    else {
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** A small hanging bell. Strike it (or let the echo strike it) to open a gate; grouped bells must ring together. */
export class BellSwitch extends Entity {
  rung = 0;
  /** Timed bells open their bars for a moment only. */
  open = 0;
  constructor(scene: Scene, x: number, y: number, public flag: string, public group: string | null, public ring = 45, public timed = 0, public bars: [number, number, number, number][] = [], public needs: string | null = null) {
    super(scene, x, y - 14, 14, 16);
    this.contact = 0;
    this.prop = true;
    this.heavy = true;
    if (timed) scene.setTiles(bars, T.Gate);
    else if (scene.flags[flag]) this.rung = -1;
  }
  get asleep(): boolean {
    return !!this.needs && !this.scene.flags[this.needs];
  }
  update(): void {
    if (this.rung > 0) this.rung--;
    if (this.open > 0) {
      this.open--;
      const p = this.scene.player;
      const inside = this.bars.some(([x, y, w, h]) => overlap({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE }, p.box()));
      if (this.open === 0 && inside) this.open = 1;
      else if (this.open === 0) { this.scene.setTiles(this.bars, T.Gate); this.scene.sfx('clang'); }
      else if (this.open < 20 && this.open % 6 === 0) this.scene.sfx('tick');
    }
  }
  damage(_a: number, _fromX: number, source: DamageSource): boolean {
    if (this.invuln > 0 || this.rung === -1 || this.asleep) return false;
    this.invuln = 10;
    this.rung = this.ring;
    if (this.timed) {
      this.open = this.timed;
      this.scene.setTiles(this.bars, T.Empty);
      this.scene.sfx('bell', 0.85);
      this.scene.sfx('gate');
      return true;
    }
    this.scene.sfx('bell', this.group ? 1.25 : 1);
    this.scene.particles.ring(this.cx, this.cy, '#ffe9b0', 26);
    if (!this.group) {
      this.scene.openFlag(this.flag);
      this.rung = -1;
    } else {
      // All bells of the group must be ringing at once.
      const mates = this.scene.entities.filter((e) => e instanceof BellSwitch && e.group === this.group) as BellSwitch[];
      if (mates.every((m) => m.rung > 0)) {
        this.scene.openFlag(this.flag);
        this.scene.sfx('chime');
        for (const m of mates) m.rung = -1;
      }
    }
    void source;
    return true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    const swing = this.rung > 0 ? Math.sin(this.rung * 0.5) * 0.4 * (this.rung / this.ring) : 0;
    ctx.strokeStyle = '#3a3030';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y - 24); ctx.lineTo(x + w / 2, y); ctx.stroke();
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.rotate(swing);
    if (this.asleep) ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.rung === -1 ? '#e8c27a' : this.timed ? '#c8a0e8' : this.group ? '#9ab8d8' : '#b8874a';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(-5, h * 0.7, -w / 2, h);
    ctx.lineTo(w / 2, h);
    ctx.quadraticCurveTo(5, h * 0.7, 3, 0);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.open > 0) {
      ctx.fillStyle = 'rgba(200,160,232,0.8)';
      ctx.fillRect(this.cx - 10, this.body.y - 30, 20 * (this.open / this.timed), 2);
    }
    if (this.rung > 0 || this.rung === -1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,230,160,${this.rung === -1 ? 0.12 : 0.3 * (this.rung / this.ring)})`;
      ctx.beginPath(); ctx.arc(this.cx, this.cy, 16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

/** Pressure plate: holds iron bars open while the Sonneur or an echo stands on it. */
export class Plate extends Entity {
  pressed = false;
  constructor(scene: Scene, x: number, y: number, public bars: [number, number, number, number][]) {
    super(scene, x, y, 24, 4);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
    scene.setTiles(bars, T.Gate);
  }
  update(): void {
    const zone = { x: this.body.x, y: this.body.y - 6, w: this.body.w, h: 10 };
    const p = this.scene.player;
    const now = overlap(zone, p.box()) || this.scene.echoes.some((e) => e.active && overlap(zone, e.box()));
    if (now === this.pressed) return;
    // Bars only close again when nothing stands inside them.
    if (!now && this.bars.some(([x, y, w, h]) => overlap({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE }, p.box()))) return;
    this.pressed = now;
    this.scene.setTiles(this.bars, now ? T.Empty : T.Gate);
    this.scene.sfx(now ? 'gate' : 'clang');
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w } = this.body;
    ctx.fillStyle = this.pressed ? '#e8c27a' : '#6a5a40';
    ctx.fillRect(x, y + (this.pressed ? 2 : 0), w, 4);
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(x - 3, y + 4, w + 6, 2);
  }
}

/** A bell hung from the ceiling that Appel can pull the Sonneur toward. */
export class Anchor extends Entity {
  anchor = true;
  light = 40;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y - 4, 14, 14);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
  }
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    const has = this.scene.player.abilities.has('grapple');
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(this.cx, this.body.y - 30); ctx.lineTo(this.cx, this.body.y); ctx.stroke();
    ctx.strokeStyle = has ? '#ffd98a' : '#8a7a60';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, 6, 0, Math.PI * 2); ctx.stroke();
    if (has) {
      const p = this.scene.player;
      const d = Math.hypot(p.cx - this.cx, p.cy - this.cy);
      if (d < 130) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,217,138,${0.5 - d / 300})`;
        ctx.beginPath(); ctx.arc(this.cx, this.cy, 11 + Math.sin(this.t * 0.2) * 2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
}

/** A column of air blowing upward from an organ pipe. Size in tiles. */
export class Wind extends Entity {
  constructor(scene: Scene, x: number, y: number, w: number, h: number, public strength = 0.95) {
    super(scene, x, y, w * TILE, h * TILE);
    this.body.x = x - TILE / 2;
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
  }
  update(): void {
    const p = this.scene.player;
    if (!overlap(this.box(), p.box()) || p.dashT > 0 || p.grapple) return;
    p.body.vy = Math.max(-6.5, p.body.vy - this.strength);
    p.airDashUsed = false;
    if (this.t % 30 === 0) this.scene.sfx('wind');
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(200,240,210,0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.max(3, w / 8); i++) {
      const lx = x + ((i * 37) % w);
      const off = ((this.t * 4 + i * 53) % h);
      ctx.beginPath();
      ctx.moveTo(lx, y + h - off);
      ctx.lineTo(lx, y + h - off - 20);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** A platform moving back and forth: (dx, dy) in tiles, period in frames. */
export class Mover extends Entity {
  platform = true;
  dx = 0;
  dy = 0;
  private ox: number;
  private oy: number;
  constructor(scene: Scene, x: number, y: number, public w: number, public ex: number, public ey: number, public period: number, public phase = 0) {
    super(scene, x, y, w * TILE, 8);
    this.body.x = x - TILE / 2;
    this.body.y = y - TILE;
    this.ox = this.body.x;
    this.oy = this.body.y;
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
  }
  update(): void {
    const k = (1 - Math.cos(((this.t + this.phase) / this.period) * Math.PI * 2)) / 2;
    const nx = this.ox + this.ex * TILE * k;
    const ny = this.oy + this.ey * TILE * k;
    this.dx = nx - this.body.x;
    this.dy = ny - this.body.y;
    this.body.x = nx;
    this.body.y = ny;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w } = this.body;
    const pal = PALETTES[this.scene.room.def.zone];
    ctx.fillStyle = '#2a2016';
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = pal.rim;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x, y, w, 1.2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#4a3a24';
    for (let i = 4; i < w; i += 14) ctx.fillRect(x + i, y + 3, 4, 3);
  }
}

/** Crumbling ledge: gives way a moment after being stood on, then reforms. */
export class Crumble extends Entity {
  platform = true;
  dx = 0;
  dy = 0;
  timer = 0;
  gone = 0;
  constructor(scene: Scene, x: number, y: number, public w: number) {
    super(scene, x, y, w * TILE, 8);
    this.body.x = x - TILE / 2;
    this.body.y = y - TILE;
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
  }
  update(): void {
    if (this.gone > 0) {
      this.gone--;
      if (this.gone === 0) this.platform = true;
      return;
    }
    const p = this.scene.player;
    const on = p.body.onGround && Math.abs(p.body.y + p.body.h - this.body.y) < 2 && p.body.x + p.body.w > this.body.x && p.body.x < this.body.x + this.body.w;
    if (on && this.timer === 0) this.timer = 1;
    if (this.timer > 0) {
      this.timer++;
      if (this.timer > 32) {
        this.timer = 0;
        this.gone = 200;
        this.platform = false;
        this.scene.sfx('break');
        this.scene.particles.burst(this.cx, this.body.y, 16, '#4a3a2a', { speed: 2, kind: 'shard' });
      }
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.gone > 0) return;
    const shake = this.timer > 0 ? Math.sin(this.timer * 1.5) * 1 : 0;
    ctx.fillStyle = '#3a2c20';
    ctx.fillRect(this.body.x + shake, this.body.y, this.body.w, 8);
    ctx.strokeStyle = '#1a120c';
    ctx.beginPath();
    for (let i = 8; i < this.body.w; i += 12) { ctx.moveTo(this.body.x + i + shake, this.body.y); ctx.lineTo(this.body.x + i + 3 + shake, this.body.y + 8); }
    ctx.stroke();
  }
}

/** Speaking characters; dialogue and shops are run by the interface. */
export class Npc extends Interactive {
  constructor(scene: Scene, x: number, y: number, public who: string) {
    super(scene, x, y, 18, 30);
    this.back = false;
  }
  update(): void {
    this.prompt = this.scene.uiText('prompt.talk');
    super.update();
    this.facing = this.scene.player.cx < this.cx ? -1 : 1;
  }
  use(): void {
    this.scene.ui.talk(this.who);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    drawNpc(ctx, this.who, this.cx, this.body.y + this.body.h, this.facing, this.t);
    this.drawPrompt(ctx);
  }
}

export function drawNpc(ctx: CanvasRenderingContext2D, who: string, x: number, y: number, facing: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  const bob = Math.sin(t * 0.05) * 0.8;
  const look: Record<string, { body: string; trim: string; tall: number; hat?: boolean; wings?: boolean; ghost?: boolean; helm?: boolean }> = {
    glas: { body: 'rgba(200,210,235,0.55)', trim: '#e8eeff', tall: 34, ghost: true },
    tierce: { body: '#1a1418', trim: '#c8a8e8', tall: 30, wings: true },
    fondeuse: { body: '#1c120c', trim: '#ff9a4a', tall: 26 },
    fa: { body: '#10141a', trim: '#a8d8c8', tall: 34, hat: true },
    muet: { body: '#121216', trim: '#b8b0a0', tall: 38, helm: true },
  };
  const l = look[who] ?? look.glas;
  if (l.ghost) ctx.globalCompositeOperation = 'lighter';
  if (l.wings) {
    ctx.fillStyle = '#2a2030';
    ctx.beginPath();
    ctx.ellipse(-8, -l.tall * 0.6 + bob, 9, 15, -0.5 + Math.sin(t * 0.08) * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = l.body;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(-9, -l.tall * 0.6 + bob, -5, -l.tall + 8 + bob);
  ctx.lineTo(5, -l.tall + 8 + bob);
  ctx.quadraticCurveTo(9, -l.tall * 0.6 + bob, 8, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -l.tall + 6 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  if (l.hat) {
    ctx.beginPath(); ctx.moveTo(-8, -l.tall + 4 + bob); ctx.lineTo(1, -l.tall - 12 + bob); ctx.lineTo(8, -l.tall + 4 + bob); ctx.fill();
  }
  if (l.helm) {
    ctx.fillStyle = '#5a5248';
    ctx.beginPath(); ctx.moveTo(-6, -l.tall + 10 + bob); ctx.quadraticCurveTo(-6, -l.tall - 4 + bob, 0, -l.tall - 4 + bob); ctx.quadraticCurveTo(6, -l.tall - 4 + bob, 6, -l.tall + 10 + bob); ctx.fill();
  }
  ctx.fillStyle = l.trim;
  ctx.fillRect(1.5, -l.tall + 5 + bob, 1.5, 2);
  ctx.fillRect(4, -l.tall + 5 + bob, 1.5, 2);
  ctx.restore();
}

/** A hanging lamp: decor that lights dark rooms. */
export class Lamp extends Entity {
  light = 110;
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 8, 10);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
  }
  update(): void {
    this.light = 105 + Math.sin(this.t * 0.2) * 4 + Math.sin(this.t * 0.07) * 6;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const pal = PALETTES[this.scene.room.def.zone];
    ctx.strokeStyle = '#2a2420';
    ctx.beginPath(); ctx.moveTo(this.cx, this.body.y - 40); ctx.lineTo(this.cx, this.body.y); ctx.stroke();
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(this.body.x, this.body.y, 8, 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.cx, this.cy, 1, this.cx, this.cy, 30);
    g.addColorStop(0, pal.accent);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(this.cx - 30, this.cy - 30, 60, 60);
    ctx.restore();
  }
}

/** A control hint carved on the wall, shown when the player comes near. */
export class Hint extends Entity {
  alpha = 0;
  constructor(scene: Scene, x: number, y: number, public key: string) {
    super(scene, x, y, 10, 10);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
  }
  update(): void {
    const d = Math.abs(this.scene.player.cx - this.cx);
    this.alpha += ((d < 90 ? 1 : 0) - this.alpha) * 0.08;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha < 0.02) return;
    const text = this.scene.hintText(this.key);
    ctx.save();
    ctx.globalAlpha = this.alpha * 0.85;
    ctx.font = '10px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8dcc0';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    const ls = text.split('\n');
    ls.forEach((l, i) => ctx.fillText(l, this.cx, this.body.y - 30 + i * 12));
    ctx.restore();
  }
}

export const ABILITY_IDS: Ability[] = ['echo', 'dash', 'walljump', 'swap', 'double', 'slam', 'grapple'];
