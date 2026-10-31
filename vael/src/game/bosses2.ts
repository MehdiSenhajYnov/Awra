import { clamp } from '../engine/core';
import { Boss, Debris, HitZone } from './boss';
import { Foe, Orb } from './foes';
import { Cloud, Glyph } from './foes2';
import type { Scene } from './scene';

/** A column of damage rising from the floor after a mark (roots, tentacles, chains). */
export class Spike extends Foe {
  warn: number;
  constructor(scene: Scene, x: number, feet: number, public h: number, warn: number, public color: number, public kind: string) {
    super(scene, x, feet, 70, h);
    this.warn = warn;
    this.hurtable = false;
    this.prop = true;
    this.brandable = false;
    this.contact = 0;
    this.sprite = 'spike';
    this.body.noClip = true;
  }
  life = 26;
  update(): void {
    if (this.warn > 0) {
      this.warn--;
      if (this.warn === 0) this.scene.emit({ t: 'spark', x: this.cx, y: this.body.y + this.body.h, n: 10, color: this.color });
      return;
    }
    this.active = this.life > 6 ? [{ box: this.box(), damage: 1 }] : [];
    if (--this.life <= 0) this.dead = true;
  }
}

const rng = (s: Scene) => s.rng;

/** La Mère-Racine: rooted, shifts along the hall; roots burst under the hero, spores, a low sweep. */
export class Racine extends Boss {
  private A = 'boss_racine_a';
  private B = 'boss_racine_b';
  private C = 'boss_racine_c';
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 180, 340, 'racine', 600);
    this.sprite = 'racine';
    this.staggerAt = 12;
    this.contact = 1;
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.C}|0,1|16|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0,1,2,3|10|1`;
    super.setAnim(a);
  }
  think(): void {
    const b = this.body;
    b.vx = 0;
    switch (this.state) {
      case 'idle':
      case 'walk': {
        this.face();
        this.play(this.A, [0, 1, 2, 3], 10, true);
        // Drifts slowly towards the hero, as if the roots dragged her.
        b.vx = clamp(this.dx() * 0.01, -1.2, 1.2) * this.pace;
        if (this.st > this.f(50)) {
          const ad = Math.abs(this.dx());
          const r = rng(this.scene).next();
          this.to(ad < 300 && r < 0.45 ? 'sweepWind' : r < 0.75 ? 'rootsWind' : 'spores');
          this.telegraph(-0.3, true);
        }
        break;
      }
      case 'rootsWind':
        this.play(this.A, [4, 5], this.f(14));
        if (this.st >= this.f(26)) {
          const n = 2 + this.phase;
          const px = this.p.cx;
          for (let i = 0; i < n; i++) {
            const x = px + (i - (n - 1) / 2) * 190;
            this.scene.add(new Spike(this.scene, x, b.y + b.h, 260, this.f(34) + i * 6, 0x70ffd8, 'root'));
          }
          this.to('roots');
        }
        break;
      case 'roots':
        this.play(this.A, [6, 7], 8);
        if (this.st >= this.f(60)) this.to('walk');
        break;
      case 'sweepWind':
        this.face();
        this.play(this.B, [4, 5], this.f(14));
        if (this.st >= this.f(30)) this.to('sweep');
        break;
      case 'sweep':
        this.play(this.B, [6, 7], 6);
        if (this.st < 8) this.active = [this.reachBox(460, 110, 0, 80, 1)];
        if (this.st >= this.f(36)) this.to('walk');
        break;
      case 'spores':
        this.play(this.B, [0, 1, 2, 3], 9, true);
        if (this.st === 24) {
          this.scene.emit({ t: 'roar', x: this.cx, y: this.cy });
          for (let i = 0; i < 2 + this.phase; i++) {
            const x = clamp(this.p.cx + (i - 1) * 260 + rng(this.scene).range(-60, 60), 150, this.scene.room.pxW - 150);
            this.scene.add(new Cloud(this.scene, x, this.p.cy - 40 - rng(this.scene).range(0, 120), 100, 0xff9ad8));
          }
        }
        if (this.st >= 70) this.to('walk');
        break;
      case 'roar':
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st >= 60) this.to('walk');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}

/** Le Forgeron Creux: hammer slams that send waves, a chain lash across the hall, leaps; embers rain later. */
export class Forgeron extends Boss {
  private A = 'boss_forgeron_a';
  private B = 'boss_forgeron_b';
  private C = 'boss_forgeron_c';
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 160, 300, 'forgeron', 720);
    this.sprite = 'forgeron';
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.C}|4,5|20|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0|1|0`;
    super.setAnim(a);
  }
  think(): void {
    const b = this.body;
    const ad = Math.abs(this.dx());
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.face();
        this.play(this.A, [0, 1, 2, 3], 9, true);
        b.vx = ad > 240 ? this.facing * 3 * this.pace : 0;
        if (this.st > this.f(36)) {
          const r = rng(this.scene).next();
          this.to(ad < 300 ? (r < 0.6 ? 'slamWind' : 'lashWind') : r < 0.5 ? 'leapWind' : 'lashWind');
          this.telegraph(-0.35, true);
        }
        break;
      case 'slamWind':
        b.vx = 0;
        this.play(this.A, [4, 5], this.f(16));
        if (this.st >= this.f(34)) this.to('slam');
        break;
      case 'slam':
        this.play(this.A, [6, 7], 6);
        if (this.st === 1) {
          const x = this.cx + this.facing * 190;
          this.scene.add(new HitZone(this.scene, this.reachBox(270, 240, 0, 30, 1), 7));
          this.scene.emit({ t: 'boom', x, y: b.y + b.h - 20, r: 150, color: 0xff9040 });
          this.wave(this.facing, 13);
          if (this.phase >= 2) this.wave(-this.facing, 11);
          if (this.phase >= 3) for (let i = 0; i < 4; i++) this.scene.add(new Debris(this.scene, rng(this.scene).range(150, this.scene.room.pxW - 150)));
        }
        if (this.st >= this.f(42)) this.to('walk');
        break;
      case 'lashWind':
        b.vx = 0;
        this.face();
        this.play(this.B, [0, 1], this.f(14));
        if (this.st >= this.f(30)) this.to('lash');
        break;
      case 'lash': {
        this.play(this.B, [2, 3], 6);
        // The chain unrolls across the hall at chest height.
        const len = Math.min(900, this.st * 70);
        if (this.st < 16) this.active = [{ box: { x: this.facing > 0 ? this.cx : this.cx - len, y: b.y + b.h - 170, w: len, h: 50 }, damage: 1 }];
        if (this.st >= this.f(40)) this.to('walk');
        break;
      }
      case 'leapWind':
        b.vx = 0;
        this.play(this.B, [4], 1);
        if (this.st >= this.f(20)) {
          this.to('leap');
          b.vy = -28;
          b.vx = clamp((this.p.cx - this.cx) / 36, -17, 17);
        }
        break;
      case 'leap':
        this.play(this.B, [5], 1);
        if (b.onGround && this.st > 4) {
          this.to('land');
          this.scene.emit({ t: 'boom', x: this.cx, y: b.y + b.h - 10, r: 170, color: 0xff9040 });
          this.wave(1, 12);
          this.wave(-1, 12);
          this.scene.add(new HitZone(this.scene, { box: { x: this.cx - 180, y: b.y + b.h - 130, w: 360, h: 130 }, damage: 1 }, 5));
        }
        break;
      case 'land':
        b.vx = 0;
        this.play(this.B, [6, 7], 8);
        if (this.st >= this.f(30)) this.to('walk');
        break;
      case 'roar':
        b.vx = 0;
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st === 20) for (let i = 0; i < 6; i++) this.scene.add(new Debris(this.scene, rng(this.scene).range(150, this.scene.room.pxW - 150)));
        if (this.st >= 60) this.to('walk');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}

