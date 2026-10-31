import { audio } from '../audio';
import { L, fmt } from '../i18n';
import type { EndingId, GameState } from '../game/state';
import { loadProfile } from '../save';
import { button, h, onKeys, show, typewriter } from './dom';
import { goTitle, startCampaign, startEndless } from './router';

export const ENDING_ORDER: EndingId[] = ['officine', 'mycologue', 'lison', 'brume', 'cueilleur', 'arrete', 'dette'];

/** `endlessNights` is set for Seasons mode, where there is no story ending. */
export function showEnding(state: GameState, id: EndingId, endlessNights: number | null): void {
  const t = L();
  const profile = loadProfile();
  audio.music('ending');
  audio.play('sting');
  const e = t.endings[id];
  const body = h('div.ending-text');
  const actions = h('div.row');
  const endless = endlessNights !== null;
  const panel = h('div.ending-panel', {},
    h('div.ending-kicker', {}, endless ? t.endings.endlessOver : fmt(t.endings.found, { i: ENDING_ORDER.indexOf(id) + 1 })),
    h('h1', {}, e.t),
    body,
    endless
      ? h('p.ending-stats', {}, `${fmt(t.endings.endlessScore, { n: endlessNights })} — ${fmt(t.endings.endlessBest, { n: profile.bestEndless })}`)
      : h('p.ending-stats', {}, fmt(t.endings.stats, { n: state.stats.specimens, c: state.stats.correct, b: state.stats.burned, d: state.stats.denounced })),
    actions);
  const scene = h('div.scene.ending', {},
    h('div.ending-art', { style: `background-image:url('img/fin_${id}.webp')` }),
    panel);
  show(scene);
  void typewriter(body, e.b, 16).then(() => {
    actions.append(
      button(t.endings.restart, () => (endless ? startEndless() : startCampaign(state.relaxed)), 'primary'),
      button(t.endings.toTitle, () => goTitle()));
  });
  onKeys(null);
}
