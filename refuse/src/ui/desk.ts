import { audio } from '../audio';
import { CLAUSE_BY_ID, PERKS, STAFF, UPGRADES } from '../data/content';
import * as G from '../game/state';
import type { GameState } from '../game/state';
import { L, fmt, lang } from '../i18n';
import { saveGame } from '../save';
import { settings } from '../settings';
import { button, confirmBox, fill, h, img, modal, onKeys, show, stage } from './dom';
import {
  achievementText, claimForm, clauseCard, clauseText, decimal, duration, money, perkText, staffText, upgradeText,
} from './forms';
import { openHowto } from './howto';
import { openOptions } from './options';
import { goTitle, showBoard, showEnding } from './router';
import { openTrial } from './trial';

type Tab = 'staff' | 'upgrades' | 'guild' | 'board' | 'honours';

let g: GameState;
let raf = 0;
let paused = false;
let busy = false;
let tab: Tab = 'staff';
let lastFrame = 0;
let lastSlow = 0;
let lastSave = 0;
let lastTip = 0;
let tipIndex = 0;
let shownClaim = -1;
let handKey = '';
let panelKey = '';
let panelUpdaters: (() => void)[] = [];
let knownAchievements = 0;
let warned = false;

// Persistent elements of the scene, built once by showDesk().
let el: {
  realm: HTMLElement; floor: HTMLElement; ecus: HTMLElement; rate: HTMLElement; scandalFill: HTMLElement; scandalLabel: HTMLElement;
  clock: HTMLElement; status: HTMLElement; window: HTMLElement; windowImg: HTMLImageElement; banner: HTMLElement; tip: HTMLElement;
  trialBox: HTMLElement; formWrap: HTMLElement; hand: HTMLElement; info: HTMLElement; streak: HTMLElement; deck: HTMLElement;
  approve: HTMLButtonElement; redraw: HTMLButtonElement; tabs: HTMLElement; panel: HTMLElement;
};

const fast = () => settings().fast;

function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

function persist(): void {
  g.lastSeen = Date.now();
  saveGame(g);
}

export function currentGame(): GameState {
  return g;
}

/** The office: claim on the desk, clauses in hand, the village through the window, shops on the right. */
export function showDesk(state: GameState, away?: { seconds: number; earned: number }): void {
  g = state;
  const t = L();
  paused = false;
  busy = false;
  shownClaim = -1;
  handKey = '';
  panelKey = '';
  knownAchievements = g.achievements.length;
  audio.track('office');

  const pauseBtn = button('❚❚', openPause, 'icon-btn');
  pauseBtn.title = t.hud.pause;
  const hud = h('header.hud', {},
    h('div.hud-place', {}, h('div.hud-realm'), h('div.hud-floor')),
    h('div.hud-money', {}, h('div.hud-ecus'), h('div.hud-rate')),
    h('div.hud-scandal', {}, h('div.hud-scandal-label'), h('div.gauge', {}, h('div.gauge-fill'), h('div.gauge-marks'))),
    h('div.hud-clock'),
    pauseBtn);
  const status = h('div.status');
  const windowImg = img(`win_${G.realmOf(g).window}_0`, 'win-img', t.hud.window);
  const win = h(`div.window.realm-${G.realmOf(g).id}` as 'div', {}, windowImg, h('div.win-night'), h('div.win-crack'), h('div.win-frame'));
  const left = h('section.col-left', {},
    win,
    status,
    h('div.banner'),
    h('div.tip', {}, img('pt_grisard', 'tip-face'), h('p.tip-text')),
    h('div.trial-box'));
  const approve = button(t.hud.approve, doApprove, 'approve');
  const redraw = button(t.hud.redraw, doRedraw, 'ghost small');
  redraw.title = t.hud.redrawHint;
  const center = h('section.col-center', {},
    h('div.form-wrap'),
    h('div.hand-head', {}, h('span', {}, t.hud.hand), h('span.streak'), h('span.deck')),
    h('div.hand'),
    h('p.card-info'),
    h('div.actions', {}, approve, redraw));
  const right = h('section.col-right', {}, h('nav.tabs'), h('div.panel'));
  const scene = h('div.scene.desk', {}, hud, h('main.desk-main', {}, left, center, right));
  show(scene);

  const q = <T extends HTMLElement>(sel: string) => scene.querySelector(sel) as T;
  el = {
    realm: q('.hud-realm'), floor: q('.hud-floor'), ecus: q('.hud-ecus'), rate: q('.hud-rate'), scandalFill: q('.gauge-fill'),
    scandalLabel: q('.hud-scandal-label'), clock: q('.hud-clock'), status, window: win, windowImg, banner: q('.banner'),
    tip: q('.tip-text'), trialBox: q('.trial-box'), formWrap: q('.form-wrap'), hand: q('.hand'), info: q('.card-info'),
    streak: q('.streak'), deck: q('.deck'), approve, redraw, tabs: q('.tabs'), panel: q('.panel'),
  };
  preloadWindows();
  renderTabs();
  renderClaim();
  renderHand();
  renderTip();
  renderSlow();
  renderHud();

  onKeys((e) => {
    if (paused || stage().querySelector('.modal')) return;
    if (e.key === 'Escape') { openPause(); return; }
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'a') doApprove();
    else if (k === 'r') doRedraw();
    else if (/^Digit[1-9]$/.test(e.code) || /^Numpad[1-9]$/.test(e.code)) pickCard(Number(e.code.slice(-1)) - 1);
  });

  cancelAnimationFrame(raf);
  lastFrame = performance.now();
  lastSave = lastFrame;
  raf = requestAnimationFrame(frame);
  if (away && away.earned > 0) showAway(away);
  if (g.trial) openTrial(g, onTrialDone);
}

