import {
  DECORATIONS, LENS_COSTS, MISSION_REWARD, type MissionKind, type Rarity, SEASONS, SHIPS, SHIP_BY_ID, type Season,
  type ShipDef, UPGRADES, WEATHERS, WRECKS, WRECK_BY_ID, type Weather, BOTTLE_MESSAGES,
} from '../data/content';
import { Rng, hashSeed } from './rng';

/** One in-game day lasts 20 real minutes; a season lasts two in-game weeks (about 4 h 40). */
export const DAY = 1200;
export const SEASON_DAYS = 14;
/** Weather changes every 6 real minutes. */
export const WEATHER_SPAN = 360;
/** The game starts on a spring Monday at 8 a.m. */
const START_OFFSET = (8 / 24) * DAY;
export const OFFLINE_CAP = 12 * 3600;
/** Normalised x of the lighthouse and of the reefs on the strip (0 left, 1 right). */
export const LIGHT_X = 0.11;
export const REEF_X = 0.3;

export type Lane = 'far' | 'mid' | 'near';

export interface LiveShip {
  uid: number;
  id: string;
  x: number;
  dir: -1 | 1;
  lane: Lane;
  /** Normalised strip widths per second. */
  speed: number;
  paid: boolean;
  storm?: { progress: number; state: 'approach' | 'saved' | 'aground'; at: number };
}

export interface FloatingWreck {
  uid: number;
  id: string;
  x: number;
  lane: Lane;
  born: number;
}

export interface Mission {
  kind: MissionKind;
  target: number;
  progress: number;
  done: boolean;
}

export interface LogEntry {
  t: number;
  key: string;
  p?: Record<string, string | number>;
}

export type StormPhase = 'none' | 'warning' | 'waiting' | 'active';

export interface GameState {
  version: 1;
  seed: number;
  time: number;
  sous: number;
  earned: number;
  oil: number;
  clean: number;
  spring: number;
  lens: number;
  upgrades: Record<string, number>;
  decorations: string[];
  registry: Record<string, { count: number; first: number }>;
  wrecks: Record<string, number>;
  bottles: number;
  messagesRead: number;
  keeperName: string;
  sent: string[];
  redeemed: string[];
  ships: LiveShip[];
  floating: FloatingWreck[];
  uid: number;
  spawnCount: number;
  nextSpawn: number;
  storm: { phase: StormPhase; at: number; queue: number; saved: number; aground: number; horn: number };
  nextStorm: number;
  lastStormEnd: number;
  missions: { day: number; list: Mission[] };
  log: LogEntry[];
  stats: { seen: number; fished: number; oiled: number; saved: number; aground: number; storms: number; bottlesSent: number; bottlesReceived: number };
  honours: string[];
  completeShown: boolean;
  lastSeen: number;
}

export type GameEvent =
  | { kind: 'new'; ship: string }
  | { kind: 'ship'; ship: string; fee: number }
  | { kind: 'wreck'; wreck: string; uid: number }
  | { kind: 'fished'; wreck: string; auto: boolean }
  | { kind: 'stormWarning' }
  | { kind: 'stormWaiting' }
  | { kind: 'stormStart' }
  | { kind: 'saved'; ship: string; fee: number; bottle: boolean }
  | { kind: 'aground'; ship: string; wreck: string }
  | { kind: 'stormEnd'; saved: number; aground: number; anchored: boolean }
  | { kind: 'mission'; mission: Mission; reward: number }
  | { kind: 'honour'; id: string }
  | { kind: 'day' };

export interface TickOptions {
  /** Minutes between storms, 0 when storms are off. */
  stormEvery: number;
}

export function newGame(seed = Math.floor(Math.random() * 2 ** 31)): GameState {
  const s: GameState = {
    version: 1, seed, time: 0, sous: 0, earned: 0, oil: 100, clean: 100, spring: 100, lens: 0, upgrades: {}, decorations: [],
    registry: {}, wrecks: {}, bottles: 1, messagesRead: 0, keeperName: '', sent: [], redeemed: [], ships: [], floating: [], uid: 1,
    spawnCount: 0, nextSpawn: 4, storm: { phase: 'none', at: 0, queue: 0, saved: 0, aground: 0, horn: 0 }, nextStorm: 0,
    lastStormEnd: -9999, missions: { day: -1, list: [] }, log: [],
    stats: { seen: 0, fished: 0, oiled: 0, saved: 0, aground: 0, storms: 0, bottlesSent: 0, bottlesReceived: 0 },
    honours: [], completeShown: false, lastSeen: Date.now(),
  };
  return s;
}

