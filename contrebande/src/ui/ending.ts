import { audio } from '../audio';
import { BORDERS } from '../game/inspect';
import { type RunState, score } from '../game/run';
import { L, fmt } from '../i18n';
import { button, h, onKeys, show } from './dom';
import { goTitle, startDaily } from './router';
import { showSetup } from './setup';

export function showEnding(run: RunState, best: number, unlocked: string[]): void {
  const t = L();
  const key = run.phase === 'won' ? 'won' : run.loss === 'dossier' ? 'dossier' : 'dette';
  const e = t.endings[key];
  const art = key === 'won' ? 'fin_victoire' : key === 'dossier' ? 'fin_dossier' : 'fin_dette';
  audio.track('none');
  audio.play(key === 'won' ? 'win' : 'lose');
  const s = score(run);
  const scene = h('div.scene.ending', {},
    h('div.ending-art', { style: `background-image:url('img/${art}.webp')` }),
    h('div.ending-panel', {},
      run.daily ? h('div.kicker', {}, fmt(t.endings.daily, { d: run.daily })) : h('div.kicker', {}, `${Math.min(run.border, BORDERS)} / ${BORDERS}`),
      h('h1', {}, e.t),
      h('p', {}, e.b),
      h('div.score', {}, fmt(t.endings.score, { n: s })),
      h('p.stats', {}, fmt(t.endings.stats, { c: run.stats.crossings, s: run.stats.sold, k: run.stats.caught, e: run.stats.earned })),
      h('p.stats', {}, fmt(t.endings.best, { n: best })),
      ...unlocked.map((u) => h('p.unlock', {}, fmt(t.endings.unlocked, { what: u }))),
      h('div.row', {},
        button(run.daily ? t.title.daily : t.endings.again, () => (run.daily ? startDaily() : showSetup()), 'primary'),
        button(t.endings.toTitle, () => goTitle()))));
  show(scene);
  onKeys(null);
}
