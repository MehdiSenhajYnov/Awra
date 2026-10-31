import { audio, type Sfx } from '../engine/audio';
import { fits } from '../engine/body';
import { type Box, CELL_H, CELL_W, Rng, TILE, VIEW_H, VIEW_W, clamp, fx, hash, overlap } from '../engine/core';
import { input } from '../engine/input';
import { Particles } from '../engine/particles';
import { drawBackdrop, drawForeground, drawLighting } from '../render/backdrop';
import { drawEcho, drawPlayer } from '../render/actors';
import { renderTerrain } from '../render/terrain';
import { type Room, T, ZONES, buildRoom, clearOwned, tileAt } from '../world/room';
import { roomAt, roomDef } from '../world/world';
import { PALETTES } from '../world/zones';
import { Echo } from './echo';
import { type DamageSource, Entity, type Hit } from './entity';
import { bonusHp, computeStats, on, takenMul } from './notes';
import { type Controls, NO_CONTROLS, Player } from './player';
import { type Save, writeSlot } from './save';
import { type ItemKind } from './props';
import { BOSS_REWARD, spawnEntity } from './spawn';
import { tx } from '../i18n';
import type { Boss } from './bosses';

/** A modal layer on top of play (dialogue, shop, menus): it receives input while open. */
export interface Modal {
  update(scene: Scene): boolean;
  draw(ctx: CanvasRenderingContext2D, scene: Scene): void;
  /** Lets the world keep running underneath (e.g. a toast); default false. */
  live?: boolean;
}

export interface UiHooks {
  areaTitle(zone: string): void;
  talk(who: string): void;
  pickup(kind: ItemKind, value: string): void;
  toast(text: string, icon?: string): void;
  bossBar(e: Entity | null, name?: string): void;
  rest(): void;
  died(): void;
  ended(kind: 'cloche' | 'silence'): void;
}

export class Scene {
  room!: Room;
  terrain!: HTMLCanvasElement | null;
  entities: Entity[] = [];
  player = new Player();
  echoes: Echo[] = [];
  particles = new Particles();
  cam = { x: 0, y: 0 };
  shake = 0;
  freeze = 0;
  time = 0;
  fade = 1;
  fadeTo = 0;
  private pending: (() => void) | null = null;
  modal: Modal | null = null;
  rng = new Rng(Date.now() & 0xffff);
  /** Arena locked while a boss lives. */
  locked = false;
  boss: Entity | null = null;
  bossName = '';
  /** Headless scenes (tests) skip rendering work. */
  headless = false;
  /** God mode for automated runs. */
  god = false;
  ui: UiHooks;
  respawning = false;

  constructor(public save: Save, ui: Partial<UiHooks> = {}) {
    const noop = () => undefined;
    this.ui = { areaTitle: noop, talk: noop, pickup: noop, toast: noop, bossBar: noop, rest: noop, died: noop, ended: noop, ...ui };
    this.applySave();
  }

  /** Copies abilities and upgrades from the save into the player. */
  applySave(): void {
    const p = this.player;
    p.abilities = new Set(this.save.abilities);
    p.stats = computeStats(this.save);
    p.maxHp = this.save.maxHp + bonusHp(this.save);
    p.maxRes = this.save.maxRes;
    p.hp = Math.min(p.hp || p.maxHp, p.maxHp);
    p.res = Math.min(p.res, p.maxRes);
  }

  get flags(): Record<string, boolean | number> {
    return this.save.flags;
  }

  setFlag(flag: string, v: boolean | number = true): void {
    this.save.flags[flag] = v;
  }

  sfx(name: Sfx, pitch = 1): void {
    if (!this.headless) audio.play(name, pitch);
  }

  shakeBy(n: number): void {
    this.shake = Math.max(this.shake, n);
  }

  spawn(e: Entity): void {
    this.entities.push(e);
  }

  // ---------- rooms ----------