// ---------- calendar ----------

export const dayIndex = (t: number) => Math.floor((t + START_OFFSET) / DAY);
export const hourOf = (t: number) => (((t + START_OFFSET) % DAY) / DAY) * 24;
export const weekday = (t: number) => dayIndex(t) % 7;
export const seasonOf = (t: number): Season => SEASONS[Math.floor(dayIndex(t) / SEASON_DAYS) % 4];
export const isNight = (t: number) => { const h = hourOf(t); return h < 6 || h >= 21; };

const SEASON_WEATHER: Record<Season, number[]> = {
  // clair, nuageux, pluie, brouillard, vent
  printemps: [4, 3, 3, 2, 2],
  ete: [7, 3, 1, 1, 2],
  automne: [2, 3, 3, 4, 3],
  hiver: [2, 3, 3, 3, 4],
};

export function weatherAt(s: GameState, t: number): Weather {
  const r = new Rng(hashSeed(s.seed, 'weather', Math.floor(t / WEATHER_SPAN)));
  const w = SEASON_WEATHER[seasonOf(t)];
  let roll = r.next() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { roll -= w[i]; if (roll < 0) return WEATHERS[i]; }
  return 'clair';
}

export const weather = (s: GameState) => weatherAt(s, s.time);
export const forecast = (s: GameState) => weatherAt(s, s.time + WEATHER_SPAN);
export const inStorm = (s: GameState) => s.storm.phase === 'waiting' || s.storm.phase === 'active';
export const level = (s: GameState, id: string) => s.upgrades[id] ?? 0;

// ---------- the light ----------

const OIL_MIN = [20, 40, 80, 160];
const SPRING_MIN = [12, 24, 48, 96];
const CLEAN_MIN = [30, 50, 80];

export function lightFactor(s: GameState): number {
  if (s.oil <= 0) return 0.25;
  return (0.4 + 0.6 * (s.clean / 100)) * (s.spring > 0 ? 1 : 0.7);
}

function decay(s: GameState, dt: number): void {
  const w = weather(s);
  const harsh = inStorm(s) || w === 'pluie' || w === 'vent' ? 2 : 1;
  s.oil = Math.max(0, s.oil - (100 / (OIL_MIN[level(s, 'reservoir')] * 60)) * dt);
  s.spring = Math.max(0, s.spring - (100 / (SPRING_MIN[level(s, 'horlogerie')] * 60)) * dt);
  s.clean = Math.max(0, s.clean - (100 / (CLEAN_MIN[level(s, 'vitres')] * 60)) * harsh * dt);
}

export function maintain(s: GameState, what: 'oil' | 'clean' | 'spring'): boolean {
  if (s[what] >= 99) return false;
  s[what] = 100;
  if (what === 'oil') { s.stats.oiled++; bumpMission(s, 'oil', 1); }
  return true;
}

// ---------- ships ----------

export function spawnInterval(s: GameState): number {
  return 40 * (level(s, 'longue_vue') ? 0.8 : 1);
}

export function shipFits(s: GameState, d: ShipDef, t: number, live = true): boolean {
  const w = weatherAt(s, t);
  if (d.night && !isNight(t)) return false;
  if (d.day && isNight(t)) return false;
  if (d.weather && !d.weather.includes(w)) return false;
  if (d.season && !d.season.includes(seasonOf(t))) return false;
  if (d.weekday !== undefined && weekday(t) !== d.weekday) return false;
  if (d.lens !== undefined && s.lens < d.lens) return false;
  if (d.afterStorm && t - s.lastStormEnd > 300) return false;
  // Legendary ships only show themselves to a keeper who is watching.
  if (d.rarity === 4 && !live) return false;
  return true;
}

const RARITY_WEIGHT: Record<Rarity, number> = { 1: 100, 2: 30, 3: 8, 4: 3 };

export function pickShip(s: GameState, t: number, r: Rng, live = true): ShipDef | null {
  const pool = SHIPS.filter((d) => shipFits(s, d, t, live));
  if (!pool.length) return null;
  const weight = (d: ShipDef) => RARITY_WEIGHT[d.rarity] * (d.rarity >= 3 ? 1 + 0.25 * s.lens : 1) * (d.weekday !== undefined ? 6 : 1);
  let roll = r.next() * pool.reduce((a, d) => a + weight(d), 0);
  for (const d of pool) { roll -= weight(d); if (roll < 0) return d; }
  return pool[pool.length - 1];
}

