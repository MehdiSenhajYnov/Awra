import {
  CLAUSES, CLAUSE_BY_ID, type ClaimType, type ClauseDef, FLOORS, PERKS, REALMS, ROYAL, SCANDAL_MAX, STAFF,
  STARTING_DECK, type Tag, UPGRADES,
} from '../data/content';
import { Rng, hashSeed } from './rng';

export interface Claim {
  seq: number;
  type: ClaimType;
  night: boolean;
  /** Final value in écus. */
  value: number;
}

export interface Trial {
  claims: Claim[];
  hand: string[];
  index: number;
  refused: number;
  needed: number;
  final: boolean;
}

export interface GameState {
  version: 1;
  seed: number;
  realm: number;
  /** 0 bureau, 1 étage, 2 tour, 3 realm conquered (bankruptcy available). */
  floor: number;
  ecus: number;
  /** Écus earned in this realm since the last bankruptcy. */
  lifetime: number;
  scandal: number;
  deck: string[];
  draw: string[];
  hand: string[];
  discard: string[];
  claim: Claim | null;
  claimSeq: number;
  staff: Record<string, number>;
  upgrades: string[];
  shares: number;
  perks: Record<string, number>;
  streak: { tag: string; count: number };
  time: number;
  nextEvent: number;
  auditUntil: number;
  riotUntil: number;
  trial: Trial | null;
  trialCooldown: number;
  ended: boolean;
  lastSeen: number;
  achievements: string[];
  stats: { refused: number; approved: number; riots: number; bankruptcies: number; best: number; staffHandled: number };
}

export const REALM_COUNT = REALMS.length;
export const REALMS_IDS = REALMS.map((r) => r.id);
export const FLOOR_MULT = [1, 3, 8, 8];
export const FLOOR_GOALS = [100000, 5000000, 300000000];
export const DAY_LENGTH = 240;
export const OFFLINE_CAP = 8 * 3600;

export function newGame(seed = Math.floor(Math.random() * 2 ** 31)): GameState {
  const s: GameState = {
    version: 1, seed, realm: 0, floor: 0, ecus: 0, lifetime: 0, scandal: 0,
    deck: [...STARTING_DECK], draw: [], hand: [], discard: [], claim: null, claimSeq: 0,
    staff: {}, upgrades: [], shares: 0, perks: {}, streak: { tag: '', count: 0 },
    time: 0, nextEvent: 180, auditUntil: 0, riotUntil: 0, trial: null, trialCooldown: 0, ended: false,
    lastSeen: Date.now(), achievements: [],
    stats: { refused: 0, approved: 0, riots: 0, bankruptcies: 0, best: 0, staffHandled: 0 },
  };
  resetRealm(s);
  return s;
}

export const realmOf = (s: GameState) => REALMS[s.realm];
export const perk = (s: GameState, id: string) => s.perks[id] ?? 0;
export const hasUp = (s: GameState, id: string) => s.upgrades.includes(id);
export const isNight = (s: GameState) => s.time % DAY_LENGTH > DAY_LENGTH * 0.66;
export const inAudit = (s: GameState) => s.time < s.auditUntil;
export const inRiot = (s: GameState) => s.time < s.riotUntil;

export function handSize(s: GameState): number {
  return 3 + (hasUp(s, 'main_large') ? 1 : 0) + (hasUp(s, 'main_large2') ? 1 : 0);
}

function rng(s: GameState, ...parts: (string | number)[]): Rng {
  return new Rng(hashSeed(s.seed, s.realm, ...parts));
}

/** New realm (or bankruptcy): fresh desk, starting deck plus legendary clauses from the board. */
function resetRealm(s: GameState): void {
  s.floor = 0;
  s.ecus = 0;
  s.lifetime = 0;
  s.scandal = 0;
  s.staff = { clerc: perk(s, 'stagiaires') * 2 };
  s.upgrades = [];
  s.deck = [...STARTING_DECK];
  for (const id of ['petits_caracteres', 'acte_divin', 'jamais']) if (perk(s, `clause_${id}`)) s.deck.push(id);
  s.draw = rng(s, 'deck').shuffle([...s.deck]);
  s.hand = [];
  s.discard = [];
  s.streak = { tag: '', count: 0 };
  s.trial = null;
  s.trialCooldown = 0;
  s.auditUntil = 0;
  s.riotUntil = 0;
  s.claim = null;
  refillHand(s);
  nextClaim(s);
}

