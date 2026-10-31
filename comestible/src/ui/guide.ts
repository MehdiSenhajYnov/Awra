import { audio } from '../audio';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import { L, fmt } from '../i18n';
import type { RuleSet } from '../game/rules';
import { button, h, img, stage } from './dom';

type Tab = 'species' | 'rules' | 'signs' | 'notes';

export interface GuideContext {
  rules: RuleSet;
  night: number;
  endless: boolean;
}

const RULE_NIGHTS: [keyof ReturnType<typeof L>['guide']['rules'], number][] = [
  ['r1', 1], ['r2', 2], ['r3', 3], ['r4', 4], ['r5', 5], ['r6', 5], ['r7', 7], ['r8', 8],
];

let openGuide: { close: () => void } | null = null;
let lastTab: Tab = 'species';
let lastSpecies = 'cepe';

export function isGuideOpen(): boolean {
  return openGuide !== null;
}

export function closeGuide(): void {
  openGuide?.close();
}

export function toggleGuide(ctx: GuideContext, onClose?: () => void): void {
  if (openGuide) {
    closeGuide();
    return;
  }
  audio.play('page');
  const t = L();
  const visible = SPECIES.filter((s) => s.night <= ctx.rules.speciesNight);
  if (!visible.some((s) => s.id === lastSpecies)) lastSpecies = visible[0].id;

  const tabs = h('div.guide-tabs');
  const left = h('div.guide-left');
  const right = h('div.guide-right');
  const book = h('div.guide-book', {}, h('div.guide-title', {}, t.guide.title), tabs, h('div.guide-pages', {}, left, right));
  const overlay = h('div.guide-overlay', { onclick: (e: Event) => { if (e.target === overlay) closeGuide(); } }, book);

  const tabList: [Tab, string, boolean][] = [
    ['species', t.guide.tabSpecies, true],
    ['rules', t.guide.tabRules, true],
    ['signs', t.guide.tabAnomalies, ctx.rules.mimics],
    ['notes', t.guide.tabNotes, !ctx.endless],
  ];

  const render = (tab: Tab) => {
    lastTab = tab;
    tabs.replaceChildren(...tabList.filter(([, , on]) => on).map(([id, label]) =>
      h(`button.guide-tab${id === tab ? '.active' : ''}` as 'button', { onclick: () => { audio.play('page'); render(id); } }, label)));
    left.replaceChildren();
    right.replaceChildren();
    if (tab === 'species') renderSpecies(left, right, visible.map((s) => s.id));
    if (tab === 'rules') renderRules(left, right, ctx);
    if (tab === 'signs') renderSigns(left, right);
    if (tab === 'notes') renderNotes(left, right, ctx.night);
  };

  const renderSpecies = (listEl: HTMLElement, pageEl: HTMLElement, ids: string[]) => {
    const showPage = (id: string) => {
      lastSpecies = id;
      const sp = SPECIES_BY_ID[id];
      const tx = t.species[id as keyof typeof t.species];
      listEl.querySelectorAll('.guide-item').forEach((el) => el.classList.toggle('active', (el as HTMLElement).dataset.id === id));
      const verdict = sp.danger === 0 ? t.guide.edible : sp.danger === 2 ? t.guide.deadly : t.guide.toxic;
      const rows: [string, string][] = [
        [t.guide.under, tx.under],
        [t.guide.stem, tx.stem],
        [t.guide.cut, tx.cut],
        [t.guide.smell, tx.smell],
        [t.guide.spore, tx.spore],
        [t.guide.size, fmt(t.guide.sizeRange, { a: sp.size[0], b: sp.size[1] })],
      ];
      if (ctx.rules.tools.includes('cuillere')) rows.push([t.guide.taste, tx.taste]);
      if (ctx.rules.tools.includes('bougie') && tx.glow) rows.push([t.guide.glow, tx.glow]);
      pageEl.replaceChildren(
        h('div.plate', {},
          img(`sp_${id}`, 'plate-img'),
          h('div.plate-text', {},
            h('h2', {}, tx.name),
            h('div.latin', {}, tx.latin),
            h(`div.verdict.v${sp.danger}` as 'div', {}, verdict),
            h('dl', {}, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
            h('p.note', {}, tx.note),
            h('div.spore-swatch', { style: `--spore:${sp.spore}`, title: tx.spore }),
          )),
      );
    };
    // Look-alike pairs are listed side by side so the comparison is the natural reading order.
    const pairs: string[][] = [];
    for (const id of ids) {
      if (pairs.some((p) => p.includes(id))) continue;
      const twin = SPECIES_BY_ID[id].twin;
      pairs.push(ids.includes(twin) ? [id, twin] : [id]);
    }
    listEl.replaceChildren(...pairs.map((pair) => h('div.guide-pair', {}, ...pair.map((id) => {
      const sp = SPECIES_BY_ID[id];
      return h(`button.guide-item.d${sp.danger}` as 'button', { 'data-id': id, onclick: () => { audio.play('page'); showPage(id); } },
        img(`sp_${id}`, 'thumb'), h('span', {}, t.species[id as keyof typeof t.species].name));
    }))));
    showPage(ids.includes(lastSpecies) ? lastSpecies : ids[0]);
  };

  render(tabList.find(([id, , on]) => id === lastTab && on) ? lastTab : 'species');
  book.append(button(t.guide.close, () => closeGuide(), 'guide-close'));
  stage().append(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  openGuide = {
    close: () => {
      audio.play('page');
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 220);
      openGuide = null;
      onClose?.();
    },
  };
}

function renderRules(left: HTMLElement, right: HTMLElement, ctx: GuideContext): void {
  const t = L();
  const active = RULE_NIGHTS.filter(([id, n]) => {
    if (ctx.endless) return id !== 'r4' && id !== 'r8';
    if (id === 'r4') return ctx.rules.decree;
    return n <= ctx.night;
  });
  left.replaceChildren(h('div.rules', {}, ...active.map(([id, n]) =>
    h('div.rule', {}, ctx.endless ? null : h('span.rule-night', {}, fmt(t.guide.ruleNight, { n })), h('p', {}, t.guide.rules[id])))));
  right.replaceChildren(h('div.stamp-legend', {},
    ...(['edible', 'toxic', 'burn', 'seize'] as const)
      .filter((v) => (v !== 'burn' || ctx.rules.burn) && (v !== 'seize' || ctx.rules.decree))
      .map((v) => h(`div.legend.${v}` as 'div', {}, t.stamps[v]))));
}

function renderSigns(left: HTMLElement, right: HTMLElement): void {
  const t = L();
  left.replaceChildren(h('ul.signs', {}, ...t.guide.signs.map((s) => h('li', {}, s))));
  right.replaceChildren(h('div.sign-plate', {}, img('an_oeil', 'plate-img faded')));
}

function renderNotes(left: HTMLElement, right: HTMLElement, night: number): void {
  const t = L();
  const count = Math.min(night, t.guide.notes.length);
  left.replaceChildren(h('div.notes', {}, ...t.guide.notes.slice(0, count).map((n) => h('p.handwritten', {}, n))));
  right.replaceChildren(h('div.sign-plate', {}, img('pt_lison', 'plate-img sepia')));
}
