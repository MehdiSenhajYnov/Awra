import { describe, expect, it } from 'vitest';
import { NOTES } from '../src/game/notes';
import { ABILITY_ORDER } from '../src/game/player';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ZONES } from '../src/world/room';
import { ROOMS } from '../src/world/world';

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, shape((value as Record<string, unknown>)[k])]));
  return typeof value;
}

describe('locales', () => {
  it('fr and en have the same structure', () => {
    expect(shape(en)).toEqual(shape(fr));
  });
  it('name every zone, note, ability, hint, page and NPC used in the world', () => {
    for (const loc of [fr, en]) {
      for (const z of ZONES) expect(loc.zones[z], z).toBeDefined();
      for (const n of NOTES) expect((loc.notes as Record<string, unknown>)[n.id], n.id).toBeDefined();
      for (const a of ABILITY_ORDER) expect((loc.abilities as Record<string, unknown>)[a], a).toBeDefined();
      for (const r of ROOMS) for (const [k, , , o] of r.ents ?? []) {
        const opts = (o ?? {}) as Record<string, string>;
        if (k === 'hint') expect((loc.hints as Record<string, unknown>)[opts.text], opts.text).toBeDefined();
        if (k === 'page') expect((loc.pages as Record<string, unknown>)[`p${opts.value}`], `page ${opts.value}`).toBeDefined();
        if (k === 'npc') expect((loc.npc as Record<string, unknown>)[opts.who], opts.who).toBeDefined();
        if (k === 'note') expect((loc.notes as Record<string, unknown>)[opts.value], opts.value).toBeDefined();
      }
    }
  });
  it('every page of lore is placed exactly once', () => {
    const pages = ROOMS.flatMap((r) => (r.ents ?? []).filter((e) => e[0] === 'page').map((e) => (e[3] as { value: string }).value));
    expect(new Set(pages).size).toBe(pages.length);
    expect(pages.length).toBe(20);
  });
});