function drawOne(s: GameState): string | null {
  if (!s.draw.length) {
    if (!s.discard.length) return null;
    s.draw = rng(s, 'shuffle', s.claimSeq).shuffle(s.discard);
    s.discard = [];
  }
  return s.draw.shift()!;
}

/** Hand, draw pile and discard pile always hold exactly the clauses of the deck. */
export function refillHand(s: GameState): void {
  while (s.hand.length < handSize(s)) {
    const c = drawOne(s);
    if (!c) break;
    s.hand.push(c);
  }
}

export function claimValue(s: GameState, type: ClaimType): number {
  return Math.round(type.amount * realmOf(s).mult * FLOOR_MULT[s.floor]);
}

function makeClaim(s: GameState, type: ClaimType, night: boolean): Claim {
  return { seq: s.claimSeq++, type, night, value: claimValue(s, type) };
}

export function nextClaim(s: GameState, royal = false): void {
  const r = rng(s, 'claim', s.claimSeq);
  const type = royal ? ROYAL : r.pick(realmOf(s).claims);
  s.claim = makeClaim(s, type, isNight(s));
}

export function clauseFits(s: GameState, c: ClauseDef, claim: Claim): boolean {
  if (c.night && !claim.night) return false;
  if (c.notBlood && claim.type.blood) return false;
  if (c.fraud && inAudit(s)) return false;
  if (claim.type.id === 'royal') return c.tags.length === 0;
  return c.tags.length === 0 || c.tags.some((t) => claim.type.tags.includes(t as Tag));
}

function incomeMult(s: GameState): number {
  let m = 1 + perk(s, 'dividendes') * 0.1;
  if (hasUp(s, 'tampon_fer')) m *= 1.25;
  if (hasUp(s, 'tampon_or')) m *= 2;
  if (hasUp(s, 'coffre')) m *= 1 + Math.min(0.5, s.ecus / (claimValue(s, realmOf(s).claims[0]) * 400));
  if (inRiot(s)) m *= 0.5;
  return m;
}

export function streakMult(s: GameState): number {
  const cap = hasUp(s, 'encre_rouge') ? 3 : 2;
  return Math.min(cap, 1 + s.streak.count * 0.1);
}

function scandalCut(s: GameState): number {
  return (hasUp(s, 'communication') ? 0.75 : 1) * (hasUp(s, 'propagande') ? 0.6 : 1);
}

function gain(s: GameState, amount: number): void {
  s.ecus += amount;
  s.lifetime += amount;
  if (amount > s.stats.best) s.stats.best = amount;
}

function unlock(s: GameState, id: string): void {
  if (!s.achievements.includes(id)) s.achievements.push(id);
}

export type Outcome =
  | { kind: 'refused'; gain: number; scandal: number; streak: number }
  | { kind: 'beheaded'; loss: number }
  | { kind: 'approved'; gain: number; relief: number }
  | { kind: 'invalid' };

/** Refuses the claim on the desk with the clause at `handIndex`. */
export function refuse(s: GameState, handIndex: number): Outcome {
  const claim = s.claim;
  const id = s.hand[handIndex];
  if (!claim || !id || s.trial) return { kind: 'invalid' };
  const clause = CLAUSE_BY_ID[id];
  if (!clauseFits(s, clause, claim)) return { kind: 'invalid' };
  s.hand.splice(handIndex, 1);
  s.discard.push(id);
  s.stats.refused++;
  unlock(s, 'premier_refus');
  if (s.stats.refused >= 100) unlock(s, 'cent_refus');
  if (s.stats.refused >= 1000) unlock(s, 'mille_refus');
  let outcome: Outcome;
  if (claim.type.id === 'royal') {
    // Refusing the King is always a mistake.
    const loss = Math.floor(s.ecus / 2);
    s.ecus -= loss;
    s.scandal = Math.min(SCANDAL_MAX - 1, s.scandal + 30);
    s.streak = { tag: '', count: 0 };
    unlock(s, 'royal_refuse');
    outcome = { kind: 'beheaded', loss };
  } else {
    const tag = clause.tags[0] ?? 'any';
    s.streak = s.streak.tag === tag ? { tag, count: s.streak.count + 1 } : { tag, count: 0 };
    if (s.streak.count >= 5) unlock(s, 'serie5');
    const g = Math.round(claim.value * clause.yield * streakMult(s) * incomeMult(s));
    const sc = claim.type.severity * 2.4 * clause.scandal * scandalCut(s);
    gain(s, g);
    s.scandal += sc;
    checkRiot(s);
    outcome = { kind: 'refused', gain: g, scandal: sc, streak: s.streak.count };
  }
  refillHand(s);
  nextClaim(s);
  checkMilestones(s);
  return outcome;
}

