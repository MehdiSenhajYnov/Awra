import { audio } from '../engine/audio';
import { VIEW_H, VIEW_W } from '../engine/core';
import { input } from '../engine/input';
import { BOSS_KEYS } from '../game/bosses';
import type { ItemKind } from '../game/props';
import { type Save, type Settings, clearSlot, loadSettings, loadSlot, newSave, saveSettings, writeSlot } from '../game/save';
import { type Modal, Scene } from '../game/scene';
import { GREAT_BELLS } from '../game/spawn';
import { detectLang, lang, lines, setLang, tx } from '../i18n';
import { ROOMS, roomDef } from '../world/world';
import { preloadZone } from '../render/backdrop';
import { COLORS, FONT_DISPLAY, drawImg, panel, para, text } from './draw';
import { Hud } from './hud';
import { Dialogue, type Item, MapScreen, Menu, Notice, NotesScreen, back, ok, optionsMenu, setMenuHost } from './menus';

declare global {
  interface Window {
    carillonDesktop?: { quit(): void };
  }
}

interface Screen {
  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export class App {
  screen!: Screen;
  settings: Settings = loadSettings();
  /** Menus opened outside a scene (title options). */
  overlay: Modal | null = null;

  constructor() {
    this.applySettings();
    setMenuHost((m) => {
      if (this.screen instanceof GameScreen) this.screen.scene.modal = m;
      else this.overlay = m;
    });
    this.toTitle();
  }

  applySettings(patch: Partial<Settings> = {}): void {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    setLang(this.settings.lang ?? detectLang());
    audio.setVolumes({ master: this.settings.master, music: this.settings.music, effects: this.settings.effects });
    if (this.settings.keys) input.bindings = structuredClone(this.settings.keys);
  }

  toTitle(): void {
    audio.music(-1);
    this.screen = new TitleScreen(this);
  }

  play(save: Save, rush = false): void {
    audio.unlock();
    this.screen = new GameScreen(this, save, rush);
  }

  update(): void {
    if (this.overlay) {
      if (this.overlay.update(null as unknown as Scene)) this.overlay = null;
      return;
    }
    this.screen.update();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.screen.draw(ctx);
    this.overlay?.draw(ctx, null as unknown as Scene);
  }
}

// ---------------------------------------------------------------- title

class TitleScreen implements Screen {
  menu: Menu;
  t = 0;
  constructor(public app: App) {
    this.menu = this.build();
  }
  build(): Menu {
    const slots = [1, 2, 3].map((n) => loadSlot(n));
    const latest = slots.filter((s): s is Save => !!s).sort((a, b) => b.lastPlayed - a.lastPlayed)[0];
    const items: Item[] = [];
    if (latest) items.push({ label: () => tx('title.continue'), action: () => this.app.play(latest) });
    items.push({ label: () => tx('title.newGame'), action: () => { this.menu = this.slotMenu(); } });
    if (slots.some((s) => s?.ended)) items.push({ label: () => tx('title.rush'), action: () => this.app.play(rushSave(), true) });
    items.push({ label: () => tx('title.options'), action: () => { this.app.overlay = optionsMenu(this.app.settings, (p) => this.app.applySettings(p), () => undefined); } });
    items.push({ label: () => tx('title.credits'), action: () => { this.app.overlay = new Notice(null, tx('title.credits'), tx('credits.body'), true); } });
    if (window.carillonDesktop) items.push({ label: () => tx('title.quit'), action: () => window.carillonDesktop!.quit() });
    return new Menu(() => '', items, null, 220);
  }
  slotMenu(): Menu {
    const items: Item[] = [1, 2, 3].map((n) => {
      const s = loadSlot(n);
      return {
        label: () => (s ? `${n}. ${tx(`zones.${roomDef(s.lectern).zone}.name`)}` : `${n}. ${tx('title.empty')}`),
        value: () => (s ? `${Math.floor(s.time / 3600)} h ${String(Math.floor((s.time % 3600) / 60)).padStart(2, '0')} · ${completion(s)} %` : ''),
        action: () => {
          if (s) { this.menu = this.confirmMenu(n); return; }
          this.start(n);
        },
      };
    });
    items.push({ label: () => tx('options.back'), action: () => { this.menu = this.build(); } });
    return new Menu(() => tx('title.chooseSlot'), items, () => { this.menu = this.build(); }, 330);
  }
  confirmMenu(n: number): Menu {
    return new Menu(() => tx('title.overwrite'), [
      { label: () => tx('title.yes'), action: () => { clearSlot(n); this.start(n); } },
      { label: () => tx('title.no'), action: () => { this.menu = this.slotMenu(); } },
    ], () => { this.menu = this.slotMenu(); }, 300);
  }
  start(n: number): void {
    const ended = [1, 2, 3].some((k) => loadSlot(k)?.ended);
    if (ended) {
      this.menu = new Menu(() => tx('title.mode'), [
        { label: () => tx('title.normal'), action: () => this.app.play(newSave(n)) },
        { label: () => tx('title.hard'), action: () => this.app.play(newSave(n, true)) },
      ], () => { this.menu = this.slotMenu(); }, 300);
      return;
    }
    this.app.play(newSave(n));
  }
  update(): void {
    this.t++;
    if (input.pressed('confirm') || input.pressed('jump')) audio.unlock();
    this.menu.update();
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (drawImg(ctx, 'key_titre', -20 - Math.sin(this.t * 0.003) * 10, -10, VIEW_W + 40, VIEW_H + 20)) {
      const g = ctx.createLinearGradient(0, 0, VIEW_W, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.85)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.2)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const a = Math.min(1, this.t / 60);
    ctx.globalAlpha = a;
    text(ctx, 'CARILLON', 60, 120, 42, COLORS.paper, 'left', FONT_DISPLAY);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(62, 132, 150, 1);
    text(ctx, tx('title.tagline'), 62, 152, 12, COLORS.dim);
    ctx.globalAlpha = 1;
    // The menu, drawn as a plain list under the logo.
    const m = this.menu;
    if (m.title()) text(ctx, m.title(), 62, 190, 13, COLORS.gold, 'left', FONT_DISPLAY);
    m.items.forEach((it, i) => {
      const y = (m.title() ? 214 : 196) + i * 20;
      const sel = i === m.index;
      if (sel) { ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.moveTo(52, y - 8); ctx.lineTo(57, y - 4); ctx.lineTo(52, y); ctx.fill(); }
      text(ctx, it.label(), 62, y, 13, sel ? COLORS.paper : COLORS.dim, 'left', FONT_DISPLAY);
      if (it.value) text(ctx, it.value(), 360, y, 11, COLORS.dim, 'right');
    });
    text(ctx, 'v1.0', VIEW_W - 10, VIEW_H - 8, 9, '#4a4640', 'right');
  }
}

export function completion(s: Save): number {
  const items = ROOMS.flatMap((r) => (r.ents ?? []).filter(([k]) => ['shard', 'vessel', 'note', 'tin', 'page', 'ability', 'slot'].includes(k)));
  const bosses = BOSS_KEYS.length;
  const got = Object.keys(s.flags).filter((f) => f.startsWith('item:') || f.startsWith('shard_') || f.startsWith('note_') || f.startsWith('has_') || f.startsWith('page_') || f.startsWith('vessel_') || f.startsWith('tin_')).length;
  const beaten = BOSS_KEYS.filter((b) => s.flags[`boss_${b}`]).length;
  return Math.min(100, Math.round(((got + beaten) / Math.max(1, items.length + bosses)) * 100));
}

function rushSave(): Save {
  const s = newSave(0);
  s.abilities = ['echo', 'dash', 'walljump', 'swap', 'double', 'slam', 'grapple'];
  s.maxHp = 7;
  s.maxRes = 5;
  s.tin = 3;
  s.slots = 5;
  s.notesOwned = ['fermata', 'staccato', 'legato', 'soupir', 'pedale', 'aigue'];
  s.hard = false;
  return s;
}

// ---------------------------------------------------------------- game

const ARENAS: Record<string, string> = {};
for (const r of ROOMS) for (const e of r.ents ?? []) if (e[0] === 'arena') ARENAS[(e[3] as { boss: string }).boss] = r.id;

class GameScreen implements Screen {
  scene: Scene;
  hud = new Hud();
  rushIndex = 0;
  rushTime = 0;
  ending: { kind: 'cloche' | 'silence'; t: number } | null = null;