  /** Loads a room and places the player at `feet` (pixels), or at the room's lectern. */
  enter(id: string, feet?: { x: number; y: number }, keepVelocity?: { vx: number; vy: number }): void {
    const def = roomDef(id);
    this.room = buildRoom(def, this.save.flags);
    this.terrain = this.headless ? null : renderTerrain(this.room);
    this.entities = [];
    this.echoes = [];
    this.particles.list = [];
    this.locked = false;
    this.boss = null;
    this.ui.bossBar(null);
    for (const [kind, x, y, opts] of def.ents ?? []) {
      const e = spawnEntity(this, kind, x * TILE + TILE / 2, (y + 1) * TILE, opts ?? {}, `${id}:${kind}:${x}:${y}`);
      if (e) this.entities.push(e);
    }
    // The dropped bronze waits where the player fell.
    const g = this.save.glas;
    if (g && g.room === id) {
      const e = spawnEntity(this, 'glas', g.x, g.y, {}, 'glas');
      if (e) this.entities.push(e);
    }
    const p = this.player;
    if (feet) {
      p.place(feet.x, feet.y);
      if (keepVelocity) { p.body.vx = keepVelocity.vx; p.body.vy = keepVelocity.vy; }
    } else {
      const lectern = (def.ents ?? []).find((e) => e[0] === 'lectern');
      const [, lx, ly] = lectern ?? ['', 3, 15];
      p.place(lx * TILE + TILE / 2 + 24, (ly + 1) * TILE);
    }
    const firstVisit = !this.save.visited.includes(id);
    if (firstVisit) this.save.visited.push(id);
    if (def.title && firstVisit) this.ui.areaTitle(def.zone);
    if (!this.headless) audio.music(ZONES.indexOf(def.zone), PALETTES[def.zone].key);
    this.snapCamera();
  }

  /** Fades out, runs `fn`, fades back in. */
  transition(fn: () => void, speed = 0.12): void {
    if (this.pending) return;
    this.pending = fn;
    this.fadeTo = 1;
    this.fadeSpeed = speed;
  }
  private fadeSpeed = 0.12;

  private checkExit(): void {
    const p = this.player;
    const b = p.body;
    const W = this.room.w * TILE;
    const H = this.room.h * TILE;
    let side: 'l' | 'r' | 'u' | 'd' | null = null;
    if (b.x + b.w / 2 < 0) side = 'l';
    else if (b.x + b.w / 2 > W) side = 'r';
    else if (b.y + b.h / 2 < 0) side = 'u';
    else if (b.y + b.h / 2 > H) side = 'd';
    if (!side || this.locked) return;
    const gx = this.room.gx * TILE + p.cx;
    const gy = this.room.gy * TILE + p.cy;
    const probeX = side === 'l' ? gx - TILE : side === 'r' ? gx + TILE : gx;
    const probeY = side === 'u' ? gy - TILE * 2 : side === 'd' ? gy + TILE : gy;
    const next = roomAt(Math.floor(probeX / TILE), Math.floor(probeY / TILE));
    if (!next) {
      // No neighbour: treat the edge as a wall.
      b.x = clamp(b.x, 0, W - b.w);
      b.y = clamp(b.y, 0, H - b.h);
      return;
    }
    const nx = next.at[0] * CELL_W * TILE;
    const ny = next.at[1] * CELL_H * TILE;
    let fxp = gx - nx;
    let fyp = this.room.gy * TILE + b.y + b.h - ny;
    const vel = { vx: b.vx, vy: b.vy };
    const [nw, nh] = next.size ?? [1, 1];
    if (side === 'l') fxp = nw * CELL_W * TILE - 14;
    if (side === 'r') fxp = 14;
    if (side === 'u') { fyp = nh * CELL_H * TILE - 4; vel.vy = Math.min(vel.vy, -9); }
    if (side === 'd') fyp = b.h + 6;
    this.enter(next.id, { x: fxp, y: fyp }, vel);
  }

  // ---------- frame ----------

  controls(): Controls {
    return {
      x: input.axisX, y: input.axisY,
      jumpPressed: input.buffered('jump'), jumpHeld: input.held('jump'),
      attackPressed: input.buffered('attack'), parryPressed: input.pressed('parry'),
      echoPressed: input.pressed('echo'), healHeld: input.held('heal'), dashPressed: input.buffered('dash'),
    };
  }

