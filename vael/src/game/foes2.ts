import { approach, clamp } from '../engine/core';
import { HitZone } from './boss';
import { Entity } from './entity';
import { Foe, Orb } from './foes';
import type { Scene } from './scene';

/** A lingering cloud of spores (hurts while inside). */
export class Cloud extends Entity {
  life = 90;
  constructor(scene: Scene, x: number, y: number, public r = 110, public color = 0xff9ad8) {
    super(scene, x, y + r, r * 2, r * 2);
    this.hurtable = false;
    this.prop = true;
    this.brandable = false;
    this.body.noClip = true;
    this.sprite = 'cloud';
    this.contact = 1;
  }
  update(): void {
    if (--this.life <= 0) this.dead = true;
    this.contact = this.life > 10 && this.life < 80 ? 1 : 0;
  }
}

/** A glyph on the ground that bursts after a delay. */
export class Glyph extends Entity {
  life = 46;
  constructor(scene: Scene, x: number, feet: number, public color = 0xb070ff) {
    super(scene, x, feet, 150, 30);
    this.hurtable = false;
    this.prop = true;
    this.brandable = false;
    this.body.noClip = true;
    this.sprite = 'glyph';
    this.contact = 0;
  }
  update(): void {
    if (--this.life === 0) {
      this.dead = true;
      this.scene.add(new HitZone(this.scene, { box: { x: this.cx - 75, y: this.body.y - 170, w: 150, h: 200 }, damage: 1 }, 8));
      this.scene.emit({ t: 'boom', x: this.cx, y: this.body.y - 40, r: 120, color: this.color });
    }
  }
}

/** Veiled priest: floats, fades and reappears near the hero, casts glyphs under their feet. */
export class Pretre extends Foe {
  fade = 1;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 50, 120);
    this.hp = this.maxHp = 34;
    this.dust = 9;
    this.sprite = 'pretre';
    this.body.noPlatforms = true;
  }
  update(): void {
    this.st++;
    const b = this.body;
    b.vx *= 0.9;
    b.vy = Math.sin(this.t * 0.05) * 0.6;
    if (this.stun > 0) { this.scene.moveBody(this); return; }
    this.face();
    switch (this.state) {
      case 'idle':
        this.setAnim('move');
        this.fade = Math.min(1, this.fade + 0.05);
        if (this.near(900, 500) && this.st > 90) { this.to('windup'); this.telegraph(-0.2); }
        if (this.near(900, 500) && this.st > 60 && Math.abs(this.dx()) > 600) this.to('vanish');
        break;
      case 'windup':
        this.setAnim('windup');
        if (this.st >= 30) {
          this.to('cast');
          this.scene.add(new Glyph(this.scene, this.p.cx, this.p.feet));
          this.scene.sfx('art', undefined, undefined, 0.4);
        }
        break;
      case 'cast':
        this.setAnim('strike');
        if (this.st >= 30) this.to(this.scene.rng.chance(0.5) ? 'vanish' : 'idle');
        break;
      case 'vanish':
        this.fade = Math.max(0, this.fade - 0.06);
        this.hurtable = this.fade > 0.3;
        if (this.fade <= 0) {
          const side = this.scene.rng.chance(0.5) ? -1 : 1;
          const nx = clamp(this.p.cx + side * this.scene.rng.range(260, 420), 120, this.scene.room.pxW - 120);
          if (this.scene.fits(nx - b.w / 2, this.p.feet - b.h - 60, b.w, b.h)) { b.x = nx - b.w / 2; b.y = this.p.feet - b.h - 60; }
          this.hurtable = true;
          this.to('idle');
        }
        break;
    }
    this.scene.moveBody(this);
  }
}

