import { CHARACTER_BY_ID, VILLAGERS } from '../data/characters';
import { NIGHTS, NIGHT_COUNT, endlessScript, type NightScript, type SpecimenTemplate } from '../data/nights';
import { SPECIES, SPECIES_BY_ID, VISUAL_ANOMALIES, type Tool } from '../data/species';
import { Rng, hashSeed } from './rng';
import {
  type Mode, type Outcome, type RuleSet, type Specimen, type Verdict,
  eatingHarm, rulesFor,
} from './rules';

export type EndingId = 'officine' | 'mycologue' | 'arrete' | 'dette' | 'cueilleur' | 'brume' | 'lison';

/** Rent plus the instalment on Vernet's debts, rising every night. */
export function rentFor(night: number): number {
  return 6 + night * 2;
}
export const CANDLE_COST = 3;
export const MEAL_COST = 3;
export const DEATHS_FOR_ARREST = 4;
export const CONTAMINATION_MAX = 8;
export const BRUME_MAX = 8;
export const DEBT_LIMIT = -10;

export interface GameState {
  version: 1;
  seed: number;
  mode: Mode;
  relaxed: boolean;
  night: number;
  money: number;
  deaths: string[];
  /** char -> first night they come back. */
  sick: Record<string, number>;
  disappeared: string[];
  arrested: string[];
  wrongful: string[];
  contamination: number;
  brume: number;
  lisonTaint: number;
  lisonSaved: boolean;
  candleBought: boolean;
  mealsSkipped: number;
  stats: { specimens: number; correct: number; burned: number; denounced: number; tasted: number };
}

export function newGame(mode: Mode, relaxed: boolean, seed = Math.floor(Math.random() * 2 ** 31)): GameState {
  return {
    version: 1, seed, mode, relaxed, night: 1, money: 12,
    deaths: [], sick: {}, disappeared: [], arrested: [], wrongful: [],
    contamination: 0, brume: 0, lisonTaint: 0, lisonSaved: false,
    candleBought: true, mealsSkipped: 0,
    stats: { specimens: 0, correct: 0, burned: 0, denounced: 0, tasted: 0 },
  };
}

export interface ClientVisit {
  char: string;
  lines: string | null;
  specimens: Specimen[];
  infected: boolean;
}

export interface NightPlan {
  night: number;
  rules: RuleSet;
  clients: ClientVisit[];
  /** null = no time limit. */
  candleSeconds: number | null;
}

export function isAvailable(state: GameState, char: string): boolean {
  if (state.deaths.includes(char) || state.disappeared.includes(char) || state.arrested.includes(char)) return false;
  if ((state.sick[char] ?? 0) > state.night) return false;
  if (char === 'lison' && state.lisonSaved) return false;
  return true;
}

export function scriptFor(state: GameState): NightScript {
  return state.mode === 'endless' ? endlessScript(state.night) : NIGHTS[state.night];
}

function randomSpecimen(rng: Rng, rules: RuleSet, script: NightScript, uid: string, infected: boolean): Specimen {
  const pool = SPECIES.filter((s) => s.night <= rules.speciesNight);
  const weighted = pool.flatMap((s) => (script.favour?.includes(s.id) ? [s, s, s] : [s]));
  const sp = rng.pick(weighted);
  const spec: Specimen = {
    uid, speciesId: sp.id,
    sizeCm: Math.round(rng.range(sp.size[0], sp.size[1])),
    hasBase: !(rules.base && rng.chance(script.noBase)),
    wormy: rules.wormy && rng.chance(script.wormy),
    flip: rng.chance(0.5), rot: rng.range(-7, 7), hue: rng.range(-8, 8),
  };
  const anomalyChance = infected ? 0.35 : script.anomaly;
  const mimicChance = infected ? 0.35 : script.mimic;
  if (rules.burn && rng.chance(anomalyChance)) {
    return { ...spec, speciesId: undefined, anomaly: rng.pick(VISUAL_ANOMALIES), hasBase: true, wormy: false };
  }
  if (rules.mimics && rng.chance(mimicChance)) {
    spec.mimic = rng.pick(rules.tools);
    spec.wormy = false;
    spec.hasBase = true;
  }
  return spec;
}