export function feeFor(s: GameState, d: ShipDef, t = s.time): number {
  if (d.free) return 0;
  const w = weatherAt(s, t);
  return Math.max(1, Math.round(d.fee * (1 + 0.35 * s.lens) * lightFactor(s) * (isNight(t) ? 1.2 : 1) * (w === 'brouillard' ? 1.3 : 1)));
}

function sight(s: GameState, id: string, events: GameEvent[]): void {
  const entry = s.registry[id];
  s.stats.seen++;
  bumpMission(s, 'see', 1, events);
  if (SHIP_BY_ID[id].rarity >= 2) bumpMission(s, 'new', 1, events);
  if (entry) { entry.count++; return; }
  s.registry[id] = { count: 1, first: s.time };
  addLog(s, 'logNew', { ship: id });
  events.push({ kind: 'new', ship: id });
  checkHonours(s, events);
}

function laneFor(d: ShipDef, r: Rng): Lane {
  if (d.lane) return d.lane;
  return r.chance(0.5) ? 'mid' : r.chance(0.5) ? 'near' : 'far';
}

function spawn(s: GameState, events: GameEvent[]): void {
  const r = new Rng(hashSeed(s.seed, 'spawn', s.spawnCount++));
  const d = pickShip(s, s.time, r);
  if (!d) return;
  const dir: -1 | 1 = d.id === 'baleine' || d.id === 'fantome' || r.chance(0.7) ? -1 : 1;
  s.ships.push({ uid: s.uid++, id: d.id, x: dir === -1 ? 1.12 : -0.12, dir, lane: laneFor(d, r), speed: 1.24 / d.crossing, paid: false });
  sight(s, d.id, events);
}

function earn(s: GameState, n: number): void {
  s.sous += n;
  s.earned += n;
}

const WRECK_WEIGHT: Record<Rarity, number> = { 1: 100, 2: 35, 3: 10, 4: 3 };

export function pickWreck(r: Rng, rareBoost = 1): string {
  const weight = (rarity: Rarity) => WRECK_WEIGHT[rarity] * (rarity >= 3 ? rareBoost : 1);
  let roll = r.next() * WRECKS.reduce((a, w) => a + weight(w.rarity), 0);
  for (const w of WRECKS) { roll -= weight(w.rarity); if (roll < 0) return w.id; }
  return WRECKS[0].id;
}

function dropWreck(s: GameState, x: number, lane: Lane, id: string, events: GameEvent[]): void {
  const w: FloatingWreck = { uid: s.uid++, id, x: Math.min(0.95, Math.max(0.2, x)), lane, born: s.time };
  s.floating.push(w);
  events.push({ kind: 'wreck', wreck: id, uid: w.uid });
}

function collect(s: GameState, id: string, events: GameEvent[]): void {
  s.wrecks[id] = (s.wrecks[id] ?? 0) + 1;
  s.stats.fished++;
  if (id === 'bouteille') s.bottles++;
  bumpMission(s, 'fish', 1, events);
  if (s.wrecks[id] === 1) addLog(s, 'logWreck', { wreck: id });
  checkHonours(s, events);
}

export function fish(s: GameState, uid: number): string | null {
  const i = s.floating.findIndex((w) => w.uid === uid);
  if (i < 0) return null;
  const [w] = s.floating.splice(i, 1);
  const events: GameEvent[] = [];
  collect(s, w.id, events);
  return w.id;
}

// ---------- storms ----------

function stormShipCount(s: GameState): number {
  return 3 + (new Rng(hashSeed(s.seed, 'stormsize', s.stats.storms)).int(0, 2));
}

/** The player takes the helm: storm ships start heading for the reefs. */
export function engageStorm(s: GameState): boolean {
  if (s.storm.phase !== 'waiting') return false;
  s.storm.phase = 'active';
  s.storm.queue = stormShipCount(s);
  s.storm.at = s.time;
  s.storm.horn = 0;
  return true;
}

