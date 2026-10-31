import { SPECIES_BY_ID, type Tool, type VisualAnomaly, TOOLS, TOOL_NIGHT } from '../data/species';

export type Verdict = 'edible' | 'toxic' | 'burn' | 'seize';
export type Mode = 'campaign' | 'endless';

export interface RuleSet {
  /** Specimens with a cut stem are refused (night 2). */
  base: boolean;
  /** "Au feu" stamp; visual anomalies appear (night 3). */
  burn: boolean;
  /** Count's decree: saffron milkcaps and ceps over 15 cm are seized (nights 4-7). */
  decree: boolean;
  /** Wormy specimens are refused (night 5). */
  wormy: boolean;
  /** Mimics exist; any abnormal sign means fire (night 5). */
  mimics: boolean;
  /** Hand check and denunciation (night 7). */
  hands: boolean;
  /** Bluefoots drank the grey rain and are refused (night 8). */
  piedBleuBanned: boolean;
  tools: Tool[];
  /** Highest species night available. */
  speciesNight: number;
}

export function rulesFor(mode: Mode, night: number): RuleSet {
  if (mode === 'endless') {
    return {
      base: true, burn: true, decree: false, wormy: true, mimics: true, hands: true,
      piedBleuBanned: false, tools: [...TOOLS], speciesNight: 99,
    };
  }
  return {
    base: night >= 2,
    burn: night >= 3,
    decree: night >= 4 && night <= 7,
    wormy: night >= 5,
    mimics: night >= 5,
    hands: night >= 7,
    piedBleuBanned: night >= 8,
    tools: TOOLS.filter((t) => TOOL_NIGHT[t] <= night),
    speciesNight: night,
  };
}

export interface Specimen {
  uid: string;
  /** Species whose look the specimen has (absent for visual anomalies). */
  speciesId?: string;
  anomaly?: VisualAnomaly;
  /** Mimic: looks like `speciesId`, betrayed by this tool. */
  mimic?: Tool;
  sizeCm: number;
  hasBase: boolean;
  wormy: boolean;
  flip: boolean;
  rot: number;
  hue: number;
  lisonGift?: boolean;
}

export const SEIZE_CEPE_CM = 15;

export function isSeizable(s: Specimen): boolean {
  return s.speciesId === 'lactaire_delicieux' || (s.speciesId === 'cepe' && s.sizeCm > SEIZE_CEPE_CM);
}

export function isAbnormal(s: Specimen): boolean {
  return !!s.anomaly || !!s.mimic;
}

export function correctVerdict(s: Specimen, rules: RuleSet): Verdict {
  if (isAbnormal(s)) return 'burn';
  if (rules.base && !s.hasBase) return 'toxic';
  if (rules.wormy && s.wormy) return 'toxic';
  const sp = SPECIES_BY_ID[s.speciesId!];
  if (sp.danger > 0) return 'toxic';
  if (rules.piedBleuBanned && sp.id === 'pied_bleu') return 'toxic';
  if (rules.decree && isSeizable(s)) return 'seize';
  return 'edible';
}

/** What actually happens to whoever eats the specimen: 0 harmless, 1 sick, 2 dead, 3 taken by the mist. */
export function eatingHarm(s: Specimen, rules: RuleSet): 0 | 1 | 2 | 3 {
  if (isAbnormal(s)) return 3;
  const sp = SPECIES_BY_ID[s.speciesId!];
  if (sp.danger > 0) return sp.danger;
  if (s.wormy) return 1;
  if (rules.piedBleuBanned && sp.id === 'pied_bleu') return 1;
  return 0;
}

export type Outcome =
  | 'ok'           // right verdict
  | 'ok_burned'    // toxic burned: safe but wasteful
  | 'waste'        // edible thrown away
  | 'wasteBurn'    // edible burned (lamp oil wasted)
  | 'poison'       // harmful specimen handed back to be eaten
  | 'infraction'   // harmless but forbidden (no base) handed back
  | 'missedSeize'  // seizable specimen handed back
  | 'wrongSeize'   // non-seizable specimen seized
  | 'countPoison'  // harmful specimen sent to the count's table
  | 'escaped';     // abnormal specimen not burned

export const PAY: Record<Verdict, number> = { edible: 2, toxic: 2, burn: 2, seize: 1 };

export function judge(s: Specimen, given: Verdict, rules: RuleSet): Outcome {
  const right = correctVerdict(s, rules);
  if (given === right) return 'ok';
  if (right === 'burn') return 'escaped';
  if (given === 'burn') return right === 'toxic' ? 'ok_burned' : 'wasteBurn';
  if (given === 'edible') {
    if (right === 'seize') return 'missedSeize';
    return eatingHarm(s, rules) > 0 ? 'poison' : 'infraction';
  }
  if (given === 'seize') {
    return eatingHarm(s, rules) > 0 ? 'countPoison' : 'wrongSeize';
  }
  // given toxic
  return 'waste';
}

export function payFor(outcome: Outcome, given: Verdict): number {
  if (outcome === 'ok') return PAY[given];
  if (outcome === 'ok_burned') return 0;
  if (outcome === 'wasteBurn') return -1;
  if (outcome === 'poison' || outcome === 'infraction' || outcome === 'missedSeize') return PAY.edible;
  return 0;
}