/** Le Bibliothécaire Noyé: floats, vanishes into the water, casts fans of pages and great waves. */
export class Bibliothecaire extends Boss {
  private A = 'boss_bibliothecaire_a';
  private B = 'boss_bibliothecaire_b';
  private C = 'boss_bibliothecaire_c';
  fade = 1;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 150, 300, 'bibliothecaire', 750);
    this.sprite = 'bibliothecaire';
    this.body.noPlatforms = true;
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.A}|0|1|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0,1,2,3|10|1`;
    super.setAnim(a);
  }
  update(): void {
    // Floats: no gravity.
    super.update();
  }
  fall(): ReturnType<Foe['fall']> {
    const b = this.body;
    b.vy = (this.homeY - b.y) * 0.05 + Math.sin(this.t * 0.04) * 0.8;
    return this.scene.moveBody(this);
  }
  homeY = this.body.y - 120;
  think(): void {
    const b = this.body;
    this.face();
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.fade = Math.min(1, this.fade + 0.05);
        this.play(this.A, [0, 1, 2, 3], 10, true);
        b.vx = clamp((this.p.cx - this.facing * 420 - this.cx) * 0.02, -3, 3);
        if (this.st > this.f(50)) {
          const r = rng(this.scene).next();
          const next = r < 0.4 ? 'castWind' : r < 0.7 ? 'waveWind' : 'vanish';
          this.to(next);
          if (next !== 'vanish') this.telegraph(-0.2, true);
        }
        break;
      case 'castWind':
        b.vx *= 0.9;
        this.play(this.A, [4, 5], this.f(14));
        if (this.st >= this.f(28)) {
          const a0 = Math.atan2(this.p.cy - this.cy, this.p.cx - this.cx);
          const n = 3 + this.phase * 2;
          for (let i = 0; i < n; i++) {
            const a = a0 + (i - (n - 1) / 2) * 0.16;
            this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0x70e0ff, 220));
          }
          this.to('cast');
        }
        break;
      case 'cast':
        this.play(this.A, [6, 7], 8);
        if (this.st >= this.f(36)) this.to('walk');
        break;
      case 'waveWind':
        b.vx *= 0.9;
        this.play(this.B, [0, 1], this.f(14));
        if (this.st >= this.f(30)) {
          this.wave(this.facing, 12, 110);
          if (this.phase >= 2) this.wave(-this.facing, 9, 110);
          this.to('waveDone');
        }
        break;
      case 'waveDone':
        this.play(this.B, [2, 3], 8);
        if (this.st >= this.f(40)) this.to('walk');
        break;
      case 'vanish':
        this.play(this.B, [4, 5, 6, 7], 6);
        this.fade = Math.max(0, this.fade - 0.05);
        this.hurtable = this.fade > 0.3;
        if (this.fade <= 0) {
          b.x = clamp(this.p.cx + (rng(this.scene).chance(0.5) ? -1 : 1) * 380, 100, this.scene.room.pxW - 100 - b.w);
          this.hurtable = true;
          this.to('rise');
          for (let i = 0; i < this.phase; i++) this.scene.add(new Glyph(this.scene, this.p.cx + (i - 0.5) * 200, this.p.feet, 0x70e0ff));
        }
        break;
      case 'rise':
        this.fade = Math.min(1, this.fade + 0.06);
        if (this.st >= 20) this.to('castWind');
        break;
      case 'roar':
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st === 20) for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(a) * 6, Math.sin(a) * 6, 0xb070ff, 200));
        }
        if (this.st >= 60) this.to('walk');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}

/** One of the Jailers. The elder leads (the keeper); the younger is a lesser twin at his side. */
export class Geolier extends Boss {
  private A = 'boss_geoliers_a';
  private B = 'boss_geoliers_b';
  private C = 'boss_geoliers_c';
  twin: GeolierTwin | null = null;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 140, 280, 'geoliers', 640);
    this.sprite = 'geoliers';
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.C}|4,5|20|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0|1|0`;
    super.setAnim(a);
  }
  think(): void {
    const b = this.body;
    if (!this.twin && this.t < 5) {
      this.twin = new GeolierTwin(this.scene, this.cx + 300, b.y + b.h);
      this.scene.add(this.twin);
    }
    if (this.twin?.dead && this.phase < 2) {
      this.hp = Math.min(this.hp, this.maxHp * 0.65);
    }
    const ad = Math.abs(this.dx());
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.face();
        this.play(this.A, [0, 1, 2, 3], 9, true);
        b.vx = ad > 220 ? this.facing * 2.6 * this.pace : 0;
        if (this.st > this.f(40)) {
          this.to(ad < 300 ? 'maceWind' : rng(this.scene).chance(0.5) ? 'chargeWind' : 'leapWind');
          this.telegraph(-0.35, true);
        }
        break;
      case 'maceWind':
        b.vx = 0;
        this.play(this.A, [4, 5], this.f(16));
        if (this.st >= this.f(34)) this.to('mace');
        break;
      case 'mace':
        this.play(this.A, [6, 7], 6);
        if (this.st < 8) this.active = [this.reachBox(300, 260, 0, 60, 1)];
        if (this.st === 2) this.scene.emit({ t: 'boom', x: this.cx + this.facing * 220, y: b.y + b.h - 20, r: 120, color: 0xc8c0e0 });
        if (this.st >= this.f(40)) this.to('walk');
        break;
      case 'chargeWind':
        b.vx = 0;
        this.face();
        this.play(this.B, [0], 1);
        if (this.st >= this.f(30)) this.to('charge');
        break;
      case 'charge':
        this.play(this.B, [1, 2, 3], 5, true);
        b.vx = this.facing * 16 * this.pace;
        this.active = [this.reachBox(120, 240, 0, 40, 1)];
        if (this.wallAhead() || this.st > 60) {
          this.to('recover');
          this.scene.emit({ t: 'boom', x: this.cx + this.facing * 70, y: this.cy, r: 140, color: 0xc8c0e0 });
          if (this.phase >= 2) for (let i = 0; i < 3; i++) this.scene.add(new Debris(this.scene, this.p.cx + (i - 1) * 200));
        }
        break;
      case 'recover':
        b.vx = 0;
        if (this.st >= this.f(40)) this.to('walk');
        break;
      case 'leapWind':
        b.vx = 0;
        this.play(this.B, [4], 1);
        if (this.st >= this.f(20)) {
          this.to('leap');
          b.vy = -27;
          b.vx = clamp((this.p.cx - this.cx) / 36, -16, 16);
        }
        break;
      case 'leap':
        this.play(this.B, [5], 1);
        if (b.onGround && this.st > 4) {
          this.to('land');
          this.wave(1, 11);
          this.wave(-1, 11);
          this.scene.emit({ t: 'boom', x: this.cx, y: b.y + b.h - 10, r: 160, color: 0xc8c0e0 });
        }
        break;
      case 'land':
        b.vx = 0;
        this.play(this.B, [6, 7], 8);
        if (this.st >= this.f(30)) this.to('walk');
        break;
      case 'roar':
        b.vx = 0;
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st >= 60) this.to('walk');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}

