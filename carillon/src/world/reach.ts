import { TILE, overlap } from '../engine/core';
import { type Ability, type Controls, NO_CONTROLS, Player } from '../game/player';
import { type Room, type RoomDef, T, buildRoom, isSolid, roomSize, tileAt } from './room';
import { ROOMS, bounds, roomAt, roomDef } from './world';

// Proves the world can be completed: it moves the real player physics through every room with scripted
// manoeuvres (walk, jumps of several heights, dashes, double jumps, wall climbs, grapples) and follows the
// abilities in the order the bosses give them.

export interface Progress {
  abilities: Set<Ability>;
  bosses: Set<string>;
}

type Side = 'l' | 'r' | 'u' | 'd';

interface Start {
  x: number;
  y: number;
  vy: number;
}

export interface RoomReach {
  exits: Set<string>;
  /** Indices of `def.ents` the player can touch. */
  ents: Set<number>;
}

const GREAT = ['dechu', 'gargouille', 'mere', 'souffleur', 'jumeaux', 'cantatrice', 'noye', 'echappement'];

/** Builds the room as the checker sees it: puzzles are solvable when their ability is owned. */
export function checkerRoom(def: RoomDef, prog: Progress): Room {
  const flags: Record<string, boolean> = {};
  (def.brk ?? []).forEach((_, i) => { flags[`${def.id}:brk${i}`] = true; });
  if (prog.abilities.has('slam')) (def.slam ?? []).forEach((_, i) => { flags[`${def.id}:slam${i}`] = true; });
  for (const g of def.gate ?? []) {
    const f = g[4];
    if (f.startsWith('has_')) flags[f] = prog.abilities.has(f.slice(4) as Ability);
    else if (f.startsWith('boss_')) flags[f] = prog.bosses.has(f.slice(5));
    else if (f === 'bourdon_open') flags[f] = GREAT.every((b) => prog.bosses.has(b));
    else flags[f] = prog.abilities.has('echo');
  }
  const room = buildRoom(def, flags);
  const set = (rects: [number, number, number, number][], t: T) => {
    for (const [x, y, w, h] of rects) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) room.tiles[yy * room.w + xx] = t;
  };
  for (const [k, x, y, o] of def.ents ?? []) {
    const opts = (o ?? {}) as Record<string, unknown>;
    if (k === 'plate' && !prog.abilities.has('echo')) set(opts.bars as [number, number, number, number][], T.Gate);
    if (k === 'bell' && opts.timed && !prog.abilities.has('swap')) set(opts.bars as [number, number, number, number][], T.Gate);
    // Moving platforms and ledges that crumble count as platforms at both ends of their travel.
    if (k === 'mover' || k === 'crumble') {
      const w = (opts.w as number) ?? 3;
      const ends: [number, number][] = [[x, y], [x + ((opts.dx as number) ?? 0), y + ((opts.dy as number) ?? 0)]];
      for (const [ex, ey] of ends) for (let i = 0; i < w; i++) {
        const tx = Math.round(ex + i);
        if (tx >= 0 && tx < room.w && ey >= 0 && ey < room.h && room.tiles[ey * room.w + tx] === T.Empty) room.tiles[ey * room.w + tx] = T.Platform;
      }
    }
    void x;
  }
  return room;
}

function entryStart(def: RoomDef, side: Side, span: [number, number]): Start {
  const [w, h] = roomSize(def);
  const mid = ((span[0] + span[1] + 1) / 2) * TILE;
  if (side === 'l') return { x: 14, y: (span[1] + 1) * TILE, vy: 0 };
  if (side === 'r') return { x: w * TILE - 14, y: (span[1] + 1) * TILE, vy: 0 };
  if (side === 'u') return { x: mid, y: 34, vy: 2 };
  return { x: mid, y: h * TILE - 4, vy: -9 };
}

interface Macro {
  dir: number;
  hold: number;
  dash?: number;
  double?: number;
  /** Wall climbing: 'away' crosses chimneys wall to wall, 'back' returns to the same wall. */
  climb?: 'away' | 'back';
  grapple?: number;
  chain?: boolean;
  drop?: boolean;
}

