import { audio } from '../audio';
import { SHIP_BY_ID } from '../data/content';
import * as G from '../game/state';
import type { GameEvent, GameState } from '../game/state';
import { L, fmt, lang, num } from '../i18n';
import { clearGame, saveGame } from '../save';
import { settings, updateSettings } from '../settings';
import { button, fill, h, img, modal, typewriter } from './dom';
import { openHowto } from './howto';
import { openOptions } from './options';
import { TABS, type Tab, openMessage, renderTab, shipText, when, wreckText } from './panel';
import { Strip } from './strip';

declare global {
  interface Window {
    phareDesktop?: { quit(): void; minimize(): void; setMode(mode: 'full' | 'strip'): void; setOnTop(on: boolean): void };
  }
}

let g: GameState;
let strip: Strip;
let tab: Tab = 'registre';
let mode: 'full' | 'strip' = 'full';
let tabKey = '';
let refreshTab: () => void = () => undefined;
let pointer: { x: number; y: number } | null = null;
let aimed: number | null = null;
let flash = 0;
let nextFlash = 0;
let nextGull = 0;
let lastFrame = 0;
let lastSlow = 0;
let lastSave = 0;
let tipIndex = 0;
let el: {
  root: HTMLElement; house: HTMLElement; tabs: HTMLElement; body: HTMLElement; quote: HTMLElement; sous: HTMLElement; clock: HTMLElement;
  forecast: HTMLElement; gauges: Record<'oil' | 'clean' | 'spring', HTMLElement>; storm: HTMLElement; toasts: HTMLElement; floats: HTMLElement;
  stripBox: HTMLElement; horn: HTMLButtonElement; modeBtn: HTMLButtonElement;
};

const opts = () => ({ stormEvery: settings().storms });

function persist(): void {
  g.lastSeen = Date.now();
  saveGame(g);
}

export function game(): GameState | undefined {
  return g;
}

export function startApp(state: GameState, away?: G.Absence): void {
  g = state;
  const t = L();
  const app = document.getElementById('app')!;
  const desktop = !!window.phareDesktop;

  const gauge = (key: 'oil' | 'clean' | 'spring', label: string, action: string, sfx: 'glug' | 'wipe' | 'creak') => {
    const b = h('button.gauge', {
      onclick: () => { audio.unlock(); if (G.maintain(g, key)) { audio.play(sfx); persist(); } },
      title: action,
    }, h('span.g-label', {}, label), h('span.g-bar', {}, h('span.g-fill')), h('span.g-act', {}, action));
    return b;
  };
  const gauges = {
    oil: gauge('oil', t.hud.oil, t.hud.doOil, 'glug'),
    clean: gauge('clean', t.hud.clean, t.hud.doClean, 'wipe'),
    spring: gauge('spring', t.hud.spring, t.hud.doSpring, 'creak'),
  };
  const horn = button(t.hud.horn, doHorn, 'horn small');
  const modeBtn = button(desktop ? t.hud.strip : '▾', toggleMode, 'small ghost mode-btn');
  modeBtn.title = desktop ? t.hud.strip : t.hud.house;
  // The paper texture is set here so its path stays relative to the page (file:// in the desktop build).
  const house = h('section.house', { style: "background-image: url('img/bg_registre.webp')" },
    h('header.house-head', {},
      img('pt_yann', 'yann'),
      h('div.house-title', {}, h('h1', {}, t.title.name), h('p.quote')),
      h('div.head-btns', {},
        button('⚙', () => openOptions({
          onLangChange: () => startApp(g),
          keeperName: { get: () => g.keeperName, set: (n) => { g.keeperName = n; persist(); } },
          onReset: () => { clearGame(); location.reload(); },
          onTopChange: (on) => window.phareDesktop?.setOnTop(on),
          desktop,
        }), 'small icon'),
        button('?', () => openHowto(), 'small icon'),
        desktop ? button('—', () => window.phareDesktop!.minimize(), 'small icon') : null,
        desktop ? button('✕', () => { persist(); window.phareDesktop!.quit(); }, 'small icon') : null)),
    h('nav.tabs'),
    h('div.tab-body'));
  const stripBox = h('section.strip', {},
    strip?.canvas ?? null,
    h('div.hud-left', {}, h('div.clock'), h('div.forecast')),
    h('div.hud-right', {}, h('div.sous'), gauges.oil, gauges.clean, gauges.spring, horn, modeBtn),
    h('div.storm-banner'),
    h('div.floats'),
    h('div.toasts'));
  if (!strip) {
    strip = new Strip();
    stripBox.prepend(strip.canvas);
  }
  fill(app, house, stripBox);
  const q = <T extends HTMLElement>(sel: string) => app.querySelector(sel) as T;
  el = {
    root: app, house, tabs: q('.tabs'), body: q('.tab-body'), quote: q('.quote'), sous: q('.sous'), clock: q('.clock'), forecast: q('.forecast'),
    gauges, storm: q('.storm-banner'), toasts: q('.toasts'), floats: q('.floats'), stripBox, horn, modeBtn,
  };
  // The desktop build reopens in the shape it was closed in.
  if (desktop && settings().mode !== mode) {
    mode = settings().mode;
    window.phareDesktop!.setMode(mode);
  }
  setMode(mode);
  renderTabs();
  renderQuote();
  bindPointer();
  strip.resize();
  tabKey = '';
  window.onresize = () => strip.resize();
  window.onkeydown = (e) => {
    if (e.code === 'KeyH' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) doHorn();
  };
  lastFrame = performance.now();
  requestAnimationFrame(frame);
  if (away && away.seconds >= 60) showAway(away);
}