  constructor(public app: App, save: Save, public rush: boolean) {
    this.scene = new Scene(save, {
      areaTitle: (z) => this.hud.areaTitle(z),
      toast: (t, i) => this.hud.toast(t, i),
      bossBar: (e, name) => {
        this.hud.boss = e && name ? { e, name } : null;
        if (e && name) this.hud.bossTitle(name);
      },
      rest: () => this.openRest(),
      died: () => undefined,
      ended: (k) => { if (!this.rush) this.ending = { kind: k, t: 0 }; },
      talk: (who) => this.talk(who),
      pickup: (k, v) => this.pickup(k, v),
    });
    this.scene.player.hp = this.scene.player.maxHp;
    preloadZone(roomDef(save.lectern).zone);
    if (rush) this.nextRush();
    else this.scene.enter(save.lectern);
    if (!rush && save.time < 1) this.hud.areaTitle(roomDef(save.lectern).zone);
  }

  nextRush(): void {
    const key = GREAT_BELLS.concat(['silence'])[this.rushIndex];
    if (!key) { this.ending = { kind: 'cloche', t: 0 }; return; }
    this.scene.save.flags = { secret: true };
    this.scene.save.hard = true;
    const room = ARENAS[key];
    const def = roomDef(room);
    const arena = (def.ents ?? []).find((e) => e[0] === 'arena')!;
    this.scene.enter(room, { x: (arena[1] - 6) * 20, y: 15 * 20 });
    this.scene.player.hp = this.scene.player.maxHp;
  }