function macros(a: Set<Ability>): Macro[] {
  const list: Macro[] = [];
  for (const dir of [-1, 0, 1]) {
    for (const hold of [0, 7, 40]) list.push({ dir, hold });
    if (a.has('dash') && dir) for (const dash of [8, 18]) list.push({ dir, hold: 40, dash });
    if (a.has('double')) for (const double of [12, 22]) {
      list.push({ dir, hold: 40, double });
      if (a.has('dash') && dir) list.push({ dir, hold: 40, double, dash: double + 10 });
    }
    if (a.has('walljump')) { list.push({ dir, hold: 40, climb: 'away' }); list.push({ dir, hold: 40, climb: 'back' }); }
    if (a.has('grapple')) { for (const g of [4, 14]) list.push({ dir, hold: 40, grapple: g }); list.push({ dir, hold: 40, chain: true }); }
    list.push({ dir, hold: 0, drop: true });
  }
  return list;
}

interface Winds { x: number; y: number; w: number; h: number; s: number }

function windsOf(def: RoomDef): Winds[] {
  return (def.ents ?? []).filter((e) => e[0] === 'wind').map(([, x, y, o]) => {
    const opts = (o ?? {}) as Record<string, number>;
    const w = (opts.w ?? 2) * TILE;
    const h = (opts.h ?? 8) * TILE;
    return { x: x * TILE, y: (y + 1) * TILE - h, w, h, s: opts.s ?? 0.95 };
  });
}

function anchorsOf(def: RoomDef): { x: number; y: number }[] {
  return (def.ents ?? []).filter((e) => e[0] === 'anchor').map(([, x, y]) => ({ x: x * TILE + TILE / 2, y: (y + 1) * TILE - 11 }));
}

/** Runs one manoeuvre from a position; reports ground tiles touched and how it left the room. */
function simulate(room: Room, def: RoomDef, prog: Progress, start: Start, m: Macro | null, onGround: (tx: number, ty: number) => void, onTouch: (tx: number, ty: number) => void = () => undefined): Side | null {
  const p = new Player();
  p.abilities = new Set(prog.abilities);
  p.place(start.x, start.y);
  p.body.vy = start.vy;
  if (start.vy === 0) { p.body.onGround = true; p.coyote = 6; }
  const winds = windsOf(def);
  const anchors = anchorsOf(def);
  const W = room.w * TILE;
  const H = room.h * TILE;
  let airborne = start.vy !== 0;
  let towardWall = 0;
  for (let f = 0; f < 170; f++) {
    const c: Controls = { ...NO_CONTROLS };
    if (m) {
      c.x = m.dir;
      if (m.drop) {
        c.y = f < 3 ? 1 : 0;
        c.jumpPressed = f === 1;
      } else {
        c.jumpPressed = f === 0 && m.hold > 0;
        c.jumpHeld = f < m.hold;
      }
      if (m.dash !== undefined && f === m.dash) c.dashPressed = true;
      if (m.double !== undefined && f === m.double) { c.jumpPressed = true; c.jumpHeld = true; }
      if (m.double !== undefined && f > m.double && f < m.double + 30) c.jumpHeld = true;
      if (m.grapple !== undefined && f === m.grapple) { c.dashPressed = true; c.y = -1; }
      if (m.chain && f > 3 && !p.grapple && !p.body.onGround && f % 3 === 0) c.dashPressed = true;
      if (m.climb && f > 2 && !p.body.onGround && p.body.wall !== 0) {
        towardWall = p.body.wall;
        if (p.wallLock === 0) { c.jumpPressed = true; c.jumpHeld = true; }
      }
      if (m.climb && towardWall && !p.body.onGround) {
        c.x = m.climb === 'back' && p.wallLock === 0 ? towardWall : -towardWall;
        c.jumpHeld = true;
      }
    }
    p.update(room, c, anchors);
    for (const w of winds) {
      if (overlap(w, p.box()) && p.dashT === 0 && !p.grapple) {
        p.body.vy = Math.max(-6.5, p.body.vy - w.s);
        p.airDashUsed = false;
      }
    }
    if (p.hurtT > 0 || touchesHazardTile(room, p)) return null;
    const b = p.body;
    onTouch(Math.floor((b.x + b.w / 2) / TILE), Math.floor((b.y + b.h / 2) / TILE));
    if (b.x + b.w / 2 < 0) return 'l';
    if (b.x + b.w / 2 > W) return 'r';
    if (b.y + b.h / 2 < 0) return 'u';
    if (b.y + b.h / 2 > H) return 'd';
    if (b.onGround) {
      onGround(Math.floor((b.x + b.w / 2) / TILE), Math.round((b.y + b.h) / TILE));
      if (airborne && f > 2) return null;
    } else airborne = true;
  }
  return null;
}