/** Approves the claim: no profit, but it calms the village. Approving the King is rewarded. */
export function approve(s: GameState): Outcome {
  const claim = s.claim;
  if (!claim || s.trial) return { kind: 'invalid' };
  s.stats.approved++;
  s.streak = { tag: '', count: 0 };
  const royal = claim.type.id === 'royal';
  const relief = royal ? 20 : 5 + claim.type.severity * 2;
  s.scandal = Math.max(0, s.scandal - relief);
  const g = royal ? Math.round(claim.value * 0.5 * incomeMult(s)) : Math.round(claim.value * 0.05);
  gain(s, g);
  if (royal) unlock(s, 'royal_approuve');
  nextClaim(s);
  return { kind: 'approved', gain: g, relief };
}

/** Discards the whole hand for a fresh one, at a small scandal cost (shredding is noticed). */
export function redraw(s: GameState): void {
  s.discard.push(...s.hand);
  s.hand = [];
  s.scandal += 3;
  refillHand(s);
}

function checkRiot(s: GameState): void {
  if (s.scandal < SCANDAL_MAX) return;
  s.ecus = Math.floor(s.ecus * 0.85);
  s.scandal = 40;
  s.riotUntil = s.time + 30;
  s.stats.riots++;
  unlock(s, 'emeute');
}

export function staffCost(s: GameState, id: string): number {
  const d = STAFF.find((x) => x.id === id)!;
  return Math.round(d.cost * Math.pow(d.growth, s.staff[id] ?? 0) * realmOf(s).mult);
}

export function upgradeCost(s: GameState, id: string): number {
  return Math.round(UPGRADES.find((u) => u.id === id)!.cost * realmOf(s).mult);
}

export function clauseCost(id: string): number {
  return CLAUSE_BY_ID[id].price;
}

export function buyStaff(s: GameState, id: string): boolean {
  const d = STAFF.find((x) => x.id === id);
  const cost = staffCost(s, id);
  if (!d || d.floor > s.floor || s.ecus < cost) return false;
  s.ecus -= cost;
  s.staff[id] = (s.staff[id] ?? 0) + 1;
  if ((s.staff.clerc ?? 0) >= 10) unlock(s, 'clercs10');
  return true;
}

export function buyUpgrade(s: GameState, id: string): boolean {
  const d = UPGRADES.find((u) => u.id === id);
  const cost = upgradeCost(s, id);
  if (!d || d.floor > s.floor || hasUp(s, id) || s.ecus < cost) return false;
  s.ecus -= cost;
  s.upgrades.push(id);
  refillHand(s);
  return true;
}

/** Clauses the guild sells in this realm (each can be bought several times). */
export function guildClauses(s: GameState): ClauseDef[] {
  return CLAUSES.filter((c) => !c.legendary && c.price > 0 && c.realm <= s.realm + 1);
}

export function buyClause(s: GameState, id: string): boolean {
  const c = CLAUSE_BY_ID[id];
  const cost = clauseCost(id);
  if (!c || c.legendary || s.ecus < cost) return false;
  s.ecus -= cost;
  s.deck.push(id);
  s.discard.push(id);
  return true;
}

/** Automation: claims handled per second by the staff. */
export function staffRate(s: GameState): number {
  let r = 0;
  for (const d of STAFF) r += (s.staff[d.id] ?? 0) * d.rate / 60;
  if (hasUp(s, 'tubes')) r *= 1.5;
  return r;
}

/** Net scandal per second from the staff (archivists calm, everyone else stirs). */
export function staffScandal(s: GameState): number {
  let total = 0;
  for (const d of STAFF) total += (s.staff[d.id] ?? 0) * d.scandal * (d.scandal > 0 ? scandalCut(s) : 1);
  return total;
}

/** Average value of a claim in this realm and floor. */
export function averageClaim(s: GameState): number {
  const claims = realmOf(s).claims;
  return claims.reduce((sum, c) => sum + claimValue(s, c), 0) / claims.length;
}

/** Écus per second earned by the staff (generic refusals, at half yield). */
export function staffIncome(s: GameState): number {
  if (inRiot(s)) return 0;
  return staffRate(s) * averageClaim(s) * 0.45 * incomeMult(s);
}