  talk(who: string): void {
    const s = this.scene;
    const state = npcState(who, s);
    const say = lines(`npc.${who}.${state}`);
    const after = () => {
      s.setFlag(`talked_${who}_${state}`);
      if (who === 'tierce') s.modal = this.shop('tierce');
      if (who === 'fondeuse') s.modal = this.shop('fondeuse');
      if (who === 'fa' && state === 'gift') s.collect('note', 'legato');
      if (who === 'glas' && state === 'end' && !s.flags.secret) s.setFlag('secret');
      if (who === 'muet' && state === 'open') s.openFlag('bourdon_open');
    };
    s.modal = new Dialogue(who, say, after);
  }

  shop(who: 'tierce' | 'fondeuse'): Menu {
    const s = this.scene;
    const save = s.save;
    let m: Menu;
    const items: Item[] = [];
    const offer = (id: string, price: number, buy: () => void, available = true) => {
      if (!available) return;
      items.push({
        label: () => (save.flags[`bought_${id}`] ? `${tx(`shop.${id}`)} ✓` : tx(`shop.${id}`)),
        value: () => (save.flags[`bought_${id}`] ? '' : `${price} ◉`),
        disabled: () => !!save.flags[`bought_${id}`] || save.bronze < price,
        action: () => { save.bronze -= price; s.setFlag(`bought_${id}`); buy(); writeSlot(save); },
      });
    };
    if (who === 'tierce') {
      offer('staccato', 240, () => s.collect('note', 'staccato'));
      offer('aigue', 180, () => s.collect('note', 'aigue'));
      offer('soupir', 380, () => s.collect('note', 'soupir'), !!save.flags.boss_dechu);
      offer('pedale', 420, () => s.collect('note', 'pedale'), !!save.flags.boss_gargouille);
      offer('or', 600, () => s.collect('note', 'or'), !!save.flags.boss_mere);
      offer('shard1', 350, () => s.collect('shard', 'shop1'));
      offer('shard2', 900, () => s.collect('shard', 'shop2'), !!save.flags.boss_souffleur);
      offer('vessel', 1200, () => s.collect('vessel', 'shop'), !!save.flags.boss_jumeaux);
    } else {
      const beaten = GREAT_BELLS.filter((b) => save.flags[`boss_${b}`]).length;
      const costs = [250, 650, 1300, 2200];
      const lvl = save.tin;
      if (lvl < 4) {
        const allowed = lvl < Math.floor((beaten + 1) / 2) + 1;
        items.push({
          label: () => tx('shop.tin', { n: lvl + 1 }),
          value: () => (allowed ? `${costs[lvl]} ◉` : tx('shop.later')),
          disabled: () => !allowed || save.bronze < costs[lvl],
          action: () => { save.bronze -= costs[lvl]; s.collect('tin', String(lvl + 1)); m.close(); },
        });
      }
    }
    items.push({ label: () => tx('options.back'), action: () => m.close() });
    m = new Menu(() => tx(`npc.${who}.name`), items, () => m.close(), 340);
    return m;
  }

