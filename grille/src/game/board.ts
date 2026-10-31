import { type Lang, RARE, VALUES, VOWELS } from '../data/letters';
import { Rng } from './rng';

export interface Cell {
  black: boolean;
  letter: string | null;
  /** Placed from a blank tile: shows the letter, scores nothing. */
  blank: boolean;
}

export interface Board {
  size: number;
  cells: Cell[][];
}

export type Dir = 'h' | 'v';

export interface Placement {
  x: number;
  y: number;
  letter: string;
  blank: boolean;
}

export interface Word {
  text: string;
  dir: Dir;
  cells: { x: number; y: number; letter: string; fresh: boolean; blank: boolean }[];
  /** Letters that were already on the board. */
  crossings: number;
}

export const cellAt = (b: Board, x: number, y: number): Cell | null =>
  x < 0 || y < 0 || x >= b.size || y >= b.size ? null : b.cells[y][x];

/** A crossword-like board: symmetric black squares, a starting word across the middle. */
export function makeBoard(rng: Rng, size: number, seedWord: string): Board {
  const cells: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ black: false, letter: null, blank: false })));
  const mid = Math.floor(size / 2);
  const start = Math.floor((size - seedWord.length) / 2);
  const reserved = (x: number, y: number) => y === mid && x >= start - 1 && x <= start + seedWord.length;
  const blacks = Math.round(size * size * 0.1);
  for (let tries = 0, placed = 0; placed < blacks && tries < 400; tries++) {
    const x = rng.int(0, size - 1);
    const y = rng.int(0, size - 1);
    const [sx, sy] = [size - 1 - x, size - 1 - y];
    if (reserved(x, y) || reserved(sx, sy) || cells[y][x].black) continue;
    // Keep black squares apart so every white cell stays reachable.
    const near = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]
      .some(([dx, dy]) => cellAt({ size, cells }, x + dx, y + dy)?.black);
    if (near) continue;
    cells[y][x].black = true;
    cells[sy][sx].black = true;
    placed += x === sx && y === sy ? 1 : 2;
  }
  for (let i = 0; i < seedWord.length; i++) cells[mid][start + i].letter = seedWord[i];
  // Make sure the starting word's ends are blocked so it reads as one word.
  if (start - 1 >= 0) cells[mid][start - 1].black = true;
  if (start + seedWord.length < size) cells[mid][start + seedWord.length].black = true;
  return { size, cells };
}

function letterAt(b: Board, placed: Map<string, Placement>, x: number, y: number): { letter: string; fresh: boolean; blank: boolean } | null {
  const p = placed.get(`${x},${y}`);
  if (p) return { letter: p.letter, fresh: true, blank: p.blank };
  const c = cellAt(b, x, y);
  if (!c || c.black || !c.letter) return null;
  return { letter: c.letter, fresh: false, blank: c.blank };
}

function wordThrough(b: Board, placed: Map<string, Placement>, x: number, y: number, dir: Dir): Word {
  const [dx, dy] = dir === 'h' ? [1, 0] : [0, 1];
  let sx = x;
  let sy = y;
  while (letterAt(b, placed, sx - dx, sy - dy)) { sx -= dx; sy -= dy; }
  const cells: Word['cells'] = [];
  for (let cx = sx, cy = sy; ; cx += dx, cy += dy) {
    const l = letterAt(b, placed, cx, cy);
    if (!l) break;
    cells.push({ x: cx, y: cy, ...l });
  }
  return { text: cells.map((c) => c.letter).join(''), dir, cells, crossings: cells.filter((c) => !c.fresh).length };
}

export type MoveError = 'empty' | 'occupied' | 'line' | 'gap' | 'cross' | 'unknown' | 'short';

export interface MoveCheck {
  ok: boolean;
  error?: MoveError;
  badWord?: string;
  main?: Word;
  extra: Word[];
}

/** Checks a set of new letters: one line, no gaps, crossing the grid, every word real. */
export function checkMove(b: Board, tiles: Placement[], isWord: (w: string) => boolean, minLength = 2, tolerateOne = false): MoveCheck {
  if (!tiles.length) return { ok: false, error: 'empty', extra: [] };
  for (const t of tiles) {
    const c = cellAt(b, t.x, t.y);
    if (!c || c.black || c.letter) return { ok: false, error: 'occupied', extra: [] };
  }
  const sameRow = tiles.every((t) => t.y === tiles[0].y);
  const sameCol = tiles.every((t) => t.x === tiles[0].x);
  if (!sameRow && !sameCol) return { ok: false, error: 'line', extra: [] };
  const placed = new Map(tiles.map((t) => [`${t.x},${t.y}`, t]));
  let dir: Dir = sameRow && !sameCol ? 'h' : !sameRow && sameCol ? 'v' : 'h';
  if (tiles.length === 1) {
    const h = wordThrough(b, placed, tiles[0].x, tiles[0].y, 'h');
    const v = wordThrough(b, placed, tiles[0].x, tiles[0].y, 'v');
    dir = v.cells.length > h.cells.length ? 'v' : 'h';
  }
  const main = wordThrough(b, placed, tiles[0].x, tiles[0].y, dir);
  if (!tiles.every((t) => main.cells.some((c) => c.x === t.x && c.y === t.y))) return { ok: false, error: 'gap', extra: [] };
  if (main.crossings === 0) return { ok: false, error: 'cross', extra: [] };
  if (main.cells.length < minLength) return { ok: false, error: 'short', extra: [] };
  const extra: Word[] = [];
  for (const t of tiles) {
    const w = wordThrough(b, placed, t.x, t.y, dir === 'h' ? 'v' : 'h');
    if (w.cells.length >= 2) extra.push(w);
  }
  let tolerated = false;
  for (const w of [main, ...extra]) {
    if (isWord(w.text)) continue;
    if (tolerateOne && !tolerated) { tolerated = true; continue; }
    return { ok: false, error: 'unknown', badWord: w.text, main, extra };
  }
  return { ok: true, main, extra };
}

export function commit(b: Board, tiles: Placement[]): void {
  for (const t of tiles) {
    b.cells[t.y][t.x].letter = t.letter;
    b.cells[t.y][t.x].blank = t.blank;
  }
}

export function letterValue(lang: Lang, letter: string, blank: boolean): number {
  return blank ? 0 : VALUES[lang][letter] ?? 0;
}

export const isVowel = (l: string) => VOWELS.has(l);
export const isRare = (l: string) => RARE.has(l);

/** Every empty cell from which some single letter could extend the grid: used by tests and hints. */
export function openCells(b: Board): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < b.size; y++) for (let x = 0; x < b.size; x++) {
    const c = b.cells[y][x];
    if (c.black || c.letter) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => cellAt(b, x + dx, y + dy)?.letter)) out.push([x, y]);
  }
  return out;
}