let running = false;
function frame(now: number): void {
  if (!running) { running = true; }
  const dt = Math.min(0.5, (now - lastFrame) / 1000);
  lastFrame = now;
  if (aimed !== null && g.storm.phase === 'active') G.lightShip(g, aimed, dt);
  const events = G.tick(g, dt, opts());
  for (const e of events) onEvent(e);
  updateWeatherFx(now);
  strip.render(g, now, { pointer, aimed, flash, reduced: settings().fast });
  flash = Math.max(0, flash - dt * 2.5);
  renderHud();
  if (now - lastSlow > 500) {
    lastSlow = now;
    renderBody();
    audio.radio(G.level(g, 'radio') > 0 && settings().radio);
  }
  if (now - lastSave > 10000) { lastSave = now; persist(); }
  requestAnimationFrame(frame);
}

function updateWeatherFx(now: number): void {
  const storm = G.inStorm(g);
  const w = G.weather(g);
  audio.ambience({
    waves: storm ? 1 : w === 'vent' ? 0.85 : 0.55,
    rain: storm ? 1 : w === 'pluie' ? 0.7 : 0,
    wind: storm ? 1 : w === 'vent' ? 0.8 : w === 'brouillard' ? 0.1 : 0.2,
  });
  if (storm && now > nextFlash) {
    nextFlash = now + 5000 + Math.random() * 9000;
    if (!settings().fast) flash = 1;
    setTimeout(() => audio.play('thunder'), 300 + Math.random() * 900);
  }
  if (!storm && !G.isNight(g.time) && (w === 'clair' || w === 'nuageux') && now > nextGull) {
    nextGull = now + 20000 + Math.random() * 40000;
    audio.play('gull');
  }
}

