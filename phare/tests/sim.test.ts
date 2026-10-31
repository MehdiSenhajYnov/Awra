import { describe, expect, it } from 'vitest';
import { DECORATIONS, SHIPS, UPGRADES, WRECKS } from '../src/data/content';
import {
  type GameState, buyDecoration, buyLens, buyUpgrade, decodeBottle, engageStorm, fish, horn, lensCost, lightShip, maintain,
  newGame, offlineProgress, redeemBottle, tick, upgradeCost, writeBottle,
} from '../src/game/state';

const opts = { stormEvery: 45 };

/** A keeper at the desk: glances every `glance` seconds, maintains, fishes, plays storms, shops. */
function play(s: GameState, seconds: number, glance = 120, saveRate = 0.8): void {
  let next = 0;
  for (let t = 0; t < seconds; t++) {
    const events = tick(s, 1, opts);
    for (const e of events) if (e.kind === 'stormWaiting') engageStorm(s);
    if (s.storm.phase === 'active') {
      for (const ship of s.ships) if (ship.storm?.state === 'approach' && ship.x < 0.75 && (ship.uid % 10) / 10 < saveRate) lightShip(s, ship.uid, 1);
      horn(s);
    }
    if (t < next) continue;
    next = t + glance;
    maintain(s, 'oil');
    maintain(s, 'clean');
    maintain(s, 'spring');
    for (const w of [...s.floating]) fish(s, w.uid);
    const lc = lensCost(s);
    if (lc !== null && s.sous >= lc) buyLens(s);
    for (const u of UPGRADES) { const c = upgradeCost(s, u.id); if (c !== null && c < s.sous * 0.5) buyUpgrade(s, u.id); }
    for (const d of DECORATIONS) if (d.cost < s.sous * 0.3) buyDecoration(s, d.id);
  }
}

describe('pacing', () => {
  it('a keeper at the desk fills the register over a few days of work', () => {
    const s = newGame(3);
    const marks: string[] = [];
    let lensDone = 0;
    for (let h = 1; h <= 40; h++) {
      play(s, 3600);
      if (!lensDone && s.lens === 5) lensDone = h;
      if (h % 4 === 0) marks.push(`${h}h: ${Object.keys(s.registry).length}/${SHIPS.length} ships, ${Object.keys(s.wrecks).length}/${WRECKS.length} wrecks, lens ${s.lens}, sous ${Math.round(s.sous)}, deco ${s.decorations.length}`);
    }
    console.log(marks.join('\n'), '\nlens 1st order at', lensDone, 'h; saved', s.stats.saved, 'aground', s.stats.aground);
    console.log('missing', SHIPS.filter((d) => !s.registry[d.id]).map((d) => d.id).join(','), WRECKS.filter((w) => !s.wrecks[w.id]).map((w) => w.id).join(','));
    expect(lensDone).toBeGreaterThan(4);
    expect(lensDone).toBeLessThan(30);
    expect(Object.keys(s.registry).length).toBeGreaterThanOrEqual(SHIPS.length - 2);
  });

  it('absences are summarised and never punish', () => {
    const s = newGame(5);
    play(s, 1800);
    const before = s.sous;
    s.lastSeen = Date.now() - 6 * 3600 * 1000;
    const away = offlineProgress(s, Date.now(), opts);
    expect(away.ships).toBeGreaterThan(300);
    expect(s.sous).toBeGreaterThan(before);
    expect(s.registry.fantome).toBeUndefined();
  });

  it('bottles travel between two lighthouses once', () => {
    const a = newGame(11);
    const b = newGame(12);
    play(a, 3600);
    a.keeperName = 'Maïwenn';
    a.sous = Math.max(a.sous, 200);
    const ship = Object.keys(a.registry)[0];
    const code = writeBottle(a, ship, { kind: 'sous', amount: 100 })!;
    expect(code).toMatch(/^[0-9A-Z-]+$/);
    expect(decodeBottle(code.toLowerCase())?.name).toBe('Maïwenn');
    expect(redeemBottle(a, code)).toEqual({ ok: false, reason: 'own' });
    const r = redeemBottle(b, code);
    expect(r.ok).toBe(true);
    expect(b.sous).toBe(100);
    expect(b.registry[ship]).toBeDefined();
    expect(redeemBottle(b, code)).toEqual({ ok: false, reason: 'used' });
    expect(redeemBottle(b, code.slice(0, -3) + 'AAA').ok).toBe(false);
  });
});
