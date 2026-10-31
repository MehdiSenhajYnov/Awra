import { audio } from '../audio';
import { MAX_INKS, MAX_PENS } from '../data/content';
import { BLANK, VALUES } from '../data/letters';
import { cellAt } from '../game/board';
import {
  type RunState, type Scored, discard, forbidden, play, refill, useInk,
} from '../game/run';
import { findMoves, type Dictionary } from '../game/solver';
import { L, fmt, num } from '../i18n';
import { saveRun } from '../save';
import { settings } from '../settings';
import { button, fill, h, onKeys, show, wait } from './dom';
import { openPause } from './pause';

interface Pending {
  tileId: number;
  x: number;
  y: number;
  letter: string;
  blank: boolean;
}

/** One grid: type words into the crossword until the target is reached or the words run out. */
export function showGrid(run: RunState, dict: Dictionary, onEnd: () => void): void {
  const t = L();
  const g = run.grid!;
  const size = g.board.size;
  const cellPx = size > 9 ? 52 : 62;
  let cursor = { x: Math.floor(size / 2), y: Math.floor(size / 2), dir: 'v' as 'h' | 'v' };
  let pending: Pending[] = [];
  let order = g.hand.map((tile) => tile.id);
  let discarding: Set<number> | null = null;
  let busy = false;
  let hintCell: [number, number] | null = null;
  let inkPick: { index: number; tileId: number | null } | null = null;

  // ---------- layout ----------
  const masthead = h('header.masthead');
  const board = h('div.board', { style: `--cell:${cellPx}px;--n:${size}` });
  const cells: HTMLElement[][] = [];
  for (let y = 0; y < size; y++) {
    cells.push([]);
    for (let x = 0; x < size; x++) {
      const c = h('div.cell', { onclick: () => clickCell(x, y) });
      cells[y].push(c);
      board.append(c);
    }
  }
  const message = h('div.message');
  const hand = h('div.hand');
  const actions = h('div.actions');
  const left = h('aside.left');
  const defsEl = h('section.defs');
  const breakdown = h('section.breakdown');
  const right = h('aside.right', {}, defsEl, breakdown);
  const center = h('section.center', {}, board, message, hand, actions);
  const scene = h('div.scene.paper', {}, masthead, left, center, right);
  show(scene);
  audio.track('cafe');

  const handLetter = (id: number) => g.hand.find((tile) => tile.id === id)!.letter;
  const usedIds = () => new Set(pending.map((p) => p.tileId));

  // ---------- render ----------
  const renderMasthead = () => {
    const day = t.days[run.gridIdx];
    masthead.replaceChildren(
      h('div.mast-left', {}, run.endless ? fmt(t.hud.endless, { e: run.edition }) : fmt(t.hud.edition, { e: run.edition }), h('span.day', {}, ` · ${day}`)),
      h('h1.mast-title', {}, 'L’Écho du Soir'),
      h('div.mast-right', {}, fmt(t.hud.francs, { n: run.francs }), h('button.pause-btn', { onclick: () => openPause(run), title: t.hud.pause }, '❚❚')));
  };

  const renderLeft = () => {
    const pct = Math.min(100, (g.score / g.target) * 100);
    fill(left, 
      g.boss ? h('div.boss', {}, h('strong', {}, t.bosses[g.boss].name), h('span', {}, t.bosses[g.boss].desc)) : null,
      h('div.scoreboard', {},
        h('div.label', {}, t.hud.target), h('div.target', {}, num(g.target)),
        h('div.label', {}, t.hud.score), h('div.score', {}, num(g.score)),
        h('div.bar', {}, h('div.fill', { style: `width:${pct}%` }))),
      h('div.counters', {},
        h('div', {}, h('span.label', {}, t.hud.words), h('span.big', {}, String(g.wordsLeft))),
        h('div', {}, h('span.label', {}, t.hud.discards), h('span.big', {}, String(g.discardsLeft)))),
      h('p.bag', {}, fmt(t.hud.lettersLeft, { n: g.bag.length })),
      h('h3', {}, `${t.hud.pens} (${run.pens.length}/${MAX_PENS})`),
      h('div.pens', {}, ...run.pens.map((p) => h('div.pen', { title: t.pens[p].desc }, h('strong', {}, t.pens[p].name), h('span', {}, t.pens[p].desc)))),
      h('h3', {}, `${t.hud.inks} (${run.inks.length}/${MAX_INKS})`),
      h('div.inks', {}, ...run.inks.map((id, i) => h('div.ink', {},
        h('div', {}, h('strong', {}, t.inks[id].name), h('span', {}, t.inks[id].desc)),
        button(t.hud.useInk, () => applyInk(i), 'small')))));
  };

  const renderDefs = () => {
    if (!g.defs.length) {
      defsEl.replaceChildren(h('h2', {}, t.hud.definitions), h('p.muted', {}, t.hud.noDefinitions));
      return;
    }
    defsEl.replaceChildren(h('h2', {}, t.hud.definitions), ...g.defs.map((d, i) => h(`div.def${d.solved ? '.solved' : ''}` as 'div', {},
      h('span.def-n', {}, String(i + 1)),
      h('div', {},
        h('p.clue', {}, d.clue),
        h('div.boxes', {}, ...d.answer.split('').map((ch, j) => h('span.box', {}, d.solved || j < d.revealed ? ch : ''))),
        d.solved ? h('span.solved-stamp', {}, t.hud.solved) : null))));
  };

  const renderBoard = () => {
    const placed = new Map(pending.map((p) => [`${p.x},${p.y}`, p]));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const c = g.board.cells[y][x];
      const el = cells[y][x];
      const p = placed.get(`${x},${y}`);
      el.className = 'cell';
      if (c.black) { el.classList.add('black'); el.textContent = ''; continue; }
      const letter = p?.letter ?? c.letter ?? '';
      el.textContent = letter;
      if (p) el.classList.add('pending');
      if ((p?.blank ?? c.blank) && letter) el.classList.add('blank');
      if (cursor.x === x && cursor.y === y) el.classList.add('cursor', cursor.dir === 'h' ? 'dir-h' : 'dir-v');
      if (hintCell && hintCell[0] === x && hintCell[1] === y) el.classList.add('hint');
      if (letter && !p) {
        const v = VALUES[run.lang][letter];
        if (v > 1 && !c.blank) el.dataset.v = String(v);
        else delete el.dataset.v;
      } else delete el.dataset.v;
    }
  };

  const renderHand = () => {
    const used = usedIds();
    order = order.filter((id) => g.hand.some((tile) => tile.id === id));
    for (const tile of g.hand) if (!order.includes(tile.id)) order.push(tile.id);
    hand.replaceChildren(...order.map((id) => {
      const letter = handLetter(id);
      const dead = forbidden(run, letter);
      const cls = ['tile', used.has(id) ? 'used' : '', dead ? 'dead' : '', discarding?.has(id) ? 'chosen' : '', inkPick?.tileId === id ? 'chosen' : '']
        .filter(Boolean).join('.');
      return h(`button.${cls}` as 'button', { onclick: () => clickTile(id) },
        h('span.tile-letter', {}, letter === BLANK ? '' : letter),
        letter === BLANK ? null : h('span.tile-value', {}, String(VALUES[run.lang][letter])));
    }));
  };

  const renderActions = () => {
    if (discarding) {
      actions.replaceChildren(
        h('span.hint-text', {}, t.hud.discardHint),
        button(fmt(t.hud.confirmDiscard, { n: discarding.size }), () => confirmDiscard(), 'primary'),
        button(t.hud.cancel, () => { discarding = null; refresh(); }, 'ghost'));
      return;
    }
    const playBtn = button(t.hud.play, () => void submit(), 'primary');
    playBtn.disabled = !pending.length || busy;
    const discardBtn = button(t.hud.discard, () => { discarding = new Set(); clearPending(); refresh(); });
    discardBtn.disabled = g.discardsLeft <= 0 || busy;
    const hintBtn = button(t.hud.hint, () => void hint());
    hintBtn.disabled = run.francs < 1 || busy;
    actions.replaceChildren(playBtn,
      button(t.hud.clear, () => { clearPending(); refresh(); }),
      button(t.hud.shuffle, () => { order = shuffled(order); audio.play('paper'); refresh(); }),
      discardBtn, hintBtn);
  };

  const refresh = () => {
    renderMasthead();
    renderLeft();
    renderDefs();
    renderBoard();
    renderHand();
    renderActions();
  };

  const say = (text: string, cls = '') => {
    message.textContent = text;
    message.className = `message ${cls}`;
  };

  // ---------- input ----------
  const empty = (x: number, y: number) => {
    const c = cellAt(g.board, x, y);
    return !!c && !c.black && !c.letter && !pending.some((p) => p.x === x && p.y === y);
  };
  const step = (x: number, y: number, sign = 1): [number, number] =>
    cursor.dir === 'h' ? [x + sign, y] : [x, y + sign];

  function clickCell(x: number, y: number) {
    if (busy || discarding) return;
    const c = g.board.cells[y][x];
    if (c.black) return;
    if (cursor.x === x && cursor.y === y) cursor.dir = cursor.dir === 'h' ? 'v' : 'h';
    else {
      // Starting somewhere else drops the half-typed word.
      if (pending.length && !pending.some((p) => p.x === x && p.y === y)) clearPending();
      cursor = { ...cursor, x, y };
    }
    audio.play('click');
    hintCell = null;
    refresh();
  }

  function placeLetter(letter: string, tileId?: number) {
    if (busy || discarding) return;
    let [x, y] = [cursor.x, cursor.y];
    while (cellAt(g.board, x, y) && !empty(x, y)) {
      const c = cellAt(g.board, x, y)!;
      if (c.black) return;
      [x, y] = step(x, y);
    }
    if (!cellAt(g.board, x, y) || cellAt(g.board, x, y)!.black) return;
    const used = usedIds();
    let id = tileId;
    if (id === undefined) {
      id = g.hand.find((tile) => tile.letter === letter && !used.has(tile.id))?.id
        ?? g.hand.find((tile) => tile.letter === BLANK && !used.has(tile.id))?.id;
    }
    if (id === undefined || used.has(id)) { audio.play('deny'); return; }
    const isBlank = handLetter(id) === BLANK;
    if (forbidden(run, letter)) { say(t.errors.censure, 'bad'); audio.play('deny'); return; }
    pending.push({ tileId: id, x, y, letter, blank: isBlank });
    audio.play('key');
    // Advance the cursor past letters already on the grid.
    let [nx, ny] = step(x, y);
    while (cellAt(g.board, nx, ny)?.letter && !cellAt(g.board, nx, ny)!.black) [nx, ny] = step(nx, ny);
    if (cellAt(g.board, nx, ny) && !cellAt(g.board, nx, ny)!.black) cursor = { ...cursor, x: nx, y: ny };
    say('');
    refresh();
  }

  function backspace() {
    const last = pending.pop();
    if (!last) return;
    cursor = { ...cursor, x: last.x, y: last.y };
    audio.play('back');
    refresh();
  }

  function clearPending() {
    if (pending.length) cursor = { ...cursor, x: pending[0].x, y: pending[0].y };
    pending = [];
  }

  function clickTile(id: number) {
    if (busy) return;
    if (inkPick) {
      inkPick.tileId = id;
      say(t.hud.pickLetter);
      refresh();
      return;
    }
    if (discarding) {
      if (discarding.has(id)) discarding.delete(id);
      else discarding.add(id);
      audio.play('click');
      refresh();
      return;
    }
    const letter = handLetter(id);
    if (usedIds().has(id)) return;
    if (letter === BLANK) {
      void pickLetter(t.hud.blankLetter).then((l) => { if (l) placeLetter(l, id); });
      return;
    }
    placeLetter(letter, id);
  }

  function confirmDiscard() {
    if (!discarding || !discarding.size) return;
    discard(run, [...discarding]);
    discarding = null;
    audio.play('paper');
    saveRun(run);
    refresh();
  }

  function applyInk(index: number) {
    if (busy) return;
    const id = run.inks[index];
    if (id === 'liquide') {
      inkPick = { index, tileId: null };
      say(t.hud.pickLetter);
      refresh();
      return;
    }
    if (useInk(run, index)) {
      audio.play('stamp');
      saveRun(run);
      refresh();
    } else audio.play('deny');
  }

  async function hint() {
    if (run.francs < 1) return;
    say(t.hud.hintLoading);
    await wait(30);
    const moves = findMoves(g.board, g.hand.map((tile) => tile.letter).filter((l) => !forbidden(run, l)), dict, 60, g.boss === 'courts' ? 4 : 2);
    run.francs -= 1;
    if (!moves.length) {
      say(t.hud.hintNone, 'bad');
    } else {
      // Point at a cell of a mid-sized word, not the answer itself.
      const m = moves.sort((a, b) => b.word.length - a.word.length)[Math.floor(moves.length / 3)];
      hintCell = [m.tiles[0].x, m.tiles[0].y];
      say(fmt(t.hud.hintFound, { n: m.word.length }));
    }
    audio.play('paper');
    saveRun(run);
    refresh();
  }

  async function submit() {
    if (busy || !pending.length) return;
    const result = play(run, pending.map((p) => ({ tileId: p.tileId, x: p.x, y: p.y, letter: p.blank ? p.letter : undefined })), dict.has);
    if (!result.ok) {
      say(fmt(t.errors[result.error as keyof typeof t.errors] ?? result.error, { w: result.badWord ?? '' }), 'bad');
      audio.play('deny');
      board.classList.remove('shake');
      void board.offsetWidth;
      board.classList.add('shake');
      return;
    }
    busy = true;
    pending = [];
    hintCell = null;
    refresh();
    await animateScore(result.scored, result.word);
    saveRun(run);
    busy = false;
    if (result.cleared || result.failed) {
      await finale(result.cleared);
      onKeys(null);
      onEnd();
      return;
    }
    refresh();
  }

  async function animateScore(s: Scored, word: string) {
    const fast = settings().fast;
    const pts = h('span.pts', {}, '0');
    const mult = h('span.mult', {}, '0');
    const list = h('ul.steps');
    const total = h('div.total');
    breakdown.replaceChildren(h('h2.word', {}, word), h('div.calc', {}, pts, h('span.x', {}, '×'), mult), list, total);
    let p = 0;
    let m = 0;
    for (const st of s.steps) {
      if (st.points) p += st.points;
      if (st.mult) m += st.mult;
      if (st.times) m *= st.times;
      const label = (t.steps as Record<string, string>)[st.key] ?? (t.pens as Record<string, { name: string }>)[st.key]?.name ?? (t.inks as Record<string, { name: string }>)[st.key]?.name ?? st.key;
      const val = st.times ? `×${fmtNum(st.times)}` : [st.points ? `+${st.points}` : '', st.mult ? `+${fmtNum(st.mult)} mult` : ''].filter(Boolean).join(' ');
      list.append(h(`li${st.key === 'definition' ? '.def-step' : ''}` as 'li', {}, h('span', {}, label), h('span', {}, val)));
      pts.textContent = String(p);
      mult.textContent = fmtNum(Math.round(m * 100) / 100);
      audio.play(st.key === 'definition' ? 'bell' : 'tick');
      await wait(fast ? 60 : 240);
    }
    total.textContent = `= ${num(s.total)}`;
    audio.play('stamp');
    if (s.definition) defsEl.classList.add('flash');
    await wait(fast ? 150 : 600);
    defsEl.classList.remove('flash');
  }

  async function finale(cleared: boolean) {
    const stamp = h(`div.big-stamp${cleared ? '' : '.late'}` as 'div', {}, cleared ? t.hud.stampWin : t.hud.stampLose);
    scene.append(stamp);
    audio.play(cleared ? 'win' : 'lose');
    await wait(1400);
  }

  function pickLetter(prompt: string): Promise<string | null> {
    return new Promise((resolve) => {
      const box = h('div.letter-picker', {}, h('p', {}, prompt));
      const grid = h('div.letters');
      const close = (l: string | null) => { box.remove(); resolve(l); };
      for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') grid.append(button(l, () => close(l), 'small'));
      box.append(grid, button(t.hud.cancel, () => close(null), 'ghost'));
      scene.append(box);
    });
  }

  onKeys((e) => {
    if (document.querySelector('.modal.open') || document.querySelector('.letter-picker')) return;
    if (inkPick && inkPick.tileId !== null && /^Key[A-Z]$/.test(e.code)) {
      const letter = e.code.slice(3);
      if (useInk(run, inkPick.index, { tileId: inkPick.tileId, letter })) { audio.play('stamp'); saveRun(run); }
      inkPick = null;
      say('');
      refresh();
      return;
    }
    if (e.code === 'Escape') {
      if (inkPick) { inkPick = null; say(''); refresh(); return; }
      if (discarding) { discarding = null; refresh(); return; }
      if (pending.length) { clearPending(); refresh(); return; }
      openPause(run);
      return;
    }
    if (busy) return;
    if (e.code === 'Enter') { e.preventDefault(); void submit(); return; }
    if (e.code === 'Backspace') { e.preventDefault(); backspace(); return; }
    if (e.code === 'Space') { e.preventDefault(); cursor.dir = cursor.dir === 'h' ? 'v' : 'h'; refresh(); return; }
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.code]) {
      e.preventDefault();
      const [dx, dy] = arrows[e.code];
      const nx = Math.max(0, Math.min(size - 1, cursor.x + dx));
      const ny = Math.max(0, Math.min(size - 1, cursor.y + dy));
      if (!g.board.cells[ny][nx].black) { clearPending(); cursor = { x: nx, y: ny, dir: dx ? 'h' : 'v' }; refresh(); }
      return;
    }
    // Letters come from e.key so AZERTY and QWERTY both type what is printed on the key.
    const key = e.key.length === 1 ? e.key.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : '';
    if (/^[A-Z]$/.test(key)) placeLetter(key);
  });

  // Test hook for tools/autoplay.mjs (dev server, or a build opened with ?autoplay).
  if (import.meta.env.DEV || location.search.includes('autoplay')) {
    (window as unknown as { __grid: unknown }).__grid = {
      best: () => {
        const moves = findMoves(g.board, g.hand.map((tile) => tile.letter).filter((l) => !forbidden(run, l) && l !== BLANK), dict, 40, g.boss === 'courts' ? 4 : 2);
        return moves.sort((a, b) => b.word.length - a.word.length)[0] ?? null;
      },
      cursor: (x: number, y: number, dir: 'h' | 'v') => { clearPending(); cursor = { x, y, dir }; refresh(); },
      submit: () => submit(),
      discardAll: () => { if (g.discardsLeft > 0) { discard(run, g.hand.map((tile) => tile.id)); refresh(); return true; } return false; },
      state: () => ({ busy, wordsLeft: g.wordsLeft, score: g.score, target: g.target }),
    };
  }

  refill(run);
  refresh();
  say(t.hud.help);
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
