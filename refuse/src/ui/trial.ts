import { audio } from '../audio';
import * as G from '../game/state';
import type { GameState } from '../game/state';
import { L, fmt } from '../i18n';
import { settings } from '../settings';
import { button, fill, h, img, modal } from './dom';
import { claimForm, clauseCard, clauseText } from './forms';

/** The court: a fixed hand, ten claimants in a row, seven refusals to win the floor. */
export function openTrial(g: GameState, onDone: () => void): void {
  const t = L();
  const trial = g.trial;
  if (!trial) return;
  audio.track('trial');
  const realmName = (t.realms as Record<string, { name: string }>)[G.realmOf(g).id].name;
  const title = trial.final ? fmt(t.trial.finalTitle, { realm: realmName }) : fmt(t.trial.title, { floor: t.floors[g.floor + 1] });
  const progress = h('p.trial-progress');
  const formWrap = h('div.form-wrap.trial-form');
  const hand = h('div.hand.trial-hand');
  const info = h('p.card-info', {}, t.trial.hint);
  const concede = button(t.trial.concede, () => answer(null), 'ghost');
  const box = h('div.trial', {},
    h('header.trial-head', {}, img('ic_tampon', 'trial-ic'), h('div', {}, h('h2', {}, title), h('p', {}, fmt(t.trial.intro, { n: trial.needed })))),
    h('div.trial-body', {}, formWrap, h('div.trial-side', {}, progress, hand, info, concede)));
  const m = modal(box, 'court');
  let busy = false;
  const fast = () => settings().fast;

  const render = () => {
    const tr = g.trial;
    if (!tr) return;
    fill(progress, fmt(t.trial.progress, { r: tr.refused, n: tr.needed, i: tr.index + 1, t: tr.claims.length }));
    const form = claimForm(tr.claims[tr.index]);
    form.classList.add('enter');
    fill(formWrap, form);
    requestAnimationFrame(() => requestAnimationFrame(() => form.classList.remove('enter')));
    fill(hand, ...tr.hand.map((id, i) => clauseCard(id, G.trialFits(g, i), i, () => answer(i),
      (hover) => { info.textContent = hover ? clauseText(hover).desc : t.trial.hint; })));
  };

  const answer = async (i: number | null) => {
    if (busy || !g.trial) return;
    if (i !== null && !G.trialFits(g, i)) {
      audio.play('deny');
      hand.children[i]?.classList.add('shake');
      setTimeout(() => hand.children[i]?.classList.remove('shake'), 400);
      return;
    }
    busy = true;
    const form = formWrap.querySelector('.form');
    form?.append(h(`div.stamp.${i === null ? 'approved' : 'refused'}` as 'div', {}, i === null ? t.hud.approve : t.hud.refuse));
    audio.play(i === null ? 'approve' : 'stamp');
    const step = G.trialAnswer(g, i);
    await new Promise((r) => setTimeout(r, fast() ? 150 : 450));
    form?.classList.add(i === null ? 'leave-up' : 'leave');
    await new Promise((r) => setTimeout(r, fast() ? 80 : 250));
    busy = false;
    if (step.done) finish(step.won);
    else render();
  };

  const finish = (won: boolean) => {
    stopKeys();
    audio.play(won ? 'win' : 'lose');
    audio.play('gavel');
    const floorName = t.floors[g.floor];
    fill(box,
      h('div.verdict', {},
        h((won ? 'div.verdict-stamp.won' : 'div.verdict-stamp.lost') as 'div', {}, won ? '⚖' : '✗'),
        h('h2', {}, won ? fmt(t.trial.won, { floor: floorName }) : t.trial.lost),
        button(t.trial.continue, () => { m.close(); onDone(); }, 'primary')));
  };

  // The desk ignores keys while a modal is open, so the court listens on its own.
  const keys = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (/^(Digit|Numpad)[1-9]$/.test(e.code)) void answer(Number(e.code.slice(-1)) - 1);
    else if (e.code === 'Digit0' || e.code === 'Numpad0') void answer(9);
  };
  const stopKeys = () => window.removeEventListener('keydown', keys);
  window.addEventListener('keydown', keys);
  render();
}
