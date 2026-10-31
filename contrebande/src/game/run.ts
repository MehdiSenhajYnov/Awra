import { BAG_BY_ID, ITEMS, ITEM_BY_ID, type ItemDef } from '../data/items';
import { MAX_STAMPS, STAMPS, STAMP_BY_ID, type StampId } from '../data/stamps';
import { type Layout, type Piece, def, isPlaced, layoutFor } from './bag';
import { BORDERS, CROSSINGS_PER_BORDER, type Crossing, type Inspection, type InspectionRules, inspect, makeCrossing } from './inspect';
import { Rng, hashSeed } from './rng';

/** Instalments owed to Olga at the end of each border. */
export const DUES = [10, 30, 60, 100, 160, 240, 340, 470];
export const START_MONEY = 30;
export const OFFERS = 5;
export const STOCK_LIMIT = 10;

export type Phase = 'market' | 'payment' | 'backroom' | 'won' | 'lost';
export type LossReason = 'dossier' | 'dette';

export interface RunState {
  version: 1;
  seed: number;
  bag: string;
  alert: number;
  daily: string | null;
  border: number;
  index: number;
  money: number;
  dossiers: number;
  stamps: StampId[];
  pieces: Piece[];
  nextUid: number;
  offers: (string | null)[];
  rerolls: number;
  backroomOffers: (StampId | null)[];
  favourUsed: boolean;
  beardUsedBorder: number;
  phase: Phase;
  loss: LossReason | null;
  stats: { crossings: number; sold: number; caught: number; earned: number };
}

export function newRun(bag: string, alert: number, seed: number, daily: string | null = null): RunState {
  const run: RunState = {
    version: 1, seed, bag, alert, daily, border: 1, index: 0, money: START_MONEY, dossiers: 0,
    stamps: [], pieces: [], nextUid: 1, offers: [], rerolls: 0, backroomOffers: [],
    favourUsed: false, beardUsedBorder: 0, phase: 'market', loss: null,
    stats: { crossings: 0, sold: 0, caught: 0, earned: 0 },
  };
  // Everyone starts with one lead sheet, the trade's basic tool.
  run.pieces.push({ uid: run.nextUid++, id: 'plomb', x: -1, y: 0, rot: false });
  rollOffers(run);
  return run;
}

export const has = (run: RunState, s: StampId) => run.stamps.includes(s);

export function layout(run: RunState): Layout {
  return layoutFor(BAG_BY_ID[run.bag], has(run, 'soufflet') ? 1 : 0);
}

export function crossing(run: RunState): Crossing {
  return makeCrossing(hashSeed(run.seed, 'x', run.border, run.index), run.border, run.index, run.alert);
}

export function due(run: RunState, border = run.border): number {
  return Math.round(DUES[border - 1] * (1 + 0.3 * run.alert));
}

export function dossierLimit(run: RunState): number {
  return has(run, 'avocat') ? 4 : 3;
}

/** Rationing gets worse further from home: everything is pricier, and resells for more. */
export function inflation(border: number): number {
  return 1 + 0.22 * (border - 1);
}

export function priceOf(run: RunState, id: string): number {
  const base = Math.round(ITEM_BY_ID[id].buy * (ITEM_BY_ID[id].kind === 'tool' ? 1 : inflation(run.border)));
  return has(run, 'solde') ? Math.max(1, Math.round(base * 0.8)) : base;
}

export function rerollCost(run: RunState): number {
  if (has(run, 'cousin') && run.rerolls === 0) return 0;
  return 2 + run.rerolls;
}

function offerPool(run: RunState): ItemDef[] {
  return ITEMS.filter((i) => (i.from ?? 1) <= run.border);
}

export function rollOffers(run: RunState): void {
  const rng = new Rng(hashSeed(run.seed, 'market', run.border, run.index, run.rerolls));
  const pool = offerPool(run);
  const byKind = (k: ItemDef['kind']) => pool.filter((i) => i.kind === k);
  const count = OFFERS + Math.min(3, Math.floor((run.border - 1) / 2)) + (has(run, 'tapis') ? 1 : 0);
  const offers: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng.next();
    const kind = i === 0 ? 'contra' : r < 0.5 ? 'contra' : r < 0.82 ? 'legal' : 'tool';
    let pick = rng.pick(byKind(kind));
    for (let guard = 0; guard < 5 && offers.includes(pick.id); guard++) pick = rng.pick(byKind(kind));
    offers.push(pick.id);
  }
  run.offers = offers;
}

