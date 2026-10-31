import { CLUES_EN, CLUES_FR } from '../data/clues';
import {
  BOSSES, type BossId, DECK_BY_ID, EDITIONS, GRIDS_PER_EDITION, INKS, type InkId, MAX_INKS, MAX_PENS, PENS,
  PEN_BY_ID, type PenId,
} from '../data/content';
import { BLANK, type Lang, fullBag } from '../data/letters';
import { type Board, type Placement, type Word, checkMove, commit, isRare, isVowel, letterValue, makeBoard } from './board';
import { Rng, hashSeed } from './rng';

export interface Tile {
  id: number;
  letter: string;
}

export interface Definition {
  answer: string;
  clue: string;
  solved: boolean;
  /** Letters shown by the "revelation" ink. */
  revealed: number;
}

export interface GridState {
  board: Board;
  bag: string[];
  hand: Tile[];
  nextTile: number;
  wordsLeft: number;
  discardsLeft: number;
  score: number;
  target: number;
  defs: Definition[];
  boss: BossId | null;
  plays: number;
  lastInitial: string | null;
  typoUsed: boolean;
  doubleNext: boolean;
  proofNext: boolean;
}

export type Phase = 'grid' | 'shop' | 'won' | 'lost';

export interface RunState {
  version: 1;
  seed: number;
  lang: Lang;
  deck: string;
  stake: number;
  daily: string | null;
  edition: number;
  gridIdx: number;
  francs: number;
  pens: PenId[];
  inks: InkId[];
  phase: Phase;
  endless: boolean;
  solvedTotal: number;
  grid: GridState | null;
  shop: { pens: (PenId | null)[]; inks: (InkId | null)[]; rerolls: number } | null;
  stats: { words: number; best: number; bestWord: string; points: number; definitions: number };
}

export const has = (run: RunState, p: PenId) => run.pens.includes(p);
export const clues = (lang: Lang) => (lang === 'fr' ? CLUES_FR : CLUES_EN);

export function newRun(lang: Lang, deck: string, stake: number, seed: number, daily: string | null = null): RunState {
  const d = DECK_BY_ID[deck];
  const run: RunState = {
    version: 1, seed, lang, deck, stake, daily, edition: 1, gridIdx: 0, francs: d.francs, pens: [], inks: [],
    phase: 'grid', endless: false, solvedTotal: 0, grid: null, shop: null,
    stats: { words: 0, best: 0, bestWord: '', points: 0, definitions: 0 },
  };
  if (deck === 'rival') {
    const rng = new Rng(hashSeed(seed, 'rival'));
    run.pens.push(rng.pick(PENS.filter((p) => p.rarity >= 2)).id);
  }
  startGrid(run);
  return run;
}

export function bossOf(run: RunState): BossId | null {
  return run.gridIdx === 2 ? BOSSES[(run.edition - 1) % BOSSES.length] : null;
}

export function targetFor(run: RunState, edition = run.edition, gridIdx = run.gridIdx): number {
  const base = 80 * Math.pow(1.5, edition - 1) * [1, 1.3, 1.75][gridIdx];
  const boss = gridIdx === 2 && BOSSES[(edition - 1) % BOSSES.length] === 'dimanche' ? 1.3 : 1;
  return Math.round(base * DECK_BY_ID[run.deck].targetMult * (1 + 0.15 * run.stake) * boss / 5) * 5;
}

function handSize(run: RunState): number {
  const g = run.grid;
  if (g?.boss === 'bouclage') return 6;
  return DECK_BY_ID[run.deck].hand + (has(run, 'machine') ? 1 : 0);
}