/** The younger Jailer: lighter, quicker, throws his chain. */
export class GeolierTwin extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 110, 220);
    this.hp = this.maxHp = 300;
    this.heavy = true;
    this.sprite = 'geolierTwin';
    this.scale = 0.8;
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { this.fall(); return; }
    const A = 'boss_geoliers_a';
    const B = 'boss_geoliers_b';
    if (this.state === 'idle' || this.state === 'walk') {
      this.face();
      this.play(A, [0, 1, 2, 3], 7, true);
      const want = this.p.cx - this.facing * 340;
      b.vx = clamp((want - this.cx) * 0.03, -4, 4);
      if (this.st > 90) { this.to('wind'); this.telegraph(-0.3); }
    } else if (this.state === 'wind') {
      b.vx = 0;
      this.play(B, [0, 1], 12);
      if (this.st >= 28) this.to('lash');
    } else {
      this.play(B, [2, 3], 6);
      const len = Math.min(700, this.st * 60);
      if (this.st < 14) this.active = [{ box: { x: this.facing > 0 ? this.cx : this.cx - len, y: b.y + b.h - 150, w: len, h: 44 }, damage: 1 }];
      if (this.st >= 40) this.to('walk');
    }
    this.fall();
  }
}

/** L'Oiseau-Comète: hovers, swoops across the sky, sweeps with a wing, rains stars. */
export class Oiseau extends Boss {
  private A = 'boss_oiseau_a';
  private B = 'boss_oiseau_b';
  private C = 'boss_oiseau_c';
  private tx = 0;
  private ty = 0;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 200, 160, 'oiseau', 700);
    this.sprite = 'oiseau';
    this.body.noPlatforms = true;
    this.body.noClip = true;
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.A}|0|1|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0,1,2,3|8|1`;
    super.setAnim(a);
  }
  fall(): ReturnType<Foe['fall']> {
    const b = this.body;
    b.x += b.vx;
    b.y += b.vy;
    b.x = clamp(b.x, 60, this.scene.room.pxW - 60 - b.w);
    b.y = clamp(b.y, 140, this.scene.room.pxH - 80 - b.h);
    return { hitX: false, hitY: false, hazard: false, landed: false };
  }
  think(): void {
    const b = this.body;
    const W = this.scene.room.pxW;
    switch (this.state) {
      case 'idle':
      case 'walk': {
        this.face();
        this.play(this.A, [0, 1, 2, 3], 7, true);
        const hx = this.p.cx < W / 2 ? W * 0.72 : W * 0.28;
        b.vx = clamp((hx - this.cx) * 0.03, -6, 6);
        b.vy = clamp((260 - this.cy) * 0.04, -5, 5) + Math.sin(this.t * 0.06) * 1.5;
        if (this.st > this.f(60)) {
          const r = rng(this.scene).next();
          this.to(r < 0.45 ? 'diveWind' : r < 0.75 ? 'stars' : 'sweepWind');
          this.telegraph(0, true);
        }
        break;
      }
      case 'diveWind':
        this.face();
        b.vx *= 0.85;
        b.vy = -2;
        this.play(this.A, [4], 1);
        this.tx = this.p.cx;
        this.ty = this.p.cy;
        if (this.st >= this.f(26)) {
          const dx = this.tx - this.cx;
          const dy = this.ty - this.cy;
          const d = Math.hypot(dx, dy) || 1;
          b.vx = (dx / d) * 24 * this.pace;
          b.vy = (dy / d) * 24 * this.pace;
          this.to('dive');
        }
        break;
      case 'dive':
        this.play(this.A, [5, 6, 7], 4, true);
        this.active = [{ box: this.box(), damage: 1 }];
        if (this.cy > this.scene.room.pxH - 240 || this.st > 40) {
          b.vy = -14;
          b.vx *= 0.6;
          this.scene.emit({ t: 'boom', x: this.cx, y: this.cy + 60, r: 130, color: 0xff9ad8 });
          this.to(this.phase >= 3 && rng(this.scene).chance(0.5) ? 'diveWind' : 'walk');
        }
        break;
      case 'stars':
        b.vx *= 0.9;
        b.vy *= 0.9;
        this.play(this.B, [0, 1, 2, 3], 8, true);
        if (this.st % this.f(14) === 0 && this.st < 70) {
          for (let i = 0; i < 2 + this.phase; i++) {
            const x = rng(this.scene).range(80, W - 80);
            this.scene.add(new Orb(this.scene, x, 60, 0, 6 + this.phase, 0xff9ad8, 200));
          }
        }
        if (this.st >= 90) this.to('walk');
        break;
      case 'sweepWind':
        this.face();
        b.vx = clamp((this.p.cx - this.facing * 260 - this.cx) * 0.05, -6, 6);
        b.vy = clamp((this.p.cy - 40 - this.cy) * 0.05, -6, 6);
        this.play(this.B, [4, 5], this.f(14));
        if (this.st >= this.f(30)) this.to('sweep');
        break;
      case 'sweep':
        b.vx = this.facing * 14;
        b.vy = 0;
        this.play(this.B, [6, 7], 6);
        this.active = [{ box: { x: this.cx - 220, y: this.cy - 60, w: 440, h: 140 }, damage: 1 }];
        if (this.st >= 18) this.to('walk');
        break;
      case 'roar':
        b.vx *= 0.9;
        b.vy *= 0.9;
        this.play(this.C, [0, 1, 2, 3], 8, true);
        if (this.st === 24) for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(a) * 7, Math.sin(a) * 7, 0xff9ad8, 200));
        }
        if (this.st >= 60) this.to('walk');
        break;
    }
    this.fall();
  }
}

/** La Reine de Pénombre: drifts and vanishes; ink tentacles burst from the floor; rings of dark stars. */
export class Reine extends Boss {
  private A = 'boss_reine_a';
  private B = 'boss_reine_b';
  private C = 'boss_reine_c';
  fade = 1;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 160, 340, 'reine', 850);
    this.sprite = 'reine';
    this.body.noPlatforms = true;
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.B}|0|1|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0,1,2,3|10|1`;
    super.setAnim(a);
  }
  fall(): ReturnType<Foe['fall']> {
    const b = this.body;
    b.vy = (this.homeY - b.y) * 0.05 + Math.sin(this.t * 0.03) * 0.7;
    return this.scene.moveBody(this);
  }
  homeY = this.body.y - 80;
  think(): void {
    const b = this.body;
    this.face();
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.fade = Math.min(1, this.fade + 0.05);
        this.play(this.A, [0, 1, 2, 3], 10, true);
        b.vx = clamp((this.p.cx - this.facing * 360 - this.cx) * 0.015, -2.5, 2.5);
        if (this.st > this.f(45)) {
          const r = rng(this.scene).next();
          const next = r < 0.4 ? 'tentWind' : r < 0.7 ? 'ringWind' : 'vanish';
          this.to(next);
          if (next !== 'vanish') this.telegraph(-0.2, true);
        }
        break;
      case 'tentWind':
        this.play(this.A, [4, 5], this.f(14));
        b.vx *= 0.9;
        if (this.st >= this.f(26)) {
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) {
            const x = this.p.cx + (i - (n - 1) / 2) * 170 + rng(this.scene).range(-30, 30);
            this.scene.add(new Spike(this.scene, x, this.scene.room.pxH - 5 * 40, 300, this.f(30) + Math.abs(i - (n - 1) / 2) * 8, 0xb070ff, 'tentacle'));
          }
          this.to('tent');
        }
        break;
      case 'tent':
        this.play(this.A, [6, 7], 8);
        if (this.st >= this.f(55)) this.to('walk');
        break;
      case 'ringWind':
        this.play(this.B, [0, 1, 2, 3], 8, true);
        b.vx *= 0.9;
        if (this.st === this.f(30) || (this.phase >= 2 && this.st === this.f(50))) {
          const n = 10 + this.phase * 2;
          const off = rng(this.scene).range(0, 1);
          for (let i = 0; i < n; i++) {
            const a = ((i + off) / n) * Math.PI * 2;
            this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0xb070ff, 260));
          }
        }
        if (this.st >= this.f(70)) this.to('walk');
        break;
      case 'vanish':
        this.play(this.B, [4, 5, 6, 7], 6);
        this.fade = Math.max(0, this.fade - 0.05);
        this.hurtable = this.fade > 0.3;
        if (this.fade <= 0) {
          b.x = clamp(this.p.cx + (rng(this.scene).chance(0.5) ? -1 : 1) * 300 - b.w / 2, 100, this.scene.room.pxW - 100 - b.w);
          this.hurtable = true;
          this.to('rise');
        }
        break;
      case 'rise':
        this.fade = Math.min(1, this.fade + 0.07);
        if (this.st >= 18) this.to('tentWind');
        break;
      case 'roar':
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st === 20) {
          this.scene.emit({ t: 'roar', x: this.cx, y: this.cy });
          for (let i = 0; i < 8; i++) this.scene.add(new Spike(this.scene, 120 + i * ((this.scene.room.pxW - 240) / 7), this.scene.room.pxH - 5 * 40, 300, 40 + (i % 2) * 30, 0xff3060, 'tentacle'));
        }
        if (this.st >= 70) this.to('walk');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}