  pickup(kind: ItemKind, value: string): void {
    const s = this.scene;
    let icon: string | null = null;
    let title = '';
    let body = '';
    switch (kind) {
      case 'ability': title = tx(`abilities.${value}.name`); body = this.keysIn(tx(`abilities.${value}.desc`)); break;
      case 'note': icon = `note_${value}`; title = tx(`notes.${value}.name`); body = tx(`notes.${value}.desc`) + '\n' + tx('pickup.noteHint'); break;
      case 'shard': icon = 'it_masque'; title = tx('pickup.shard'); body = s.save.shards === 0 ? tx('pickup.shardFull') : tx('pickup.shardPart', { n: s.save.shards }); break;
      case 'vessel': icon = 'it_vase'; title = tx('pickup.vessel'); body = tx('pickup.vesselDesc'); break;
      case 'tin': icon = 'it_etain'; title = tx('pickup.tin'); body = tx('pickup.tinDesc'); break;
      case 'slot': icon = 'it_lutrin'; title = tx('pickup.slot'); body = tx('pickup.slotDesc'); break;
      case 'page': icon = 'it_partition'; title = tx('pickup.page'); body = tx(`pages.p${value}`); break;
      case 'key': icon = 'it_cle'; title = tx('pickup.key'); body = tx('pickup.keyDesc'); break;
    }
    s.modal = new Notice(icon, title, body, kind === 'ability');
  }

  keysIn(t: string): string {
    return t.replace(/\{(\w+)\}/g, (_, a: string) => `[${input.keyName(a as never)}]`);
  }

  openRest(): void {
    const s = this.scene;
    let m: Menu;
    const items: Item[] = [
      { label: () => tx('rest.notes'), action: () => { s.modal = new NotesScreen(s, true); } },
      { label: () => tx('rest.travel'), disabled: () => s.save.lecterns.length < 2, action: () => { s.modal = new MapScreen(s, (room) => s.transition(() => { s.save.lectern = room; s.enter(room); s.rest(); })); } },
      { label: () => tx('rest.leave'), action: () => m.close() },
    ];
    m = new Menu(() => tx('rest.title'), items, () => m.close(), 260);
    s.modal = m;
  }

  pause(): void {
    const s = this.scene;
    let m: Menu;
    const items: Item[] = [
      { label: () => tx('pause.resume'), action: () => m.close() },
      { label: () => tx('pause.notes'), action: () => { s.modal = new NotesScreen(s, false); } },
      { label: () => tx('pause.map'), action: () => { s.modal = new MapScreen(s); } },
      { label: () => tx('pause.options'), action: () => { s.modal = optionsMenu(this.app.settings, (p) => this.app.applySettings(p), () => this.pause()); } },
      { label: () => tx('pause.quit'), action: () => { if (!this.rush) writeSlot(s.save); this.app.toTitle(); } },
    ];
    m = new Menu(() => tx('pause.title'), items, () => m.close(), 260);
    s.modal = m;
  }

  update(): void {
    const s = this.scene;
    if (this.ending) { this.updateEnding(); return; }
    if (!s.modal && input.pressed('pause')) { this.pause(); return; }
    if (!s.modal && input.pressed('map') && !this.rush) { s.modal = new MapScreen(s); return; }
    s.update();
    if (this.rush) {
      this.rushTime++;
      const key = GREAT_BELLS.concat(['silence'])[this.rushIndex];
      if (s.flags[`boss_${key}`] && !s.pendingRush) {
        s.pendingRush = true;
        setTimeout(() => s.transition(() => { s.pendingRush = false; this.rushIndex++; this.nextRush(); }), 1500);
      }
      if (s.player.dead || s.player.hp <= 0) {
        // In the rush a defeat sends the player back to the title with the score.
        this.ending = { kind: 'silence', t: 0 };
      }
    }
    if (s.time % 600 === 0 && !this.rush) writeSlot(s.save);
  }

