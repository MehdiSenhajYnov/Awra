import { describe, expect, it } from 'vitest';
import { playthrough } from '../src/world/reach';

describe('completability', () => {
  it('the whole world can be finished in order, with every item reachable', () => {
    const log: string[] = [];
    const t0 = Date.now();
    const r = playthrough(log);
    console.log(log.join(' → '));
    console.log(`checked in ${Math.round((Date.now() - t0) / 1000)} s; missing:\n${r.missing.join('\n')}`);
    expect(r.prog.bosses.has('silence')).toBe(true);
    expect(r.missing).toEqual([]);
  }, 600000);
});

describe('each ability is really needed', () => {
  const cases: [string, string][] = [['dash', 'gargouille'], ['walljump', 'mere'], ['swap', 'souffleur'], ['double', 'jumeaux'], ['slam', 'cantatrice'], ['grapple', 'noye']];
  for (const [ability, boss] of cases) {
    it(`without ${ability}, ${boss} cannot be reached`, () => {
      const r = playthrough([], ability as never);
      expect(r.prog.bosses.has(boss)).toBe(false);
    }, 600000);
  }
});