/** L'Enchaîneur: the old king. Sword combos, a chain whip across the throne room, plunges; chains fall from above. */
export class Enchaineur extends Boss {
  private A = 'boss_enchaineur_a';
  private B = 'boss_enchaineur_b';
  private C = 'boss_enchaineur_c';
  private combo = 0;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 140, 300, 'enchaineur', 1150);
    this.sprite = 'enchaineur';
    this.staggerAt = 14;
  }
  setAnim(a: string): void {
    if (a === 'stagger') a = `@${this.C}|4,5|20|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|16|0`;
    else if (a === 'idle') a = `@${this.A}|0|1|0`;
    super.setAnim(a);
  }
  think(): void {
    const b = this.body;
    const ad = Math.abs(this.dx());
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.face();
        this.play(this.A, [0, 1, 2, 3], 9, true);
        b.vx = ad > 200 ? this.facing * 3.4 * this.pace : 0;
        if (this.st > this.f(30)) {
          const r = rng(this.scene).next();
          this.to(ad < 280 ? 'swordWind' : r < 0.5 ? 'whipWind' : 'plungeWind');
          this.combo = this.phase;
          this.telegraph(-0.35, true);
        }
        break;
      case 'swordWind':
        b.vx = 0;
        this.face();
        this.play(this.A, [4, 5], this.f(10));
        if (this.st >= this.f(22)) this.to('sword');
        break;
      case 'sword':
        this.play(this.A, [6, 7], 5);
        b.vx = this.facing * 8;
        if (this.st < 8) this.active = [this.reachBox(300, 220, 0, 40, 1)];
        if (this.st >= this.f(18)) {
          if (--this.combo > 0) { this.to('swordWind'); this.telegraph(-0.3); } else this.to('walk');
        }
        break;
      case 'whipWind':
        b.vx = 0;
        this.face();
        this.play(this.B, [0, 1], this.f(14));
        if (this.st >= this.f(28)) this.to('whip');
        break;
      case 'whip': {
        this.play(this.B, [2, 3], 6);
        const len = Math.min(1100, this.st * 90);
        if (this.st < 14) this.active = [{ box: { x: this.facing > 0 ? this.cx : this.cx - len, y: b.y + b.h - 160, w: len, h: 60 }, damage: 1 }];
        if (this.st >= this.f(36)) this.to('walk');
        break;
      }
      case 'plungeWind':
        b.vx = 0;
        this.play(this.B, [4], 1);
        if (this.st >= this.f(18)) {
          this.to('plunge');
          b.vy = -30;
          b.vx = clamp((this.p.cx - this.cx) / 34, -18, 18);
        }
        break;
      case 'plunge':
        this.play(this.B, [5], 1);
        if (b.onGround && this.st > 4) {
          this.to('land');
          this.scene.emit({ t: 'boom', x: this.cx, y: b.y + b.h - 10, r: 200, color: 0xfff0c8 });
          this.scene.add(new HitZone(this.scene, { box: { x: this.cx - 200, y: b.y + b.h - 150, w: 400, h: 150 }, damage: 1 }, 6));
          this.wave(1, 13);
          this.wave(-1, 13);
        }
        break;
      case 'land':
        b.vx = 0;
        this.play(this.B, [6, 7], 8);
        if (this.st >= this.f(28)) this.to(this.phase >= 2 && rng(this.scene).chance(0.4) ? 'chains' : 'walk');
        break;
      case 'chains':
        this.play(this.C, [0, 1, 2, 3], 8, true);
        if (this.st === 10) {
          const n = 3 + this.phase * 2;
          for (let i = 0; i < n; i++) {
            const x = this.p.cx + (i - (n - 1) / 2) * 150;
            this.scene.add(new Spike(this.scene, x, this.scene.room.pxH - 5 * 40, 900, 30 + i * 5, 0xfff0c8, 'chain'));
          }
        }
        if (this.st >= 70) this.to('walk');
        break;
      case 'roar':
        b.vx = 0;
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st >= 60) this.to('chains');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}