export function stopDesk(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  if (g) persist();
}

function frame(now: number): void {
  if (!document.getElementById('stage')?.querySelector('.desk')) return;
  const dt = Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!paused) {
    const riots = g.stats.riots;
    const ev = G.tick(g, dt);
    if (ev === 'royal') { announce(L().hud.royal, 'royal'); audio.play('fanfare'); }
    if (ev === 'audit') { announce(L().hud.auditStart, 'audit'); audio.play('bell'); }
    if (g.stats.riots > riots) onRiot();
    // One warning per climb towards a riot.
    if (g.scandal >= 75 && !warned) { warned = true; announce(L().hud.warn, 'warn'); }
    if (g.scandal < 50) warned = false;
  }
  renderHud();
  if (now - lastSlow > 250) {
    lastSlow = now;
    renderClaim();
    renderHand();
    renderSlow();
    checkAchievements();
  }
  if (now - lastTip > 28000) { lastTip = now; renderTip(); }
  if (now - lastSave > 5000) { lastSave = now; persist(); }
  raf = requestAnimationFrame(frame);
}

function renderHud(): void {
  const t = L();
  const realm = G.realmOf(g);
  setText(el.realm, (t.realms as Record<string, { name: string }>)[realm.id].name);
  setText(el.floor, g.ended && g.floor >= 3 ? t.hud.endless : t.floors[g.floor]);
  setText(el.ecus, money(g.ecus));
  setText(el.rate, fmt(t.hud.perSec, { n: G.short(G.staffIncome(g), lang()) }));
  const sc = Math.min(100, g.scandal);
  el.scandalFill.style.width = `${sc}%`;
  const mood = G.inRiot(g) ? t.hud.riot : sc < 25 ? t.hud.calm : sc < 55 ? t.hud.restless : t.hud.angry;
  setText(el.scandalLabel, `${t.hud.scandal} — ${mood}`);
  el.scandalFill.className = `gauge-fill lvl-${G.inRiot(g) ? 4 : Math.min(3, Math.floor(sc / 25))}`;
  const night = G.isNight(g);
  const dayPos = (g.time % G.DAY_LENGTH) / G.DAY_LENGTH;
  setText(el.clock, `${night ? '☾' : '☀'} ${night ? t.hud.night : t.hud.day}`);
  el.clock.style.setProperty('--day', String(dayPos));
  el.clock.classList.toggle('night', night);
  const lines: string[] = [];
  if (G.inAudit(g)) lines.push(fmt(t.hud.audit, { n: Math.ceil(g.auditUntil - g.time) }));
  if (G.inRiot(g)) lines.push(fmt(t.hud.strike, { n: Math.ceil(g.riotUntil - g.time) }));
  setText(el.status, lines.join('\n'));
  el.status.classList.toggle('on', lines.length > 0);
}