function fromTemplate(rng: Rng, t: SpecimenTemplate, uid: string): Specimen {
  if (t.anomaly) {
    return { uid, anomaly: t.anomaly, sizeCm: 8, hasBase: true, wormy: false, flip: rng.chance(0.5), rot: rng.range(-5, 5), hue: 0, lisonGift: t.lisonGift };
  }
  const sp = SPECIES_BY_ID[t.sp!];
  return {
    uid, speciesId: sp.id,
    sizeCm: t.size ?? Math.round(rng.range(sp.size[0], sp.size[1])),
    hasBase: !t.noBase, wormy: !!t.wormy, mimic: t.mimic as Tool | undefined,
    flip: rng.chance(0.5), rot: rng.range(-6, 6), hue: rng.range(-6, 6), lisonGift: t.lisonGift,
  };
}

export function planNight(state: GameState): NightPlan {
  const rules = rulesFor(state.mode, state.night);
  const script = scriptFor(state);
  const rng = new Rng(hashSeed(state.seed, state.mode, state.night));
  const used = new Set<string>();
  const clients: ClientVisit[] = [];
  let n = 0;
  const uid = () => `s${state.night}-${n++}`;

  const availableVillagers = () =>
    rng.shuffle(VILLAGERS.filter((v) => isAvailable(state, v) && !used.has(v)));

  // Villagers named in this night's script keep their scene; random picks avoid them.
  for (const c of script.clients) if (c) used.add(c.char);

  for (const slot of script.clients) {
    if (slot && isAvailable(state, slot.char)) {
      const infected = !!slot.infected;
      const specimens = (slot.basket ?? []).map((t) => fromTemplate(rng, t, uid()));
      for (let i = 0; i < (slot.extra ?? 0); i++) specimens.push(randomSpecimen(rng, rules, script, uid(), infected));
      clients.push({ char: slot.char, lines: slot.lines ?? null, specimens, infected });
      continue;
    }
    const pool = availableVillagers();
    if (!pool.length) continue;
    const char = pool[0];
    used.add(char);
    const infected = rules.hands && rng.chance(script.infected + state.brume * 0.02);
    const count = rng.int(script.basket[0], script.basket[1]);
    const specimens = Array.from({ length: count }, () => randomSpecimen(rng, rules, script, uid(), infected));
    clients.push({ char, lines: null, specimens, infected });
  }

  const total = clients.reduce((sum, c) => sum + c.specimens.length, 0);
  let candleSeconds: number | null = null;
  if (!state.relaxed && !(state.mode === 'campaign' && state.night === 1)) {
    candleSeconds = Math.round((total * 22 + clients.length * 8 + 40) * (state.candleBought ? 1 : 0.7));
  }
  return { night: state.night, rules, clients, candleSeconds };
}

export interface VerdictRecord {
  char: string;
  specimen: Specimen;
  given: Verdict;
  outcome: Outcome;
  pay: number;
}

export interface NightReport {
  verdicts: VerdictRecord[];
  denounced: { char: string; infected: boolean }[];
  ignoredInfected: string[];
  turnedAway: string[];
}

export function emptyReport(): NightReport {
  return { verdicts: [], denounced: [], ignoredInfected: [], turnedAway: [] };
}

export interface Article {
  key: string;
  params?: Record<string, string | number>;
  /** Visual weight: headline, normal, small. */
  size: 'big' | 'normal' | 'small';
}

export interface LedgerLine {
  key: string;
  amount: number;
  params?: Record<string, string | number>;
}

export interface MorningResult {
  articles: Article[];
  ledger: LedgerLine[];
  earned: number;
  /** Ending triggered before expenses (arrest, mist, mycelium). */
  gameOver?: EndingId;
}

