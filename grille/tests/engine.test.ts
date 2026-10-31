import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLUES_EN, CLUES_FR } from '../src/data/clues';
import type { Lang } from '../src/data/letters';
import { checkMove, makeBoard } from '../src/game/board';
import { Rng } from '../src/game/rng';
import {
  type RunState, buyInk, buyPen, discard, leaveShop, newRun, play, scoreMove,
} from '../src/game/run';
import { type Dictionary, buildDictionary, findMoves } from '../src/game/solver';

const dicts: Record<Lang, Dictionary> = {
  fr: buildDictionary(readFileSync('public/dict/fr.txt', 'utf8').split('\n')),
  en: buildDictionary(readFileSync('public/dict/en.txt', 'utf8').split('\n')),
};

describe('clues', () => {
  it('have answers in the dictionary, 2 to 8 letters, no duplicates', () => {
    for (const [lang, list] of [['fr', CLUES_FR], ['en', CLUES_EN]] as const) {
      const answers = list.map(([a]) => a);
      expect(new Set(answers).size, lang).toBe(answers.length);
      for (const a of answers) {
        expect(dicts[lang].has(a), `${lang} ${a}`).toBe(true);
        expect(a.length).toBeGreaterThanOrEqual(2);
        expect(a.length).toBeLessThanOrEqual(8);
      }
      expect(list.length).toBeGreaterThan(120);
    }
  });
});

describe('board', () => {
  it('checks crossings, gaps and words', () => {
    const b = makeBoard(new Rng(1), 9, 'CHAT');
    const mid = 4;
    const start = Math.floor((9 - 4) / 2);
    const has = dicts.fr.has;
    // CHAT across the middle; play "HA" down through the H? Build "AH" vertically ending on the H.
    const h = { x: start + 1, y: mid };
    const ok = checkMove(b, [{ x: h.x, y: h.y - 1, letter: 'A', blank: false }], has);
    expect(ok.ok || ok.error === 'unknown').toBe(true);
    expect(checkMove(b, [{ x: 0, y: 0, letter: 'A', blank: false }, { x: 1, y: 0, letter: 'S', blank: false }], has).error).toBe('cross');
    expect(checkMove(b, [{ x: 0, y: 0, letter: 'A', blank: false }, { x: 2, y: 2, letter: 'S', blank: false }], has).error).toBe('line');
  });

  it('every fresh grid has a playable move for a full hand', () => {
    for (let s = 0; s < 20; s++) {
      const run = newRun('fr', 'classique', 0, 100 + s);
      const moves = findMoves(run.grid!.board, run.grid!.hand.map((t) => t.letter), dicts.fr, 5);
      expect(moves.length, `seed ${s}`).toBeGreaterThan(0);
    }
  });
});

// ---- A greedy bot that always plays the best word it finds. ----
/** `skill` 1 plays the best move found; lower values play a typical human word instead. */
function botTurn(run: RunState, dict: Dictionary, skill = 1): boolean {
  const g = run.grid!;
  const moves = findMoves(g.board, g.hand.map((t) => t.letter), dict, 250, g.boss === 'courts' ? 4 : 2)
    .filter((m) => !m.tiles.some((t) => g.boss === 'censure' && t.letter === 'E'));
  const scoredMoves: { total: number; len: number; moves: { tileId: number; x: number; y: number; letter?: string }[] }[] = [];
  for (const m of moves) {
    const used = new Set<number>();
    const mapped = m.tiles.map((t) => {
      const tile = g.hand.find((h) => !used.has(h.id) && (t.blankFor ? h.letter === '?' : h.letter === t.letter))!;
      used.add(tile.id);
      return { tileId: tile.id, x: t.x, y: t.y, letter: t.blankFor };
    });
    const check = checkMove(g.board, m.tiles.map((t) => ({ x: t.x, y: t.y, letter: t.letter, blank: !!t.blankFor })), dict.has);
    if (!check.ok) continue;
    const s = scoreMove(run, check.main!, check.extra, false);
    scoredMoves.push({ total: s.total, len: check.main!.text.length, moves: mapped });
  }
  // A person rarely finds the solver's obscure 9-letter words: keep common lengths, pick a percentile.
  const pool = (skill < 1 ? scoredMoves.filter((m) => m.len <= 6) : scoredMoves).sort((a, b) => a.total - b.total);
  const best = pool.length ? pool[Math.min(pool.length - 1, Math.floor(pool.length * skill))] : null;
  if (!best) {
    if (!discard(run, g.hand.map((t) => t.id))) { g.wordsLeft = 0; run.phase = 'lost'; }
    return false;
  }
  const r = play(run, best.moves, dict.has);
  expect(r.ok).toBe(true);
  return true;
}

function botRun(lang: Lang, seed: number, shop: boolean, skill = 1): RunState {
  const run = newRun(lang, 'classique', 0, seed);
  const rng = new Rng(seed);
  for (let guard = 0; guard < 400; guard++) {
    if (run.phase === 'won' || run.phase === 'lost') break;
    if (run.phase === 'shop') {
      if (shop) {
        for (let i = 0; i < 3; i++) if (rng.chance(0.7)) buyPen(run, i);
        if (rng.chance(0.3)) buyInk(run, 0);
      }
      leaveShop(run);
      continue;
    }
    botTurn(run, dicts[lang], skill);
  }
  return run;
}

describe('balance', () => {
  for (const lang of ['fr', 'en'] as const) {
    it(`${lang}: a human-like player reaches the middle editions, rarely the end`, () => {
      const runs = Array.from({ length: 12 }, (_, i) => botRun(lang, 900 + i, true, 0.8));
      const reached = runs.map((r) => (r.phase === 'won' ? 9 : r.edition + r.gridIdx / 3));
      const avg = reached.reduce((a, b) => a + b, 0) / runs.length;
      console.log(`${lang} human-like editions:`, reached.map((r) => r.toFixed(1)).join(' '), 'avg', avg.toFixed(2));
      expect(avg).toBeGreaterThan(2.5);
      expect(avg).toBeLessThan(7.5);
    }, 120000);
    it(`${lang}: a greedy bot with a few pens reaches the middle editions`, () => {
      const runs = Array.from({ length: 12 }, (_, i) => botRun(lang, 500 + i, true));
      const reached = runs.map((r) => (r.phase === 'won' ? 9 : r.edition + r.gridIdx / 3));
      const avg = reached.reduce((a, b) => a + b, 0) / runs.length;
      console.log(`${lang} bot editions:`, reached.map((r) => r.toFixed(1)).join(' '), 'avg', avg.toFixed(2),
        'best word', runs.map((r) => `${r.stats.bestWord}:${r.stats.best}`).slice(0, 4).join(' '));
      expect(avg).toBeGreaterThan(2);
    }, 120000);
  }
});

import { BOSSES, INKS, PENS } from '../src/data/content';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, shape((value as Record<string, unknown>)[k])]));
  }
  return typeof value;
}

describe('locales', () => {
  it('fr and en have the same structure', () => {
    expect(shape(en)).toEqual(shape(fr));
  });
  it('name every pen, ink and boss', () => {
    for (const p of PENS) expect(fr.pens[p.id], p.id).toBeDefined();
    for (const i of INKS) expect(fr.inks[i.id], i.id).toBeDefined();
    for (const b of BOSSES) expect(fr.bosses[b], b).toBeDefined();
  });
});