export function scandalDecay(s: GameState): number {
  return 0.5 + perk(s, 'calme') * 0.25 + (hasUp(s, 'communication') ? 0.5 : 0) + (hasUp(s, 'propagande') ? 1 : 0);
}

export type Event = 'audit' | 'royal' | null;

/** Advances time. Returns an event that just started, for the interface to announce. */
export function tick(s: GameState, dt: number): Event {
  s.time += dt;
  // During a riot the staff are on strike: no income, no new scandal.
  if (!inRiot(s)) {
    s.stats.staffHandled += staffRate(s) * dt;
    gain(s, staffIncome(s) * dt);
    s.scandal += staffScandal(s) * dt;
  }
  s.scandal = Math.max(0, s.scandal - scandalDecay(s) * dt);
  checkRiot(s);
  checkMilestones(s);
  if (s.time >= s.nextEvent && !s.trial) {
    const r = rng(s, 'event', Math.floor(s.time));
    s.nextEvent = s.time + r.range(150, 260);
    if (s.floor >= 1 && r.chance(0.45)) {
      s.auditUntil = s.time + 60;
      return 'audit';
    }
    nextClaim(s, true);
    return 'royal';
  }
  return null;
}

function checkMilestones(s: GameState): void {
  if (s.ecus >= 1e6) unlock(s, 'million');
}

/** Later realms ask for more, so the board's perks speed them up without trivialising them. */
export const REALM_GOAL_FACTOR = [1, 4, 16, 64];

export function floorGoal(s: GameState): number {
  return FLOOR_GOALS[Math.min(s.floor, FLOOR_GOALS.length - 1)] * realmOf(s).mult * REALM_GOAL_FACTOR[s.realm];
}

export function canPlead(s: GameState): boolean {
  return s.floor < FLOORS && s.lifetime >= floorGoal(s) && s.time >= s.trialCooldown && !s.trial;
}

/** Starts the trial for the next floor: 10 claims, a fixed hand, 7 refusals needed. Always solvable. */
export function startTrial(s: GameState): Trial | null {
  if (!canPlead(s)) return null;
  const r = rng(s, 'trial', s.floor, Math.floor(s.time));
  const final = s.floor === FLOORS - 1;
  const realm = realmOf(s);
  const fitsType = (id: string, t: ClaimType) => {
    const c = CLAUSE_BY_ID[id];
    return (c.tags.length === 0 || c.tags.some((tag) => t.tags.includes(tag))) && !(c.notBlood && t.blood) && !c.night;
  };
  // Only clauses that can refuse something in this realm make it into the trial hand.
  const usable = r.shuffle(s.deck.filter((id) => realm.claims.some((t) => fitsType(id, t))));
  const handSizeT = 7 + perk(s, 'memoire');
  const hand = usable.slice(0, handSizeT);
  while (hand.length < handSizeT) hand.push('franchise');
  const claims: Claim[] = [];
  // Seven claims are each answerable by a distinct clause of the hand; three are filler.
  hand.slice(0, 7).forEach((id, i) => {
    if (final && i === 0 && fitsType(id, realm.boss)) {
      claims.push(makeClaim(s, realm.boss, false));
      return;
    }
    const type = r.pick(realm.claims.filter((t) => fitsType(id, t)));
    claims.push(makeClaim(s, type, false));
  });
  if (final && !claims.some((c) => c.type.id === realm.boss.id)) {
    // No clause in hand fits the boss: give the hand a catch-all for it.
    hand.push('franchise');
    claims.push(makeClaim(s, realm.boss, false));
  }
  for (let i = claims.length; i < 10; i++) claims.push(makeClaim(s, r.pick(realm.claims), false));
  r.shuffle(claims);
  // The realm's boss pleads first.
  const bi = claims.findIndex((c) => c.type.id === realm.boss.id);
  if (bi > 0) claims.unshift(...claims.splice(bi, 1));
  s.trial = { claims, hand, index: 0, refused: 0, needed: 7, final };
  return s.trial;
}

export function trialFits(s: GameState, handIndex: number): boolean {
  const t = s.trial;
  if (!t) return false;
  const c = CLAUSE_BY_ID[t.hand[handIndex]];
  const claim = t.claims[t.index];
  return !!c && !!claim && (c.tags.length === 0 || c.tags.some((tag) => claim.type.tags.includes(tag))) && !(c.notBlood && claim.type.blood);
}

