import { audio } from '../engine/audio';
import { CELL_H, CELL_W, VIEW_H, VIEW_W } from '../engine/core';
import { ACTIONS, type Action, DEFAULT_KEYS, input } from '../engine/input';
import { NOTES, NOTE_BY_ID, canEquip, on, toggleNote, usedSlots } from '../game/notes';
import type { Modal, Scene } from '../game/scene';
import { type Settings } from '../game/save';
import { LOCALES, type Lang, lang, lines, tx } from '../i18n';
import { ZONES } from '../world/room';
import { ROOMS, bounds, roomDef } from '../world/world';
import { PALETTES } from '../world/zones';
import { COLORS, FONT_DISPLAY, drawImg, panel, para, text } from './draw';

/** Confirm / back read from any of the usual buttons. */
export const ok = () => input.pressed('confirm') || input.pressed('jump') || input.pressed('attack');
export const back = () => input.pressed('back') || input.pressed('pause') || input.pressed('heal');

// ---------------------------------------------------------------- list menu

export interface Item {
  label: () => string;
  action?: () => void;
  /** Left/right adjust (sliders, toggles). */
  adjust?: (dir: number) => void;
  value?: () => string;
  disabled?: () => boolean;
}

export class Menu implements Modal {
  index = 0;
  closed = false;
  constructor(public title: () => string, public items: Item[], public onBack: (() => void) | null = null, public width = 300) {}
  update(): boolean {
    if (this.closed) return true;
    const n = this.items.length;
    if (input.pressed('down')) { this.index = (this.index + 1) % n; audio.play('menuMove'); }
    if (input.pressed('up')) { this.index = (this.index + n - 1) % n; audio.play('menuMove'); }
    const it = this.items[this.index];
    if (it.adjust && (input.pressed('left') || input.pressed('right'))) { it.adjust(input.pressed('left') ? -1 : 1); audio.play('menuMove'); }
    if (ok() && it.action && !it.disabled?.()) { audio.play('menu'); it.action(); }
    else if (back() && this.onBack) { audio.play('back'); this.onBack(); }
    return this.closed;
  }
  close(): void {
    this.closed = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const h = 46 + this.items.length * 20;
    const x = (VIEW_W - this.width) / 2;
    const y = (VIEW_H - h) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, x, y, this.width, h);
    text(ctx, this.title(), VIEW_W / 2, y + 26, 15, COLORS.gold, 'center', FONT_DISPLAY);
    this.items.forEach((it, i) => {
      const yy = y + 50 + i * 20;
      const sel = i === this.index;
      const dis = it.disabled?.();
      const color = dis ? '#55504a' : sel ? COLORS.paper : COLORS.dim;
      if (sel) {
        ctx.fillStyle = 'rgba(232,194,122,0.12)';
        ctx.fillRect(x + 10, yy - 13, this.width - 20, 18);
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath(); ctx.moveTo(x + 16, yy - 8); ctx.lineTo(x + 21, yy - 4); ctx.lineTo(x + 16, yy); ctx.fill();
      }
      text(ctx, it.label(), x + 28, yy, 12, color, 'left', FONT_DISPLAY);
      if (it.value) text(ctx, it.value(), x + this.width - 20, yy, 12, color, 'right');
    });
  }
}

// ---------------------------------------------------------------- dialogue

export class Dialogue implements Modal {
  i = 0;
  shown = 0;
  constructor(public who: string, public lines: string[], public after?: () => void) {}
  update(): boolean {
    const full = this.lines[this.i].length;
    if (this.shown < full) this.shown += 1.4;
    if (ok() || input.pressed('up')) {
      if (this.shown < full) this.shown = full;
      else {
        this.i++;
        this.shown = 0;
        audio.play('menuMove');
        if (this.i >= this.lines.length) { this.after?.(); return true; }
      }
    }
    if (back()) { this.after?.(); return true; }
    return false;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const x = 60;
    const y = VIEW_H - 112;
    const w = VIEW_W - 120;
    panel(ctx, x, y, w, 90, 0.92);
    drawImg(ctx, `pt_${this.who}`, x + 10, y + 10, 70, 70);
    text(ctx, tx(`npc.${this.who}.name`), x + 92, y + 22, 12, COLORS.gold, 'left', FONT_DISPLAY);
    para(ctx, this.lines[this.i].slice(0, Math.floor(this.shown)), x + 92, y + 40, w - 106, 12, COLORS.paper);
    if (this.shown >= this.lines[this.i].length && Math.floor(Date.now() / 400) % 2) text(ctx, '▾', x + w - 14, y + 82, 10, COLORS.gold);
  }
}

