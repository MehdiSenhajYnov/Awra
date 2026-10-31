import { type BagDef, type ItemDef, ITEM_BY_ID } from '../data/items';

/** An owned item: in stock (x = -1) or placed in the bag. */
export interface Piece {
  uid: number;
  id: string;
  x: number;
  y: number;
  /** Rotated a quarter turn: footprint becomes h × w. */
  rot: boolean;
}

export interface Layout {
  cols: number;
  rows: number;
  falseBottom: boolean;
  bellows: [number, number] | null;
  extraSearch: number;
}

export function layoutFor(bag: BagDef, extraCols = 0): Layout {
  return {
    cols: bag.cols + extraCols,
    rows: bag.rows,
    falseBottom: !!bag.falseBottom,
    bellows: bag.bellows ?? null,
    extraSearch: bag.extraSearch ?? 0,
  };
}

export const def = (p: Piece): ItemDef => ITEM_BY_ID[p.id];

export function footprint(p: Piece): [number, number] {
  const d = def(p);
  return p.rot ? [d.h, d.w] : [d.w, d.h];
}

export function isPlaced(p: Piece): boolean {
  return p.x >= 0;
}

export function cellsOf(p: Piece): [number, number][] {
  const [w, h] = footprint(p);
  const out: [number, number][] = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push([p.x + dx, p.y + dy]);
  return out;
}

/** Cell -> uid of the piece covering it. */
export function occupancy(pieces: Piece[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pieces) if (isPlaced(p)) for (const [x, y] of cellsOf(p)) m.set(`${x},${y}`, p.uid);
  return m;
}

export function canPlace(layout: Layout, pieces: Piece[], p: Piece, x: number, y: number, rot: boolean): boolean {
  const moved: Piece = { ...p, x, y, rot };
  const [w, h] = footprint(moved);
  if (x < 0 || y < 0 || x + w > layout.cols || y + h > layout.rows) return false;
  const occ = occupancy(pieces.filter((o) => o.uid !== p.uid));
  return cellsOf(moved).every(([cx, cy]) => !occ.has(`${cx},${cy}`));
}

const cheb = (a: [number, number], b: [number, number]) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

function minDistance(a: Piece, b: Piece): number {
  let best = Infinity;
  for (const ca of cellsOf(a)) for (const cb of cellsOf(b)) best = Math.min(best, cheb(ca, cb));
  return best;
}

export interface Modifiers {
  shieldBonus: number;
  maskBonus: number;
}

/** Cells hidden from the scanner by lead, plus accordion bellows. */
export function shieldedCells(layout: Layout, pieces: Piece[], mods: Modifiers, leadless = false): Set<string> {
  const out = new Set<string>();
  if (layout.bellows) {
    for (let x = layout.bellows[0]; x <= layout.bellows[1]; x++) for (let y = 0; y < layout.rows; y++) out.add(`${x},${y}`);
  }
  if (leadless) return out;
  for (const p of pieces) {
    const r = def(p).shield;
    if (!isPlaced(p) || r === undefined) continue;
    const radius = r + mods.shieldBonus;
    for (const [cx, cy] of cellsOf(p)) {
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) out.add(`${cx + dx},${cy + dy}`);
    }
  }
  return out;
}

/** Smell left on each placed piece after neighbouring masks. */
export function effectiveSmell(pieces: Piece[], mods: Modifiers): Map<number, number> {
  const placed = pieces.filter(isPlaced);
  const out = new Map<number, number>();
  for (const p of placed) {
    let s = def(p).smell;
    if (s > 0) {
      for (const m of placed) {
        const mask = def(m).mask;
        if (!mask || m.uid === p.uid) continue;
        if (minDistance(p, m) <= mask.radius + mods.maskBonus) s -= mask.power;
      }
    }
    out.set(p.uid, Math.max(0, s));
  }
  return out;
}
