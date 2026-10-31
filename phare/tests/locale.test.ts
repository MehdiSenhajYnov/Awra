import { describe, expect, it } from 'vitest';
import { DECORATIONS, SHIPS, UPGRADES, WRECKS, BOTTLE_MESSAGES } from '../src/data/content';
import { HONOURS } from '../src/game/state';
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
  it('name every ship, wreck, upgrade, decoration and honour, and hold every bottle message', () => {
    for (const loc of [fr, en]) {
      const has = (group: object, id: string) => expect((group as Record<string, unknown>)[id], id).toBeDefined();
      for (const s of SHIPS) has(loc.ships, s.id);
      for (const w of WRECKS) has(loc.wrecks, w.id);
      for (const u of UPGRADES) has(loc.upgrades, u.id);
      for (const d of DECORATIONS) has(loc.decorations, d.id);
      for (const h of HONOURS) has(loc.honours, h);
      expect(loc.messages.length).toBe(BOTTLE_MESSAGES);
    }
  });
});
