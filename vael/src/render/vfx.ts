import { Container, Sprite, type Texture } from 'pixi.js';
import { fx } from '../engine/core';

export interface ParticleOpts {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life: number;
  scale?: number;
  scaleEnd?: number;
  /** Stretch along the velocity (sparks). */
  stretch?: number;
  alpha?: number;
  tint?: number;
  rot?: number;
  spin?: number;
  drag?: number;
  gravity?: number;
  add?: boolean;
  /** Fades in over this fraction of the life. */
  fadeIn?: number;
  /** Uses velocity for rotation. */
  align?: boolean;
  scaleX?: number;
}

interface P extends Required<Omit<ParticleOpts, 'x' | 'y'>> {
  s: Sprite;
  age: number;
  x: number;
  y: number;
}

/** Pooled sprite particles: sparks, motes, smoke, flashes, rings, slash arcs. All visual, never simulation. */
export class Vfx {
  readonly add = new Container();
  readonly normal = new Container();
  private live: P[] = [];
  private pool: Sprite[] = [];

  spawn(texture: Texture, o: ParticleOpts): Sprite {
    const s = this.pool.pop() ?? new Sprite();
    s.texture = texture;
    s.anchor.set(0.5);
    s.visible = true;
    s.blendMode = o.add === false ? 'normal' : 'add';
    s.tint = o.tint ?? 0xffffff;
    (o.add === false ? this.normal : this.add).addChild(s);
    const p: P = {
      s, age: 0, x: o.x, y: o.y, vx: o.vx ?? 0, vy: o.vy ?? 0, life: o.life, scale: o.scale ?? 1, scaleEnd: o.scaleEnd ?? o.scale ?? 1,
      stretch: o.stretch ?? 0, alpha: o.alpha ?? 1, tint: o.tint ?? 0xffffff, rot: o.rot ?? 0, spin: o.spin ?? 0, drag: o.drag ?? 1,
      gravity: o.gravity ?? 0, add: o.add ?? true, fadeIn: o.fadeIn ?? 0, align: o.align ?? false, scaleX: o.scaleX ?? 1,
    };
    this.live.push(p);
    this.apply(p);
    return s;
  }

  private apply(p: P): void {
    const k = p.age / p.life;
    const s = p.s;
    s.position.set(p.x, p.y);
    const sc = p.scale + (p.scaleEnd - p.scale) * k;
    if (p.stretch > 0) {
      const v = Math.hypot(p.vx, p.vy);
      s.scale.set(sc * (1 + v * p.stretch), sc);
      s.rotation = Math.atan2(p.vy, p.vx);
    } else {
      s.scale.set(sc * p.scaleX, sc);
      s.rotation = p.align ? Math.atan2(p.vy, p.vx) : p.rot;
    }
    const fadeOut = 1 - Math.max(0, (k - 0.35) / 0.65);
    const fadeIn = p.fadeIn > 0 ? Math.min(1, k / p.fadeIn) : 1;
    s.alpha = p.alpha * fadeIn * fadeOut * fadeOut;
  }

  /** dt: 1 per game frame (fraction during slow motion). */
  update(dt = 1): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      if (p.age >= p.life) {
        p.s.visible = false;
        p.s.removeFromParent();
        this.pool.push(p.s);
        this.live.splice(i, 1);
        continue;
      }
      const drag = Math.pow(p.drag, dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      this.apply(p);
    }
  }

  clear(): void {
    for (const p of this.live) {
      p.s.visible = false;
      p.s.removeFromParent();
      this.pool.push(p.s);
    }
    this.live = [];
  }

  /** Radial burst of sparks. */
  burst(texture: Texture, x: number, y: number, n: number, o: { speed?: number; life?: number; tint?: number; scale?: number; dir?: number; spread?: number; gravity?: number; stretch?: number; drag?: number }): void {
    for (let i = 0; i < n; i++) {
      const a = o.dir !== undefined ? o.dir + fx.range(-(o.spread ?? Math.PI), o.spread ?? Math.PI) : fx.range(0, Math.PI * 2);
      const sp = (o.speed ?? 8) * fx.range(0.35, 1.15);
      this.spawn(texture, {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (o.life ?? 24) * fx.range(0.6, 1.2), scale: (o.scale ?? 0.25) * fx.range(0.6, 1.3),
        scaleEnd: 0, tint: o.tint, gravity: o.gravity ?? 0, stretch: o.stretch ?? 0, drag: o.drag ?? 0.9,
      });
    }
  }
}