function spawnStormShip(s: GameState, events: GameEvent[]): void {
  const r = new Rng(hashSeed(s.seed, 'stormship', s.stats.storms, s.storm.queue));
  const pool = SHIPS.filter((d) => !d.free && !d.afterStorm && d.rarity <= 3 && (d.lens === undefined || s.lens >= d.lens));
  const d = r.pick(pool);
  s.ships.push({
    uid: s.uid++, id: d.id, x: 1.1, dir: -1, lane: r.chance(0.5) ? 'near' : 'mid', speed: (1.1 - REEF_X) / r.range(20, 28), paid: true,
    storm: { progress: 0, state: 'approach', at: s.time },
  });
  sight(s, d.id, events);
}

/** Lighting a storm ship with the beam for a moment turns it away from the reefs. */
export function lightShip(s: GameState, uid: number, dt: number): boolean {
  const ship = s.ships.find((x) => x.uid === uid);
  if (!ship?.storm || ship.storm.state !== 'approach') return false;
  ship.storm.progress += (dt / 1.3) * (1 + 0.1 * s.lens);
  return true;
}

export const HORN_COOLDOWN = 8;

export function horn(s: GameState): boolean {
  if (!level(s, 'corne') || s.storm.phase !== 'active' || s.time < s.storm.horn) return false;
  s.storm.horn = s.time + HORN_COOLDOWN;
  for (const ship of s.ships) if (ship.storm?.state === 'approach' && ship.x < 0.8) ship.storm.progress += 0.55;
  return true;
}

function stormReward(s: GameState, d: ShipDef): number {
  return Math.round(Math.max(15, d.fee * 3) * (1 + 0.35 * s.lens) * (level(s, 'canot') ? 1.5 : 1));
}

function updateStorm(s: GameState, opts: TickOptions, events: GameEvent[]): void {
  const st = s.storm;
  if (opts.stormEvery <= 0) {
    if (st.phase === 'warning') st.phase = 'none';
    s.nextStorm = 0;
    return;
  }
  if (!s.nextStorm) s.nextStorm = s.time + opts.stormEvery * 60;
  if (st.phase === 'none' && s.time >= s.nextStorm - (level(s, 'radio') ? 180 : 60)) {
    st.phase = 'warning';
    events.push({ kind: 'stormWarning' });
  }
  if (st.phase === 'warning' && s.time >= s.nextStorm) {
    st.phase = 'waiting';
    st.at = s.time;
    st.saved = 0;
    st.aground = 0;
    events.push({ kind: 'stormWaiting' });
  }
  if (st.phase === 'waiting' && s.time - st.at > 120) {
    // Nobody at the helm: the ships waited at anchor. Nothing is lost.
    endStorm(s, events, true);
    return;
  }
  if (st.phase !== 'active') return;
  if (st.queue > 0 && s.time - st.at >= 0) {
    spawnStormShip(s, events);
    st.queue--;
    st.at = s.time + 4;
  }
  for (const ship of s.ships) {
    if (!ship.storm || ship.storm.state !== 'approach') continue;
    const d = SHIP_BY_ID[ship.id];
    if (ship.storm.progress >= 1) {
      ship.storm.state = 'saved';
      ship.dir = 1;
      ship.speed = 0.03;
      const fee = stormReward(s, d);
      earn(s, fee);
      st.saved++;
      s.stats.saved++;
      const bottle = new Rng(hashSeed(s.seed, 'bottle', s.stats.saved)).chance(0.4);
      if (bottle) s.bottles++;
      bumpMission(s, 'save', 1, events);
      events.push({ kind: 'saved', ship: ship.id, fee, bottle });
    } else if (ship.x <= REEF_X) {
      ship.storm.state = 'aground';
      ship.storm.at = s.time;
      ship.speed = 0;
      st.aground++;
      s.stats.aground++;
      // The crew rows ashore; the sea gives something back.
      const wreck = pickWreck(new Rng(hashSeed(s.seed, 'aground', s.stats.aground)), 2);
      dropWreck(s, REEF_X + 0.06, ship.lane, wreck, events);
      events.push({ kind: 'aground', ship: ship.id, wreck });
    }
  }
  const pending = st.queue > 0 || s.ships.some((x) => x.storm?.state === 'approach');
  if (!pending) endStorm(s, events, false);
}