/** Gloam knight: prowls low, then a fast clawing lunge; leaps back after being struck twice. */
export class Chevalier extends Foe {
  private struck = 0;
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 60, 110);
    this.hp = this.maxHp = 48;
    this.dust = 12;
    this.sprite = 'chevalier';
  }
  onHurt(): void {
    if (++this.struck >= 2 && this.state !== 'lunge') {
      this.struck = 0;
      this.to('hop');
      this.body.vy = -12;
      this.body.vx = -this.facing * 9;
    }
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { b.vx = approach(b.vx, 0, 0.8); this.fall(); return; }
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.setAnim('move');
        if (this.near(700, 200)) this.face();
        else if (this.wallAhead() || !this.groundAhead()) this.facing *= -1;
        b.vx = approach(b.vx, this.groundAhead() && !this.wallAhead() ? this.facing * (this.near(700, 200) ? 3.4 : 1.5) : 0, 0.5);
        if (this.near(360, 120) && this.st > 40) { this.to('windup'); this.face(); this.telegraph(-0.1); }
        break;
      case 'windup':
        this.setAnim('windup');
        b.vx = approach(b.vx, -this.facing * 2, 0.6);
        if (this.st >= 22) this.to('lunge');
        break;
      case 'lunge':
        this.setAnim('strike');
        b.vx = this.groundAhead(this.facing, 40) ? this.facing * 17 : 0;
        this.active = [this.front(120, 90, 0, 1)];
        if (this.st >= 12) this.to('recover');
        break;
      case 'recover':
        b.vx = approach(b.vx, 0, 1.5);
        if (this.st >= 34) this.to('walk');
        break;
      case 'hop':
        this.setAnim('move');
        if (b.onGround && this.st > 5) this.to('walk');
        break;
    }
    this.fall();
  }
}

/** Carnivorous bloom: rooted; bites forward when the hero comes close. */
export class Ronce extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 70, 110);
    this.hp = this.maxHp = 28;
    this.dust = 6;
    this.sprite = 'ronce';
    this.heavy = true;
  }
  update(): void {
    this.st++;
    this.active = [];
    if (this.stun > 0) return;
    switch (this.state) {
      case 'idle':
        this.setAnim('idle');
        this.face();
        if (this.near(230, 140) && this.st > 30) { this.to('windup'); this.telegraph(-0.2); }
        break;
      case 'windup':
        this.setAnim('windup');
        if (this.st >= 18) this.to('bite');
        break;
      case 'bite':
        this.setAnim('strike');
        if (this.st < 8) this.active = [this.front(190, 80, -10, 1)];
        if (this.st >= 30) this.to('idle');
        break;
    }
    this.fall();
  }
}

/** Spore mother: drifts toward the hero, swells, releases a cloud. */
export class Spore extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 64, 70);
    this.hp = this.maxHp = 20;
    this.dust = 5;
    this.sprite = 'spore';
    this.body.noPlatforms = true;
  }
  update(): void {
    this.st++;
    const b = this.body;
    if (this.stun > 0) { b.vx *= 0.9; b.vy *= 0.9; this.scene.moveBody(this); return; }
    const aware = this.near(800, 500);
    if (this.state === 'idle') {
      this.setAnim('move');
      const tx = aware ? this.p.cx : this.home + Math.sin(this.t * 0.01) * 100;
      const ty = aware ? this.p.cy - 120 : b.y + Math.sin(this.t * 0.04) * 10;
      b.vx = approach(b.vx, clamp((tx - this.cx) * 0.02, -2, 2), 0.1);
      b.vy = approach(b.vy, clamp((ty - this.cy) * 0.02, -1.6, 1.6), 0.1) + Math.sin(this.t * 0.1) * 0.3;
      if (this.near(200, 220) && this.st > 60) { this.to('windup'); this.telegraph(0); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx *= 0.9;
      b.vy *= 0.9;
      this.scale = 1 + (this.st / 30) * 0.25;
      if (this.st >= 30) {
        this.scale = 1;
        this.scene.add(new Cloud(this.scene, this.cx, this.cy));
        this.scene.sfx('kill', undefined, undefined, 0.3);
        this.to('rest');
      }
    } else {
      this.setAnim('strike');
      if (this.st >= 70) this.to('idle');
    }
    this.scene.moveBody(this);
  }
}

