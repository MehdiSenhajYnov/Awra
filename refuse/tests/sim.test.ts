import { describe, expect, it } from 'vitest';
import { CLAUSE_BY_ID, PERKS, STAFF, UPGRADES } from '../src/data/content';
import {
  type GameState, approve, bankrupt, buyClause, buyPerk, buyStaff, buyUpgrade, canPlead, clauseCost, clauseFits,
  guildClauses, newGame, refuse, redraw, staffCost, startTrial, tick, trialAnswer, trialFits, upgradeCost,
} from '../src/game/state';

/** An attentive player: one decision every `pace` seconds, buys the cheapest useful thing. */
function play(s: GameState, seconds: number, pace = 2.5, log?: string[]): void {
  for (let t = 0; t < seconds; t += pace) {
    tick(s, pace);
    if (s.trial) {
      const tr = s.trial;
      // Use the most specific fitting clause first, keep the catch-all ones for later.
      const idx = tr.hand.map((c, i) => ({ c, i })).filter(({ i }) => trialFits(s, i))
        .sort((a, b) => CLAUSE_BY_ID[b.c].tags.length - CLAUSE_BY_ID[a.c].tags.length)[0];
      trialAnswer(s, idx ? idx.i : null);
      continue;
    }
    if (canPlead(s)) { log?.push(`r${s.realm}f${s.floor}@${Math.round(s.time / 60)}`); startTrial(s); continue; }
    if (s.floor >= 3) {
      for (const p of PERKS) buyPerk(s, p.id);
      const realm = s.realm;
      log?.push(`+${bankrupt(s)} shares`);
      for (const p of PERKS) while (buyPerk(s, p.id));
      log?.push(`realm ${realm} done at ${Math.round(s.time / 60)} min`);
      if (s.ended) return;
      continue;
    }
    // Spend: upgrades, then staff, then a specific clause now and then.
    for (const u of UPGRADES) if (u.floor <= s.floor && upgradeCost(s, u.id) < s.ecus * 0.6) buyUpgrade(s, u.id);
    for (const st of [...STAFF].reverse()) {
      if (st.floor > s.floor || staffCost(s, st.id) >= s.ecus * 0.5) continue;
      // Hire calming staff when the village is restless, workers otherwise.
      if ((st.scandal < 0) === (s.scandal > 45)) buyStaff(s, st.id);
    }
    const shop = guildClauses(s).filter((c) => clauseCost(c.id) < s.ecus * 0.2 && s.deck.filter((d) => d === c.id).length < 2);
    if (shop.length) buyClause(s, shop[0].id);
    if (s.scandal > 70) { approve(s); continue; }
    const claim = s.claim!;
    if (claim.type.id === 'royal') { approve(s); continue; }
    const fit = s.hand.findIndex((c) => clauseFits(s, CLAUSE_BY_ID[c], claim));
    if (fit >= 0) refuse(s, fit);
    else if (s.scandal < 40) redraw(s);
    else approve(s);
  }
}

describe('incremental pacing', () => {
  it('an active player clears the four realms in a few hours', () => {
    const log: string[] = [];
    const s = newGame(7);
    play(s, 8 * 3600, 2.5, log);
    console.log(log.join(' | '), '| ended', s.ended, 'refused', s.stats.refused, 'riots', s.stats.riots);
    expect(log.length).toBeGreaterThanOrEqual(3);
    expect(s.ended).toBe(true);
  });

  it('a slow, half-idle player still progresses through the first realm', () => {
    const log: string[] = [];
    const s = newGame(9);
    play(s, 3 * 3600, 8, log);
    console.log('slow:', log.join(' | '), '| floor', s.floor, 'realm', s.realm);
    expect(s.realm + s.floor).toBeGreaterThanOrEqual(2);
  });
});