function renderHud(): void {
  const t = L();
  setText(el.sous, fmt(t.hud.sous, { n: num(Math.floor(g.sous)) }));
  const storm = G.inStorm(g);
  const wx = storm ? t.weather.tempete : (t.weather as Record<string, string>)[G.weather(g)];
  setText(el.clock, `${when(g.time)} · ${wx}`);
  let fc = '';
  if (G.level(g, 'radio')) {
    fc = fmt(t.hud.forecast, { now: wx, next: (t.weather as Record<string, string>)[G.forecast(g)] });
    if (g.nextStorm && g.storm.phase === 'none') fc += ` · ${fmt(t.hud.nextStorm, { n: Math.max(1, Math.ceil((g.nextStorm - g.time) / 60)) })}`;
  }
  setText(el.forecast, fc);
  for (const k of ['oil', 'clean', 'spring'] as const) {
    const v = g[k];
    const fillEl = el.gauges[k].querySelector('.g-fill') as HTMLElement;
    fillEl.style.width = `${v}%`;
    el.gauges[k].classList.toggle('low', v < 25);
    el.gauges[k].classList.toggle('empty', v <= 0);
  }
  const hornReady = G.level(g, 'corne') > 0 && g.storm.phase === 'active';
  el.horn.style.display = hornReady ? '' : 'none';
  el.horn.disabled = g.time < g.storm.horn;
  // Storm banner.
  const phase = g.storm.phase;
  const key = `${phase}|${lang()}`;
  if (el.storm.dataset.key !== key) {
    el.storm.dataset.key = key;
    if (phase === 'waiting') {
      fill(el.storm, h('span', {}, t.hud.stormWaiting), button(t.hud.stormEngage, engage, 'primary small'));
      el.storm.className = 'storm-banner on';
    } else if (phase === 'active') {
      fill(el.storm, h('span', {}, t.hud.stormHelp), G.level(g, 'corne') ? h('span.kbd', {}, t.hud.hornHelp) : null);
      el.storm.className = 'storm-banner on active';
    } else if (phase === 'warning') {
      fill(el.storm, h('span', {}, t.hud.stormWarning));
      el.storm.className = 'storm-banner on warn';
    } else {
      el.storm.className = 'storm-banner';
    }
  }
  el.stripBox.classList.toggle('out', g.oil <= 0);
}

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function engage(): void {
  audio.unlock();
  if (G.engageStorm(g)) audio.play('horn');
}

function doHorn(): void {
  if (G.horn(g)) audio.play('horn');
}

function onEvent(e: GameEvent): void {
  const t = L();
  switch (e.kind) {
    case 'new':
      audio.play('bell');
      toast(fmt(t.hud.newShip, { ship: shipText(e.ship).name }), 'new', `sh_${e.ship}`);
      break;
    case 'ship':
      if (e.fee > 0) floatAt(e.ship, `+${e.fee}`);
      break;
    case 'wreck':
      audio.play('splash');
      if (g.stats.fished < 3 && !G.level(g, 'epuisette')) toast(t.hud.wreckSpotted, 'info');
      break;
    case 'fished':
      audio.play('splash');
      toast(fmt(t.hud.fished, { wreck: wreckText(e.wreck).name }), 'info', `ep_${e.wreck}`);
      break;
    case 'stormWarning':
      audio.play('thunder');
      break;
    case 'stormWaiting':
      audio.play('horn');
      break;
    case 'saved':
      audio.play('saved');
      toast(fmt(e.bottle ? t.hud.savedBottle : t.hud.saved, { n: e.fee }), 'good');
      break;
    case 'aground':
      audio.play('crash');
      toast(t.hud.aground, 'info');
      break;
    case 'stormEnd':
      toast(e.anchored ? t.hud.anchored : fmt(t.hud.stormEnd, { saved: e.saved, aground: e.aground }), 'info');
      aimed = null;
      persist();
      break;
    case 'mission':
      audio.play('coin');
      toast(fmt(t.hud.mission, { n: e.reward }), 'good');
      break;
    case 'honour':
      audio.play('bell');
      toast(fmt(t.hud.honour, { name: (t.honours as Record<string, { name: string }>)[e.id].name }), 'new');
      if (G.collectionComplete(g) && !g.completeShown) { g.completeShown = true; showComplete(); }
      break;
    case 'day':
      renderQuote();
      break;
    default:
      break;
  }
}

function toast(text: string, kind: string, icon?: string): void {
  const n = h(`div.toast.${kind}` as 'div', {}, icon ? img(icon, 'toast-ic') : null, h('span', {}, text));
  el.toasts.append(n);
  while (el.toasts.children.length > 2) el.toasts.firstElementChild!.remove();
  setTimeout(() => n.classList.add('out'), 4500);
  setTimeout(() => n.remove(), 5200);
}

