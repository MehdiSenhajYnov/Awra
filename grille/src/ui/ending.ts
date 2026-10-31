import { audio } from '../audio';
import { type RunState, continueEndless, score } from '../game/run';
import { L, fmt, num } from '../i18n';
import { clearRun, saveRun } from '../save';
import { button, h, onKeys, show } from './dom';
import { continueRun, goTitle, startDaily } from './router';
import { showSetup } from './setup';

export function showEnding(run: RunState, best: number, unlocked: string[]): void {
  const t = L();
  const won = run.phase === 'won';
  const e = won ? t.endings.won : t.endings.lost;
  audio.play(won ? 'win' : 'lose');
  const s = score(run);
  const actions = h('div.row');
  if (won && !run.daily) {
    actions.append(button(t.endings.endless, () => { continueEndless(run); saveRun(run); continueRun(run); }, 'primary'));
  }
  actions.append(
    button(run.daily ? t.title.daily : t.endings.again, () => {
      if (won) clearRun();
      if (run.daily) startDaily(run.lang);
      else showSetup();
    }, won ? '' : 'primary'),
    button(t.endings.toTitle, () => { if (won) clearRun(); goTitle(); }));
  const scene = h('div.scene.paper.ending', {},
    h('article.front', {},
      h('div.kicker', {}, run.daily ? fmt(t.endings.daily, { d: run.daily }) : fmt(t.endings.reached, { e: run.edition, day: t.days[run.gridIdx] })),
      h('h1', {}, e.t),
      h('p.lede', {}, e.b),
      h('div.score', {}, fmt(t.endings.score, { n: num(s) })),
      h('p.stats', {}, fmt(t.endings.stats, { w: run.stats.words, b: run.stats.bestWord || '—', p: num(run.stats.best), d: run.stats.definitions })),
      h('p.stats', {}, fmt(t.endings.best, { n: num(best) })),
      ...unlocked.map((u) => h('p.unlock', {}, fmt(t.endings.unlocked, { what: u }))),
      actions));
  show(scene);
  onKeys(null);
}