export function startGrid(run: RunState): void {
  const rng = new Rng(hashSeed(run.seed, 'grid', run.edition, run.gridIdx));
  const boss = bossOf(run);
  const deck = DECK_BY_ID[run.deck];
  const pool = clues(run.lang);
  // Three definitions and a starting word, all distinct.
  const picks = rng.shuffle([...pool]).slice(0, 4);
  const seedWord = picks[3][0].length <= 7 ? picks[3][0] : 'MOT';
  const size = boss === 'dimanche' ? 11 : 9;
  const board = makeBoard(rng, size, seedWord);
  const defs: Definition[] = boss === 'masque' ? [] : picks.slice(0, 3).map(([answer, clue]) => ({ answer, clue, solved: false, revealed: 0 }));
  // The bag carries the definitions' letters early, so answering a clue is a real option.
  const bag = rng.shuffle(fullBag(run.lang));
  for (const d of defs) {
    for (const l of d.answer) {
      const i = bag.indexOf(l);
      if (i >= 0) bag.splice(i, 1);
      bag.splice(rng.int(0, Math.min(30, bag.length)), 0, l);
    }
  }
  run.grid = {
    board, bag, hand: [], nextTile: 1,
    wordsLeft: (boss === 'greve' ? 4 : deck.words) + (has(run, 'cafe') ? 1 : 0) - (has(run, 'masque') ? 1 : 0),
    discardsLeft: boss === 'gel' ? 0 : deck.discards + (has(run, 'gomme') ? 1 : 0),
    score: 0, target: targetFor(run), defs, boss, plays: 0, lastInitial: null, typoUsed: false,
    doubleNext: false, proofNext: false,
  };
  refill(run);
  run.phase = 'grid';
}

export function refill(run: RunState): void {
  const g = run.grid!;
  const size = handSize(run);
  while (g.hand.length < size && g.bag.length) g.hand.push({ id: g.nextTile++, letter: g.bag.shift()! });
}

/** A letter the current Sunday boss forbids. */
export function forbidden(run: RunState, letter: string): boolean {
  return run.grid?.boss === 'censure' && letter === 'E';
}

export interface Step {
  key: string;
  points?: number;
  mult?: number;
  times?: number;
}

export interface Scored {
  points: number;
  mult: number;
  total: number;
  steps: Step[];
  definition: Definition | null;
}

/** Score of a validated move: points × mult, Balatro-style, with every bonus listed for the animation. */
export function scoreMove(run: RunState, main: Word, extra: Word[], typo: boolean): Scored {
  const g = run.grid!;
  const lang = run.lang;
  const steps: Step[] = [];
  const val = (l: string, blank: boolean) => {
    let v = letterValue(lang, l, blank);
    if (g.boss === 'coquilles' && isVowel(l)) v = 0;
    if (has(run, 'crayon_gras') && v === 1) v = 2;
    return v;
  };
  let points = main.cells.reduce((s, c) => s + val(c.letter, c.blank), 0);
  steps.push({ key: 'letters', points });
  const extraPts = extra.reduce((s, w) => s + w.cells.reduce((t, c) => t + val(c.letter, c.blank), 0), 0);
  if (extraPts) { points += extraPts; steps.push({ key: 'extra', points: extraPts }); }
  let mult = main.cells.length + extra.length * 0.5;
  steps.push({ key: 'length', mult });

  const add = (key: string, p = 0, m = 0) => { points += p; mult += m; steps.push({ key, points: p || undefined, mult: m || undefined }); };
  const times = (key: string, f: number) => { mult *= f; steps.push({ key, times: f }); };

  if (has(run, 'rouge')) {
    const v = main.cells.filter((c) => isVowel(c.letter)).length * 2;
    if (v) add('rouge', v);
  }
  if (has(run, 'bic')) add('bic', 4);
  if (has(run, 'criterium')) add('criterium', 0, 2);
  if (has(run, 'feutre') && main.crossings) add('feutre', 0, main.crossings);
  if (has(run, 'court') && main.cells.length <= 3) add('court', 10);
  if (has(run, 'pluriel') && main.text.endsWith('S')) add('pluriel', 15);
  if (has(run, 'linotype') && main.cells.length > 5) add('linotype', 0, main.cells.length - 5);
  if (has(run, 'archive') && run.solvedTotal) add('archive', 0, run.solvedTotal * 0.5);

  times('crossing', Math.pow(1.5, main.crossings));
  const definition = g.defs.find((d) => !d.solved && d.answer === main.text) ?? null;
  if (definition) times('definition', has(run, 'correcteur') ? 7 : 5);
  if (has(run, 'plume_or') && main.cells.length >= 7) times('plume_or', 3);
  if (has(run, 'encre_chine') && main.cells.some((c) => isRare(c.letter))) times('encre_chine', 1.5);
  if (has(run, 'rotative') && main.dir === 'v') times('rotative', 2);
  if (has(run, 'colonne') && main.crossings >= 3) times('colonne', 2);
  if (has(run, 'masque')) times('masque', 2);
  if (has(run, 'tampon') && g.plays === 0) times('tampon', 2);
  if (has(run, 'dernier') && g.wordsLeft === 1) times('dernier', 3);
  if (has(run, 'alliteration') && g.lastInitial === main.text[0]) times('alliteration', 2);
  if (g.doubleNext) times('double', 2);
  if (g.proofNext) times('epreuve', 1.5);
  if (typo) times('typo', 0.5);

  mult = Math.round(mult * 100) / 100;
  return { points, mult, total: Math.round(points * mult), steps, definition };
}