function floatAt(shipId: string, text: string): void {
  const ship = g.ships.find((s) => s.id === shipId && s.paid);
  if (!ship) return;
  const f = h('div.float', { style: `left:${strip.px(ship.x)}px;top:${strip.laneY(ship.lane) - SHIP_BY_ID[ship.id].size * strip.laneScale(ship.lane) * 0.5}px` }, text);
  el.floats.append(f);
  setTimeout(() => f.remove(), 1600);
}

function renderQuote(): void {
  const lines = L().yann;
  tipIndex = (tipIndex + 1) % lines.length;
  setText(el.quote, lines[tipIndex]);
}

// ---- house panel ----

function renderTabs(): void {
  const t = L();
  // Buttons are built once and updated in place, so a click is never lost to a rebuild.
  if (el.tabs.children.length !== TABS.length || el.tabs.dataset.lang !== lang()) {
    el.tabs.dataset.lang = lang();
    fill(el.tabs, ...TABS.map((id) => h('button.tab', {
      'data-tab': id,
      onclick: () => { audio.unlock(); audio.play('paper'); tab = id; tabKey = ''; renderTabs(); renderBody(); },
    }, h('span', {}, t.tabs[id]), h('span.badge'))));
  }
  const unread = G.unreadMessages(g);
  for (const b of Array.from(el.tabs.children) as HTMLElement[]) {
    b.classList.toggle('on', b.dataset.tab === tab);
    const badge = b.querySelector('.badge') as HTMLElement;
    const n = b.dataset.tab === 'bouteilles' ? unread : 0;
    setText(badge, n ? String(n) : '');
    badge.style.display = n ? '' : 'none';
  }
}

/** What each tab shows: it is rebuilt only when this changes; buttons are refreshed in between. */
function tabContentKey(): string {
  const reg = Object.keys(g.registry).length;
  switch (tab) {
    case 'registre': return `${reg}|${g.lens}|${Math.floor(g.time / 60)}`;
    case 'epaves': return JSON.stringify(g.wrecks);
    case 'atelier': return `${g.lens}|${JSON.stringify(g.upgrades)}`;
    case 'maison': return `${JSON.stringify(g.missions)}|${g.decorations.length}|${g.honours.length}`;
    case 'bouteilles': return `${g.bottles}|${g.messagesRead}|${JSON.stringify(g.wrecks)}|${reg}`;
    case 'journal': return `${g.log.length}|${g.log[0]?.t ?? 0}`;
  }
}

function renderBody(): void {
  if (mode === 'strip') return;
  // Rebuild only when something shown in the tab changed; otherwise just refresh the buttons.
  const key = `${tab}|${lang()}|${tabContentKey()}`;
  if (key !== tabKey) {
    const scroll = el.body.scrollTop;
    const keepCode = tab === 'bouteilles' ? (el.body.querySelector('.code-in') as HTMLTextAreaElement | null)?.value : undefined;
    tabKey = key;
    refreshTab = renderTab(tab, el.body, { g, changed: () => { persist(); tabKey = ''; renderBody(); renderTabs(); } });
    el.body.scrollTop = scroll;
    const input = el.body.querySelector('.code-in') as HTMLTextAreaElement | null;
    if (input && keepCode) input.value = keepCode;
  }
  renderTabs();
  refreshTab();
}

function setMode(m: 'full' | 'strip'): void {
  mode = m;
  document.body.classList.toggle('strip-mode', m === 'strip');
  el.modeBtn.textContent = window.phareDesktop ? (m === 'strip' ? L().hud.full : L().hud.strip) : m === 'strip' ? '▴' : '▾';
  requestAnimationFrame(() => strip.resize());
}

function toggleMode(): void {
  const next = mode === 'full' ? 'strip' : 'full';
  window.phareDesktop?.setMode(next);
  updateSettings({ mode: next });
  setMode(next);
  if (next === 'full') { tabKey = ''; renderBody(); }
}

// ---- pointer on the strip ----

