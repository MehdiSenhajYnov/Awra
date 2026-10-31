import { type Layout, type Piece, def, footprint, isPlaced } from '../game/bag';
import { h } from './dom';

/** Builds the visual of one item: the picture lies flat and turns a quarter when the piece is rotated. */
export function pieceEl(p: Piece, cell: number): HTMLElement {
  const d = def(p);
  const [fw, fh] = footprint(p);
  const art = h('img.piece-art', { src: `img/it_${d.id}.webp`, alt: '', draggable: 'false' });
  art.style.width = `${d.w * cell - 8}px`;
  art.style.height = `${d.h * cell - 8}px`;
  if (p.rot) art.classList.add('rot');
  const badges = h('div.badges', {},
    d.major ? h('span.badge.major', { title: 'dossier' }, '★') : null,
    d.dense ? h('span.badge.dense', {}, '▣') : null,
    d.smell ? h('span.badge.smell', {}, '~'.repeat(d.smell)) : null,
    d.shield ? h('span.badge.shield', {}, 'Pb') : null,
    d.mask ? h('span.badge.mask', {}, `−${d.mask.power}`) : null);
  const el = h(`div.piece.k-${d.kind}` as 'div', { 'data-uid': p.uid }, art, badges);
  el.style.width = `${fw * cell}px`;
  el.style.height = `${fh * cell}px`;
  return el;
}

export interface BagView {
  el: HTMLElement;
  cells: Map<string, HTMLElement>;
  pieces: Map<number, HTMLElement>;
  cell: number;
  render(pieces: Piece[]): void;
}

export function bagView(layout: Layout, cell: number): BagView {
  const grid = h('div.grid');
  grid.style.width = `${layout.cols * cell}px`;
  grid.style.height = `${layout.rows * cell}px`;
  grid.style.setProperty('--cell', `${cell}px`);
  const cells = new Map<string, HTMLElement>();
  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      const c = h('div.cell');
      c.style.left = `${x * cell}px`;
      c.style.top = `${y * cell}px`;
      if (layout.falseBottom && y === layout.rows - 1) c.classList.add('false-bottom');
      if (layout.bellows && x >= layout.bellows[0] && x <= layout.bellows[1]) c.classList.add('bellows');
      cells.set(`${x},${y}`, c);
      grid.append(c);
    }
  }
  const layer = h('div.piece-layer');
  grid.append(layer);
  const view: BagView = {
    el: grid,
    cells,
    pieces: new Map(),
    cell,
    render(pieces: Piece[]) {
      layer.replaceChildren();
      view.pieces.clear();
      for (const p of pieces.filter(isPlaced)) {
        const el = pieceEl(p, cell);
        el.style.left = `${p.x * cell}px`;
        el.style.top = `${p.y * cell}px`;
        layer.append(el);
        view.pieces.set(p.uid, el);
      }
    },
  };
  return view;
}