function windowState(): number {
  if (G.inRiot(g)) return 3;
  return Math.min(3, Math.floor(g.scandal / 25));
}

function preloadWindows(): void {
  for (let i = 0; i < 4; i++) new Image().src = `img/win_${G.realmOf(g).window}_${i}.webp`;
}

/** Things that change a few times a second: window, trial box, shop affordability. */
function renderSlow(): void {
  const realm = G.realmOf(g);
  const src = `img/win_${realm.window}_${windowState()}.webp`;
  if (!el.windowImg.src.endsWith(src)) el.windowImg.src = src;
  el.window.classList.toggle('night', G.isNight(g));
  el.window.classList.toggle('riot', G.inRiot(g));
  el.approve.disabled = busy || !g.claim;
  renderTrialBox();
  const key = `${tab}|${g.floor}|${g.realm}|${g.shares}|${JSON.stringify(g.staff)}|${g.upgrades.join()}|${g.deck.length}|${JSON.stringify(g.perks)}|${g.achievements.length}`;
  if (key !== panelKey) { panelKey = key; renderPanel(); }
  for (const u of panelUpdaters) u();
  renderTabs();
}

function renderClaim(): void {
  if (!g.claim || g.claim.seq === shownClaim || busy) return;
  shownClaim = g.claim.seq;
  const form = claimForm(g.claim);
  form.classList.add('enter');
  fill(el.formWrap, form);
  requestAnimationFrame(() => requestAnimationFrame(() => form.classList.remove('enter')));
  if (g.claim.type.id === 'royal') el.formWrap.classList.add('royal-glow');
  else el.formWrap.classList.remove('royal-glow');
  handKey = '';
  renderHand();
}

function fits(i: number): boolean {
  const id = g.hand[i];
  return !!g.claim && !!id && G.clauseFits(g, CLAUSE_BY_ID[id], g.claim);
}

function renderHand(): void {
  const key = `${g.hand.join()}|${g.claim?.seq}|${G.inAudit(g)}|${g.claim?.night}|${busy}|${lang()}`;
  if (key === handKey) return;
  handKey = key;
  const t = L();
  const cards = g.hand.map((id, i) => {
    const card = clauseCard(id, fits(i), i, () => pickCard(i), (hover) => setText(el.info, hover ? clauseText(hover).desc : hint()));
    card.disabled = busy;
    return card;
  });
  fill(el.hand, ...cards);
  setText(el.info, hint());
  setText(el.deck, fmt(t.hud.deck, { n: g.deck.length }));
  setText(el.streak, g.streak.count > 0 ? fmt(t.hud.streak, { n: decimal(Math.round(G.streakMult(g) * 10) / 10) }) : '');
  el.redraw.disabled = busy;
}

function hint(): string {
  const t = L();
  if (!g.claim) return '';
  if (g.claim.type.id === 'royal') return t.hud.royal;
  return g.hand.some((_, i) => fits(i)) ? t.hud.pickClause : t.hud.noFit;
}

function float(text: string, cls: string): void {
  const f = h(`div.float.${cls}` as 'div', {}, text);
  el.formWrap.append(f);
  setTimeout(() => f.remove(), 1400);
}

async function stampAndNext(kind: 'refused' | 'approved'): Promise<void> {
  const form = el.formWrap.querySelector('.form');
  if (!form) return;
  busy = true;
  handKey = '';
  renderHand();
  const t = L();
  form.append(h(`div.stamp.${kind}` as 'div', {}, kind === 'refused' ? t.hud.refuse : t.hud.approve));
  await new Promise((r) => setTimeout(r, fast() ? 120 : 380));
  form.classList.add(kind === 'refused' ? 'leave' : 'leave-up');
  await new Promise((r) => setTimeout(r, fast() ? 80 : 260));
  busy = false;
  renderClaim();
}

