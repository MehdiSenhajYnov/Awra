import { audio } from '../audio';
import { L, capitalize, fmt } from '../i18n';
import {
  type Expenses, type GameState, type MorningResult,
  CANDLE_COST, DEBT_LIMIT, MEAL_COST, rentFor,
} from '../game/state';
import { CHARACTER_BY_ID } from '../data/characters';
import { Rng, hashSeed } from '../game/rng';
import { button, h, img, onKeys, show } from './dom';

export function showMorning(state: GameState, result: MorningResult, final: boolean, onNext: (e?: Expenses) => void): void {
  const t = L();
  audio.music('morning');
  showGazette(state, result, () => {
    if (result.gameOver || final) {
      onKeys(null);
      onNext();
    } else showLedger(state, result, onNext);
  }, result.gameOver || final ? (final ? t.morning.final : t.morning.continue) : t.morning.continue);
}

function showGazette(state: GameState, result: MorningResult, onDone: () => void, label: string): void {
  const t = L();
  const ordered = [...result.articles].sort((a, b) => rank(a.size) - rank(b.size));
  // A thin night still prints a full page: village fillers pad the columns.
  const rng = new Rng(hashSeed(state.seed, 'gazette', state.night));
  const fillers = rng.shuffle([1, 2, 3, 4, 5, 6]).map((n) => ({ key: `filler${n}`, size: 'small' as const, params: undefined }))
    .filter((f) => !ordered.some((a) => a.key === f.key));
  while (ordered.length < 5 && fillers.length) ordered.push(fillers.shift()!);
  const [lead, ...rest] = ordered;
  const article = (key: string, params: Record<string, string | number> | undefined, cls: string) => {
    const a = t.articles[key as keyof typeof t.articles];
    const who = typeof params?.who === 'string' ? CHARACTER_BY_ID[params.who] : undefined;
    return h(`article.${cls}` as 'article', {},
      h('h3', {}, capitalize(fmt(a.t, params))),
      cls === 'lead' && who ? img(who.portrait, 'gazette-portrait') : null,
      h('p', {}, capitalize(fmt(a.b, params))));
  };
  const date = state.mode === 'endless' ? '' : t.meta.date[Math.min(state.night, t.meta.date.length - 1)];
  const paper = h('div.gazette', {},
    h('div.masthead', {}, t.morning.gazette),
    h('div.issue', {}, state.mode === 'endless' ? `— ${state.night} —` : fmt(t.morning.issue, { n: 312 + state.night, date })),
    lead ? article(lead.key, lead.params, 'lead') : null,
    h('div.columns', {}, ...rest.map((a) => article(a.key, a.params, a.size))),
  );
  const scene = h('div.scene.morning', {},
    h('div.bg.dawn'),
    paper,
    button(label, () => { onKeys(null); onDone(); }, 'primary next'));
  show(scene);
  audio.play('paper');
  onKeys((e) => { if (e.code === 'Enter') { onKeys(null); onDone(); } });
}

function rank(size: string): number {
  return size === 'big' ? 0 : size === 'normal' ? 1 : 2;
}

function showLedger(state: GameState, result: MorningResult, onNext: (e?: Expenses) => void): void {
  const t = L();
  const exp: Expenses = { candles: true, meal: true };
  const rent = rentFor(state.night);
  const startMoney = state.money - result.earned;

  const lines = h('div.ledger-lines');
  const balanceEl = h('div.ledger-total');
  const warning = h('p.ledger-warning');

  const row = (label: string, amount: number | null, extra?: HTMLElement) =>
    h('div.ledger-row', {}, h('span', {}, label), extra ?? null, h(`span.amount${amount !== null && amount < 0 ? '.neg' : ''}` as 'span', {}, amount === null ? '' : `${amount > 0 ? '+' : ''}${amount}`));

  const toggle = (key: keyof Expenses, label: string, cost: number, note: string) => {
    const box = h('input', { type: 'checkbox', checked: true }) as HTMLInputElement;
    const hint = h('p.ledger-hint', {}, note);
    hint.style.display = 'none';
    box.addEventListener('change', () => {
      exp[key] = box.checked;
      hint.style.display = box.checked ? 'none' : '';
      audio.play('click');
      update();
    });
    return h('div', {}, h('label.ledger-row.toggle', {}, h('span', {}, box, ` ${label}`), h('span.amount.neg', {}, `-${cost}`)), hint);
  };

  const update = () => {
    const after = state.money - rent - (exp.candles ? CANDLE_COST : 0) - (exp.meal ? MEAL_COST : 0);
    balanceEl.replaceChildren(h('span', {}, t.morning.balance), h(`span.amount${after < 0 ? '.neg' : ''}` as 'span', {}, `${after}`));
    warning.textContent = after < 0 ? fmt(t.morning.debtWarning, { n: -DEBT_LIMIT }) : '';
  };

  lines.append(
    h('div.ledger-row', {}, h('span', {}, t.morning.savings), h('span.amount', {}, `${startMoney}`)),
    ...result.ledger.map((l) => row(fmt(t.morning[l.key as 'income'], l.params), l.amount === 0 ? null : l.amount)),
    row(t.morning.rent, -rent),
    toggle('candles', t.morning.candles, CANDLE_COST, t.morning.candlesNo),
    toggle('meal', t.morning.meal, MEAL_COST, t.morning.mealNo),
  );
  update();

  const mist = t.morning.mistLevels[Math.min(4, Math.floor(state.brume / 2))];
  const you = t.morning.youLevels[Math.min(4, Math.floor(state.contamination / 2))];
  const sick = Object.values(state.sick).filter((n) => n > state.night).length;
  const status = h('div.status', {},
    h('h3', {}, t.morning.status),
    h('p', {}, fmt(t.morning.deaths, { n: state.deaths.length })),
    h('p', {}, fmt(t.morning.sickNow, { n: sick })),
    h('p', {}, fmt(t.morning.gone, { n: state.disappeared.length })),
    h('p', {}, `${t.morning.mist} : `, h(`strong.lvl${Math.min(4, Math.floor(state.brume / 2))}` as 'strong', {}, mist)),
    h('p', {}, `${t.morning.you} : `, h(`strong.lvl${Math.min(4, Math.floor(state.contamination / 2))}` as 'strong', {}, you)),
    memorial(state),
  );

  const go = () => {
    onKeys(null);
    audio.play('coin');
    onNext(exp);
  };
  const scene = h('div.scene.ledger', {},
    h('div.bg.dawn'),
    h('div.ledger-book', {},
      h('div.ledger-page', {}, h('h2', {}, t.morning.ledger), lines, balanceEl, warning),
      h('div.ledger-page', {}, status)),
    button(t.morning.nextNight, go, 'primary next'));
  show(scene);
  audio.play('page');
  onKeys((e) => { if (e.code === 'Enter') go(); });
}

/** Portraits of everyone the village has lost so far. */
function memorial(state: GameState): HTMLElement | null {
  const t = L();
  const lost = [
    ...state.deaths.map((c) => [c, '†'] as const),
    ...state.disappeared.map((c) => [c, '?'] as const),
    ...state.arrested.map((c) => [c, '⛓'] as const),
  ];
  if (!lost.length) return null;
  return h('div.memorial', {}, ...lost.map(([c, mark]) => h('figure', {},
    img(CHARACTER_BY_ID[c].portrait, `memorial-img${mark === '†' ? ' dead' : ''}`),
    h('figcaption', {}, `${mark} ${t.charTitle[c as keyof typeof t.charTitle]}`))));
}
