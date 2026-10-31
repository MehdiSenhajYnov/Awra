import { CATEGORIES, type Category } from '../data/items';
import { type Layout, type Modifiers, type Piece, cellsOf, def, effectiveSmell, footprint, isPlaced, occupancy, shieldedCells } from './bag';
import { Rng } from './rng';

export type Check =
  | { kind: 'scanner'; half?: boolean; leadless?: boolean }
  | { kind: 'dog'; alerts: number; sensitivity: number }
  | { kind: 'search'; cells: number }
  | { kind: 'largest' };

export type OfficerId = 'pilsky' | 'kolb' | 'irina' | 'dudek' | 'stagiaire' | 'vass' | 'rossa' | 'ministre' | 'greve';

export interface Lane {
  officer: OfficerId;
  checks: Check[];
  /** Multiplier on sale prices on the other side of this lane. */
  priceMult: number;
  /** Paid before crossing. */
  toll: number;
}

export interface Crossing {
  border: number;
  /** 0, 1 = ordinary crossings, 2 = the border's boss. */
  index: number;
  boss: boolean;
  lanes: Lane[];
  demand: Category;
  /** Seed for the manual searches of this crossing. */
  searchSeed: number;
}

export const BORDERS = 8;
export const CROSSINGS_PER_BORDER = 3;

/** The border bosses, in order. */
export const BOSSES: Lane[] = [
  { officer: 'kolb', checks: [{ kind: 'scanner' }, { kind: 'search', cells: 2 }], priceMult: 1, toll: 0 },
  { officer: 'pilsky', checks: [{ kind: 'dog', alerts: 2, sensitivity: 1 }, { kind: 'search', cells: 2 }], priceMult: 1, toll: 0 },
  { officer: 'irina', checks: [{ kind: 'scanner' }, { kind: 'dog', alerts: 1, sensitivity: 1 }], priceMult: 1, toll: 0 },
  { officer: 'vass', checks: [{ kind: 'largest' }, { kind: 'scanner' }, { kind: 'search', cells: 3 }], priceMult: 1, toll: 0 },
  { officer: 'greve', checks: [], priceMult: 0.6, toll: 0 },
  { officer: 'dudek', checks: [{ kind: 'scanner', half: true, leadless: true }, { kind: 'search', cells: 3 }], priceMult: 1, toll: 0 },
  { officer: 'rossa', checks: [{ kind: 'dog', alerts: 99, sensitivity: 1 }, { kind: 'search', cells: 3 }], priceMult: 1, toll: 0 },
  { officer: 'ministre', checks: [{ kind: 'largest' }, { kind: 'scanner' }, { kind: 'dog', alerts: 1, sensitivity: 1 }, { kind: 'search', cells: 4 }], priceMult: 1.2, toll: 0 },
];

const ORDINARY: OfficerId[] = ['pilsky', 'kolb', 'irina', 'dudek', 'stagiaire'];

function checkCost(c: Check): number {
  switch (c.kind) {
    case 'scanner': return c.half ? 1.2 : 2;
    case 'dog': return c.alerts >= 2 ? 2.2 : c.sensitivity >= 2 ? 1 : 1.5;
    case 'search': return c.cells * 0.6;
    case 'largest': return 1.5;
  }
}