function touchesHazardTile(room: Room, p: Player): boolean {
  const b = p.body;
  const x0 = Math.floor((b.x + 3) / TILE);
  const x1 = Math.floor((b.x + b.w - 3) / TILE);
  const y0 = Math.floor((b.y + 3) / TILE);
  const y1 = Math.floor((b.y + b.h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = tileAt(room, tx, ty);
    if (t === T.Spikes || t === T.Ink || t === T.Water) return true;
  }
  return false;
}

/** Everything reachable inside a room from one entry. */
export function reachRoom(def: RoomDef, prog: Progress, entry: Side | 'spawn', span?: [number, number]): RoomReach {
  const room = checkerRoom(def, prog);
  const exits = new Set<string>();
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  const visit = (tx: number, ty: number) => {
    const k = `${tx},${ty}`;
    if (seen.has(k)) return;
    seen.add(k);
    queue.push([tx, ty]);
  };
  const exitOf = (side: Side | null, x: number, y: number) => {
    if (!side) return;
    // Which opening of that side was used?
    const spans = def.exits[side] ?? [];
    const coord = side === 'l' || side === 'r' ? Math.floor(y / TILE) : Math.floor(x / TILE);
    let best = 0;
    let bestD = Infinity;
    spans.forEach((s, i) => { const d = coord < s[0] ? s[0] - coord : coord > s[1] ? coord - s[1] : 0; if (d < bestD) { bestD = d; best = i; } });
    exits.add(`${side}${best}`);
  };
  const start: Start = entry === 'spawn' ? spawnStart(def) : entryStart(def, entry, span!);
  const ms = macros(prog.abilities);
  const touched = new Set<string>();
  const runFrom = (s: Start, m: Macro | null) => {
    let last = { x: s.x, y: s.y };
    const pending: string[] = [];
    const side = simulate(room, def, prog, s, m, (tx, ty) => { visit(tx, ty); last = { x: tx * TILE, y: ty * TILE }; }, (tx, ty) => pending.push(`${tx},${ty}`));
    // Air positions count only for manoeuvres that end safely.
    if (side || pending.length) for (const k of pending) touched.add(k);
    exitOf(side, last.x, last.y);
  };
  runFrom(start, null);
  if (entry === 'u' || entry === 'd') for (const dir of [-1, 1]) runFrom(start, { dir, hold: 0 });
  // Explore ground tiles; walking along a floor connects neighbouring tiles, so every other tile is enough.
  let guard = 0;
  while (queue.length && guard++ < 4000) {
    const [tx, ty] = queue.shift()!;
    const s: Start = { x: tx * TILE + TILE / 2, y: ty * TILE, vy: 0 };
    const left = isSolid(tileAt(room, tx - 1, ty - 1)) || !isGround(room, tx - 1, ty);
    const right = isSolid(tileAt(room, tx + 1, ty - 1)) || !isGround(room, tx + 1, ty);
    if (tx % 2 !== 0 && !left && !right) {
      // Mid-floor odd tile: walking reaches the neighbours anyway.
      visit(tx - 1, ty);
      visit(tx + 1, ty);
      continue;
    }
    for (const m of ms) runFrom(s, m);
  }
  // While its keeper lives, an arena locks behind the player: the fight is the only way on.
  const arena = (def.ents ?? []).find((e) => e[0] === 'arena');
  if (arena && !prog.bosses.has((arena[3] as { boss: string }).boss)) exits.clear();
  if (process.env.REACH_DEBUG === def.id) console.log('seen', [...seen].join(' '));
  const ents = new Set<number>();
  (def.ents ?? []).forEach(([, ex, ey], i) => {
    for (const k of touched) {
      const [tx, ty] = k.split(',').map(Number);
      if (Math.abs(tx - ex) <= 1 && Math.abs(ty - ey) <= 1) { ents.add(i); return; }
    }
    for (const k of seen) {
      const [tx, ty] = k.split(',').map(Number);
      if (Math.abs(tx - ex) <= 2 && ty - (ey + 1) <= 1 && (ey + 1) - ty <= 4) { ents.add(i); break; }
    }
  });
  return { exits, ents };
}

function isGround(room: Room, tx: number, ty: number): boolean {
  const t = tileAt(room, tx, ty);
  return isSolid(t) || t === T.Platform;
}

function spawnStart(def: RoomDef): Start {
  const lectern = (def.ents ?? []).find((e) => e[0] === 'lectern');
  const [, lx, ly] = lectern ?? ['', 3, 14];
  return { x: lx * TILE + TILE / 2 + 24, y: (ly + 1) * TILE, vy: 0 };
}

/** Follows the progression from the first lectern; returns what was reached at the end. */
export function playthrough(log: string[] = [], ban: Ability | null = null): { prog: Progress; rooms: Set<string>; items: Set<string>; missing: string[] } {
  const prog: Progress = { abilities: new Set(), bosses: new Set() };
  const reachedItems = new Set<string>();
  const ITEMS = new Set(['shard', 'vessel', 'tin', 'page', 'note', 'ability', 'key', 'slot']);
  let changed = true;
  let rooms = new Set<string>();
  let round = 0;
  const cache = new Map<string, RoomReach>();
  while (changed && round++ < 20) {
    changed = false;
    rooms = new Set();
    const key = (id: string, e: string) => `${id}|${e}|${[...prog.abilities].sort().join()}|${[...prog.bosses].sort().join()}`;
    const visited = new Set<string>();
    const queue: [string, Side | 'spawn', [number, number] | undefined][] = [['b_cloche', 'spawn', undefined]];
    while (queue.length) {
      const [id, entry, span] = queue.shift()!;
      const vk = `${id}|${entry}|${span}`;
      if (visited.has(vk)) continue;
      visited.add(vk);
      rooms.add(id);
      const def = roomDef(id);
      const ck = key(id, vk);
      let r = cache.get(ck);
      if (!r) { r = reachRoom(def, prog, entry, span); cache.set(ck, r); }
      // Items, abilities and bosses in reach.
      for (const i of r.ents) {
        const [k, , , o] = def.ents![i];
        const opts = (o ?? {}) as Record<string, string>;
        if (ITEMS.has(k)) {
          const id2 = `${def.id}:${i}`;
          if (!reachedItems.has(id2)) reachedItems.add(id2);
          if (k === 'ability' && opts.value !== ban && !prog.abilities.has(opts.value as Ability)) { prog.abilities.add(opts.value as Ability); changed = true; log.push(`+${opts.value} (${def.id})`); }
        }
        if (k === 'arena' && !prog.bosses.has(opts.boss)) {
          prog.bosses.add(opts.boss);
          changed = true;
          log.push(`boss ${opts.boss} (${def.id})`);
          const reward: Record<string, Ability> = { dechu: 'dash', gargouille: 'walljump', mere: 'swap', souffleur: 'double', jumeaux: 'slam', cantatrice: 'grapple' };
          if (reward[opts.boss] && reward[opts.boss] !== ban) { prog.abilities.add(reward[opts.boss]); log.push(`+${reward[opts.boss]}`); }
        }
      }
      // Leave through the openings reached.
      for (const e of r.exits) {
        const side = e[0] as Side;
        const sp = def.exits[side]![Number(e.slice(1))];
        const b = bounds(def);
        const gx = side === 'l' ? b.x - 1 : side === 'r' ? b.x + b.w : b.x + sp[0];
        const gy = side === 'u' ? b.y - 1 : side === 'd' ? b.y + b.h : b.y + sp[0];
        const n = roomAt(gx, gy);
        if (!n) continue;
        const nb = bounds(n);
        const back = ({ l: 'r', r: 'l', u: 'd', d: 'u' } as const)[side];
        const local: [number, number] = side === 'l' || side === 'r' ? [b.y + sp[0] - nb.y, b.y + sp[1] - nb.y] : [b.x + sp[0] - nb.x, b.x + sp[1] - nb.x];
        queue.push([n.id, back, local]);
      }
    }
  }
  const missing: string[] = [];
  for (const def of ROOMS) {
    if (!rooms.has(def.id)) missing.push(`room ${def.id}`);
    (def.ents ?? []).forEach(([k], i) => { if (ITEMS.has(k) && !reachedItems.has(`${def.id}:${i}`)) missing.push(`${def.id}: ${k} #${i}`); });
  }
  return { prog, rooms, items: reachedItems, missing };
}