/** Scythe mantis: careful steps, a double slash, a hop back. */
export class Mante extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 64, 140);
    this.hp = this.maxHp = 44;
    this.dust = 11;
    this.sprite = 'mante';
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { b.vx = approach(b.vx, 0, 0.8); this.fall(); return; }
    switch (this.state) {
      case 'idle':
      case 'walk':
        this.setAnim('move');
        if (this.near(600, 200)) this.face();
        else if (this.wallAhead() || !this.groundAhead()) this.facing *= -1;
        b.vx = approach(b.vx, this.groundAhead() && !this.wallAhead() ? this.facing * 2.2 : 0, 0.4);
        if (this.near(240, 140) && this.st > 30) { this.to('windup'); this.face(); this.telegraph(-0.3); }
        break;
      case 'windup':
        this.setAnim('windup');
        b.vx = 0;
        if (this.st >= 20) this.to('slash');
        break;
      case 'slash':
        this.setAnim('strike');
        if (this.st < 5 || (this.st >= 12 && this.st < 17)) this.active = [this.front(200, 130, -10, 1)];
        if (this.st === 12) this.scene.emit({ t: 'telegraph', x: this.cx + this.facing * 60, y: this.cy - 30 });
        if (this.st >= 24) {
          this.to('hop');
          b.vy = -11;
          b.vx = -this.facing * 8;
        }
        break;
      case 'hop':
        if (b.onGround && this.st > 4) this.to('walk');
        break;
    }
    this.fall();
  }
}

/** Ember worker: waddles, swells, breathes a cone of embers. */
export class Souffle extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 56, 90);
    this.hp = this.maxHp = 36;
    this.dust = 9;
    this.sprite = 'souffle';
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { b.vx = approach(b.vx, 0, 0.8); this.fall(); return; }
    if (this.state === 'idle' || this.state === 'walk') {
      this.setAnim('move');
      if (this.near(600, 200)) this.face();
      else if (this.wallAhead() || !this.groundAhead()) this.facing *= -1;
      b.vx = approach(b.vx, this.groundAhead() && !this.wallAhead() ? this.facing * 1.8 : 0, 0.3);
      if (this.near(320, 120) && this.st > 50) { this.to('windup'); this.face(); this.telegraph(-0.2); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx = 0;
      if (this.st >= 30) this.to('breath');
    } else if (this.state === 'breath') {
      this.setAnim('strike');
      if (this.st < 40) {
        this.active = [this.front(260, 90, -10, 1)];
        if (this.st % 3 === 0) this.scene.emit({ t: 'spark', x: this.cx + this.facing * (60 + (this.st % 9) * 22), y: this.cy - 10, n: 3, color: 0xff9040 });
      }
      if (this.st >= 60) this.to('walk');
    }
    this.fall();
  }
}

/** Anvil brute: slow; raises both fists and pounds, sending waves along the floor. */
export class Enclume extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 110, 170);
    this.hp = this.maxHp = 90;
    this.dust = 22;
    this.sprite = 'enclume';
    this.heavy = true;
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { this.fall(); return; }
    if (this.state === 'idle' || this.state === 'walk') {
      this.setAnim('move');
      this.face();
      b.vx = this.near(800, 260) && this.groundAhead() && !this.wallAhead() ? this.facing * 1.3 : 0;
      if (this.near(420, 200) && this.st > 70) { this.to('windup'); this.telegraph(-0.4, true); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx = 0;
      if (this.st >= 40) {
        this.to('pound');
        this.scene.add(new HitZone(this.scene, { box: { x: this.cx - 150, y: b.y + b.h - 120, w: 300, h: 120 }, damage: 1 }, 6));
        this.scene.emit({ t: 'boom', x: this.cx, y: b.y + b.h, r: 140, color: 0xff9040 });
        for (const d of [-1, 1]) this.scene.add(new (WaveCtor())(this.scene, this.cx + d * 60, b.y + b.h, d, 10, 60));
      }
    } else {
      this.setAnim('strike');
      if (this.st >= 50) this.to('walk');
    }
    this.fall();
  }
}

