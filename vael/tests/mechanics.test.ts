import { describe, expect, it } from 'vitest';
import { TILE } from '../src/engine/core';
import { flatRoom, makeScene, run } from './helpers';

function place(s: ReturnType<typeof makeScene>, tx: number) {
  const p = s.player;
  p.body.x = tx * TILE;
  p.body.y = 22 * TILE - p.body.h;
  p.body.onGround = true;
  run(s, 2);
}

describe('movement', () => {
  it('a full jump rises about eleven tiles, a tap about five', () => {
    const s = makeScene([], flatRoom('t_jump'));
    place(s, 10);
    const ground = s.player.feet;
    let top = ground;
    run(s, 60, (f) => ({ jumpPressed: f === 0, jumpHeld: true }));
    for (let f = 0; f < 60; f++) { s.update({ ...ctlNone() }); }
    const s2 = makeScene([], flatRoom('t_jump2'));
    place(s2, 10);
    let top2 = s2.player.feet;
    for (let f = 0; f < 60; f++) {
      s2.update({ ...ctlNone(), jumpPressed: f === 0, jumpHeld: true });
      top2 = Math.min(top2, s2.player.feet);
    }
    const s3 = makeScene([], flatRoom('t_jump3'));
    place(s3, 10);
    let top3 = s3.player.feet;
    for (let f = 0; f < 60; f++) {
      s3.update({ ...ctlNone(), jumpPressed: f === 0, jumpHeld: f < 3 });
      top3 = Math.min(top3, s3.player.feet);
    }
    void top;
    const full = (ground - top2) / TILE;
    const tap = (ground - top3) / TILE;
    expect(full).toBeGreaterThan(9.5);
    expect(full).toBeLessThan(12.5);
    expect(tap).toBeGreaterThan(3);
    expect(tap).toBeLessThan(7);
  });
});

function ctlNone() {
  return { x: 0, y: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, bladePressed: false, blinkPressed: false, dashPressed: false, healHeld: false, artPressed: false, artHeld: false, interactPressed: false };
}

describe('the bound blade', () => {
  it('lodges in a wall and becomes a foothold the hero can stand on', () => {
    const s = makeScene([], flatRoom('t_blade', { solid: [[0, 22, 48, 5], [30, 0, 18, 22]] }));
    place(s, 24);
    run(s, 2, { x: 1 });
    run(s, 1, { bladePressed: true });
    run(s, 20);
    expect(s.blade.state).toBe('stuck');
    expect(s.blade.wallSide).toBe(1);
    const ledge = s.blade.ledge()!;
    expect(ledge).toBeTruthy();
    // Drop the hero just above the ledge: it must hold.
    const p = s.player;
    p.body.x = ledge.x + 10;
    p.body.y = ledge.y - p.body.h - 30;
    p.body.vy = 0;
    run(s, 30);
    expect(p.body.onGround).toBe(true);
    expect(Math.abs(p.feet - ledge.y)).toBeLessThan(2);
  });

  it('climbs a cliff too high to jump, by throwing the blade while rising', () => {
    // A 14-tile cliff: a jump alone reaches about 11.
    const s = makeScene([], flatRoom('t_climb', { solid: [[0, 22, 48, 5], [30, 8, 18, 14]] }));
    place(s, 27);
    const p = s.player;
    // Hug the wall, jump, throw early in the rise, keep holding right to land on the hilt, then jump again.
    let onLedge = false;
    const log: string[] = [];
    for (let f = 0; f < 200; f++) {
      log.push(`${f} feet=${(p.feet / TILE).toFixed(1)} g=${p.body.onGround} blade=${s.blade.state} x=${(p.cx / TILE).toFixed(1)}`);
      const c = { ...ctlNone(), x: 1, jumpHeld: true, jumpPressed: f === 2, bladePressed: f === 8 };
      if (onLedge && p.body.onGround) c.jumpPressed = true;
      s.update(c);
      if (s.blade.state === 'stuck' && p.body.onGround && p.feet < 21 * TILE) onLedge = true;
      if (p.feet <= 8 * TILE + 1 && p.body.onGround) break;
    }
    if (p.feet > 8 * TILE + 1) console.log(log.filter((_, i) => i % 4 === 0).join('\n'));
    expect(onLedge).toBe(true);
    expect(p.feet).toBeLessThanOrEqual(8 * TILE + 1);
  });

  it('pierces foes on the way back', () => {
    const s = makeScene([], flatRoom('t_recall', { solid: [[0, 22, 48, 5], [40, 0, 8, 22]], ents: [['acarien', 30, 21], ['acarien', 35, 21]] }));
    place(s, 26);
    const foes = s.entities.filter((e) => e.sprite === 'acarien');
    for (const f of foes) { f.hp = f.maxHp = 1000; f.body.y -= 2000; }
    for (const f of foes) { (f as unknown as { update(): void }).update = () => {}; }
    run(s, 1, { bladePressed: true, x: 1 });
    run(s, 20);
    expect(s.blade.state).toBe('stuck');
    // Now the foes stand between the hero and the blade; the recall cuts through both.
    for (const f of foes) f.body.y += 2000;
    run(s, 1, { bladePressed: true });
    run(s, 30);
    expect(s.blade.state).toBe('held');
    expect(foes.every((f) => f.hp < 1000)).toBe(true);
  });
});

describe('combat', () => {
  it('a dash through a blow at the last instant triggers the Eclipse', () => {
    const s = makeScene(['dash'], flatRoom('t_dodge'));
    place(s, 10);
    run(s, 1, { dashPressed: true, x: 1 });
    s.hurtPlayer(1, s.player.cx + 50);
    expect(s.eclipse).toBeGreaterThan(0);
    expect(s.player.hp).toBe(s.player.maxHp);
  });

  it('a blow outside the dash hurts', () => {
    const s = makeScene(['dash'], flatRoom('t_hurt'));
    place(s, 10);
    s.hurtPlayer(1, s.player.cx + 50);
    expect(s.player.hp).toBe(s.player.maxHp - 1);
  });
});