function pickCard(i: number): void {
  if (busy || paused || !g.claim || i >= g.hand.length) return;
  if (!fits(i)) {
    audio.play('deny');
    el.hand.children[i]?.classList.add('shake');
    setTimeout(() => el.hand.children[i]?.classList.remove('shake'), 400);
    return;
  }
  const riots = g.stats.riots;
  const out = G.refuse(g, i);
  if (out.kind === 'invalid') return;
  audio.play('stamp');
  if (out.kind === 'refused') {
    float(`+${money(out.gain)}`, 'gain');
    if (out.gain > 0) setTimeout(() => audio.play('coin'), 120);
  } else if (out.kind === 'beheaded') {
    float(`−${money(out.loss)}`, 'loss');
    announce(L().hud.beheaded, 'royal');
    setTimeout(() => audio.play('lose'), 200);
    shakeStage();
  }
  if (g.stats.riots > riots) onRiot();
  void stampAndNext('refused');
}

function doApprove(): void {
  if (busy || paused || !g.claim) return;
  const out = G.approve(g);
  if (out.kind !== 'approved') return;
  audio.play('approve');
  float(out.gain > 0 ? `+${money(out.gain)}` : `−${Math.round(out.relief)} ${L().hud.scandal.toLowerCase()}`, 'calm');
  void stampAndNext('approved');
}

function doRedraw(): void {
  if (busy || paused) return;
  G.redraw(g);
  audio.play('paper');
  handKey = '';
  renderHand();
}

function onRiot(): void {
  announce(L().hud.riotStart, 'riot');
  audio.play('riot');
  shakeStage();
}

function shakeStage(): void {
  if (fast()) return;
  const s = stage().querySelector('.desk');
  s?.classList.remove('shake-hard');
  void (s as HTMLElement | null)?.offsetWidth;
  s?.classList.add('shake-hard');
}

let bannerTimer = 0;
function announce(text: string, kind: string): void {
  el.banner.className = `banner on ${kind}`;
  el.banner.textContent = text;
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => el.banner.classList.remove('on'), 7000);
}

function renderTip(): void {
  const tips = L().grisard;
  tipIndex = (tipIndex + 1) % tips.length;
  setText(el.tip, tips[tipIndex]);
}

function renderTrialBox(): void {
  const t = L();
  const key = `${g.floor}|${G.canPlead(g)}|${Math.ceil(Math.max(0, g.trialCooldown - g.time))}|${G.short(g.lifetime, lang())}|${G.sharesFor(g)}|${lang()}`;
  if (el.trialBox.dataset.key === key) return;
  el.trialBox.dataset.key = key;
  if (g.floor >= 3) {
    const n = G.sharesFor(g);
    fill(el.trialBox,
      h('p.goal', {}, t.hud.conquered),
      button(t.hud.bankrupt, async () => {
        if (await confirmBox(fmt(t.hud.bankruptConfirm, { n }), t.hud.yes, t.hud.no)) {
          persist();
          showBoard(g, G.bankrupt(g));
        }
      }, 'primary bankrupt'),
      h('p.small', {}, fmt(t.hud.bankruptDesc, { n })));
    return;
  }
  const goal = G.floorGoal(g);
  const pct = Math.min(100, (g.lifetime / goal) * 100);
  const cooldown = g.trialCooldown - g.time;
  const plead = button(cooldown > 0 ? fmt(t.hud.cooldown, { n: Math.ceil(cooldown) }) : t.hud.plead, () => {
    if (!G.startTrial(g)) return;
    audio.play('gavel');
    persist();
    openTrial(g, onTrialDone);
  }, G.canPlead(g) ? 'primary plead ready' : 'plead');
  plead.disabled = !G.canPlead(g);
  fill(el.trialBox,
    h('p.goal', {}, fmt(t.hud.progress, { n: G.short(g.lifetime, lang()), g: G.short(goal, lang()) })),
    h('div.bar', {}, h('div.bar-fill', { style: `width:${pct}%` })),
    plead);
}

