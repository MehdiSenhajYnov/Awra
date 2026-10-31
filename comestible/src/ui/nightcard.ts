import { audio } from '../audio';
import { L, fmt } from '../i18n';
import type { GameState } from '../game/state';
import { button, h, onKeys, show } from './dom';

export function showNightCard(state: GameState, onStart: () => void): void {
  const t = L();
  const endless = state.mode === 'endless';
  const rule = endless ? null : (t.nightCard.rules as Record<number, string>)[state.night];
  const start = () => {
    onKeys(null);
    audio.unlock();
    onStart();
  };
  const scene = h('div.scene.nightcard', {},
    h('div.card', {},
      h('div.card-title', {}, endless ? fmt(t.nightCard.endlessTitle, { n: state.night }) : fmt(t.nightCard.title, { n: state.night })),
      endless ? null : h('div.card-date', {}, `${t.meta.date[state.night - 1]} 1887`),
      endless ? null : h('p.card-line', {}, t.nightCard.lines[state.night - 1]),
      rule ? h('div.card-rule', {}, h('span.badge', {}, t.nightCard.new), h('span', {}, rule)) : null,
      button(t.nightCard.start, start, 'primary'),
    ));
  show(scene);
  audio.play('bell');
  onKeys((e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); start(); } });
}
