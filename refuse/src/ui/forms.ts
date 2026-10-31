import { CLAUSE_BY_ID } from '../data/content';
import { type Claim, short } from '../game/state';
import { L, fmt, lang } from '../i18n';
import { h, img } from './dom';

type Named = { name: string; desc: string };

export const money = (n: number): string => fmt(L().hud.ecus, { n: short(n, lang()) });
export const claimText = (id: string) => (L().claims as Record<string, { who: string; what: string }>)[id];
export const clauseText = (id: string) => (L().clauses as Record<string, Named>)[id];
export const staffText = (id: string) => (L().staff as Record<string, Named>)[id];
export const upgradeText = (id: string) => (L().upgrades as Record<string, Named>)[id];
export const perkText = (id: string) => (L().perks as Record<string, Named>)[id];
export const achievementText = (id: string) => (L().achievements as Record<string, Named>)[id];
export const tagText = (tag: string) => (L().tags as Record<string, string>)[tag] ?? tag;

export function duration(seconds: number): string {
  const t = L();
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? fmt(t.hud.durationH, { h, m }) : fmt(t.hud.durationM, { m: Math.max(1, m) });
}

export function decimal(n: number): string {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return lang() === 'fr' ? s.replace('.', ',') : s;
}

/** The claim form on the desk, composed in code around the claimant's portrait. */
export function claimForm(c: Claim): HTMLElement {
  const t = L();
  const text = claimText(c.type.id);
  const chips = h('div.chips', {}, ...c.type.tags.map((tag) => h(`span.chip.tag-${tag}` as 'span', {}, tagText(tag))));
  return h(`div.form${c.type.id === 'royal' ? '.royal' : ''}` as 'div', {},
    h('div.form-head', {},
      h('span.form-org', {}, t.title.tagline.split(' — ')[0]),
      h('span.form-no', {}, fmt(t.hud.number, { n: String(c.seq + 1).padStart(4, '0') }))),
    h('h3.form-title', {}, t.hud.formTitle),
    h('div.form-body', {},
      h('div.portrait', {}, img(c.type.claimant, '', text.who)),
      h('div.fields', {},
        h('div.field', {}, h('label', {}, t.hud.insured), h('span.ink', {}, text.who)),
        h('div.field', {}, h('label', {}, t.hud.loss), h('span.ink', {}, text.what)),
        h('div.field', {}, h('label', {}, t.hud.amount), h('span.ink.amount', {}, money(c.value))),
        h('div.field', {}, h('label', {}, t.hud.tags), chips))),
    c.type.blood ? h('div.seal.blood', { title: t.hud.blood }, h('span', {}, t.hud.blood)) : null,
    c.night ? h('div.seal.night', { title: t.hud.night }, '☾') : null,
  );
}

/** A clause card. `index` is shown as its keyboard shortcut. */
export function clauseCard(id: string, fits: boolean, index: number, onPick: () => void, onHover: (id: string | null) => void): HTMLButtonElement {
  const t = L();
  const c = CLAUSE_BY_ID[id];
  const flags = [c.fraud ? t.hud.fraud : '', c.night ? t.hud.nightOnly : '', c.notBlood ? t.hud.notBlood : ''].filter(Boolean);
  const card = h(`button.card${fits ? '.fits' : ''}${c.legendary ? '.legendary' : ''}${c.fraud ? '.fraud' : ''}` as 'button', {
    onclick: onPick,
    onmouseenter: () => onHover(id),
    onmouseleave: () => onHover(null),
    onfocus: () => onHover(id),
    onblur: () => onHover(null),
  },
  h('kbd', {}, String(index + 1)),
  h('div.card-name', {}, clauseText(id).name),
  h('div.chips', {}, ...(c.tags.length ? c.tags.map((tag) => h(`span.chip.tag-${tag}` as 'span', {}, tagText(tag))) : [h('span.chip.any', {}, t.hud.anyClaim)])),
  h('div.card-flags', {}, flags.join(' · ')),
  h('div.card-foot', {}, fmt(t.hud.yieldLabel, { n: decimal(c.yield) })));
  return card;
}