/** Ember sprite: darts around, curls up, then rushes at the hero. */
export class Etincelle extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 44, 44);
    this.hp = this.maxHp = 14;
    this.dust = 4;
    this.sprite = 'etincelle';
    this.body.noPlatforms = true;
  }
  update(): void {
    this.st++;
    const b = this.body;
    if (this.stun > 0) { b.vx *= 0.9; b.vy = Math.min(b.vy + 0.3, 5); this.scene.moveBody(this); return; }
    this.face();
    if (this.state === 'idle') {
      this.setAnim('move');
      const tx = this.p.cx + Math.cos(this.t * 0.03) * 260;
      const ty = this.p.cy - 180 + Math.sin(this.t * 0.05) * 60;
      if (this.near(900, 600)) {
        b.vx = approach(b.vx, clamp((tx - this.cx) * 0.04, -6, 6), 0.4);
        b.vy = approach(b.vy, clamp((ty - this.cy) * 0.04, -6, 6), 0.4);
        if (this.st > 90) { this.to('windup'); this.telegraph(0); }
      } else { b.vx *= 0.95; b.vy *= 0.95; }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx *= 0.85;
      b.vy *= 0.85;
      if (this.st >= 24) {
        const dx = this.p.cx - this.cx;
        const dy = this.p.cy - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        b.vx = (dx / d) * 15;
        b.vy = (dy / d) * 15;
        this.to('rush');
      }
    } else {
      this.setAnim('strike');
      const r = this.scene.moveBody(this);
      if (r.hitX || r.hitY || this.st > 40) { this.to('idle'); b.vx *= -0.3; b.vy *= -0.3; }
      return;
    }
    this.scene.moveBody(this);
  }
}

/** Drowned reader: floats, opens its book: a fan of three cutting pages. */
export class Lecteur extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 54, 120);
    this.hp = this.maxHp = 40;
    this.dust = 11;
    this.sprite = 'lecteur';
    this.body.noPlatforms = true;
  }
  update(): void {
    this.st++;
    const b = this.body;
    if (this.stun > 0) { b.vx *= 0.9; this.scene.moveBody(this); return; }
    this.face();
    b.vy = Math.sin(this.t * 0.04) * 0.8;
    if (this.state === 'idle') {
      this.setAnim('move');
      const want = this.near(900, 500) ? this.p.cx - Math.sign(this.dx() || 1) * 380 : this.home;
      b.vx = approach(b.vx, clamp((want - this.cx) * 0.02, -2.4, 2.4), 0.15);
      if (this.near(800, 400) && this.st > 100) { this.to('windup'); this.telegraph(-0.1); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx *= 0.9;
      if (this.st >= 30) {
        const a0 = Math.atan2(this.p.cy - this.cy, this.p.cx - this.cx);
        for (const da of [-0.25, 0, 0.25]) this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(a0 + da) * 8, Math.sin(a0 + da) * 8, 0x70e0ff, 200));
        this.to('cast');
      }
    } else {
      this.setAnim('strike');
      if (this.st >= 40) this.to('idle');
    }
    this.scene.moveBody(this);
  }
}

/** Ink eel: hides in water, leaps out in an arc at the hero. */
export class Anguille extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 90, 40);
    this.hp = this.maxHp = 26;
    this.dust = 8;
    this.sprite = 'anguille';
    this.homeY = this.body.y;
  }
  homeY: number;
  update(): void {
    this.st++;
    const b = this.body;
    if (this.state === 'idle') {
      this.setAnim('move');
      this.hurtable = false;
      b.y = this.homeY + 30;
      b.x += Math.sin(this.t * 0.03) * 1.5;
      if (this.near(500, 500) && this.st > 80) { this.to('windup'); this.face(); this.telegraph(0); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      this.hurtable = true;
      b.y = this.homeY;
      if (this.st >= 24) {
        this.to('leap');
        b.vy = -22;
        b.vx = clamp(this.dx() / 32, -12, 12);
      }
    } else {
      this.setAnim('strike');
      b.vy = Math.min(b.vy + 0.9, 20);
      b.x += b.vx;
      b.y += b.vy;
      if (b.y >= this.homeY && b.vy > 0) { b.y = this.homeY; b.vx = 0; this.to('idle'); }
    }
  }
}