  updateEnding(): void {
    const e = this.ending!;
    e.t++;
    if (e.t > 120 && ok()) {
      if (!this.rush) writeSlot(this.scene.save);
      this.app.toTitle();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scene;
    if (this.ending) { this.drawEnding(ctx); return; }
    s.draw(ctx, this.app.settings);
    this.hud.draw(ctx, s);
    if (this.app.settings.assist) this.drawAssist(ctx);
    if (s.modal) s.modal.draw(ctx, s);
    if (this.rush) text(ctx, timeStr(this.rushTime / 60), VIEW_W - 12, 20, 11, COLORS.paper, 'right');
  }

  /** Assist overlay: shows the parry window and the echo's start point. */
  drawAssist(ctx: CanvasRenderingContext2D): void {
    const p = this.scene.player;
    if (p.parryT > 0) text(ctx, '♪', VIEW_W / 2, VIEW_H - 40, 20, COLORS.gold, 'center');
    const h = p.history[p.history.length - p.stats.echoFrames];
    if (h && p.abilities.has('echo')) {
      ctx.strokeStyle = 'rgba(168,240,255,0.5)';
      ctx.strokeRect(h.x - this.scene.cam.x, h.y - this.scene.cam.y, 12, 26);
    }
  }

  drawEnding(ctx: CanvasRenderingContext2D): void {
    const e = this.ending!;
    const s = this.scene.save;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const a = Math.min(1, e.t / 120);
    ctx.globalAlpha = a;
    if (this.rush) {
      text(ctx, tx(e.kind === 'cloche' ? 'rush.won' : 'rush.lost'), VIEW_W / 2, 140, 22, COLORS.paper, 'center', FONT_DISPLAY);
      text(ctx, tx('rush.score', { n: this.rushIndex, t: timeStr(this.rushTime / 60) }), VIEW_W / 2, 175, 13, COLORS.dim, 'center');
    } else {
      drawImg(ctx, e.kind === 'cloche' ? 'fin_cloche' : 'fin_silence', 0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, VIEW_H - 140, VIEW_W, 140);
      text(ctx, tx(`ending.${e.kind}.title`), VIEW_W / 2, VIEW_H - 110, 20, COLORS.paper, 'center', FONT_DISPLAY);
      para(ctx, tx(`ending.${e.kind}.body`), 80, VIEW_H - 86, VIEW_W - 160, 11, COLORS.paper, 1.3);
      text(ctx, tx('ending.stats', { t: timeStr(s.time), d: s.deaths, p: completion(s) }), VIEW_W / 2, VIEW_H - 16, 10, COLORS.dim, 'center');
    }
    ctx.globalAlpha = 1;
  }
}

declare module '../game/scene' {
  interface Scene {
    pendingRush?: boolean;
  }
}

function timeStr(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Which dialogue an NPC gives depends on progress. */
function npcState(who: string, s: Scene): string {
  const f = s.flags;
  const bells = GREAT_BELLS.filter((b) => f[`boss_${b}`]).length;
  switch (who) {
    case 'glas':
      if (bells >= 8) return 'end';
      if (!f.has_echo) return 'intro';
      if (!f.boss_dechu) return 'echo';
      return bells >= 4 ? 'deep' : 'mid';
    case 'tierce': return f.talked_tierce_intro ? 'again' : 'intro';
    case 'fondeuse': return f.talked_fondeuse_intro ? 'again' : 'intro';
    case 'fa':
      if (bells >= 3 && !f.talked_fa_gift) return 'gift';
      return f.talked_fa_intro ? 'again' : 'intro';
    case 'muet': return bells >= 8 ? 'open' : 'closed';
  }
  return 'intro';
}

export { panel, lang, back };
