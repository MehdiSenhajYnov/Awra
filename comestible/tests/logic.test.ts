import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { NIGHTS, NIGHT_COUNT } from '../src/data/nights';
import { SPECIES, SPECIES_BY_ID } from '../src/data/species';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { Rng } from '../src/game/rng';
import { correctVerdict, judge, payFor, rulesFor, type Specimen, type Verdict } from '../src/game/rules';
import {
  type GameState, type NightReport, emptyReport, finalEnding, isFinalNight, newGame,
  payAndAdvance, planNight, resolveNight,
} from '../src/game/state';

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, shape((value as Record<string, unknown>)[k])]));
  }
  return typeof value;
}

describe('locales', () => {
  it('fr and en have the same structure', () => {
    expect(shape(en)).toEqual(shape(fr));
  });

  it('cover every species, character and scripted line', () => {
    for (const s of SPECIES) expect(fr.species[s.id as keyof typeof fr.species]).toBeDefined();
    for (const c of CHARACTERS) {
      expect(fr.chars[c.id as keyof typeof fr.chars]).toBeDefined();
      expect(fr.greet[c.id as keyof typeof fr.greet]).toBeDefined();
    }
    for (const night of Object.values(NIGHTS)) {
      for (const c of night.clients) {
        if (c?.lines) expect(fr.scripted[c.lines as keyof typeof fr.scripted], c.lines).toBeDefined();
      }
    }
    for (let n = 1; n <= NIGHT_COUNT; n++) expect(fr.articles[`story${n}` as keyof typeof fr.articles]).toBeDefined();
  });
});

describe('rules', () => {
  const base: Specimen = { uid: 'x', speciesId: 'cepe', sizeCm: 10, hasBase: true, wormy: false, flip: false, rot: 0, hue: 0 };

  it('follows species danger', () => {
    expect(correctVerdict(base, rulesFor('campaign', 1))).toBe('edible');
    expect(correctVerdict({ ...base, speciesId: 'blanche_mort' }, rulesFor('campaign', 1))).toBe('toxic');
  });

  it('applies the rules in priority order', () => {
    const n4 = rulesFor('campaign', 4);
    expect(correctVerdict({ ...base, sizeCm: 18 }, n4)).toBe('seize');
    expect(correctVerdict({ ...base, sizeCm: 18, hasBase: false }, n4)).toBe('toxic');
    expect(correctVerdict({ ...base, sizeCm: 18, mimic: 'couteau' }, n4)).toBe('burn');
    expect(correctVerdict({ ...base, sizeCm: 18 }, rulesFor('campaign', 8))).toBe('edible');
    expect(correctVerdict({ ...base, speciesId: 'pied_bleu' }, rulesFor('campaign', 8))).toBe('toxic');
    expect(correctVerdict({ ...base, wormy: true }, rulesFor('campaign', 5))).toBe('toxic');
  });

  it('judges mistakes', () => {
    const r = rulesFor('campaign', 5);
    expect(judge({ ...base, speciesId: 'blanche_mort' }, 'edible', r)).toBe('poison');
    expect(judge(base, 'toxic', r)).toBe('waste');
    expect(judge({ ...base, speciesId: 'lepiote_veuve' }, 'burn', r)).toBe('ok_burned');
    expect(judge({ ...base, mimic: 'nez' }, 'edible', r)).toBe('escaped');
  });
});

describe('nights', () => {
  it('are deterministic and populated', () => {
    for (let n = 1; n <= NIGHT_COUNT; n++) {
      const s = newGame('campaign', false, 42);
      s.night = n;
      const a = planNight(s);
      const b = planNight(s);
      expect(a).toEqual(b);
      expect(a.clients.length).toBeGreaterThan(2);
      for (const c of a.clients) {
        for (const sp of c.specimens) {
          if (sp.speciesId) expect(SPECIES_BY_ID[sp.speciesId].night).toBeLessThanOrEqual(n);
          if (sp.mimic) expect(a.rules.tools).toContain(sp.mimic);
        }
      }
    }
  });
});

type Player = (rng: Rng, s: Specimen, right: Verdict) => Verdict;

function playCampaign(player: Player, seed: number, denounce: boolean) {
  const state: GameState = newGame('campaign', false, seed);
  const rng = new Rng(seed);
  const money: number[] = [];
  for (;;) {
    const plan = planNight(state);
    const report: NightReport = emptyReport();
    for (const c of plan.clients) {
      if (c.infected && plan.rules.hands) {
        if (denounce) report.denounced.push({ char: c.char, infected: true });
        else report.ignoredInfected.push(c.char);
      }
      for (const sp of c.specimens) {
        const right = correctVerdict(sp, plan.rules);
        const given = player(rng, sp, right);
        const outcome = judge(sp, given, plan.rules);
        report.verdicts.push({ char: c.char, specimen: sp, given, outcome, pay: payFor(outcome, given) });
      }
    }
    const morning = resolveNight(state, report);
    for (const a of morning.articles) expect(fr.articles[a.key as keyof typeof fr.articles], a.key).toBeDefined();
    if (morning.gameOver) return { ending: morning.gameOver, state, money };
    if (isFinalNight(state)) return { ending: finalEnding(state), state, money };
    const ending = payAndAdvance(state, { candles: true, meal: true });
    money.push(state.money);
    if (ending) return { ending, state, money };
  }
}

describe('campaign balance', () => {
  it('a perfect player reaches the good ending without debt', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = playCampaign((_, __, right) => right, seed, true);
      expect(r.ending).toBe('officine');
      console.log('perfect player money:', r.money.join(','));
      expect(Math.min(...r.money)).toBeGreaterThan(-10);
    }
  });

  it('a careless player gets punished', () => {
    const verdicts: Verdict[] = ['edible', 'toxic'];
    const endings = [1, 2, 3, 4, 5].map((seed) => playCampaign((rng) => rng.pick(verdicts), seed, false).ending);
    expect(endings.every((e) => e !== 'officine')).toBe(true);
  });

  it('an 85% accurate player usually survives the campaign', () => {
    const all: Verdict[] = ['edible', 'toxic', 'burn', 'seize'];
    const results = [11, 12, 13, 14, 15, 16].map((seed) =>
      playCampaign((rng, _, right) => (rng.chance(0.85) ? right : rng.pick(all)), seed, true));
    const finished = results.filter((r) => ['officine', 'mycologue', 'lison', 'brume'].includes(r.ending));
    console.log('85% player:', results.map((r) => `${r.ending}@${r.state.night} money=${r.money.join(',')}`).join(' | '));
    expect(finished.length).toBeGreaterThanOrEqual(2);
  });
});

describe('seasons mode', () => {
  it('runs many nights for a perfect player and reports valid articles', () => {
    const state = newGame('endless', false, 99);
    for (let n = 0; n < 15; n++) {
      const plan = planNight(state);
      expect(plan.clients.length).toBeGreaterThan(3);
      const report = emptyReport();
      for (const c of plan.clients) {
        if (c.infected) report.denounced.push({ char: c.char, infected: true });
        for (const sp of c.specimens) {
          const right = correctVerdict(sp, plan.rules);
          report.verdicts.push({ char: c.char, specimen: sp, given: right, outcome: judge(sp, right, plan.rules), pay: payFor('ok', right) });
        }
      }
      const morning = resolveNight(state, report);
      for (const a of morning.articles) expect(fr.articles[a.key as keyof typeof fr.articles], a.key).toBeDefined();
      expect(morning.gameOver).toBeUndefined();
      expect(payAndAdvance(state, { candles: true, meal: true })).toBeUndefined();
    }
  });
});