/** Cell warden: shield up in front (blows bounce), chain mace swung overhead. Strike from behind or above. */
export class Geolier extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 70, 150);
    this.hp = this.maxHp = 70;
    this.dust = 18;
    this.sprite = 'geolier';
    this.heavy = true;
  }
  damage(amount: number, fromX: number, source: Parameters<Foe['damage']>[2]): boolean {
    const front = Math.sign(fromX - this.cx) === this.facing;
    if (front && this.state !== 'swing' && this.state !== 'recover' && source !== 'art' && source !== 'execute' && source !== 'rip') {
      this.scene.emit({ t: 'clank', x: this.cx + this.facing * 40, y: this.cy });
      return false;
    }
    return super.damage(amount, fromX, source);
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { this.fall(); return; }
    if (this.state === 'idle' || this.state === 'walk') {
      this.setAnim('move');
      this.face();
      b.vx = this.near(700, 220) && this.groundAhead() && !this.wallAhead() ? this.facing * 1.6 : 0;
      if (this.near(300, 200) && this.st > 50) { this.to('windup'); this.telegraph(-0.4, true); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx = 0;
      if (this.st >= 34) this.to('swing');
    } else if (this.state === 'swing') {
      this.setAnim('strike');
      if (this.st < 8) this.active = [this.front(240, 200, 0, 1)];
      if (this.st === 2) this.scene.emit({ t: 'boom', x: this.cx + this.facing * 200, y: b.y + b.h - 20, r: 90, color: 0xc8c0e0 });
      if (this.st >= 8) this.to('recover');
    } else {
      if (this.st >= 46) this.to('walk');
    }
    this.fall();
  }
}

/** Chain raven: hovers high, rears up, then dives at where the hero was. */
export class Corbeau extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 80, 60);
    this.hp = this.maxHp = 30;
    this.dust = 9;
    this.sprite = 'corbeau';
    this.body.noPlatforms = true;
  }
  tx = 0;
  ty = 0;
  update(): void {
    this.st++;
    const b = this.body;
    if (this.stun > 0) { b.vx *= 0.9; b.vy = Math.min(b.vy + 0.5, 8); this.scene.moveBody(this); return; }
    this.face();
    if (this.state === 'idle') {
      this.setAnim('move');
      if (this.near(1000, 700)) {
        const hx = this.p.cx - this.facing * 200;
        const hy = this.p.cy - 300;
        b.vx = approach(b.vx, clamp((hx - this.cx) * 0.03, -5, 5), 0.3);
        b.vy = approach(b.vy, clamp((hy - this.cy) * 0.03, -4, 4), 0.3);
        if (this.st > 110) { this.to('windup'); this.telegraph(0); this.tx = this.p.cx; this.ty = this.p.cy; }
      } else { b.vx *= 0.95; b.vy = Math.sin(this.t * 0.05); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx *= 0.8;
      b.vy = -1.5;
      if (this.st >= 26) {
        const dx = this.tx - this.cx;
        const dy = this.ty - this.cy;
        const d = Math.hypot(dx, dy) || 1;
        b.vx = (dx / d) * 18;
        b.vy = (dy / d) * 18;
        this.to('dive');
      }
    } else {
      this.setAnim('strike');
      const r = this.scene.moveBody(this);
      if (r.hitX || r.hitY || this.st > 36) { b.vx *= 0.2; b.vy = -6; this.to('idle'); }
      return;
    }
    this.scene.moveBody(this);
  }
}