// ---------------------------------------------------------------- item notice

export class Notice implements Modal {
  t = 0;
  constructor(public icon: string | null, public title: string, public body: string, public big = false) {}
  update(): boolean {
    this.t++;
    return this.t > 30 && (ok() || back());
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const a = Math.min(1, this.t / 20);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = this.big ? 400 : 330;
    const h = this.big ? 170 : 120;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h, 0.95);
    let tx0 = x + 20;
    if (this.icon && drawImg(ctx, this.icon, x + 16, y + 20, 56, 56)) tx0 = x + 84;
    text(ctx, this.title, tx0, y + 34, this.big ? 18 : 15, COLORS.gold, 'left', FONT_DISPLAY);
    para(ctx, this.body, tx0, y + 56, w - (tx0 - x) - 18, 12, COLORS.paper);
    if (this.t > 30) text(ctx, '▾', x + w - 16, y + h - 10, 10, COLORS.gold);
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- notes (charms)

export class NotesScreen implements Modal {
  index = 0;
  done = false;
  constructor(public scene: Scene, public canChange: boolean) {}
  update(): boolean {
    const cols = 8;
    if (input.pressed('right')) { this.index = (this.index + 1) % NOTES.length; audio.play('menuMove'); }
    if (input.pressed('left')) { this.index = (this.index + NOTES.length - 1) % NOTES.length; audio.play('menuMove'); }
    if (input.pressed('down')) { this.index = (this.index + cols) % NOTES.length; audio.play('menuMove'); }
    if (input.pressed('up')) { this.index = (this.index + NOTES.length - cols) % NOTES.length; audio.play('menuMove'); }
    if (ok()) {
      const id = NOTES[this.index].id;
      const save = this.scene.save;
      if (!this.canChange) audio.play('back');
      else if (save.notesOwned.includes(id) && toggleNote(save, id)) { audio.play('chime'); this.scene.applySave(); }
      else audio.play('back');
    }
    return back();
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const save = this.scene.save;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 40, 30, VIEW_W - 80, VIEW_H - 60, 0.94);
    text(ctx, tx('menu.notes'), VIEW_W / 2, 56, 16, COLORS.gold, 'center', FONT_DISPLAY);
    // Slots.
    const used = usedSlots(save);
    for (let i = 0; i < save.slots; i++) {
      ctx.strokeStyle = COLORS.gold;
      ctx.fillStyle = i < used ? COLORS.gold : 'transparent';
      ctx.beginPath(); ctx.arc(VIEW_W / 2 - (save.slots - 1) * 7 + i * 14, 70, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    NOTES.forEach((n, i) => {
      const cx = 92 + (i % 8) * 58;
      const cy = 108 + Math.floor(i / 8) * 64;
      const owned = save.notesOwned.includes(n.id);
      const eq = on(save, n.id);
      if (i === this.index) {
        ctx.strokeStyle = COLORS.paper;
        ctx.strokeRect(cx - 24, cy - 24, 48, 52);
      }
      if (eq) { ctx.fillStyle = 'rgba(232,194,122,0.18)'; ctx.fillRect(cx - 23, cy - 23, 46, 50); }
      if (owned) drawImg(ctx, `note_${n.id}`, cx - 18, cy - 20, 36, 36);
      else { ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.arc(cx, cy - 2, 10, 0, Math.PI * 2); ctx.fill(); }
      for (let c = 0; c < n.cost; c++) { ctx.fillStyle = owned ? COLORS.gold : '#3a342c'; ctx.fillRect(cx - n.cost * 3 + c * 6, cy + 20, 4, 3); }
    });
    const sel = NOTES[this.index];
    const owned = save.notesOwned.includes(sel.id);
    const y = 250;
    text(ctx, owned ? tx(`notes.${sel.id}.name`) : '???', 70, y, 14, COLORS.paper, 'left', FONT_DISPLAY);
    if (owned) {
      para(ctx, tx(`notes.${sel.id}.desc`), 70, y + 20, VIEW_W - 140, 12, COLORS.dim);
      const state = on(save, sel.id) ? tx('menu.equipped') : canEquip(save, sel.id) ? tx('menu.equip') : tx('menu.noSlot');
      text(ctx, this.canChange ? state : tx('menu.restToChange'), VIEW_W - 70, y, 11, COLORS.gold, 'right');
    }
    text(ctx, `${NOTE_BY_ID[sel.id].cost} ◆`, VIEW_W - 70, y + 16, 10, COLORS.dim, 'right');
  }
}

// ---------------------------------------------------------------- map

export class MapScreen implements Modal {
  panX = 0;
  panY = 0;
  constructor(public scene: Scene, public travel: ((room: string) => void) | null = null) {
    const r = bounds(scene.room.def);
    this.panX = r.x + r.w / 2;
    this.panY = r.y + r.h / 2;
    this.sel = Math.max(0, scene.save.lecterns.indexOf(scene.room.id));
  }
  sel = 0;
  update(): boolean {
    const step = 6;
    if (this.travel) {
      const list = this.scene.save.lecterns;
      if (input.pressed('right') || input.pressed('down')) { this.sel = (this.sel + 1) % list.length; audio.play('menuMove'); }
      if (input.pressed('left') || input.pressed('up')) { this.sel = (this.sel + list.length - 1) % list.length; audio.play('menuMove'); }
      const b = bounds(roomDef(list[this.sel]));
      this.panX += (b.x + b.w / 2 - this.panX) * 0.2;
      this.panY += (b.y + b.h / 2 - this.panY) * 0.2;
      if (ok()) { this.travel(list[this.sel]); return true; }
    } else {
      if (input.held('left')) this.panX -= step;
      if (input.held('right')) this.panX += step;
      if (input.held('up')) this.panY -= step;
      if (input.held('down')) this.panY += step;
    }
    return back() || (!this.travel && input.pressed('map'));
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.scene;
    ctx.fillStyle = 'rgba(10,9,8,0.96)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const scale = 1.3;
    const ox = VIEW_W / 2 - this.panX * scale;
    const oy = VIEW_H / 2 - this.panY * scale;
    for (const r of ROOMS) {
      if (!s.save.visited.includes(r.id)) continue;
      const b = bounds(r);
      const x = ox + b.x * scale;
      const y = oy + b.y * scale;
      const here = r.id === s.room.id;
      ctx.fillStyle = here ? 'rgba(232,194,122,0.3)' : 'rgba(232,220,192,0.08)';
      ctx.fillRect(x + 1, y + 1, b.w * scale - 2, b.h * scale - 2);
      ctx.strokeStyle = PALETTES[r.zone].rim;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, b.w * scale - 3, b.h * scale - 3);
      ctx.globalAlpha = 1;
      // Exits as gaps of light.
      ctx.fillStyle = COLORS.paper;
      for (const sp of r.exits.l ?? []) ctx.fillRect(x, y + sp[0] * scale, 2, (sp[1] - sp[0] + 1) * scale);
      for (const sp of r.exits.r ?? []) ctx.fillRect(x + b.w * scale - 2, y + sp[0] * scale, 2, (sp[1] - sp[0] + 1) * scale);
      for (const sp of r.exits.u ?? []) ctx.fillRect(x + sp[0] * scale, y, (sp[1] - sp[0] + 1) * scale, 2);
      for (const sp of r.exits.d ?? []) ctx.fillRect(x + sp[0] * scale, y + b.h * scale - 2, (sp[1] - sp[0] + 1) * scale, 2);
      // Icons: lecterns, bosses, the glas.
      for (const [k, ex, ey] of r.ents ?? []) {
        const px = x + ex * scale;
        const py = y + ey * scale;
        if (k === 'lectern') { ctx.fillStyle = COLORS.gold; ctx.fillRect(px - 2, py - 4, 4, 5); }
        if (k === 'arena') { ctx.fillStyle = s.flags[`boss_${(r.ents!.find((e) => e[0] === 'arena')![3] as { boss: string }).boss}`] ? '#6a6050' : COLORS.red; ctx.beginPath(); ctx.arc(px, py - 4, 3, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    // The player.
    const pr = bounds(s.room.def);
    const px = ox + (pr.x + s.player.cx / 20) * scale;
    const py = oy + (pr.y + s.player.cy / 20) * scale;
    ctx.fillStyle = Math.floor(Date.now() / 300) % 2 ? '#ffffff' : COLORS.gold;
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    if (s.save.glas) {
      const g = bounds(roomDef(s.save.glas.room));
      ctx.fillStyle = COLORS.bronze;
      ctx.beginPath(); ctx.arc(ox + (g.x + s.save.glas.x / 20) * scale, oy + (g.y + s.save.glas.y / 20) * scale, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (this.travel) {
      const id = s.save.lecterns[this.sel];
      const b = bounds(roomDef(id));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + b.x * scale - 3, oy + b.y * scale - 3, b.w * scale + 6, b.h * scale + 6);
      text(ctx, tx(`zones.${roomDef(id).zone}.name`), VIEW_W / 2, VIEW_H - 24, 13, COLORS.paper, 'center', FONT_DISPLAY);
    }
    text(ctx, this.travel ? tx('menu.travel') : tx('menu.map'), VIEW_W / 2, 26, 16, COLORS.gold, 'center', FONT_DISPLAY);
    // Legend of zones discovered.
    let ly = 50;
    for (const z of ZONES) {
      if (!s.save.visited.some((id) => roomDef(id).zone === z)) continue;
      ctx.fillStyle = PALETTES[z].rim;
      ctx.fillRect(16, ly - 7, 8, 8);
      text(ctx, tx(`zones.${z}.name`), 30, ly, 10, COLORS.dim);
      ly += 14;
    }
    void CELL_W;
    void CELL_H;
  }
}

// ---------------------------------------------------------------- options

export function optionsMenu(settings: Settings, apply: (s: Partial<Settings>) => void, onClose: () => void): Menu {
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const slider = (key: 'master' | 'music' | 'effects') => ({
    label: () => tx(`options.${key}`),
    value: () => pct(settings[key]),
    adjust: (d: number) => apply({ [key]: Math.max(0, Math.min(1, Math.round((settings[key] + d * 0.1) * 10) / 10)) }),
  });
  const toggle = (key: 'shake' | 'flashes' | 'assist') => ({
    label: () => tx(`options.${key}`),
    value: () => (settings[key] ? tx('options.on') : tx('options.off')),
    action: () => apply({ [key]: !settings[key] }),
    adjust: () => apply({ [key]: !settings[key] }),
  });
  const langs = Object.keys(LOCALES) as Lang[];
  let m: Menu;
  const items: Item[] = [
    { label: () => tx('options.language'), value: () => LOCALES[lang()].meta.lang, adjust: (d) => apply({ lang: langs[(langs.indexOf(lang()) + d + langs.length) % langs.length] }), action: () => apply({ lang: langs[(langs.indexOf(lang()) + 1) % langs.length] }) },
    slider('master'), slider('music'), slider('effects'), toggle('shake'), toggle('flashes'), toggle('assist'),
    { label: () => tx('options.keys'), action: () => { m.close(); keysMenuOpen(settings, apply, onClose); } },
    { label: () => tx('options.fullscreen'), action: () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => undefined); } },
    { label: () => tx('options.back'), action: () => { m.close(); onClose(); } },
  ];
  m = new Menu(() => tx('options.title'), items, () => { m.close(); onClose(); }, 330);
  return m;
}

let keysHook: ((m: Menu) => void) | null = null;
/** The interface registers how to show a menu built outside a scene. */
export function setMenuHost(fn: (m: Menu) => void): void {
  keysHook = fn;
}

function keysMenuOpen(settings: Settings, apply: (s: Partial<Settings>) => void, onClose: () => void): void {
  let m: Menu;
  const items: Item[] = ACTIONS.map((a: Action) => ({
    label: () => tx(`actions.${a}`),
    value: () => (input.capture && waiting === a ? '…' : input.bindings[a].map((c) => c.replace(/^Key|^Digit/, '')).join(' / ')),
    action: () => {
      waiting = a;
      input.capture = (code) => {
        waiting = null;
        // Replace the first binding; drop the key from other actions.
        for (const other of ACTIONS) input.bindings[other] = input.bindings[other].filter((c) => c !== code);
        input.bindings[a] = [code, ...input.bindings[a].slice(1, 2)];
        apply({ keys: structuredClone(input.bindings) });
      };
    },
  }));
  items.push({ label: () => tx('options.resetKeys'), action: () => { input.bindings = structuredClone(DEFAULT_KEYS); apply({ keys: null }); } });
  items.push({ label: () => tx('options.back'), action: () => { m.close(); keysHook?.(optionsMenu(settings, apply, onClose)); } });
  m = new Menu(() => tx('options.keys'), items, () => { m.close(); keysHook?.(optionsMenu(settings, apply, onClose)); }, 360);
  keysHook?.(m);
}
let waiting: Action | null = null;

export { lines };