/** L'Étoile Rêveuse: the secret keeper. She does not want to hurt; her light does. */
export class Etoile extends Boss {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 200, 360, 'etoile', 1200);
    this.sprite = 'etoile';
    this.body.noClip = true;
    this.contact = 0;
  }
  setAnim(a: string): void {
    if (a === 'stagger' || a === 'idle') a = '@boss_etoile|0,1,2,3|10|1';
    else if (a === 'death') a = '@boss_etoile|0|1|0';
    super.setAnim(a);
  }
  fall(): ReturnType<Foe['fall']> {
    const b = this.body;
    b.x += b.vx;
    b.y += (180 - b.y) * 0.04 + Math.sin(this.t * 0.03) * 0.8;
    return { hitX: false, hitY: false, hazard: false, landed: false };
  }
  think(): void {
    const b = this.body;
    const W = this.scene.room.pxW;
    b.vx = clamp((W / 2 + Math.sin(this.t * 0.01) * 400 - this.cx) * 0.02, -3, 3);
    this.play('boss_etoile', this.state === 'cast' ? [4, 5, 6, 7] : [0, 1, 2, 3], this.state === 'cast' ? 8 : 10, true);
    if (this.state === 'idle' || this.state === 'walk') {
      if (this.st > this.f(40)) { this.to('cast'); this.telegraph(0, true); }
    } else if (this.state === 'cast') {
      const k = this.st;
      if (k % this.f(6) === 0 && k < 90) {
        const a = k * 0.21 * (this.phase >= 2 ? 1.3 : 1);
        for (let i = 0; i < 2 + this.phase; i++) {
          const aa = a + (i / (2 + this.phase)) * Math.PI * 2;
          this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(aa) * 5, Math.sin(aa) * 5, 0xfff0c8, 240));
        }
      }
      if (k === 60 && this.phase >= 2) for (let i = 0; i < 4; i++) this.scene.add(new Spike(this.scene, this.p.cx + (i - 1.5) * 220, this.scene.room.pxH - 5 * 40, 900, 36, 0xfff0c8, 'chain'));
      if (k >= 110) this.to('walk');
    } else if (this.state === 'roar') {
      if (this.st >= 40) this.to('cast');
    }
    this.fall();
  }
}

