import { describe, expect, it } from 'vitest';
import { CLAUSES, PERKS, REALMS, ROYAL, STAFF, UPGRADES } from '../src/data/content';
import { ACHIEVEMENTS } from '../src/game/state';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';

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
  it('name every realm, claim, clause, staff, upgrade, perk and achievement', () => {
    for (const loc of [fr, en]) {
      const has = (group: object, id: string) => expect((group as Record<string, unknown>)[id], id).toBeDefined();
      for (const r of REALMS) {
        has(loc.realms, r.id);
        for (const c of [...r.claims, r.boss]) has(loc.claims, c.id);
      }
      has(loc.claims, ROYAL.id);
      for (const c of CLAUSES) has(loc.clauses, c.id);
      for (const s of STAFF) has(loc.staff, s.id);
      for (const u of UPGRADES) has(loc.upgrades, u.id);
      for (const p of PERKS) has(loc.perks, p.id);
      for (const a of ACHIEVEMENTS) has(loc.achievements, a);
    }
  });
});
