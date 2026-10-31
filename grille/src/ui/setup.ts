import { audio } from '../audio';
import { DECKS } from '../data/content';
import type { Lang } from '../data/letters';
import { L, LOCALES, fmt, lang } from '../i18n';
import { loadProfile } from '../save';
import { button, h, onKeys, show } from './dom';
import { goTitle, startRun } from './router';

export function showSetup(): void {
  const t = L();
  const profile = loadProfile();
  let deck = 'classique';
  let stake = 0;
  let gridLang: Lang = profile.gridLang ?? (lang() as Lang);
  const decks = h('div.decks');
  const stakes = h('div.stakes');
  const stakeDesc = h('p.stake-desc');
  const langs = h('div.row');
  const render = () => {
    decks.replaceChildren(...DECKS.map((d) => {
      const open = profile.bestEdition >= d.unlock;
      const tx = t.decks[d.id];
      return h(`button.deck${d.id === deck ? '.on' : ''}${open ? '' : '.locked'}` as 'button', {
        onclick: () => { if (open) { deck = d.id; audio.play('key'); render(); } else audio.play('deny'); },
      }, h('h3', {}, tx.name), h('p', {}, open ? tx.desc : fmt(t.setup.locked, { n: d.unlock })),
      h('span.deck-stats', {}, fmt(t.setup.stats, { w: d.words, d: d.discards, h: d.hand })));
    }));
    stakes.replaceChildren(...t.setup.stakeDesc.map((_, i) => {
      const b = h(`button.stake${i === stake ? '.on' : ''}` as 'button', { onclick: () => { stake = i; audio.play('key'); render(); } }, String(i));
      b.disabled = i > profile.maxStake;
      return b;
    }));
    stakeDesc.textContent = t.setup.stakeDesc[stake];
    langs.replaceChildren(h('span.label', {}, t.title.gridLang), ...(['fr', 'en'] as Lang[]).map((l) =>
      button(LOCALES[l].meta.lang, () => { gridLang = l; render(); }, l === gridLang ? 'small active' : 'small')));
  };
  show(h('div.scene.paper.setup', {}, h('div.setup-box', {},
    h('h1', {}, t.setup.title), decks,
    h('div.stake-row', {}, h('span.label', {}, t.setup.stake), stakes, stakeDesc),
    langs,
    h('div.row', {}, button(t.setup.back, () => goTitle(), 'ghost'), button(t.setup.start, () => { onKeys(null); startRun(gridLang, deck, stake); }, 'primary')))));
  render();
  onKeys((e) => { if (e.code === 'Escape') goTitle(); });
}
