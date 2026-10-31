import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_BY_ID } from '../src/data/items';
import { STAMPS } from '../src/data/stamps';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { type Piece, def, effectiveSmell, footprint } from '../src/game/bag';
import { expectedLoss, packGreedy } from '../src/game/autopack';
import { BOSSES, inspect, makeCrossing, searchCells } from '../src/game/inspect';
import { Rng } from '../src/game/rng';
import {
  type RunState, buy, buyStamp, cross, crossing, due, leaveBackroom, newRun, pay, priceOf,
} from '../src/game/run';

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
  it('name every item, stamp and boss', () => {
    for (const i of ITEMS) expect(fr.items[i.id as keyof typeof fr.items], i.id).toBeDefined();
    for (const s of STAMPS) expect(fr.stamps[s.id as keyof typeof fr.stamps], s.id).toBeDefined();
    for (const b of BOSSES) expect(fr.officers[b.officer], b.officer).toBeDefined();
  });
});

const piece = (uid: number, id: string, x: number, y: number, rot = false): Piece => ({ uid, id, x, y, rot });
const lay = { cols: 6, rows: 4, falseBottom: false, bellows: null, extraSearch: 0 };
const noMods = { shieldBonus: 0, maskBonus: 0, dogAlertsMinus: 0, skipSearches: false };

describe('checks', () => {
  it('lead hides dense goods next to it from the scanner', () => {
    const pieces = [piece(1, 'plomb', 2, 1), piece(2, 'montre', 1, 2), piece(3, 'calculatrice', 5, 3)];
    const r = inspect(lay, pieces, { officer: 'kolb', checks: [{ kind: 'scanner' }], priceMult: 1, toll: 0 }, 1, noMods);
    expect(r.caught).toEqual([3]);
  });

  it('the dog follows the strongest unmasked smell', () => {
    const pieces = [piece(1, 'comte', 3, 0), piece(2, 'cigares', 0, 3), piece(3, 'cologne', 1, 2)];
    const smell = effectiveSmell(pieces, noMods);
    expect(smell.get(2)).toBe(0);
    const r = inspect(lay, pieces, { officer: 'pilsky', checks: [{ kind: 'dog', alerts: 1, sensitivity: 1 }], priceMult: 1, toll: 0 }, 1, noMods);
    expect(r.caught).toEqual([]);
    expect(r.steps[0]).toMatchObject({ kind: 'dog', alerts: [1] });
  });

  it('a false bottom is never searched', () => {
    const l = { ...lay, falseBottom: true };
    for (let seed = 0; seed < 30; seed++) {
      expect(searchCells(l, seed, 30, 0).every(([, y]) => y < 3)).toBe(true);
    }
  });

  it('crossings are deterministic', () => {
    expect(makeCrossing(5, 3, 1, 0)).toEqual(makeCrossing(5, 3, 1, 0));
    expect(makeCrossing(5, 3, 2, 0).boss).toBe(true);
  });
});

// ---- A greedy bot that plays whole runs, to keep the economy honest. ----

function playRun(seed: number, skill: number): RunState {
  const run = newRun('carton', 0, seed);
  const rng = new Rng(seed);
  for (let guard = 0; guard < 200; guard++) {
    if (run.phase === 'won' || run.phase === 'lost') break;
    if (run.phase === 'payment') { pay(run); continue; }
    if (run.phase === 'backroom') {
      for (let i = 0; i < 3; i++) if (rng.chance(0.6)) buyStamp(run, i);
      leaveBackroom(run);
      continue;
    }
    // Market: keep a cushion for the instalment, buy the best margins first.
    const cushion = run.index === 2 ? 0 : Math.round(due(run) * 0.15);
    const offers = run.offers
      .map((id, slot) => ({ id, slot }))
      .filter((o): o is { id: string; slot: number } => !!o.id)
      .sort((a, b) => {
        const da = ITEM_BY_ID[a.id];
        const db = ITEM_BY_ID[b.id];
        const va = da.kind === 'tool' ? 30 : (da.sell - da.buy) / (da.w * da.h);
        const vb = db.kind === 'tool' ? 30 : (db.sell - db.buy) / (db.w * db.h);
        return vb - va;
      });
    for (const o of offers) {
      const d = ITEM_BY_ID[o.id];
      if (d.kind === 'tool' && run.pieces.filter((p) => def(p).kind === 'tool').length >= 3) continue;
      if (run.money - priceOf(run, o.id) >= cushion && rng.chance(skill)) buy(run, o.slot);
    }
    packGreedy(run);
    const lanes = crossing(run).lanes.map((_, i) => i);
    const lane = lanes.sort((a, b) => expectedLoss(run, a) - expectedLoss(run, b))[0];
    const res = cross(run, rng.chance(skill) ? lane : rng.int(0, lanes.length - 1));
    if (process.env.SIM_DEBUG && seed === 1000) console.log(`b${run.border}.${run.index} money=${run.money} net=${res.net} sold=${res.sales.length} caught=${res.fines.length} placed=${res.sales.length + res.fines.length}`);
  }
  return run;
}

describe('economy', () => {
  it('a careful bot clears several borders and sometimes wins', () => {
    const runs = Array.from({ length: 40 }, (_, i) => playRun(1000 + i, 0.95));
    const wins = runs.filter((r) => r.phase === 'won').length;
    const borders = runs.map((r) => (r.phase === 'won' ? 9 : r.border));
    const avg = borders.reduce((a, b) => a + b, 0) / runs.length;
    const losses = runs.reduce((m, r) => ({ ...m, [r.loss ?? 'won']: (m[r.loss ?? 'won'] ?? 0) + 1 }), {} as Record<string, number>);
    console.log(`careful bot: wins ${wins}/40, average border ${avg.toFixed(2)}`, losses, borders.join(','));
    expect(avg).toBeGreaterThan(3);
    expect(wins).toBeGreaterThan(0);
    expect(wins).toBeLessThan(36);
  });

  it('a sloppy bot loses early', () => {
    const runs = Array.from({ length: 30 }, (_, i) => playRun(2000 + i, 0.5));
    const avg = runs.reduce((a, r) => a + (r.phase === 'won' ? 9 : r.border), 0) / runs.length;
    console.log(`sloppy bot: average border ${avg.toFixed(2)}`);
    expect(avg).toBeLessThan(6);
  });
});

describe('footprints', () => {
  it('lie flat', () => {
    for (const i of ITEMS) expect(i.w >= i.h, i.id).toBe(true);
    expect(footprint({ uid: 1, id: 'guitare', x: 0, y: 0, rot: true })).toEqual([2, 4]);
  });
});
