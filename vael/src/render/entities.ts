import { Container, Graphics, Sprite } from 'pixi.js';
import type { Entity } from '../game/entity';
import type { Scene } from '../game/scene';
import { AnimSprite, type Clip } from './anim';
import { hasTex, sheet, tex } from './assets';
import { fxTextures } from './textures';
import type { GameView } from './view';

/** How an entity looks: a sheet with move/attack rows, or a single picture, a scale and a light. */
export interface Look {
  sheet?: string;
  image?: string;
  /** Height in pixels on screen. */
  height: number;
  /** Extra anchor tweak (0..1 of height) to sink feet into the ground. */
  sink?: number;
  light?: { color: number; radius: number; dy?: number };
  /** Sheets are drawn facing left. */
  facesLeft?: boolean;
  /** Bob for flyers. */
  bob?: number;
  additive?: boolean;
  /** Custom rotation from the entity (projectiles). */
  rotate?: boolean;
  tint?: number;
  /** Procedural drawing on top of (or instead of) the picture. */
  custom?: (g: Graphics, e: Entity, now: number) => void;
  /** Hide the picture (custom drawing only). */
  noBody?: boolean;
  /** Draw the custom layer additively. */
  customAdd?: boolean;
}

const LOOKS: Record<string, Look> = {};

export function defineLook(key: string, look: Look): void {
  LOOKS[key] = look;
}

/** Default clips for 4×2 sheets: row 1 loops (move), row 2 = wind-up (4-5) and strike (6-7). */
function clipFor(e: Entity, l: Look): { clip: Clip; t: number } {
  if (e.anim.startsWith('@')) {
    // Explicit clip from any sheet: "@sheet|a,b,c|hold|loop".
    const [sh, list, hold, loop] = e.anim.slice(1).split('|');
    return { clip: { sheet: sh, frames: list.split(',').map(Number), hold: Number(hold || 6), loop: loop === '1' }, t: e.animT };
  }
  const s = l.sheet!;
  switch (e.anim) {
    case 'windup':
      return { clip: { sheet: s, frames: [4, 5], hold: 7, loop: false }, t: e.animT };
    case 'strike':
      return { clip: { sheet: s, frames: [6, 7], hold: 5, loop: false }, t: e.animT };
    case 'idle':
      return { clip: { sheet: s, frames: [0, 1, 2, 3], hold: 11, loop: true }, t: e.animT };
    default:
      if (e.anim.startsWith('f:')) {
        // Explicit frames "f:a,b,c:hold" from bosses.
        const [, list, hold] = e.anim.split(':');
        return { clip: { sheet: s, frames: list.split(',').map(Number), hold: Number(hold || 6), loop: false }, t: e.animT };
      }
      return { clip: { sheet: s, frames: [0, 1, 2, 3], hold: 7, loop: true }, t: e.animT };
  }
}

interface View {
  c: Container;
  body: AnimSprite;
  flash: Sprite;
  look: Look;
  g: Graphics | null;
}

export class EntityViews {
  private views = new Map<number, View>();

  constructor(private gv: GameView) {}

  clear(): void {
    for (const v of this.views.values()) v.c.destroy({ children: true });
    this.views.clear();
  }

  private make(e: Entity): View | null {
    const look = LOOKS[e.sprite];
    if (!look) return null;
    const c = new Container();
    const body = new AnimSprite();
    const flash = new Sprite();
    flash.blendMode = 'add';
    flash.alpha = 0;
    if (look.additive) body.blendMode = 'add';
    if (look.tint !== undefined) body.tint = look.tint;
    c.addChild(body, flash);
    let g: Graphics | null = null;
    if (look.custom) {
      g = new Graphics();
      if (look.customAdd) g.blendMode = 'add';
      c.addChild(g);
    }
    if (look.noBody) {
      body.visible = false;
      flash.visible = false;
    }
    this.gv.actors.addChild(c);
    const v = { c, body, flash, look, g };
    this.views.set(e.id, v);
    return v;
  }

  update(scene: Scene, _dt: number): void {
    const alive = new Set<number>();
    for (const e of scene.entities) {
      if (!e.sprite) continue;
      alive.add(e.id);
      const v = this.views.get(e.id) ?? this.make(e);
      if (!v) continue;
      const l = v.look;
      const facing = l.facesLeft ? -e.facing : e.facing;
      let shown = false;
      let scale = 1;
      if (l.sheet && sheet(l.sheet)) {
        const { clip, t } = clipFor(e, l);
        const s = sheet(l.sheet)!;
        if (!sheet(clip.sheet)) clip.sheet = l.sheet;
        const ref = s.frames[0];
        scale = (l.height / ref.tex.frame.height) * e.scale;
        shown = v.body.show(clip, t, facing, scale);
      }
      if (!shown) {
        const name = l.image && hasTex(l.image) ? l.image : null;
        const t = name ? tex(name) : fxTextures().glow;
        v.body.texture = t;
        v.body.anchor.set(0.5, 1 - (l.sink ?? 0));
        scale = (l.height / t.height) * e.scale;
        v.body.scale.set(facing * scale, scale);
        if (!name) v.body.tint = 0xb080ff;
      }
      const bob = l.bob ? Math.sin(e.t * 0.08) * l.bob : 0;
      v.c.position.set(e.cx + e.shakeX, e.body.y + e.body.h + bob);
      if (l.rotate) {
        v.body.rotation = Math.atan2(e.body.vy, e.body.vx);
        v.c.position.set(e.cx, e.cy);
        v.body.anchor.set(0.5, 0.5);
      }
      v.flash.texture = v.body.texture;
      v.flash.anchor.copyFrom(v.body.anchor);
      v.flash.scale.copyFrom(v.body.scale);
      v.flash.rotation = v.body.rotation;
      v.flash.alpha = e.flash > 0 ? (e.flash / 7) * 0.9 : e.stun > 0 ? 0.15 + Math.sin(e.t * 0.6) * 0.1 : 0;
      v.flash.tint = e.stun > 0 && e.flash === 0 ? 0xffe0a0 : 0xffffff;
      v.c.alpha = (e as unknown as { fade?: number }).fade ?? 1;
      if (v.g && l.custom) {
        v.g.clear();
        v.g.position.set(-v.c.x, -v.c.y);
        l.custom(v.g, e, performance.now() / 1000);
      }
    }
    for (const [id, v] of this.views) {
      if (!alive.has(id)) {
        v.c.destroy({ children: true });
        this.views.delete(id);
      }
    }
  }

  lights(scene: Scene): void {
    for (const e of scene.entities) {
      const l = LOOKS[e.sprite]?.light;
      if (!l || e.dead) continue;
      this.gv.light(e.cx, e.cy + (l.dy ?? 0), l.radius, l.color, 0.8);
    }
  }
}