export type TrialStep = { done: false } | { done: true; won: boolean };

export function trialAnswer(s: GameState, handIndex: number | null): TrialStep {
  const t = s.trial;
  if (!t) return { done: true, won: false };
  if (handIndex !== null) {
    if (!trialFits(s, handIndex)) return { done: false };
    t.hand.splice(handIndex, 1);
    t.refused++;
  }
  t.index++;
  const left = t.claims.length - t.index;
  const won = t.refused >= t.needed;
  // The trial ends when won, when the claims run out, or when even refusing every remaining claim falls short.
  if (won || left === 0 || t.refused + left < t.needed) {
    s.trial = null;
    if (won) {
      s.floor++;
      unlock(s, 'proces');
      if (s.floor === 1) unlock(s, 'etage');
      if (s.floor === 2) unlock(s, 'tour');
      if (s.floor === FLOORS && s.realm === REALM_COUNT - 1) {
        s.ended = true;
        unlock(s, 'apocalypse');
      }
      if (s.claim) s.claim = makeClaim(s, s.claim.type, s.claim.night);
    } else {
      s.trialCooldown = s.time + 45;
    }
    return { done: true, won };
  }
  return { done: false };
}

/** Holding shares a bankruptcy would pay out now. */
export function sharesFor(s: GameState): number {
  if (s.floor < FLOORS) return 0;
  return 3 + s.realm * 2 + Math.floor(Math.sqrt(s.lifetime / (realmOf(s).mult * 300000)));
}

/** "Fraudulent bankruptcy": cash in shares and move to the next realm (or replay hell after the end). */
export function bankrupt(s: GameState): number {
  const got = sharesFor(s);
  if (!got) return 0;
  s.shares += got;
  s.stats.bankruptcies++;
  if (s.realm < REALM_COUNT - 1) s.realm++;
  const names = ['desert', 'mer', 'enfer'];
  if (s.realm >= 1) unlock(s, names[s.realm - 1]);
  resetRealm(s);
  return got;
}

export function perkCost(s: GameState, id: string): number {
  const p = PERKS.find((x) => x.id === id)!;
  return p.cost * (perk(s, id) + 1);
}

export function buyPerk(s: GameState, id: string): boolean {
  const p = PERKS.find((x) => x.id === id);
  if (!p || perk(s, id) >= p.max) return false;
  const cost = perkCost(s, id);
  if (s.shares < cost) return false;
  s.shares -= cost;
  s.perks[id] = perk(s, id) + 1;
  // Interns join at once, not only from the next realm.
  if (id === 'stagiaires') s.staff.clerc = (s.staff.clerc ?? 0) + 2;
  if (id.startsWith('clause_')) {
    const clause = id.slice(7);
    s.deck.push(clause);
    s.discard.push(clause);
  }
  return true;
}

/** Earnings while the game was closed: the staff kept stamping, at half speed. */
export function offlineProgress(s: GameState, now = Date.now()): { seconds: number; earned: number } {
  const seconds = Math.min(Math.max(0, (now - s.lastSeen) / 1000), OFFLINE_CAP * (hasUp(s, 'sablier') ? 2 : 1));
  s.lastSeen = now;
  if (seconds < 30 || s.trial) return { seconds: 0, earned: 0 };
  const earned = Math.round(staffIncome(s) * seconds * 0.5);
  gain(s, earned);
  s.scandal = Math.min(s.scandal, 50);
  return { seconds, earned };
}

export const ACHIEVEMENTS = [
  'premier_refus', 'cent_refus', 'mille_refus', 'serie5', 'emeute', 'royal_refuse', 'royal_approuve', 'proces',
  'etage', 'tour', 'desert', 'mer', 'enfer', 'apocalypse', 'clercs10', 'million',
];

/** Big-number formatting used everywhere: 1 234, 12,3 k, 4,5 M, 7,8 Md… */
export function short(n: number, lang: 'fr' | 'en'): string {
  const units = lang === 'fr' ? ['', ' k', ' M', ' Md', ' Bn', ' Bd'] : ['', 'K', 'M', 'B', 'T', 'Qa'];
  let u = 0;
  if (n < 10000) return Math.floor(n).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
  let x = n;
  while (x >= 1000 && u < units.length - 1) { x /= 1000; u++; }
  const str = x >= 100 ? x.toFixed(0) : x.toFixed(1);
  return (lang === 'fr' ? str.replace('.', ',') : str) + units[u];
}