/** Starling: a floating turret; charges, then fires a spray of light. */
export class Astrelet extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 60, 60);
    this.hp = this.maxHp = 28;
    this.dust = 9;
    this.sprite = 'astrelet';
    this.body.noPlatforms = true;
  }
  update(): void {
    this.st++;
    const b = this.body;
    b.vy = Math.sin(this.t * 0.04) * 1.2;
    b.vx = Math.cos(this.t * 0.02) * 1.2;
    if (this.stun > 0) { this.scene.moveBody(this); return; }
    if (this.state === 'idle') {
      this.setAnim('move');
      if (this.near(900, 600) && this.st > 120) { this.to('windup'); this.telegraph(0); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      if (this.st >= 36) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.t * 0.1;
          this.scene.add(new Orb(this.scene, this.cx, this.cy, Math.cos(a) * 6, Math.sin(a) * 6, 0xff9ad8, 160));
        }
        this.to('fire');
      }
    } else {
      this.setAnim('strike');
      if (this.st >= 30) this.to('idle');
    }
    this.scene.moveBody(this);
  }
}

/** Gloam mother: crawls, rears up and lashes long arms on both sides. */
export class OmbreMere extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 110, 90);
    this.hp = this.maxHp = 60;
    this.dust = 16;
    this.sprite = 'ombre';
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { b.vx = approach(b.vx, 0, 0.8); this.fall(); return; }
    if (this.state === 'idle' || this.state === 'walk') {
      this.setAnim('move');
      this.face();
      b.vx = approach(b.vx, this.near(800, 250) && this.groundAhead() && !this.wallAhead() ? this.facing * 2.8 : 0, 0.3);
      if (this.near(330, 200) && this.st > 40) { this.to('windup'); this.telegraph(-0.3, true); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx = 0;
      if (this.st >= 28) this.to('lash');
    } else if (this.state === 'lash') {
      this.setAnim('strike');
      if (this.st < 10) this.active = [{ box: { x: this.cx - 330, y: b.y - 40, w: 660, h: b.h + 40 }, damage: 1 }];
      if (this.st >= 40) this.to('walk');
    }
    this.fall();
  }
}

/** Crystal sentinel: stately; draws its lance back, then a long thrust of light. */
export class Sentinelle extends Foe {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 64, 160);
    this.hp = this.maxHp = 80;
    this.dust = 20;
    this.sprite = 'sentinelle';
  }
  update(): void {
    this.st++;
    this.active = [];
    const b = this.body;
    if (this.stun > 0) { b.vx = approach(b.vx, 0, 0.8); this.fall(); return; }
    if (this.state === 'idle' || this.state === 'walk') {
      this.setAnim('move');
      this.face();
      b.vx = approach(b.vx, this.near(800, 250) && this.groundAhead() && !this.wallAhead() ? this.facing * 2 : 0, 0.3);
      if (this.near(480, 150) && this.st > 50) { this.to('windup'); this.telegraph(-0.2, true); }
    } else if (this.state === 'windup') {
      this.setAnim('windup');
      b.vx = approach(b.vx, -this.facing * 1.5, 0.4);
      if (this.st >= 30) this.to('thrust');
    } else if (this.state === 'thrust') {
      this.setAnim('strike');
      if (this.st < 7) this.active = [this.front(460, 50, -20, 1)];
      if (this.st === 1) this.scene.emit({ t: 'spark', x: this.cx + this.facing * 300, y: this.cy - 20, n: 14, color: 0xfff0c8 });
      if (this.st >= 40) this.to('walk');
    }
    this.fall();
  }
}

let waveCtor: (new (s: Scene, x: number, feet: number, dir: number, speed: number, h: number) => Entity) | null = null;
export function setWaveCtor(c: typeof waveCtor): void {
  waveCtor = c;
}
function WaveCtor() {
  return waveCtor!;
}
