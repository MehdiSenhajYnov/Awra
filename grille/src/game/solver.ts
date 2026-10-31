// Move finder: lists playable words for a hand. Powers the balance tests, the "proofreader" hint
// and the guarantee that a fresh grid always has at least one move.
import { BLANK } from '../data/letters';
import { type Board, cellAt, checkMove } from './board';

export interface Dictionary {
  has(w: string): boolean;
  /** Words of a length, and their (length, position, letter) index; built on first use. */
  readonly byLength: Map<number, string[]>;
  readonly index: Map<string, number[]>;
}

export function buildDictionary(words: string[]): Dictionary {
  const set = new Set(words.filter(Boolean));
  let byLength: Map<number, string[]> | null = null;
  let index: Map<string, number[]> | null = null;
  const build = () => {
    byLength = new Map();
    for (const w of set) {
      if (!byLength.has(w.length)) byLength.set(w.length, []);
      byLength.get(w.length)!.push(w);
    }
    index = new Map();
    for (const [len, list] of byLength) {
      list.forEach((w, i) => {
        for (let p = 0; p < w.length; p++) {
          const key = `${len}:${p}:${w[p]}`;
          let arr = index!.get(key);
          if (!arr) index!.set(key, (arr = []));
          arr.push(i);
        }
      });
    }
  };
  return {
    has: (w) => set.has(w),
    get byLength() { if (!byLength) build(); return byLength!; },
    get index() { if (!index) build(); return index!; },
  };
}

export interface FoundMove {
  word: string;
  tiles: { x: number; y: number; letter: string; blankFor?: string }[];
}

function fits(word: string, pattern: (string | null)[], hand: Map<string, number>, blanks: number): string[] | null {
  const need = new Map(hand);
  let free = blanks;
  const blankFor: string[] = [];
  for (let i = 0; i < word.length; i++) {
    if (pattern[i]) {
      if (pattern[i] !== word[i]) return null;
      continue;
    }
    const n = need.get(word[i]) ?? 0;
    if (n > 0) need.set(word[i], n - 1);
    else if (free > 0) { free--; blankFor.push(word[i]); }
    else return null;
  }
  return blankFor;
}

/** Every legal move for a hand, up to `limit` (best-effort, longest lines first). */
export function findMoves(board: Board, hand: string[], dict: Dictionary, limit = 400, minLength = 2): FoundMove[] {
  const counts = new Map<string, number>();
  let blanks = 0;
  for (const l of hand) {
    if (l === BLANK) blanks++;
    else counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  const out: FoundMove[] = [];
  const seen = new Set<string>();
  for (const dir of ['h', 'v'] as const) {
    for (let line = 0; line < board.size; line++) {
      const cells = Array.from({ length: board.size }, (_, i) => (dir === 'h' ? cellAt(board, i, line)! : cellAt(board, line, i)!));
      for (let start = 0; start < board.size; start++) {
        if (cells[start].black) continue;
        if (start > 0 && !cells[start - 1].black && cells[start - 1].letter) continue;
        for (let len = Math.max(2, minLength); start + len <= board.size; len++) {
          const seg = cells.slice(start, start + len);
          if (seg.some((c) => c.black)) break;
          const after = cells[start + len];
          if (after && !after.black && after.letter) continue;
          const pattern = seg.map((c) => c.letter);
          const empties = pattern.filter((p) => !p).length;
          if (!pattern.some(Boolean) || !empties || empties > hand.length) continue;
          const list = dict.byLength.get(len);
          if (!list) continue;
          // Narrow with the rarest fixed letter.
          let candidates: number[] | null = null;
          pattern.forEach((p, i) => {
            if (!p) return;
            const idx = dict.index.get(`${len}:${i}:${p}`) ?? [];
            if (!candidates || idx.length < candidates.length) candidates = idx;
          });
          for (const wi of candidates ?? []) {
            const word = list[wi];
            const blankFor = fits(word, pattern, counts, blanks);
            if (!blankFor) continue;
            const tiles: FoundMove['tiles'] = [];
            const left = new Map(counts);
            seg.forEach((c, i) => {
              if (c.letter) return;
              const x = dir === 'h' ? start + i : line;
              const y = dir === 'h' ? line : start + i;
              const n = left.get(word[i]) ?? 0;
              if (n > 0) left.set(word[i], n - 1);
              tiles.push({ x, y, letter: word[i], blankFor: n > 0 ? undefined : word[i] });
            });
            const key = `${dir}${line}:${start}:${word}`;
            if (seen.has(key)) continue;
            const check = checkMove(board, tiles.map((t) => ({ x: t.x, y: t.y, letter: t.letter, blank: !!t.blankFor })), dict.has, minLength);
            if (!check.ok) continue;
            seen.add(key);
            out.push({ word, tiles });
            if (out.length >= limit) return out;
          }
        }
      }
    }
  }
  return out;
}
