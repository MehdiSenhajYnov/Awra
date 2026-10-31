// A greedy packer and lane picker. Used by the balance tests and by the autoplay test hook;
// players never get it (packing is the game).
import { type Piece, canPlace, cellsOf, def, effectiveSmell, isPlaced, shieldedCells } from './bag';
import { inspect } from './inspect';
import { type RunState, crossing, inspectionRules, layout } from './run';

function placementCost(run: RunState, pieces: Piece[], p: Piece): number {
  const d = def(p);
  const others = pieces.filter((o) => o.uid !== p.uid && isPlaced(o));
  if (d.kind === 'contra' && d.dense) {
    const hidden = shieldedCells(layout(run), others, inspectionRules(run));
    return cellsOf(p).filter(([x, y]) => !hidden.has(`${x},${y}`)).length * 10;
  }
  if (d.smell > 0 && d.kind === 'contra') return (effectiveSmell([...others, p], inspectionRules(run)).get(p.uid) ?? 0) * 5;
  if (d.mask) {
    const smelly = others.filter((o) => def(o).kind === 'contra' && def(o).smell > 0);
    return -smelly.length * 3 + cellsOf(p).reduce((s, [x, y]) => s + x + y, 0) * 0.01;
  }
  return cellsOf(p).reduce((s, [x, y]) => s + (5 - x) + y, 0) * 0.01;
}

export function packGreedy(run: RunState): void {
  const L = layout(run);
  const order = (p: Piece) => {
    const d = def(p);
    if (d.shield) return 0;
    if (d.kind === 'contra' && d.dense) return 1;
    if (d.mask) return 2;
    if (d.kind === 'contra') return 3;
    return 4;
  };
  const todo = run.pieces.filter((p) => !isPlaced(p)).sort((a, b) => order(a) - order(b) || def(b).sell - def(a).sell);
  for (const p of todo) {
    let best: { x: number; y: number; rot: boolean; cost: number } | null = null;
    for (const rot of [false, true]) {
      for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) {
        if (!canPlace(L, run.pieces, p, x, y, rot)) continue;
        const cost = placementCost(run, run.pieces, { ...p, x, y, rot });
        if (!best || cost < best.cost) best = { x, y, rot, cost };
      }
    }
    if (best) Object.assign(p, { x: best.x, y: best.y, rot: best.rot });
  }
}

export function expectedLoss(run: RunState, laneIdx: number): number {
  const c = crossing(run);
  let loss = 0;
  for (let s = 0; s < 6; s++) {
    const r = inspect(layout(run), run.pieces, c.lanes[laneIdx], s * 977, inspectionRules(run));
    loss += r.caught.reduce((sum, u) => {
      const d = def(run.pieces.find((p) => p.uid === u)!);
      return sum + d.sell * 1.5 + (d.major ? 40 : 0);
    }, 0);
  }
  return loss / 6 + c.lanes[laneIdx].toll + (1 - c.lanes[laneIdx].priceMult) * 30;
}