export function stockCount(run: RunState): number {
  return run.pieces.filter((p) => !isPlaced(p)).length;
}

export function buy(run: RunState, slot: number): boolean {
  const id = run.offers[slot];
  if (!id || run.phase !== 'market') return false;
  const price = priceOf(run, id);
  if (run.money < price || stockCount(run) >= STOCK_LIMIT) return false;
  run.money -= price;
  run.offers[slot] = null;
  run.pieces.push({ uid: run.nextUid++, id, x: -1, y: 0, rot: false });
  return true;
}

export function reroll(run: RunState): boolean {
  const cost = rerollCost(run);
  if (run.money < cost || run.phase !== 'market') return false;
  run.money -= cost;
  run.rerolls++;
  rollOffers(run);
  return true;
}

/** Olga takes back an unwanted piece for half its price. */
export function sellBack(run: RunState, uid: number): number {
  const p = run.pieces.find((q) => q.uid === uid);
  if (!p) return 0;
  const refund = Math.floor((def(p).kind === 'tool' ? def(p).buy : def(p).buy * inflation(run.border)) / 2);
  run.pieces = run.pieces.filter((q) => q.uid !== uid);
  run.money += refund;
  return refund;
}

export function inspectionRules(run: RunState): InspectionRules {
  return {
    shieldBonus: has(run, 'plomberie') ? 1 : 0,
    maskBonus: has(run, 'toilette') ? 1 : 0,
    dogAlertsMinus: has(run, 'os') ? 1 : 0,
    skipSearches: has(run, 'diplomatique') && run.index === 0,
  };
}

export interface Sale {
  uid: number;
  id: string;
  amount: number;
}

export interface Fine {
  uid: number;
  id: string;
  amount: number;
  dossier: boolean;
  pardoned: 'favour' | 'beard' | null;
}

export interface CrossingResult {
  lane: number;
  inspection: Inspection;
  toll: number;
  sales: Sale[];
  fines: Fine[];
  bonuses: { key: 'dent' | 'indemnite' | 'collection'; amount: number }[];
  net: number;
}

export function saleValue(run: RunState, c: Crossing, laneIdx: number, d: ItemDef): number {
  if (d.kind === 'tool') return 0;
  let v = d.sell * inflation(run.border) * c.lanes[laneIdx].priceMult;
  if (d.kind === 'legal') return Math.round(v * (has(run, 'reseau') ? 2 : 1));
  if (d.cat === c.demand) v *= 1.5;
  if (has(run, 'contacts')) v *= 1.25;
  if (has(run, 'jazz') && d.cat === 'musique') v *= 2;
  if (has(run, 'gourmet') && d.cat === 'epicerie') v *= 1.6;
  return Math.round(v);
}

/** Pure preview of a lane, for planning and tests. */
export function previewLane(run: RunState, laneIdx: number): Inspection {
  const c = crossing(run);
  return inspect(layout(run), run.pieces, c.lanes[laneIdx], c.searchSeed, inspectionRules(run));
}