export type PlayResult =
  | { ok: false; error: string; badWord?: string }
  | { ok: true; scored: Scored; word: string; cleared: boolean; failed: boolean };

/** Plays tiles from the hand. Tiles are hand ids; blanks carry the letter chosen for them. */
export function play(run: RunState, moves: { tileId: number; x: number; y: number; letter?: string }[], isWord: (w: string) => boolean): PlayResult {
  const g = run.grid!;
  if (g.wordsLeft <= 0) return { ok: false, error: 'noWords' };
  const placements: Placement[] = [];
  for (const m of moves) {
    const tile = g.hand.find((t) => t.id === m.tileId);
    if (!tile) return { ok: false, error: 'tile' };
    const blank = tile.letter === BLANK;
    const letter = blank ? (m.letter ?? '') : tile.letter;
    if (!/^[A-Z]$/.test(letter)) return { ok: false, error: 'blank' };
    if (forbidden(run, letter)) return { ok: false, error: 'censure' };
    placements.push({ x: m.x, y: m.y, letter, blank });
  }
  const minLength = g.boss === 'courts' ? 4 : 2;
  const canTypo = has(run, 'coquille') && !g.typoUsed;
  const check = checkMove(g.board, placements, isWord, minLength, canTypo);
  if (!check.ok) return { ok: false, error: check.error!, badWord: check.badWord };
  const main = check.main!;
  const typo = canTypo && [main, ...check.extra].some((w) => !isWord(w.text));
  const scored = scoreMove(run, main, check.extra, typo);

  commit(g.board, placements);
  if (typo) g.typoUsed = true;
  if (scored.definition) {
    scored.definition.solved = true;
    run.solvedTotal++;
    run.stats.definitions++;
  }
  g.hand = g.hand.filter((t) => !moves.some((m) => m.tileId === t.id));
  g.score += scored.total;
  g.wordsLeft--;
  g.plays++;
  g.lastInitial = main.text[0];
  g.doubleNext = false;
  g.proofNext = false;
  run.stats.words++;
  run.stats.points += scored.total;
  if (scored.total > run.stats.best) { run.stats.best = scored.total; run.stats.bestWord = main.text; }
  refill(run);

  const cleared = g.score >= g.target;
  const failed = !cleared && g.wordsLeft <= 0;
  if (cleared) finishGrid(run);
  else if (failed) run.phase = 'lost';
  return { ok: true, scored, word: main.text, cleared, failed };
}

export function discard(run: RunState, tileIds: number[]): boolean {
  const g = run.grid!;
  if (g.discardsLeft <= 0 || !tileIds.length) return false;
  const out = g.hand.filter((t) => tileIds.includes(t.id));
  g.hand = g.hand.filter((t) => !tileIds.includes(t.id));
  g.bag.push(...out.map((t) => t.letter).filter((l) => l !== BLANK));
  g.discardsLeft--;
  refill(run);
  return true;
}

export interface Reward {
  base: number;
  words: number;
  interest: number;
  bonus: number;
  total: number;
}

export function reward(run: RunState): Reward {
  const g = run.grid!;
  const base = [3, 4, 6][run.gridIdx];
  const words = g.wordsLeft * (has(run, 'abonne') ? 2 : 1);
  const interest = Math.min(5, Math.floor(run.francs / 5));
  const bonus = has(run, 'pigiste') ? 3 : 0;
  return { base, words, interest, bonus, total: base + words + interest + bonus };
}

let lastReward: Reward | null = null;
export const lastGridReward = () => lastReward;

function finishGrid(run: RunState): void {
  lastReward = reward(run);
  run.francs += lastReward.total;
  if (run.gridIdx === GRIDS_PER_EDITION - 1 && run.edition === EDITIONS && !run.endless) {
    run.phase = 'won';
    return;
  }
  run.phase = 'shop';
  rollShop(run);
}