function endStorm(s: GameState, events: GameEvent[], anchored: boolean): void {
  const st = s.storm;
  s.stats.storms++;
  events.push({ kind: 'stormEnd', saved: st.saved, aground: st.aground, anchored });
  addLog(s, anchored ? 'logAnchored' : 'logStorm', { saved: st.saved, aground: st.aground });
  st.phase = 'none';
  s.lastStormEnd = s.time;
  s.nextStorm = 0;
  checkHonours(s, events);
}

// ---------- missions ("veillées") ----------

function newMissions(s: GameState, day: number, storms: boolean): Mission[] {
  const r = new Rng(hashSeed(s.seed, 'missions', day));
  const pool: MissionKind[] = ['see', 'fish', 'oil', 'new'];
  if (storms) pool.push('save');
  const kinds = r.shuffle(pool).slice(0, 3);
  const target: Record<MissionKind, number> = { see: 8 + r.int(0, 7), fish: 1 + r.int(0, 2), oil: 2 + r.int(0, 1), save: 2 + r.int(0, 1), new: 2 + r.int(0, 1) };
  return kinds.map((kind) => ({ kind, target: target[kind], progress: 0, done: false }));
}

function bumpMission(s: GameState, kind: MissionKind, n: number, events?: GameEvent[]): void {
  for (const m of s.missions.list) {
    if (m.kind !== kind || m.done) continue;
    m.progress = Math.min(m.target, m.progress + n);
    if (m.progress >= m.target) {
      m.done = true;
      const reward = missionReward(s, m);
      earn(s, reward);
      events?.push({ kind: 'mission', mission: m, reward });
    }
  }
}

export function missionReward(s: GameState, m: Mission): number {
  return Math.round(MISSION_REWARD[m.kind] * (1 + 0.6 * s.lens));
}

// ---------- tick ----------

export function tick(s: GameState, dt: number, opts: TickOptions): GameEvent[] {
  const events: GameEvent[] = [];
  s.time += dt;
  const day = dayIndex(s.time);
  if (day !== s.missions.day) {
    s.missions = { day, list: newMissions(s, day, opts.stormEvery > 0) };
    if (s.time > 1) events.push({ kind: 'day' });
  }
  decay(s, dt);
  updateStorm(s, opts, events);
  if (!inStorm(s) && s.time >= s.nextSpawn) {
    spawn(s, events);
    s.nextSpawn = s.time + spawnInterval(s) * (0.6 + new Rng(hashSeed(s.seed, 'gap', s.spawnCount)).next() * 0.8);
  }
  for (const ship of s.ships) {
    const d = SHIP_BY_ID[ship.id];
    ship.x += ship.dir * ship.speed * dt;
    if (!ship.paid && ((ship.dir === -1 && ship.x <= 0.5) || (ship.dir === 1 && ship.x >= 0.5))) {
      ship.paid = true;
      const fee = feeFor(s, d);
      if (fee > 0) earn(s, fee);
      events.push({ kind: 'ship', ship: ship.id, fee });
      const r = new Rng(hashSeed(s.seed, 'drop', ship.uid));
      if (!d.free && r.chance(0.12)) dropWreck(s, ship.x, ship.lane, pickWreck(r), events);
    }
  }
  s.ships = s.ships.filter((x) => x.x > -0.2 && x.x < 1.2 && !(x.storm?.state === 'aground' && s.time - x.storm.at > 12));
  // Floating wrecks drift for two minutes; the landing net catches them by itself.
  for (const w of [...s.floating]) {
    w.x -= 0.0015 * dt;
    const auto = level(s, 'epuisette') > 0 && s.time - w.born > 6;
    if (auto) {
      s.floating.splice(s.floating.indexOf(w), 1);
      collect(s, w.id, events);
      events.push({ kind: 'fished', wreck: w.id, auto: true });
    } else if (s.time - w.born > 120) s.floating.splice(s.floating.indexOf(w), 1);
  }
  return events;
}

// ---------- shop ----------

export function lensCost(s: GameState): number | null {
  return s.lens < LENS_COSTS.length ? LENS_COSTS[s.lens] : null;
}

export function buyLens(s: GameState): boolean {
  const c = lensCost(s);
  if (c === null || s.sous < c) return false;
  s.sous -= c;
  s.lens++;
  addLog(s, 'logLens', { n: 6 - s.lens });
  checkHonours(s, []);
  return true;
}

export function upgradeCost(s: GameState, id: string): number | null {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return null;
  const l = level(s, id);
  return l < u.costs.length ? u.costs[l] : null;
}

