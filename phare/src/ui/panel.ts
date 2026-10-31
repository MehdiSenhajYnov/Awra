import { audio } from '../audio';
import { DECORATIONS, LENS_COSTS, SHIPS, UPGRADES, WRECKS } from '../data/content';
import * as G from '../game/state';
import type { GameState } from '../game/state';
import { L, fmt, lang, num } from '../i18n';
import { button, fill, h, img, modal } from './dom';

export type Tab = 'registre' | 'epaves' | 'atelier' | 'maison' | 'bouteilles' | 'journal';
export const TABS: Tab[] = ['registre', 'epaves', 'atelier', 'maison', 'bouteilles', 'journal'];

type Named = { name: string; desc: string };
export const shipText = (id: string) => (L().ships as Record<string, Named & { hint: string }>)[id];
export const wreckText = (id: string) => (L().wrecks as Record<string, Named>)[id];
const upgradeText = (id: string) => (L().upgrades as Record<string, Named>)[id];
const honourText = (id: string) => (L().honours as Record<string, Named>)[id];

/** "6e" / "1er" in French, "6th" / "1st" in English. */
export function ordinal(n: number): string {
  if (lang() === 'fr') return n === 1 ? '1er' : `${n}e`;
  return `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
}

export function when(t: number): string {
  const tt = L();
  return fmt(tt.hud.clock, { day: tt.weekdays[G.weekday(t)], h: Math.floor(G.hourOf(t)), season: (tt.seasons as Record<string, string>)[G.seasonOf(t)] });
}

export function logLine(e: GameState['log'][number]): string {
  const t = L();
  const p: Record<string, string | number> = { ...(e.p ?? {}) };
  if (typeof p.ship === 'string') p.ship = shipText(p.ship).name;
  if (typeof p.wreck === 'string') p.wreck = wreckText(p.wreck).name;
  if (e.key === 'logLens') p.n = ordinal(Number(p.n));
  return fmt((t.log as Record<string, string>)[e.key] ?? e.key, p);
}

interface Ctx {
  g: GameState;
  /** Called after a purchase or any change that should be saved and redrawn. */
  changed: () => void;
}

/** Each tab renders into `body` and returns a function that refreshes affordability without rebuilding. */
export function renderTab(tab: Tab, body: HTMLElement, c: Ctx): () => void {
  switch (tab) {
    case 'registre': return registry(body, c);
    case 'epaves': return wrecks(body, c);
    case 'atelier': return workshop(body, c);
    case 'maison': return house(body, c);
    case 'bouteilles': return bottles(body, c);
    case 'journal': return journal(body, c);
  }
}

function registry(body: HTMLElement, { g }: Ctx): () => void {
  const t = L();
  const count = Object.keys(g.registry).length;
  const grid = h('div.reg-grid');
  for (const d of SHIPS) {
    const e = g.registry[d.id];
    const card = h(`div.reg-card${e ? '' : '.unknown'}.r${d.rarity}` as 'div', {},
      h('div.reg-art', {}, img(`sh_${d.id}`, e ? '' : 'silhouette')),
      h('div.reg-name', {}, e ? shipText(d.id).name : t.registry.unknown),
      h('div.reg-rarity', {}, t.rarity[d.rarity]),
      h('p.reg-desc', {}, e ? shipText(d.id).desc : shipText(d.id).hint),
      e ? h('div.reg-meta', {},
        h('span', {}, fmt(t.registry.seen, { n: e.count })),
        h('span', {}, d.free ? t.registry.free : fmt(t.registry.fee, { n: Math.round(d.fee * (1 + 0.35 * g.lens)) }))) : null);
    if (e) card.title = fmt(t.registry.first, { when: when(e.first) });
    grid.append(card);
  }
  fill(body, h('div.tab-head', {}, h('h2', {}, t.registry.title), h('span.count', {}, fmt(t.registry.count, { n: count, t: SHIPS.length }))), grid);
  return () => undefined;
}

function wrecks(body: HTMLElement, c: Ctx): () => void {
  const { g } = c;
  const t = L();
  const owned = WRECKS.filter((w) => g.wrecks[w.id]).length;
  const updaters: (() => void)[] = [];
  const grid = h('div.wreck-grid');
  for (const w of WRECKS) {
    const n = g.wrecks[w.id] ?? 0;
    const sell = button(fmt(t.wrecksTab.sell, { n: w.value }), () => {
      if (G.sellDuplicate(g, w.id)) { audio.play('coin'); c.changed(); }
    }, 'small');
    updaters.push(() => { sell.disabled = (g.wrecks[w.id] ?? 0) < 2; });
    grid.append(h(`div.wreck-card${n ? '' : '.unknown'}.r${w.rarity}` as 'div', {},
      h('div.wreck-art', {}, n ? img(`ep_${w.id}`) : h('span.q', {}, t.wrecksTab.unknown)),
      h('div.reg-name', {}, n ? wreckText(w.id).name : '…', n > 1 ? h('span.owned', {}, fmt(t.wrecksTab.owned, { n })) : null),
      h('p.reg-desc', {}, n ? wreckText(w.id).desc : t.rarity[w.rarity]),
      n > 1 ? sell : null));
  }
  fill(body, h('div.tab-head', {}, h('h2', {}, t.wrecksTab.title), h('span.count', {}, fmt(t.wrecksTab.count, { n: owned, t: WRECKS.length }))), grid);
  return () => updaters.forEach((u) => u());
}

function workshop(body: HTMLElement, c: Ctx): () => void {
  const { g } = c;
  const t = L();
  const updaters: (() => void)[] = [];
  const lensCost = G.lensCost(g);
  const lensBtn = lensCost === null ? null : button(fmt(t.workshop.buy, { n: num(lensCost) }), () => {
    if (G.buyLens(g)) { audio.play('bell'); c.changed(); }
  }, 'primary');
  if (lensBtn) updaters.push(() => { lensBtn.disabled = g.sous < (G.lensCost(g) ?? Infinity); });
  const steps = h('div.lens-steps', {}, ...Array.from({ length: LENS_COSTS.length + 1 }, (_, i) => h(`span${i <= g.lens ? '.on' : ''}` as 'span', {}, ordinal(6 - i))));
  const lens = h('div.lens-card', {},
    h('h3', {}, t.workshop.lens),
    steps,
    h('p', {}, fmt(t.workshop.lensNow, { n: ordinal(6 - g.lens) })),
    h('p.small', {}, t.workshop.lensDesc),
    lensBtn ? h('div.row', {}, h('span', {}, fmt(t.workshop.lensNext, { n: ordinal(5 - g.lens) })), lensBtn) : h('p.done', {}, t.workshop.lensMax));
  const list = h('div.up-list');
  for (const u of UPGRADES) {
    const lvl = G.level(g, u.id);
    const cost = G.upgradeCost(g, u.id);
    const b = cost === null ? h('span.owned-tag', {}, t.workshop.owned) : button(fmt(t.workshop.buy, { n: num(cost) }), () => {
      if (G.buyUpgrade(g, u.id)) { audio.play('creak'); c.changed(); }
    }, 'buy');
    if (cost !== null) updaters.push(() => { (b as HTMLButtonElement).disabled = g.sous < cost; });
    list.append(h('div.up-row', {},
      h('div', {}, h('div.up-name', {}, upgradeText(u.id).name, u.costs.length > 1 ? h('span.lvl', {}, fmt(t.workshop.level, { n: lvl, m: u.costs.length })) : null),
        h('div.up-desc', {}, upgradeText(u.id).desc)),
      b));
  }
  fill(body, h('div.tab-head', {}, h('h2', {}, t.workshop.title)), h('div.workshop', {}, lens, list));
  updaters.forEach((u) => u());
  return () => updaters.forEach((u) => u());
}

function house(body: HTMLElement, c: Ctx): () => void {
  const { g } = c;
  const t = L();
  const updaters: (() => void)[] = [];
  const missions = h('div.missions', {}, ...g.missions.list.map((m) => h(`div.mission${m.done ? '.done' : ''}` as 'div', {},
    h('span', {}, fmt((t.missions as Record<string, string>)[m.kind], { n: m.target })),
    h('span.prog', {}, m.done ? t.houseTab.done : `${m.progress}/${m.target}`),
    h('span.reward', {}, fmt(t.houseTab.missionReward, { n: G.missionReward(g, m) })))));
  const decos = h('div.deco-list');
  for (const d of DECORATIONS) {
    const owned = g.decorations.includes(d.id);
    const b = owned ? h('span.owned-tag', {}, t.workshop.owned) : button(fmt(t.workshop.buy, { n: num(d.cost) }), () => {
      if (G.buyDecoration(g, d.id)) { audio.play('coin'); c.changed(); }
    }, 'buy');
    if (!owned) updaters.push(() => { (b as HTMLButtonElement).disabled = g.sous < d.cost; });
    decos.append(h('div.up-row', {}, h('div.up-name', {}, (t.decorations as Record<string, string>)[d.id]), b));
  }
  const honours = h('div.honours', {}, ...G.HONOURS.map((id) => h(`div.honour${g.honours.includes(id) ? '.on' : ''}` as 'div', {},
    h('strong', {}, honourText(id).name), h('span', {}, honourText(id).desc))));
  fill(body,
    h('div.tab-head', {}, h('h2', {}, t.houseTab.title)),
    h('div.cottage', {},
      h('div.house-col', {}, h('h3', {}, t.houseTab.missions), missions, h('h3', {}, t.houseTab.honours), honours),
      h('div.house-col', {}, h('h3', {}, t.houseTab.decorations), decos)));
  updaters.forEach((u) => u());
  return () => updaters.forEach((u) => u());
}

function bottles(body: HTMLElement, c: Ctx): () => void {
  const { g } = c;
  const t = L();
  const seen = SHIPS.filter((d) => g.registry[d.id]);
  const shipSel = h('select.sel', {}, ...seen.map((d) => h('option', { value: d.id }, shipText(d.id).name))) as HTMLSelectElement;
  const gifts: { value: string; label: string; gift: G.Gift }[] = [{ value: 'sous', label: t.bottles.giftSous, gift: { kind: 'sous', amount: 100 } }];
  for (const w of WRECKS) if ((g.wrecks[w.id] ?? 0) >= 2) gifts.push({ value: w.id, label: fmt(t.bottles.giftWreck, { wreck: wreckText(w.id).name }), gift: { kind: 'wreck', id: w.id } });
  const giftSel = h('select.sel', {}, ...gifts.map((x) => h('option', { value: x.value }, x.label))) as HTMLSelectElement;
  const out = h('div.code-out');
  const write = button(t.bottles.write, () => {
    const gift = gifts.find((x) => x.value === giftSel.value)!.gift;
    const code = G.writeBottle(g, shipSel.value, gift);
    if (!code) { audio.play('deny'); return; }
    audio.play('splash');
    c.changed();
    showCode(code);
  }, 'primary');
  const update = () => {
    const gift = gifts.find((x) => x.value === giftSel.value)?.gift;
    write.disabled = !gift || !seen.length || !G.canSendGift(g, gift);
  };
  giftSel.addEventListener('change', update);
  const input = h('textarea.code-in', { placeholder: t.bottles.redeemPlaceholder, rows: 2, spellcheck: 'false' }) as HTMLTextAreaElement;
  const result = h('p.redeem-result');
  const redeem = button(t.bottles.redeem, () => {
    const r = G.redeemBottle(g, input.value);
    if (!r.ok) { audio.play('deny'); result.textContent = (t.bottles as Record<string, string>)[r.reason]; result.className = 'redeem-result bad'; return; }
    audio.play('bell');
    const gift = r.bottle.gift.kind === 'sous' ? fmt(t.bottles.receivedSous, { n: r.bottle.gift.amount }) : wreckText(r.bottle.gift.id).name;
    const msg = fmt(t.bottles.received, { name: r.bottle.name, gift, ship: shipText(r.bottle.ship).name });
    input.value = '';
    c.changed();
    // The tab was rebuilt by changed(); show the result on the fresh one.
    const fresh = document.querySelector('.redeem-result');
    if (fresh) { fresh.textContent = msg; fresh.className = 'redeem-result good'; }
  }, 'primary');
  const msgs = h('div.msgs');
  const unread = G.unreadMessages(g);
  const read = button(t.bottles.read, () => {
    const i = G.readMessage(g);
    if (i === null) return;
    audio.play('paper');
    c.changed();
    openMessage(i);
  }, unread ? 'primary' : '');
  read.disabled = !unread;
  for (let i = g.messagesRead - 1; i >= 0; i--) msgs.append(h('blockquote.msg', {}, t.messages[i]));
  if (!g.messagesRead) msgs.append(h('p.small', {}, t.bottles.noMessages));
  fill(body,
    h('div.tab-head', {}, h('h2', {}, t.bottles.title), h('span.count', {}, fmt(t.bottles.count, { n: g.bottles }))),
    h('div.bottles', {},
      h('div.house-col', {},
        h('p.small', {}, t.bottles.intro),
        g.bottles > 0 && seen.length
          ? h('div.form', {}, h('label', {}, t.bottles.ship, shipSel), h('label', {}, t.bottles.gift, giftSel), write, out)
          : h('p.notice', {}, t.bottles.noBottle),
        h('h3', {}, t.bottles.redeemTitle), input, redeem, result),
      h('div.house-col', {}, h('h3', {}, t.bottles.messages, unread ? h('span.badge', {}, String(unread)) : null), read, msgs)));
  update();

  function showCode(code: string): void {
    const copy = button(t.bottles.copy, () => {
      void navigator.clipboard?.writeText(code).then(() => { copy.textContent = t.bottles.copied; }).catch(() => undefined);
    }, 'small');
    const box = h('div.menu-box', {}, h('h2', {}, t.bottles.title), h('p', {}, t.bottles.code), h('code.code', {}, code), h('div.row', {}, copy));
    const m = modal(box, 'small');
    box.append(button(t.options.close, () => m.close(), 'primary'));
  }
  return update;
}

export function openMessage(i: number): void {
  const t = L();
  const box = h('div.menu-box.letter', {}, img('ep_bouteille', 'letter-ic'), h('p.letter-text', {}, t.messages[i]));
  const m = modal(box, 'small');
  box.append(button(t.options.close, () => m.close(), 'primary'));
}

function journal(body: HTMLElement, { g }: Ctx): () => void {
  const t = L();
  fill(body,
    h('div.tab-head', {}, h('h2', {}, t.tabs.journal)),
    h('div.journal', {}, ...g.log.map((e) => h('div.log-line', {}, h('span.when', {}, when(e.t)), h('span', {}, logLine(e))))));
  return () => undefined;
}