/** Applies a finished night to the state and writes the morning paper. */
export function resolveNight(state: GameState, report: NightReport): MorningResult {
  const rules = rulesFor(state.mode, state.night);
  const rng = new Rng(hashSeed(state.seed, 'morning', state.night));
  const articles: Article[] = [];
  const ledger: LedgerLine[] = [];
  let earned = 0;
  const harmed: Record<string, number> = {};
  let fines = 0;
  let wasted = 0;

  for (const v of report.verdicts) {
    earned += v.pay;
    state.stats.specimens++;
    if (v.outcome === 'ok' || v.outcome === 'ok_burned') state.stats.correct++;
    if (v.given === 'burn') state.stats.burned++;
    switch (v.outcome) {
      case 'poison': {
        const harm = eatingHarm(v.specimen, rules);
        harmed[v.char] = Math.max(harmed[v.char] ?? 0, harm);
        break;
      }
      case 'infraction':
        if (state.mode === 'campaign') fines += 2;
        break;
      case 'missedSeize':
        if (rng.chance(0.45)) fines += 4;
        break;
      case 'countPoison':
        fines += 6;
        articles.push({ key: 'countSick', size: 'normal' });
        break;
      case 'escaped':
        state.brume++;
        if (v.given === 'edible' && !CHARACTER_BY_ID[v.char].id.startsWith('cueill')) harmed[v.char] = 3;
        if (v.specimen.lisonGift) state.lisonTaint++;
        break;
      case 'waste':
      case 'wasteBurn':
      case 'wrongSeize':
        wasted++;
        break;
      default:
        break;
    }
  }

  for (const [char, harm] of Object.entries(harmed)) {
    if (char.startsWith('cueill')) continue;
    if (harm === 3) {
      state.disappeared.push(char);
      articles.push({ key: 'disappeared', params: { who: char }, size: 'big' });
    } else if (harm === 2) {
      state.deaths.push(char);
      articles.push({ key: 'death', params: { who: char }, size: 'big' });
    } else if (harm === 1) {
      state.sick[char] = state.night + 2;
      articles.push({ key: 'sick', params: { who: char }, size: 'normal' });
    }
  }

  for (const d of report.denounced) {
    state.arrested.push(d.char);
    state.stats.denounced++;
    if (d.infected) {
      earned += 3;
      if (d.char === 'lison') {
        state.lisonSaved = true;
        articles.push({ key: 'lisonSaved', size: 'big' });
      } else {
        articles.push({ key: 'caught', params: { who: d.char }, size: 'normal' });
      }
    } else {
      state.wrongful.push(d.char);
      articles.push({ key: 'wrongful', params: { who: d.char }, size: 'normal' });
    }
  }
  for (const char of report.ignoredInfected) {
    state.brume++;
    if (char === 'lison') state.lisonTaint++;
  }
  if (report.ignoredInfected.length) articles.push({ key: 'mistSpreads', size: 'small' });
  if (report.turnedAway.length) articles.push({ key: 'turnedAway', params: { n: report.turnedAway.length }, size: 'small' });

  // Story column for the campaign; endless mode gets rotating filler news.
  if (state.mode === 'campaign') {
    articles.push({ key: `story${state.night}`, size: articles.some((a) => a.size === 'big') ? 'normal' : 'big' });
  } else {
    articles.push({ key: `filler${rng.int(1, 6)}`, size: articles.some((a) => a.size === 'big') ? 'normal' : 'big' });
  }
  if (state.brume >= 3) articles.push({ key: state.brume >= 6 ? 'mistHigh' : 'mistLow', size: 'small' });

  ledger.push({ key: 'income', amount: earned, params: { n: report.verdicts.length } });
  if (fines) ledger.push({ key: 'fines', amount: -fines });
  if (wasted) ledger.push({ key: 'wasted', amount: 0, params: { n: wasted } });
  state.money += earned - fines;

  let gameOver: EndingId | undefined;
  if (state.deaths.length >= DEATHS_FOR_ARREST) gameOver = 'arrete';
  else if (state.contamination >= CONTAMINATION_MAX) gameOver = 'cueilleur';
  else if (state.brume >= BRUME_MAX) gameOver = 'brume';
  return { articles, ledger, earned: earned - fines, gameOver };
}

export interface Expenses {
  candles: boolean;
  meal: boolean;
}

/** Pays the morning bills and advances to the next night. Returns an ending if the game stops. */
export function payAndAdvance(state: GameState, exp: Expenses): EndingId | undefined {
  state.money -= rentFor(state.night) + (exp.candles ? CANDLE_COST : 0) + (exp.meal ? MEAL_COST : 0);
  state.candleBought = exp.candles;
  if (exp.meal) {
    state.mealsSkipped = 0;
  } else {
    state.mealsSkipped++;
    state.contamination++;
  }
  if (state.money < DEBT_LIMIT) return 'dette';
  if (state.contamination >= CONTAMINATION_MAX) return 'cueilleur';
  state.night++;
  return undefined;
}

export function isFinalNight(state: GameState): boolean {
  return state.mode === 'campaign' && state.night >= NIGHT_COUNT;
}

export function finalEnding(state: GameState): EndingId {
  if (state.brume >= 6) return 'brume';
  if (state.lisonTaint >= 2 && !state.lisonSaved) return 'lison';
  if (state.deaths.length <= 1 && state.disappeared.length === 0 && state.brume <= 2) return 'officine';
  return 'mycologue';
}

/** Contamination gained by tasting a specimen. */
export function tasteContamination(s: Specimen): number {
  if (s.anomaly || s.mimic) return 3;
  const sp = SPECIES_BY_ID[s.speciesId!];
  return sp.danger === 2 ? 2 : sp.danger === 1 ? 1 : 0;
}