  update(c: Controls = this.controls()): void {
    this.time++;
    this.save.time += 1 / 60;
    if (this.fadeTo !== this.fade) {
      this.fade = this.fadeTo > this.fade ? Math.min(1, this.fade + this.fadeSpeed) : Math.max(0, this.fade - this.fadeSpeed);
      if (this.fade >= 1 && this.pending) {
        const fn = this.pending;
        this.pending = null;
        fn();
        this.fadeTo = 0;
      }
    }
    if (this.modal) {
      if (this.modal.update(this)) {
        this.modal = null;
        input.clearBuffer();
        return;
      }
      if (!this.modal.live) return;
    }
    if (this.freeze > 0) { this.freeze--; return; }
    if (this.pending) return;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.6);

    const p = this.player;
    const anchors = this.entities.filter((e) => (e as unknown as { anchor?: boolean }).anchor).map((e) => ({ x: e.cx, y: e.cy }));
    const ev = p.dead ? [] : p.update(this.room, this.respawning ? NO_CONTROLS : c, anchors);
    for (const e of ev) {
      switch (e.kind) {
        case 'swing': this.sfx('swing'); break;
        case 'jump': this.sfx('jump'); break;
        case 'double': this.sfx('jump', 1.4); this.particles.burst(p.cx, p.body.y + p.body.h, 8, '#d8e4ff', { speed: 2, dir: Math.PI / 2, spread: 2 }); break;
        case 'dash': this.sfx('dash'); this.particles.burst(p.cx, p.cy, 10, '#9fb6e8', { speed: 2.5, dir: p.facing > 0 ? Math.PI : 0, spread: 0.6, kind: 'spark' }); break;
        case 'parry': this.sfx('swing', 1.6); break;
        case 'healStart': this.sfx('heal'); break;
        case 'healed': this.sfx('healed'); this.particles.burst(p.cx, p.cy, 16, '#ffe3a0', { speed: 1.5, gravity: -0.05 }); break;
        case 'echo': this.useEcho(); break;
        case 'hazard': this.hazard(); break;
        case 'slamLand': this.slamLand(); break;
        case 'grapple': this.sfx('grapple'); break;
      }
    }
    for (const echo of this.echoes) echo.update();
    this.echoes = this.echoes.filter((e) => !e.done);
    for (const e of [...this.entities]) {
      e.tick();
      e.update();
    }
    this.combat();
    this.platformsCarry();
    this.entities = this.entities.filter((e) => !e.dead || (e as unknown as { linger?: boolean }).linger);
    this.particles.update();
    this.checkExit();
    this.updateCamera();
  }

  // ---------- echo ----------

  private useEcho(): void {
    const p = this.player;
    const live = this.echoes.find((e) => e.active);
    if (live && p.abilities.has('swap')) {
      const f = live.frame;
      const from = { x: p.cx, y: p.cy };
      if (!fits(this.room, f.x, f.y, p.body.w, p.body.h)) return;
      p.body.x = f.x;
      p.body.y = f.y;
      p.body.vx = f.vx;
      p.body.vy = Math.min(f.vy, 2);
      p.facing = f.facing;
      p.invuln = Math.max(p.invuln, 16);
      p.airDashUsed = false;
      p.doubleUsed = false;
      for (const e of this.echoes) e.done = true;
      this.sfx('swap');
      this.particles.burst(from.x, from.y, 14, '#a8f0ff', { speed: 2.5 });
      this.particles.burst(p.cx, p.cy, 14, '#ffffff', { speed: 2.5 });
      if (on(this.save, 'contrepoint')) this.wave(p.cx, p.cy, 54, 2);
      return;
    }
    if (live || p.res < 1) { this.sfx('back'); return; }
    const n = p.stats.echoFrames;
    if (p.history.length < 20) return;
    const frames = p.history.slice(-n);
    p.res--;
    for (let i = 0; i < p.stats.echoCopies; i++) this.echoes.push(new Echo(frames, i * 24, i));
    this.sfx('echo');
    const f0 = frames[0];
    this.particles.ring(f0.x + 6, f0.y + 13, '#a8f0ff', 30);
  }

  /** A shockwave that damages everything around (Diapason, Contrepoint, plunging strike). */
  wave(x: number, y: number, radius: number, dmg: number): void {
    this.particles.ring(x, y, '#ffe9b0', radius, 16);
    for (const e of this.entities) {
      if (!e.hurtable || e.dead) continue;
      if (Math.hypot(e.cx - x, e.cy - y) < radius + Math.max(e.body.w, e.body.h) / 2) this.strike(e, dmg, x, 'wave');
    }
  }

  private slamLand(): void {
    const p = this.player;
    this.sfx('slam');
    this.shakeBy(7);
    this.particles.burst(p.cx, p.body.y + p.body.h, 24, PALETTES[this.room.def.zone].rim, { speed: 4, dir: -Math.PI / 2, spread: 2.6 });
    // Break the floor under the plunge.
    const ty = Math.floor((p.body.y + p.body.h + 2) / TILE);
    for (let tx = Math.floor((p.body.x - 8) / TILE); tx <= Math.floor((p.body.x + p.body.w + 8) / TILE); tx++) {
      if (tileAt(this.room, tx, ty) === T.Slam) this.breakTile(tx, ty);
    }
    this.wave(p.cx, p.body.y + p.body.h - 6, 46, p.stats.damage * 2);
  }

  // ---------- combat ----------

  /** Damages an entity and applies the side effects of a landed blow. */
  strike(e: Entity, dmg: number, fromX: number, source: DamageSource): boolean {
    if (!e.damage(dmg, fromX, source)) return false;
    const heavy = e.heavy;
    this.sfx(heavy ? 'hitHeavy' : 'hit', 0.9 + fx.next() * 0.2);
    this.particles.burst(e.cx, e.cy, 8, '#fff2d0', { speed: 3.5, kind: 'spark' });
    if (source === 'player') {
      this.player.addRes(this.player.stats.resPerHit);
      this.freeze = Math.max(this.freeze, heavy ? 4 : 3);
      this.shakeBy(2);
    }
    return true;
  }

  private damageFor(source: DamageSource): number {
    const p = this.player;
    let d = p.stats.damage * (source === 'echo' ? 0.6 : 1);
    if (source === 'player' && p.perfectT > 0 && on(this.save, 'point_orgue')) { d *= 3; p.perfectT = 0; }
    return d;
  }

  private combat(): void {
    const p = this.player;
    const atk = p.attackBox();
    if (atk && p.attack) {
      for (const e of this.entities) {
        if (e.dead || !e.hurtable || p.attack.hit.has(e.id) || !overlap(atk, e.box())) continue;
        p.attack.hit.add(e.id);
        const landed = this.strike(e, this.damageFor(p.attack.dir === 'slam' ? 'slam' : 'player') * (p.attack.dir === 'down' && on(this.save, 'tremolo') ? 1.5 : 1), p.cx, 'player');
        if (p.attack.dir === 'down' && (landed || !e.prop)) p.pogo();
        if (landed && p.attack.dir === 'side' && !e.heavy) p.body.vx -= p.facing * 1.2;
      }
      this.tileHits(atk, p.attack.dir, p.attack.hit);
    }
    for (const echo of this.echoes) {
      const box = echo.attackBox();
      if (!box) continue;
      for (const e of this.entities) {
        if (e.dead || !e.hurtable || echo.hit.has(e.id) || !overlap(box, e.box())) continue;
        echo.hit.add(e.id);
        this.strike(e, this.damageFor('echo'), echo.frame.x + 6, 'echo');
      }
      this.tileHits(box, echo.frame.attack ?? 'side', echo.hit);
    }
    if (p.dead || this.god) return;
    // Hits on the player: parry first, then damage.
    const pb = p.box();
    for (const e of this.entities) {
      if (e.dead) continue;
      for (const h of e.hits()) {
        if (!overlap(h.box, pb)) continue;
        if (this.tryParry(e, h)) continue;
        this.hurtPlayer(h.damage, e.cx);
      }
      if (e.contact > 0 && e.stun === 0 && overlap(e.box(), pb)) {
        if (p.canParry() && !e.heavy) { this.parrySuccess(e, { box: e.box(), damage: e.contact, parry: 'stun' }); continue; }
        this.hurtPlayer(e.contact, e.cx);
      }
    }
  }

  private tryParry(e: Entity, h: Hit): boolean {
    if (!this.player.canParry() || h.parry === 'none') return false;
    this.parrySuccess(e, h);
    return true;
  }

  private parrySuccess(e: Entity, h: Hit): void {
    const p = this.player;
    if (p.invuln > 0 && p.perfectT > 0) return;
    p.parryT = 0;
    p.parryCd = 6;
    p.invuln = Math.max(p.invuln, 24);
    p.perfectT = 90;
    p.addRes(1);
    e.parried(h.parry);
    this.sfx('parry');
    this.freeze = 8;
    this.shakeBy(3);
    this.particles.ring(p.cx + p.facing * 8, p.cy, '#fff4c8', 40, 20);
    this.particles.burst(p.cx + p.facing * 10, p.cy, 16, '#ffe9a8', { speed: 4, kind: 'spark' });
    p.body.vx = -p.facing * 2;
    if (on(this.save, 'diapason')) this.wave(p.cx, p.cy, 60, p.stats.damage);
  }

  hurtPlayer(amount: number, fromX: number): void {
    const p = this.player;
    if (p.invuln > 0 || p.dead || this.respawning || this.god) return;
    const dmg = amount * takenMul(this.save);
    p.hp -= dmg;
    p.invuln = 70;
    p.hurtT = 14;
    p.attack = null;
    p.grapple = null;
    p.dashT = 0;
    p.healT = 0;
    const dir = Math.sign(p.cx - fromX) || -p.facing;
    p.body.vx = dir * 3.4;
    p.body.vy = -4.5;
    this.freeze = 9;
    this.shakeBy(8);
    this.sfx('hurt');
    this.particles.burst(p.cx, p.cy, 18, '#0b0b10', { speed: 4 });
    this.particles.burst(p.cx, p.cy, 10, '#e8e0ff', { speed: 3, kind: 'spark' });
    if (p.hp <= 0) this.die();
  }

  private hazard(): void {
    const p = this.player;
    if (this.respawning || p.dead) return;
    this.sfx('hazard');
    this.particles.burst(p.cx, p.cy, 14, '#e8e0ff', { speed: 3 });
    if (!this.god) {
      p.hp -= takenMul(this.save);
      this.shakeBy(6);
    }
    if (p.hp <= 0) { this.die(); return; }
    // Back to the last safe ground, like waking from a bad fall.
    this.respawning = true;
    p.body.vx = 0;
    p.body.vy = 0;
    this.transition(() => {
      p.body.x = p.safe.x;
      p.body.y = p.safe.y;
      p.body.vx = 0;
      p.body.vy = 0;
      p.invuln = 50;
      p.hurtT = 0;
      this.respawning = false;
      this.snapCamera();
    }, 0.16);
  }

  private die(): void {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.hp = 0;
    this.save.deaths++;
    this.sfx('death');
    this.freeze = 30;
    this.particles.burst(p.cx, p.cy, 40, '#0b0b10', { speed: 5, life: 60 });
    // Bronze stays behind in a cracked bell; in Fêlé mode it is simply lost.
    const lost = this.save.bronze;
    this.save.bronze = 0;
    if (on(this.save, 'glas') && !this.save.hard) {
      this.save.bronze = lost;
      this.save.glas = null;
    } else this.save.glas = lost > 0 && !this.save.hard ? { room: this.room.id, x: p.safe.x + 6, y: p.safe.y + p.body.h, bronze: lost } : null;
    this.ui.died();
    this.transition(() => this.respawn(), 0.03);
  }

  /** Back at the last lectern, healed, with the world's enemies restored. */
  respawn(): void {
    const p = this.player;
    p.dead = false;
    p.hp = p.maxHp;
    p.res = 0;
    p.resPartial = 0;
    p.invuln = 60;
    p.hurtT = 0;
    p.attack = null;
    this.respawning = false;
    this.enter(this.save.lectern);
    writeSlot(this.save);
  }

  /** Rest at a lectern: heal, save, enemies return. */
  rest(): void {
    const p = this.player;
    this.applySave();
    p.hp = p.maxHp;
    this.save.lectern = this.room.id;
    if (!this.save.lecterns.includes(this.room.id)) this.save.lecterns.push(this.room.id);
    writeSlot(this.save);
    this.sfx('rest');
    this.ui.rest();
  }

  private tileHits(box: Box, dir: string, hit: Set<number>): void {
    const x0 = Math.floor(box.x / TILE);
    const x1 = Math.floor((box.x + box.w) / TILE);
    const y0 = Math.floor(box.y / TILE);
    const y1 = Math.floor((box.y + box.h) / TILE);
    let pogoed = false;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(this.room, tx, ty);
      const key = -(ty * 10000 + tx) - 1;
      if (t === T.Breakable && !hit.has(key)) {
        hit.add(key);
        this.breakTile(tx, ty);
      }
      // Pogo off spikes with a downward swing.
      if (dir === 'down' && (t === T.Spikes || t === T.Ink) && !pogoed && this.player.attack?.dir === 'down') {
        pogoed = true;
        this.player.pogo();
        this.sfx('clang');
      }
    }
  }

  breakTile(tx: number, ty: number): void {
    const flag = this.room.owner.get(ty * this.room.w + tx);
    if (!flag) return;
    clearOwned(this.room, flag);
    this.setFlag(flag);
    if (!this.headless) this.terrain = renderTerrain(this.room);
    this.sfx('break');
    this.shakeBy(5);
    this.particles.burst(tx * TILE + 10, ty * TILE + 10, 30, PALETTES[this.room.def.zone].vein, { speed: 4, kind: 'shard', size: 3 });
  }

  /** Opens gates owned by a flag in the current room. */
  openFlag(flag: string): void {
    this.setFlag(flag);
    if (![...this.room.owner.values()].includes(flag)) return;
    clearOwned(this.room, flag);
    if (!this.headless) this.terrain = renderTerrain(this.room);
    this.sfx('gate');
    this.shakeBy(4);
  }

  /** Temporarily solid tiles (arena locks). */
  setTiles(rects: [number, number, number, number][], t: T): void {
    for (const [x, y, w, h] of rects) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (xx >= 0 && yy >= 0 && xx < this.room.w && yy < this.room.h) this.room.tiles[yy * this.room.w + xx] = t;
    }
    if (!this.headless) this.terrain = renderTerrain(this.room);
  }

  /** Moving platforms carry the player standing on them. */
  private platformsCarry(): void {
    const p = this.player;
    const b = p.body;
    for (const e of this.entities) {
      const plat = e as unknown as { platform?: boolean; dx?: number; dy?: number };
      if (!plat.platform || e.dead) continue;
      const top = e.body.y;
      const feet = b.y + b.h;
      const within = b.x + b.w > e.body.x + 1 && b.x < e.body.x + e.body.w - 1;
      if (within && b.vy >= 0 && feet >= top - 2 && feet <= top + 8 + (plat.dy ?? 0)) {
        b.y = top - b.h;
        b.vy = 0;
        b.onGround = true;
        p.coyote = 6;
        p.airDashUsed = false;
        p.doubleUsed = false;
        if (fits(this.room, b.x + (plat.dx ?? 0), b.y, b.w, b.h)) b.x += plat.dx ?? 0;
      }
    }
  }

  /** Control hints with the player's actual keys. */
  hintText(key: string): string {
    const k = (a: Parameters<typeof input.keyName>[0]) => input.keyName(a);
    return tx(`hints.${key}`, { left: k('left'), right: k('right'), up: k('up'), down: k('down'), jump: k('jump'), attack: k('attack'), parry: k('parry'), echo: k('echo'), heal: k('heal'), dash: k('dash'), map: k('map') });
  }

  uiText(path: string, params: Record<string, string | number> = {}): string {
    return tx(path, params);
  }

  /** Applies a picked-up item to the save and tells the interface. */
  collect(kind: ItemKind, value: string): void {
    const s = this.save;
    switch (kind) {
      case 'shard':
        s.shards++;
        if (s.shards >= 4) { s.shards = 0; s.maxHp = Math.min(9, s.maxHp + 1); }
        break;
      case 'vessel': s.maxRes = Math.min(6, s.maxRes + 1); break;
      case 'tin': s.tin = Math.min(4, s.tin + 1); break;
      case 'note': if (!s.notesOwned.includes(value)) s.notesOwned.push(value); break;
      case 'ability':
        if (!s.abilities.includes(value as never)) s.abilities.push(value as never);
        this.setFlag(`has_${value}`);
        break;
      case 'slot': s.slots = Math.min(6, s.slots + 1); break;
      case 'page': case 'key': break;
    }
    this.applySave();
    if (kind === 'shard' && s.shards === 0) this.player.hp = this.player.maxHp;
    if (kind === 'vessel') this.player.res = this.player.maxRes;
    this.sfx(kind === 'ability' ? 'ability' : 'item');
    this.particles.burst(this.player.cx, this.player.cy, 30, '#fff4c8', { speed: 3 });
    writeSlot(s);
    this.ui.pickup(kind, value);
  }

  /** A great bell rings again: rewards, save, and the way opens. */
  bossDefeated(b: Boss): void {
    this.killFx(b);
    this.setFlag(`boss_${b.key}`);
    this.sfx('bellBig');
    this.shakeBy(12);
    this.freeze = 40;
    this.boss = null;
    this.particles.burst(b.cx, b.cy, 60, '#fff4c8', { speed: 5, life: 70 });
    if (b.key === 'silence') {
      this.save.ended = true;
      writeSlot(this.save);
      this.ui.ended(this.save.flags.secret ? 'cloche' : 'silence');
      return;
    }
    const reward = BOSS_REWARD[b.key];
    if (reward) {
      const e = spawnEntity(this, reward.kind, b.cx, Math.min(b.body.y + b.body.h, this.room.h * TILE - TILE * 2), { value: reward.value, id: `reward_${b.key}` }, '');
      if (e) this.entities.push(e);
    }
    writeSlot(this.save);
  }

  dropBronze(x: number, y: number, amount: number): void {
    const mul = on(this.save, 'or') ? 1.5 : 1;
    let left = Math.round(amount * mul);
    while (left > 0) {
      const v = left >= 10 ? 10 : left >= 5 ? 5 : 1;
      left -= v;
      const e = spawnEntity(this, 'coin', x, y, { value: v }, '');
      if (e) this.entities.push(e);
    }
  }

  killFx(e: Entity): void {
    this.sfx('enemyDie', 0.8 + fx.next() * 0.4);
    this.particles.burst(e.cx, e.cy, 22, '#0a0a0e', { speed: 4, life: 40 });
    this.particles.burst(e.cx, e.cy, 10, PALETTES[this.room.def.zone].accent, { speed: 3, kind: 'spark' });
    if (e.bronze) this.dropBronze(e.cx, e.cy, e.bronze);
  }

  // ---------- camera & drawing ----------

  snapCamera(): void {
    this.updateCamera(true);
  }

  private updateCamera(snap = false): void {
    const p = this.player;
    const W = this.room.w * TILE;
    const H = this.room.h * TILE;
    const lookX = p.facing * 34 + p.body.vx * 6;
    const lookY = input.held('up') && p.body.onGround && p.pose === 'idle' ? -70 : input.held('down') && p.body.onGround && p.pose === 'idle' ? 70 : 0;
    const tx = clamp(p.cx + lookX - VIEW_W / 2, 0, W - VIEW_W);
    const ty = clamp(p.cy - 20 + lookY - VIEW_H / 2, 0, H - VIEW_H);
    if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
    this.cam.x += (tx - this.cam.x) * 0.12;
    this.cam.y += (ty - this.cam.y) * 0.1;
  }

  draw(ctx: CanvasRenderingContext2D, settings: { shake: boolean }): void {
    const zone = this.room.def.zone;
    const sx = settings.shake && this.shake > 0 ? (fx.next() - 0.5) * this.shake : 0;
    const sy = settings.shake && this.shake > 0 ? (fx.next() - 0.5) * this.shake : 0;
    const camX = Math.round(this.cam.x + sx);
    const camY = Math.round(this.cam.y + sy);
    drawBackdrop(ctx, this.room, camX, camY, this.time);
    ctx.save();
    ctx.translate(-camX, -camY);
    for (const e of this.entities) if (e.back) e.draw(ctx);
    if (this.terrain) ctx.drawImage(this.terrain, 0, 0, this.room.w * TILE, this.room.h * TILE);
    for (const e of this.entities) if (!e.back) e.draw(ctx);
    for (const echo of this.echoes) if (echo.active) drawEcho(ctx, echo);
    if (!this.player.dead) drawPlayer(ctx, this.player, this.time);
    this.particles.draw(ctx);
    ctx.restore();
    drawForeground(ctx, this.room, camX, camY, this.time);
    if (this.room.def.dark) drawLighting(ctx, this, camX, camY);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    void PALETTES[zone];
    void hash;
  }
}