/** Le Veilleur Gris: an optional duel with an old swordsman. Quick, honest, merciless. */
export class Veilleur extends Boss {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 60, 140, 'veilleur', 480);
    this.sprite = 'veilleurBoss';
    this.staggerAt = 7;
  }
  setAnim(a: string): void {
    if (a === 'stagger' || a === 'idle') a = 'idle';
    else if (a === 'death') a = 'windup';
    super.setAnim(a);
  }
  think(): void {
    const b = this.body;
    const ad = Math.abs(this.dx());
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.face();
        this.setAnim('move');
        b.vx = ad > 200 ? this.facing * 4 * this.pace : ad < 120 ? -this.facing * 3 : 0;
        if (this.st > this.f(28)) { this.to(ad < 320 ? 'wind' : 'dashWind'); this.telegraph(-0.3); }
        break;
      case 'wind':
        b.vx = 0;
        this.setAnim('windup');
        if (this.st >= this.f(18)) this.to('cut');
        break;
      case 'cut':
        this.setAnim('strike');
        b.vx = this.facing * 10;
        if (this.st < 7) this.active = [this.reachBox(200, 160, 0, 20, 1)];
        if (this.st >= this.f(20)) this.to(this.phase >= 2 && rng(this.scene).chance(0.5) ? 'wind' : 'walk');
        break;
      case 'dashWind':
        b.vx = 0;
        this.face();
        this.setAnim('windup');
        if (this.st >= this.f(24)) this.to('dash');
        break;
      case 'dash':
        this.setAnim('strike');
        b.vx = this.facing * 24;
        this.active = [this.reachBox(120, 140, 0, 60, 1)];
        if (this.st >= 14 || this.wallAhead()) this.to('walk');
        break;
      case 'roar':
        this.setAnim('idle');
        if (this.st >= 40) this.to('walk');
        break;
    }
    this.fall();
    this.clampToRoom();
  }
}