export function buyUpgrade(s: GameState, id: string): boolean {
  const c = upgradeCost(s, id);
  if (c === null || s.sous < c) return false;
  s.sous -= c;
  s.upgrades[id] = level(s, id) + 1;
  return true;
}

export function buyDecoration(s: GameState, id: string): boolean {
  const d = DECORATIONS.find((x) => x.id === id);
  if (!d || s.decorations.includes(id) || s.sous < d.cost) return false;
  s.sous -= d.cost;
  s.decorations.push(id);
  checkHonours(s, []);
  return true;
}

/** Duplicates go to the antique dealer of Kerbrume. */
export function sellDuplicate(s: GameState, id: string): number {
  if ((s.wrecks[id] ?? 0) < 2) return 0;
  s.wrecks[id]--;
  const v = WRECK_BY_ID[id].value;
  earn(s, v);
  return v;
}

/** Reading a found bottle's message (they arrive with each 'bouteille' wreck). */
export function unreadMessages(s: GameState): number {
  return Math.max(0, Math.min(s.wrecks.bouteille ?? 0, BOTTLE_MESSAGES) - s.messagesRead);
}

export function readMessage(s: GameState): number | null {
  if (!unreadMessages(s)) return null;
  return s.messagesRead++;
}

// ---------- honours ----------

export const HONOURS = ['premier', 'dix', 'vingt', 'registre', 'epaves', 'premier_ordre', 'sauveteur', 'postier', 'maison'];

function addHonour(s: GameState, id: string, events: GameEvent[]): void {
  if (s.honours.includes(id)) return;
  s.honours.push(id);
  events.push({ kind: 'honour', id });
}

function checkHonours(s: GameState, events: GameEvent[]): void {
  const species = Object.keys(s.registry).length;
  if (species >= 1) addHonour(s, 'premier', events);
  if (species >= 10) addHonour(s, 'dix', events);
  if (species >= 20) addHonour(s, 'vingt', events);
  if (species >= SHIPS.length) addHonour(s, 'registre', events);
  if (WRECKS.every((w) => s.wrecks[w.id])) addHonour(s, 'epaves', events);
  if (s.lens >= LENS_COSTS.length) addHonour(s, 'premier_ordre', events);
  if (s.stats.saved >= 10) addHonour(s, 'sauveteur', events);
  if (s.stats.bottlesSent >= 1) addHonour(s, 'postier', events);
  if (s.decorations.length >= DECORATIONS.length) addHonour(s, 'maison', events);
}

export function collectionComplete(s: GameState): boolean {
  return SHIPS.every((d) => s.registry[d.id]) && WRECKS.every((w) => s.wrecks[w.id]);
}

// ---------- journal ----------

export function addLog(s: GameState, key: string, p?: Record<string, string | number>): void {
  s.log.unshift({ t: s.time, key, p });
  if (s.log.length > 40) s.log.length = 40;
}

// ---------- absence ----------

export interface Absence {
  seconds: number;
  ships: number;
  fresh: string[];
  sous: number;
  wrecks: string[];
}

/** While the game was closed, Yann kept watch with the petrol lamp: commoner ships are noted, at a reduced fee. */
export function offlineProgress(s: GameState, now = Date.now(), opts: TickOptions = { stormEvery: 0 }): Absence {
  const seconds = Math.min(Math.max(0, (now - s.lastSeen) / 1000), OFFLINE_CAP);
  s.lastSeen = now;
  const out: Absence = { seconds, ships: 0, fresh: [], sous: 0, wrecks: [] };
  if (seconds < 60) return out;
  const events: GameEvent[] = [];
  const start = s.time;
  const interval = spawnInterval(s);
  const count = Math.min(1500, Math.floor(seconds / interval));
  for (let i = 0; i < count; i++) {
    const t = start + (i + 0.5) * interval;
    const r = new Rng(hashSeed(s.seed, 'away', s.spawnCount++));
    const d = pickShip(s, t, r, false);
    if (!d) continue;
    s.time = t;
    out.ships++;
    if (!s.registry[d.id]) out.fresh.push(d.id);
    sight(s, d.id, events);
    const fee = Math.round(feeFor(s, d, t) * 0.5);
    earn(s, fee);
    out.sous += fee;
    if (!d.free && r.chance(level(s, 'epuisette') ? 0.12 : 0.05)) {
      const w = pickWreck(r);
      collect(s, w, events);
      out.wrecks.push(w);
    }
  }
  s.time = start + seconds;
  decay(s, seconds);
  // Storms that broke out meanwhile let the ships wait at anchor; the next one is scheduled afresh.
  s.storm.phase = 'none';
  s.nextStorm = 0;
  s.ships = [];
  s.floating = [];
  s.nextSpawn = s.time + 3;
  void opts;
  return out;
}