export function rollShop(run: RunState): void {
  const rerolls = run.shop?.rerolls ?? 0;
  const rng = new Rng(hashSeed(run.seed, 'shop', run.edition, run.gridIdx, rerolls));
  const pens = rng.shuffle(PENS.filter((p) => !run.pens.includes(p.id) && (p.rarity < 3 || run.edition >= 3))).slice(0, 3).map((p) => p.id);
  const inks = rng.shuffle([...INKS]).slice(0, 2).map((i) => i.id);
  run.shop = { pens, inks, rerolls };
}

export function penPrice(id: PenId): number {
  return PEN_BY_ID[id].price;
}

export function inkPrice(id: InkId): number {
  return INKS.find((i) => i.id === id)!.price;
}

export function rerollCost(run: RunState): number {
  return 2 + (run.shop?.rerolls ?? 0);
}

export function buyPen(run: RunState, slot: number): boolean {
  const id = run.shop?.pens[slot];
  if (!id || run.pens.length >= MAX_PENS || run.francs < penPrice(id)) return false;
  run.francs -= penPrice(id);
  run.pens.push(id);
  run.shop!.pens[slot] = null;
  return true;
}

export function buyInk(run: RunState, slot: number): boolean {
  const id = run.shop?.inks[slot];
  if (!id || run.inks.length >= MAX_INKS || run.francs < inkPrice(id)) return false;
  run.francs -= inkPrice(id);
  run.inks.push(id);
  run.shop!.inks[slot] = null;
  return true;
}

export function rerollShop(run: RunState): boolean {
  const cost = rerollCost(run);
  if (run.francs < cost || !run.shop) return false;
  run.francs -= cost;
  run.shop.rerolls++;
  const keep = run.shop.rerolls;
  rollShop(run);
  run.shop.rerolls = keep;
  return true;
}

export function sellPen(run: RunState, id: PenId): void {
  if (!run.pens.includes(id)) return;
  run.pens = run.pens.filter((p) => p !== id);
  run.francs += Math.floor(penPrice(id) / 2);
}

export function leaveShop(run: RunState): void {
  run.gridIdx++;
  if (run.gridIdx >= GRIDS_PER_EDITION) {
    run.gridIdx = 0;
    run.edition++;
  }
  run.shop = null;
  startGrid(run);
}

/** After the 8th edition, the paper keeps printing: endless mode. */
export function continueEndless(run: RunState): void {
  run.endless = true;
  run.phase = 'shop';
  rollShop(run);
}

/** One-shot inks. `letter` is used by the correction fluid. Returns false when it cannot apply. */
export function useInk(run: RunState, index: number, opts: { tileId?: number; letter?: string } = {}): boolean {
  const id = run.inks[index];
  const g = run.grid;
  if (!id || !g || run.phase !== 'grid') return false;
  switch (id) {
    case 'pioche':
      for (let i = 0; i < 3 && g.bag.length; i++) g.hand.push({ id: g.nextTile++, letter: g.bag.shift()! });
      break;
    case 'liquide': {
      const tile = g.hand.find((t) => t.id === opts.tileId);
      if (!tile || !opts.letter || !/^[A-Z]$/.test(opts.letter)) return false;
      tile.letter = opts.letter;
      break;
    }
    case 'revelation': {
      const d = g.defs.find((x) => !x.solved && x.revealed < x.answer.length - 1);
      if (!d) return false;
      d.revealed = Math.min(d.answer.length - 1, d.revealed + 2);
      break;
    }
    case 'recharge':
      g.wordsLeft++;
      break;
    case 'echange':
      g.bag.push(...g.hand.map((t) => t.letter).filter((l) => l !== BLANK));
      g.hand = [];
      refill(run);
      break;
    case 'double':
      g.doubleNext = true;
      break;
    case 'joker':
      g.hand.push({ id: g.nextTile++, letter: BLANK });
      break;
    case 'epreuve':
      g.proofNext = true;
      break;
  }
  run.inks.splice(index, 1);
  return true;
}

export function score(run: RunState): number {
  const editions = run.phase === 'won' ? EDITIONS : run.edition - 1 + run.gridIdx / 3;
  return Math.round(editions * 1000 + run.stats.points / 10);
}