export function cross(run: RunState, laneIdx: number): CrossingResult {
  const c = crossing(run);
  const lane = c.lanes[laneIdx];
  const toll = has(run, 'potdevin') ? 0 : lane.toll;
  const inspection = inspect(layout(run), run.pieces, lane, c.searchSeed, inspectionRules(run));
  const caught = new Set(inspection.caught);
  const placed = run.pieces.filter(isPlaced);

  const fines: Fine[] = [];
  for (const p of placed.filter((q) => caught.has(q.uid))) {
    const d = def(p);
    let pardoned: Fine['pardoned'] = null;
    if (has(run, 'faveur') && !run.favourUsed) {
      run.favourUsed = true;
      pardoned = 'favour';
    } else if (d.major && has(run, 'barbe') && run.beardUsedBorder !== run.border) {
      run.beardUsedBorder = run.border;
      pardoned = 'beard';
    }
    fines.push({
      uid: p.uid, id: p.id,
      amount: pardoned === 'favour' ? 0 : Math.ceil(d.sell * inflation(run.border) * 0.25),
      dossier: !!d.major && pardoned === null,
      pardoned,
    });
  }
  const released = new Set(fines.filter((f) => f.pardoned === 'favour').map((f) => f.uid));

  const sales: Sale[] = placed
    .filter((p) => def(p).kind !== 'tool' && (!caught.has(p.uid) || released.has(p.uid)))
    .map((p) => ({ uid: p.uid, id: p.id, amount: saleValue(run, c, laneIdx, def(p)) }));

  const bonuses: CrossingResult['bonuses'] = [];
  if (has(run, 'dent')) bonuses.push({ key: 'dent', amount: 4 });
  if (has(run, 'indemnite')) {
    const legalAlerts = inspection.steps.flatMap((s) => (s.kind === 'dog' ? s.alerts : []))
      .filter((u) => def(placed.find((p) => p.uid === u)!).kind !== 'contra').length;
    if (legalAlerts) bonuses.push({ key: 'indemnite', amount: legalAlerts * 5 });
  }
  if (has(run, 'collection')) {
    const cats = new Set(sales.map((s) => ITEM_BY_ID[s.id].cat).filter(Boolean));
    if (cats.size) bonuses.push({ key: 'collection', amount: cats.size * 3 });
  }

  const income = sales.reduce((s, x) => s + x.amount, 0) + bonuses.reduce((s, b) => s + b.amount, 0);
  const fineTotal = fines.reduce((s, f) => s + f.amount, 0);
  const net = income - fineTotal - toll;
  run.money += net;
  run.dossiers += fines.filter((f) => f.dossier).length;
  run.stats.crossings++;
  run.stats.sold += sales.length;
  run.stats.caught += fines.filter((f) => f.pardoned !== 'favour').length;
  run.stats.earned += income;

  // Goods leave the bag (sold or confiscated); tools stay where they were packed.
  run.pieces = run.pieces.filter((p) => !isPlaced(p) || def(p).kind === 'tool');

  if (run.dossiers >= dossierLimit(run)) {
    run.phase = 'lost';
    run.loss = 'dossier';
  } else {
    run.index++;
    run.rerolls = 0;
    if (run.index >= CROSSINGS_PER_BORDER) run.phase = 'payment';
    else rollOffers(run);
  }
  return { lane: laneIdx, inspection, toll, sales, fines, bonuses, net };
}

/** Pays Olga's instalment. Returns false when the run is lost for debt. */
export function pay(run: RunState): boolean {
  const amount = due(run);
  if (run.money < amount) {
    run.phase = 'lost';
    run.loss = 'dette';
    return false;
  }
  run.money -= amount;
  if (run.border >= BORDERS) {
    run.phase = 'won';
    return true;
  }
  run.phase = 'backroom';
  const rng = new Rng(hashSeed(run.seed, 'backroom', run.border));
  const pool = STAMPS.filter((s) => !run.stamps.includes(s.id));
  run.backroomOffers = rng.shuffle([...pool]).slice(0, 3).map((s) => s.id);
  return true;
}

export function stampPrice(id: StampId): number {
  return STAMP_BY_ID[id].price;
}

export function buyStamp(run: RunState, slot: number): boolean {
  const id = run.backroomOffers[slot];
  if (!id || run.stamps.length >= MAX_STAMPS || run.money < stampPrice(id)) return false;
  run.money -= stampPrice(id);
  run.stamps.push(id);
  run.backroomOffers[slot] = null;
  return true;
}

export function sellStamp(run: RunState, id: StampId): void {
  if (!run.stamps.includes(id)) return;
  run.stamps = run.stamps.filter((s) => s !== id);
  run.money += Math.floor(stampPrice(id) / 2);
  // A pocket-expanding stamp leaving can strand pieces outside the bag.
  const lay = layout(run);
  for (const p of run.pieces) {
    if (!isPlaced(p)) continue;
    const [w, h] = p.rot ? [def(p).h, def(p).w] : [def(p).w, def(p).h];
    if (p.x + w > lay.cols || p.y + h > lay.rows) p.x = -1;
  }
}

export function leaveBackroom(run: RunState): void {
  run.border++;
  run.index = 0;
  run.rerolls = 0;
  run.phase = 'market';
  rollOffers(run);
}

/** Final score: money in hand plus a bonus per border cleared. */
export function score(run: RunState): number {
  const cleared = run.phase === 'won' ? BORDERS : run.border - 1;
  return run.money + cleared * 25 + run.alert * 50;
}