function onTrialDone(): void {
  shownClaim = -1;
  handKey = '';
  panelKey = '';
  el.trialBox.dataset.key = '';
  persist();
  if (g.ended && g.floor >= 3 && g.realm === G.REALM_COUNT - 1 && !endingShown()) {
    markEnding();
    showEnding(g);
    return;
  }
  audio.track('office');
  renderClaim();
}

// The ending plays once per save; afterwards the endless year continues quietly.
const endingShown = () => g.achievements.includes('fin_vue');
const markEnding = () => { if (!endingShown()) g.achievements.push('fin_vue'); };

function checkAchievements(): void {
  if (g.achievements.length <= knownAchievements) return;
  const fresh = g.achievements.slice(knownAchievements).filter((a) => G.ACHIEVEMENTS.includes(a));
  knownAchievements = g.achievements.length;
  for (const a of fresh) toast(fmt(L().hud.unlocked, { name: achievementText(a).name }));
}

function toast(text: string): void {
  const n = h('div.toast', {}, text);
  stage().append(n);
  audio.play('bell');
  setTimeout(() => n.classList.add('out'), 3200);
  setTimeout(() => n.remove(), 3800);
}

function showAway(away: { seconds: number; earned: number }): void {
  const t = L();
  const box = h('div.menu-box.away', {},
    h('h2', {}, t.hud.awayTitle),
    img('ic_clerc', 'away-ic'),
    h('p', {}, fmt(t.hud.away, { t: duration(away.seconds), n: G.short(away.earned, lang()) })));
  const m = modal(box, 'small');
  box.append(button(t.howto.close, () => m.close(), 'primary'));
  audio.play('coin');
}

function openPause(): void {
  const t = L();
  paused = true;
  persist();
  const box = h('div.menu-box', {}, h('h2', {}, t.hud.pause));
  const m = modal(box);
  const close = () => { m.close(); paused = false; lastFrame = performance.now(); };
  box.append(
    button(t.options.resume, close, 'primary'),
    button(t.title.howto, () => openHowto()),
    button(t.title.options, () => openOptions(() => { panelKey = ''; handKey = ''; el.trialBox.dataset.key = ''; renderTabs(); })),
    button(t.options.toTitle, () => { m.close(); paused = false; stopDesk(); goTitle(); }),
  );
}

// ---- Right column: shops ----

function tabsAvailable(): Tab[] {
  const tabs: Tab[] = ['staff', 'upgrades', 'guild'];
  if (g.shares > 0 || g.stats.bankruptcies > 0 || Object.keys(g.perks).length) tabs.push('board');
  tabs.push('honours');
  return tabs;
}

function renderTabs(): void {
  const t = L();
  const labels: Record<Tab, string> = { staff: t.hud.staff, upgrades: t.hud.upgrades, guild: t.hud.guild, board: t.hud.board, honours: t.hud.achievements };
  const list = tabsAvailable();
  const key = `${list.join()}|${tab}|${lang()}`;
  if (el.tabs.dataset.key === key) return;
  el.tabs.dataset.key = key;
  if (!list.includes(tab)) tab = 'staff';
  fill(el.tabs, ...list.map((id) => h(`button.tab${id === tab ? '.on' : ''}` as 'button', {
    onclick: () => { audio.play('paper'); tab = id; panelKey = ''; el.tabs.dataset.key = ''; renderTabs(); renderSlow(); },
  }, labels[id])));
}

function row(icon: string | null, name: string, desc: string, extra: string, action: HTMLButtonElement | null): HTMLElement {
  return h('div.row-item', {},
    icon ? img(icon, 'row-ic') : h('div.row-ic.blank'),
    h('div.row-text', {}, h('div.row-name', {}, name, extra ? h('span.row-extra', {}, extra) : null), h('div.row-desc', {}, desc)),
    action);
}

function buyButton(label: () => string, enabled: () => boolean, onBuy: () => boolean): HTMLButtonElement {
  const b = h('button.btn.buy', {
    onclick: () => {
      if (onBuy()) { audio.play('buy'); panelKey = ''; renderSlow(); persist(); } else audio.play('deny');
    },
  }) as HTMLButtonElement;
  panelUpdaters.push(() => {
    setText(b, label());
    b.disabled = !enabled();
  });
  return b;
}