// ---------- bottles to friends (offline codes) ----------

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function checksum(bytes: number[]): number {
  let h = 2166136261;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
  return h & 0xffff;
}

function toBase32(bytes: number[]): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(text: string): number[] | null {
  const clean = text.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) return null;
    value = ((value << 5) | v) & 0xffffff;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return out;
}

export type Gift = { kind: 'sous'; amount: number } | { kind: 'wreck'; id: string };

export interface Bottle {
  name: string;
  ship: string;
  gift: Gift;
  nonce: string;
}

export function canSendGift(s: GameState, gift: Gift): boolean {
  if (s.bottles < 1) return false;
  if (gift.kind === 'sous') return s.sous >= gift.amount;
  return (s.wrecks[gift.id] ?? 0) >= 2;
}

/** Corks a bottle: the gift leaves this lighthouse, the code carries it to a friend's. */
export function writeBottle(s: GameState, ship: string, gift: Gift, now = Date.now()): string | null {
  if (!canSendGift(s, gift) || !s.registry[ship]) return null;
  const nonce = [now & 255, (now >>> 8) & 255, (now >>> 16) & 255, (s.uid * 37 + s.seed) & 255];
  const name = Array.from(new TextEncoder().encode((s.keeperName || 'Kerbrume').slice(0, 18)));
  const giftByte = gift.kind === 'sous' ? Math.min(127, Math.round(gift.amount / 25)) : 128 + WRECKS.findIndex((w) => w.id === gift.id);
  const body = [1, SHIPS.findIndex((d) => d.id === ship), giftByte, ...nonce, ...name];
  const sum = checksum(body);
  const code = toBase32([...body, sum >> 8, sum & 255]).match(/.{1,5}/g)!.join('-');
  s.bottles--;
  if (gift.kind === 'sous') s.sous -= gift.amount;
  else s.wrecks[gift.id]--;
  s.sent.push(nonce.join('.'));
  s.stats.bottlesSent++;
  s.uid++;
  addLog(s, 'logSent', { ship });
  checkHonours(s, []);
  return code;
}

export function decodeBottle(code: string): Bottle | null {
  const bytes = fromBase32(code);
  if (!bytes || bytes.length < 10) return null;
  const body = bytes.slice(0, -2);
  const sum = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  if (checksum(body) !== sum || body[0] !== 1) return null;
  const ship = SHIPS[body[1]];
  if (!ship) return null;
  const g = body[2];
  const gift: Gift = g >= 128 ? { kind: 'wreck', id: WRECKS[g - 128]?.id ?? '' } : { kind: 'sous', amount: g * 25 };
  if (gift.kind === 'wreck' && !gift.id) return null;
  let name = '';
  try { name = new TextDecoder().decode(new Uint8Array(body.slice(7))); } catch { return null; }
  return { name, ship: ship.id, gift, nonce: body.slice(3, 7).join('.') };
}

export type RedeemResult = { ok: true; bottle: Bottle; fresh: boolean } | { ok: false; reason: 'invalid' | 'own' | 'used' };

export function redeemBottle(s: GameState, code: string): RedeemResult {
  const b = decodeBottle(code);
  if (!b) return { ok: false, reason: 'invalid' };
  if (s.sent.includes(b.nonce)) return { ok: false, reason: 'own' };
  if (s.redeemed.includes(b.nonce)) return { ok: false, reason: 'used' };
  s.redeemed.push(b.nonce);
  s.stats.bottlesReceived++;
  if (b.gift.kind === 'sous') earn(s, b.gift.amount);
  else { s.wrecks[b.gift.id] = (s.wrecks[b.gift.id] ?? 0) + 1; }
  // The friend's ship sails past this lighthouse too, and is noted in the register.
  const fresh = !s.registry[b.ship];
  const events: GameEvent[] = [];
  sight(s, b.ship, events);
  addLog(s, 'logReceived', { name: b.name, ship: b.ship });
  checkHonours(s, events);
  return { ok: true, bottle: b, fresh };
}