function randomChecks(rng: Rng, budget: number): Check[] {
  const checks: Check[] = [];
  let spent = 0;
  const has = (k: Check['kind']) => checks.some((c) => c.kind === k);
  for (let guard = 0; guard < 20 && spent < budget; guard++) {
    const roll = rng.next();
    let c: Check;
    if (roll < 0.35 && !has('scanner')) c = { kind: 'scanner', half: rng.chance(0.4) };
    else if (roll < 0.65 && !has('dog')) c = { kind: 'dog', alerts: 1, sensitivity: rng.chance(0.4) ? 2 : 1 };
    else if (roll < 0.75 && !has('largest') && budget > 3) c = { kind: 'largest' };
    else if (!has('search')) c = { kind: 'search', cells: Math.max(1, Math.min(5, Math.round((budget - spent) / 0.6))) };
    else continue;
    const cost = checkCost(c);
    if (spent + cost > budget + 0.6 && checks.length) break;
    checks.push(c);
    spent += cost;
  }
  // Present the checks in a stable reading order.
  const order: Check['kind'][] = ['largest', 'scanner', 'dog', 'search'];
  return checks.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export function makeCrossing(seed: number, border: number, index: number, alert: number): Crossing {
  const rng = new Rng(seed);
  const demand = rng.pick(CATEGORIES);
  const searchSeed = Math.floor(rng.next() * 2 ** 31);
  const extraCells = Math.floor(alert / 2);
  const withAlert = (lane: Lane): Lane => ({
    ...lane,
    checks: lane.checks.map((c) => (c.kind === 'search' ? { ...c, cells: c.cells + extraCells } : c)),
  });
  if (index === 2) {
    return { border, index, boss: true, lanes: [withAlert(BOSSES[(border - 1) % BOSSES.length])], demand, searchSeed };
  }
  const level = border - 1 + index * 0.5;
  const officers = rng.shuffle([...ORDINARY]);
  const main: Lane = { officer: officers[0], checks: randomChecks(rng, 1.2 + level * 0.55), priceMult: 1, toll: 0 };
  const expressPerk = rng.chance(0.5);
  const express: Lane = {
    officer: officers[1],
    checks: randomChecks(rng, 0.4 + level * 0.35),
    priceMult: expressPerk ? 0.8 : 1,
    toll: expressPerk ? 0 : 2 + border * 2,
  };
  return { border, index, boss: false, lanes: [withAlert(main), withAlert(express)], demand, searchSeed };
}

export interface InspectionRules extends Modifiers {
  dogAlertsMinus: number;
  skipSearches: boolean;
}

export type Step =
  | { kind: 'scanner'; region: [number, number]; seen: number[]; caught: number[] }
  | { kind: 'dog'; alerts: number[]; caught: number[] }
  | { kind: 'search'; cells: [number, number][]; caught: number[]; skipped: boolean }
  | { kind: 'largest'; target: number | null; caught: number[] };

export interface Inspection {
  steps: Step[];
  caught: number[];
}

/** Cells a manual search will open; deterministic for a crossing so the "eye" stamp can preview it. */
export function searchCells(layout: Layout, seed: number, count: number, stepIndex: number): [number, number][] {
  const rng = new Rng(seed + stepIndex * 7919);
  const pool: [number, number][] = [];
  for (let y = 0; y < layout.rows; y++) {
    if (layout.falseBottom && y === layout.rows - 1) continue;
    for (let x = 0; x < layout.cols; x++) pool.push([x, y]);
  }
  return rng.shuffle(pool).slice(0, Math.min(count + layout.extraSearch, pool.length));
}

export function inspect(layout: Layout, pieces: Piece[], lane: Lane, seed: number, rules: InspectionRules): Inspection {
  const placed = pieces.filter(isPlaced);
  const caught = new Set<number>();
  const steps: Step[] = [];
  const contra = (uid: number) => def(placed.find((p) => p.uid === uid)!).kind === 'contra';
  // Confiscated goods leave the bag: later checks only see what is still in it.
  const live = () => placed.filter((p) => !caught.has(p.uid));

  lane.checks.forEach((check, i) => {
    switch (check.kind) {
      case 'scanner': {
        const region: [number, number] = check.half ? [0, Math.ceil(layout.cols / 2) - 1] : [0, layout.cols - 1];
        const hidden = shieldedCells(layout, placed, rules, check.leadless);
        const seen = live().filter((p) => def(p).dense && cellsOf(p).some(([x, y]) =>
          x >= region[0] && x <= region[1] && !hidden.has(`${x},${y}`))).map((p) => p.uid);
        const got = seen.filter(contra);
        got.forEach((u) => caught.add(u));
        steps.push({ kind: 'scanner', region, seen, caught: got });
        break;
      }
      case 'dog': {
        const smell = effectiveSmell(live(), rules);
        const max = Math.max(0, check.alerts - rules.dogAlertsMinus);
        const alerts = live()
          .filter((p) => (smell.get(p.uid) ?? 0) >= check.sensitivity)
          .sort((a, b) => (smell.get(b.uid)! - smell.get(a.uid)!) || (a.y - b.y) || (a.x - b.x))
          .slice(0, max)
          .map((p) => p.uid);
        const got = alerts.filter(contra);
        got.forEach((u) => caught.add(u));
        steps.push({ kind: 'dog', alerts, caught: got });
        break;
      }
      case 'search': {
        const cells = searchCells(layout, seed, check.cells, i);
        if (rules.skipSearches) {
          steps.push({ kind: 'search', cells, caught: [], skipped: true });
          break;
        }
        const occ = occupancy(live());
        const hit = new Set<number>();
        for (const [x, y] of cells) {
          const u = occ.get(`${x},${y}`);
          if (u !== undefined && contra(u)) hit.add(u);
        }
        hit.forEach((u) => caught.add(u));
        steps.push({ kind: 'search', cells, caught: [...hit], skipped: false });
        break;
      }
      case 'largest': {
        const area = (p: Piece) => footprint(p)[0] * footprint(p)[1];
        const target = live().sort((a, b) => area(b) - area(a) || def(b).sell - def(a).sell)[0];
        const got = target && contra(target.uid) ? [target.uid] : [];
        got.forEach((u) => caught.add(u));
        steps.push({ kind: 'largest', target: target?.uid ?? null, caught: got });
        break;
      }
    }
  });
  return { steps, caught: [...caught] };
}