function bindPointer(): void {
  const c = strip.canvas;
  const pos = (e: PointerEvent) => {
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  c.onpointermove = (e) => {
    pointer = pos(e);
    const hit = strip.hitAt(pointer.x, pointer.y);
    const ship = hit?.kind === 'ship' ? g.ships.find((s) => s.uid === hit.uid) : undefined;
    aimed = ship?.storm?.state === 'approach' ? ship.uid : null;
    c.style.cursor = hit && (hit.kind !== 'ship' || aimed !== null) ? 'pointer' : g.storm.phase === 'waiting' ? 'pointer' : 'default';
    c.title = ship ? (g.registry[ship.id] ? shipText(ship.id).name : '') : '';
  };
  c.onpointerleave = () => { pointer = null; aimed = null; };
  c.onpointerdown = (e) => {
    audio.unlock();
    const p = pos(e);
    const hit = strip.hitAt(p.x, p.y);
    if (hit?.kind === 'wreck') {
      const id = G.fish(g, hit.uid);
      if (id) onEvent({ kind: 'fished', wreck: id, auto: false });
      persist();
      return;
    }
    if (hit?.kind === 'cat') { audio.play('meow'); toast(L().hud.meow, 'info', 'chr_bernique'); return; }
    if (g.storm.phase === 'waiting') { engage(); return; }
    if (hit?.kind === 'ship') {
      const ship = g.ships.find((s) => s.uid === hit.uid);
      if (ship?.storm?.state === 'approach') aimed = ship.uid;
    }
  };
}

// ---- modals ----

function showAway(a: G.Absence): void {
  const t = L();
  const hours = Math.floor(a.seconds / 3600);
  const mins = Math.floor((a.seconds % 3600) / 60);
  const dur = hours ? `${hours} h ${String(mins).padStart(2, '0')}` : `${Math.max(1, mins)} min`;
  const box = h('div.menu-box.away', {},
    h('h2', {}, fmt(t.away.title, { t: dur })),
    img('pt_yann', 'away-face'),
    h('p', {}, fmt(t.away.body, { n: a.ships })),
    a.fresh.length ? h('p.fresh', {}, fmt(t.away.fresh, { list: a.fresh.map((id) => shipText(id).name).join(', ') })) : null,
    a.sous ? h('p', {}, fmt(t.away.sous, { n: num(a.sous) })) : null,
    a.wrecks.length ? h('p', {}, fmt(t.away.wrecks, { list: [...new Set(a.wrecks)].map((id) => wreckText(id).name).join(', ') })) : null);
  const m = modal(box, 'small');
  box.append(button(t.away.close, () => { audio.unlock(); m.close(); }, 'primary'));
}

function showComplete(): void {
  const t = L();
  const body = h('p.letter-text');
  const box = h('div.menu-box.letter', {}, h('h2', {}, t.complete.title), img('pt_yann', 'away-face'), body);
  const m = modal(box);
  void typewriter(body, t.complete.body).then(() => box.append(button(t.complete.close, () => m.close(), 'primary')));
  persist();
}

export { openMessage };

// ---- test hooks (dev builds and ?autoplay only) ----
if (import.meta.env.DEV || location.search.includes('autoplay')) {
  (window as unknown as { __phare: unknown }).__phare = {
    game: () => g,
    /** Simulates `seconds` of play, a second at a time, letting events reach the interface. */
    advance: (seconds: number) => {
      for (let i = 0; i < seconds; i++) for (const e of G.tick(g, 1, opts())) onEvent(e);
    },
    storm: () => { g.nextStorm = g.time + 1; },
    setTime: (hour: number) => { const now = G.hourOf(g.time); g.time += (((hour - now + 24) % 24) / 24) * G.DAY; },
    stripHits: () => strip.hits,
    /** Lights every approaching storm ship, as a player sweeping the beam would. */
    aimAll: () => { for (const s of g.ships) if (s.storm?.state === 'approach') G.lightShip(g, s.uid, 2); },
    away: (seconds: number) => { g.lastSeen = Date.now() - seconds * 1000; const a = G.offlineProgress(g, Date.now(), opts()); showAway(a); },
    setMode,
    updateSettings,
  };
}
