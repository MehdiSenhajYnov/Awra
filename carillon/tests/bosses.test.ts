import { describe, expect, it } from 'vitest';
import { NO_CONTROLS, type Controls } from '../src/game/player';
import { newSave } from '../src/game/save';
import { Scene } from '../src/game/scene';
import { Rng } from '../src/engine/core';
import { ROOMS } from '../src/world/world';

const ARENAS: Record<string, string> = {};
for (const r of ROOMS) for (const e of r.ents ?? []) if (e[0] === 'arena' && !(e[3] as { variant?: string }).variant) ARENAS[(e[3] as { boss: string }).boss] = r.id;

/** Tin level a player would normally have reached by each keeper. */
const TIN: Record<string, number> = { dechu: 0, gargouille: 0, mere: 1, souffleur: 1, jumeaux: 2, cantatrice: 2, noye: 3, echappement: 3, silence: 4 };

/**
 * An invulnerable bot that walks to the boss and keeps striking (up when it is above, down when below, jumping
 * to reach flyers). It proves every keeper can be struck down and that its phases play out.
 */
function fight(boss: string): { frames: number; phases: number; won: boolean } {
  const save = newSave(1);
  save.abilities = ['echo', 'dash', 'walljump', 'swap', 'double', 'slam', 'grapple'];
  save.tin = TIN[boss];
  const scene = new Scene(save);
  scene.headless = true;
  scene.god = true;
  // Fixed seed: the fight plays out the same way on every run.
  scene.rng = new Rng(1234);
  const room = ARENAS[boss];
  scene.enter(room);
  const p = scene.player;
  p.body.x = scene.room.w * 10;
  p.body.y = 200;
  p.safe = { x: p.body.x, y: 15 * 20 - p.body.h };
  let maxPhase = 1;
  for (let f = 0; f < 60 * 300; f++) {
    const b = scene.boss;
    const c: Controls = { ...NO_CONTROLS };
    if (b && !b.dead) {
      const dx = b.cx - p.cx;
      const dy = b.cy - p.cy;
      c.x = Math.abs(dx) > 18 ? Math.sign(dx) : 0;
      if (dy < -30 && p.body.onGround) { c.jumpPressed = true; c.jumpHeld = true; }
      if (!p.body.onGround) c.jumpHeld = true;
      c.y = dy < -24 ? -1 : dy > 30 && !p.body.onGround ? 1 : 0;
      // Standing on a ledge above the keeper: drop through it.
      if (dy > 40 && p.body.onGround && f % 20 === 0) { c.y = 1; c.jumpPressed = true; }
      c.attackPressed = Math.abs(dx) < 50 && Math.abs(dy) < 70 && f % 3 === 0;
      maxPhase = Math.max(maxPhase, (b as unknown as { phase: number }).phase);
      if (process.env.BOSS_DEBUG && f % 600 === 0) console.log(boss, f, b.hp, Math.round(b.cx), Math.round(b.cy), Math.round(p.cx), Math.round(p.cy), (b as any).act);
      // The final keeper only falls to the three bells: ring them once it is bared.
      if (boss === 'silence' && (b as unknown as { phase: number }).phase === 3) scene.setFlag('final_ring');
    }
    scene.update(c);
    // Over the drowned keeper's black water the bot stands on an invisible plank (navigation is not under test here).
    if (boss === 'noye') { p.body.y = 11 * 20 - p.body.h; p.body.vy = Math.min(p.body.vy, 0); p.body.onGround = true; }
    if (scene.flags[`boss_${boss}`]) return { frames: f, phases: maxPhase, won: true };
  }
  return { frames: -1, phases: maxPhase, won: false };
}

describe('every keeper can be beaten', () => {
  for (const boss of Object.keys(TIN)) {
    it(boss, () => {
      const r = fight(boss);
      console.log(`${boss}: ${r.won ? `${(r.frames / 60).toFixed(0)} s` : 'NOT BEATEN'}, phases seen ${r.phases}`);
      expect(r.won).toBe(true);
      expect(r.phases).toBe(3);
    }, 120000);
  }
});