function renderPanel(): void {
  const t = L();
  panelUpdaters = [];
  const floorName = (f: number) => fmt(t.hud.locked, { floor: t.floors[f] });
  let items: HTMLElement[] = [];
  if (tab === 'staff') {
    items = STAFF.map((d) => {
      const locked = d.floor > g.floor;
      const btn = buyButton(
        () => locked ? floorName(d.floor) : money(G.staffCost(g, d.id)),
        () => !locked && g.ecus >= G.staffCost(g, d.id),
        () => G.buyStaff(g, d.id));
      const r = row(d.icon, staffText(d.id).name, staffText(d.id).desc, fmt(t.hud.owned, { n: g.staff[d.id] ?? 0 }), btn);
      if (locked) r.classList.add('locked');
      return r;
    });
  } else if (tab === 'upgrades') {
    items = UPGRADES.map((u) => {
      const owned = G.hasUp(g, u.id);
      const locked = u.floor > g.floor;
      const btn = buyButton(
        () => owned ? t.hud.bought : locked ? floorName(u.floor) : money(G.upgradeCost(g, u.id)),
        () => !owned && !locked && g.ecus >= G.upgradeCost(g, u.id),
        () => G.buyUpgrade(g, u.id));
      const r = row(u.icon, upgradeText(u.id).name, upgradeText(u.id).desc, '', btn);
      if (owned) r.classList.add('owned');
      if (locked) r.classList.add('locked');
      return r;
    });
  } else if (tab === 'guild') {
    items = G.guildClauses(g).map((c) => {
      const count = g.deck.filter((x) => x === c.id).length;
      const btn = buyButton(() => money(G.clauseCost(c.id)), () => g.ecus >= G.clauseCost(c.id), () => G.buyClause(g, c.id));
      const r = row(null, clauseText(c.id).name, clauseText(c.id).desc, count ? fmt(t.hud.owned, { n: count }) : '', btn);
      r.querySelector('.row-ic')!.replaceWith(h(`div.row-ic.mini-card${c.fraud ? '.fraud' : ''}` as 'div', {}, decimal(c.yield)));
      return r;
    });
    items.unshift(h('p.panel-note', {}, fmt(t.hud.deck, { n: g.deck.length })));
  } else if (tab === 'board') {
    items = PERKS.map((p) => {
      const level = G.perk(g, p.id);
      const maxed = level >= p.max;
      const btn = buyButton(
        () => maxed ? t.hud.bought : fmt(t.hud.shares, { n: G.perkCost(g, p.id) }),
        () => !maxed && g.shares >= G.perkCost(g, p.id),
        () => G.buyPerk(g, p.id));
      return row(null, perkText(p.id).name, perkText(p.id).desc, p.max > 1 ? `${level}/${p.max}` : '', btn);
    });
    items.unshift(h('p.panel-note.shares', {}, fmt(t.hud.shares, { n: g.shares })));
  } else {
    items = G.ACHIEVEMENTS.map((a) => {
      const got = g.achievements.includes(a);
      const r = row(null, `${got ? '✔ ' : ''}${achievementText(a).name}`, achievementText(a).desc, '', null);
      r.classList.add(got ? 'owned' : 'locked');
      return r;
    });
    items.unshift(h('p.panel-note', {}, fmt(t.ending.stats, { r: g.stats.refused, a: g.stats.approved, e: g.stats.riots, b: g.stats.bankruptcies })));
  }
  const scroll = el.panel.scrollTop;
  fill(el.panel, ...items);
  el.panel.scrollTop = scroll;
}

// ---- Test hooks (dev builds and ?autoplay only) ----
if (import.meta.env.DEV || location.search.includes('autoplay')) {
  (window as unknown as { __refuse: unknown }).__refuse = {
    game: () => g,
    /** Simulates `seconds` of play time (staff income, scandal, events) in one go. */
    advance: (seconds: number) => {
      for (let i = 0; i < seconds; i++) G.tick(g, 1);
    },
    fitIndex: () => g.hand.findIndex((_, i) => fits(i)),
    isBusy: () => busy,
  };
}
