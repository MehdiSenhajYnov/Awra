import { describe, expect, it } from 'vitest';
import { TILE } from '../src/engine/core';
import { Guard, Walker } from '../src/game/enemies';
import { NO_CONTROLS, type Controls } from '../src/game/player';
import { BellSwitch } from '../src/game/props';
import { newSave } from '../src/game/save';
import { Scene } from '../src/game/scene';
import { T, tileAt } from '../src/world/room';

function scene(room: string, abilities: string[] = ['echo', 'dash', 'walljump', 'swap', 'double', 'slam', 'grapple']): Scene {
  const save = newSave(1);
  save.abilities = abilities as never;
  const s = new Scene(save);
  s.headless = true;
  s.enter(room);
  s.entities = s.entities.filter((e) => e.prop);
  return s;
}

function run(s: Scene, frames: number, c: Partial<Controls> | ((f: number) => Partial<Controls>) = {}): void {
  for (let f = 0; f < frames; f++) s.update({ ...NO_CONTROLS, ...(typeof c === 'function' ? c(f) : c) });
}

function stand(s: Scene, tx: number, ty = 15): void {
  s.player.place(tx * TILE + TILE / 2, ty * TILE);
  s.player.body.onGround = true;
  run(s, 2);
}

describe('mechanics', () => {
  it('the echo replays a swing where it happened and hurts what is there', () => {
    const s = scene('b_cloche');
    stand(s, 8);
    const dummy = new Walker(s, 10 * TILE, 15 * TILE, 'ver');
    dummy.hp = dummy.maxHp = 50;
    dummy.update = () => undefined;
    s.spawn(dummy);
    s.player.facing = 1;
    run(s, 1, { attackPressed: true });
    run(s, 20);
    const afterPlayer = dummy.hp;
    expect(afterPlayer).toBeLessThan(50);
    run(s, 40, { x: -1 });
    s.player.res = 1;
    run(s, 1, { echoPressed: true });
    expect(s.echoes.length).toBe(1);
    run(s, 80);
    expect(dummy.hp).toBeLessThan(afterPlayer);
  });

  it('Contretemps swaps the Sonneur with its echo', () => {
    const s = scene('b_cloche');
    stand(s, 6);
    run(s, 40, { x: 1 });
    const before = s.player.cx;
    s.player.res = 1;
    run(s, 1, { echoPressed: true });
    run(s, 5);
    run(s, 1, { echoPressed: true });
    expect(s.player.cx).toBeLessThan(before - 40);
    expect(s.player.invuln).toBeGreaterThan(0);
  });

  it('a parry on a guard’s blow stuns it, earns résonance and costs no health', () => {
    const s = scene('b_cloche');
    stand(s, 10);
    const g = new Guard(s, 12 * TILE, 15 * TILE);
    s.spawn(g);
    let parried = false;
    for (let f = 0; f < 200 && !parried; f++) {
      const striking = g.phase === 'wind' && g.timer <= 3;
      s.update({ ...NO_CONTROLS, parryPressed: striking });
      if (g.stun > 0) parried = true;
    }
    expect(parried).toBe(true);
    expect(s.player.hp).toBe(s.player.maxHp);
    expect(s.player.res).toBeGreaterThanOrEqual(1);
  });

  it('a downward swing on spikes bounces the Sonneur', () => {
    const s = scene('b_charpente');
    s.player.place(20 * TILE, 12 * TILE);
    s.player.body.vy = 2;
    let bounced = false;
    for (let f = 0; f < 40 && !bounced; f++) {
      s.update({ ...NO_CONTROLS, y: 1, attackPressed: f % 4 === 0 });
      if (s.player.body.vy < -6) bounced = true;
    }
    expect(bounced).toBe(true);
  });

  it('an Accord turns a résonance into a bell of health', () => {
    const s = scene('b_cloche');
    stand(s, 8);
    s.player.hp = 3;
    s.player.res = 1;
    run(s, 60, { healHeld: true });
    expect(s.player.hp).toBe(4);
    expect(s.player.res).toBe(0);
  });

  it('death sends the Sonneur back to the lectern and leaves the bronze in a Glas', () => {
    const s = scene('b_charpente');
    s.save.bronze = 77;
    s.save.lectern = 'b_cloche';
    stand(s, 30);
    s.hurtPlayer(10, 0);
    run(s, 120);
    expect(s.room.id).toBe('b_cloche');
    expect(s.player.hp).toBe(s.player.maxHp);
    expect(s.save.bronze).toBe(0);
    expect(s.save.glas?.bronze).toBe(77);
  });

  it('the hammer breaks a cracked wall and the world remembers it', () => {
    const s = scene('b_charpente');
    stand(s, 58);
    s.player.facing = 1;
    for (let i = 0; i < 6; i++) run(s, 22, (f) => ({ attackPressed: f === 0 }));
    expect(tileAt(s.room, 60, 12)).toBe(T.Empty);
    expect(s.flags['b_charpente:brk0']).toBe(true);
  });

  it('paired bells open their gate only when ringing together', () => {
    const s = scene('b_echo');
    const bells = s.entities.filter((e) => e instanceof BellSwitch) as BellSwitch[];
    expect(bells.length).toBe(2);
    bells[0].damage(1, 0, 'player');
    run(s, 60);
    bells[1].damage(1, 0, 'player');
    expect(s.flags.b_duo).toBeFalsy();
    bells[0].damage(1, 0, 'echo');
    run(s, 2);
    bells[1].damage(1, 0, 'player');
    expect(s.flags.b_duo).toBe(true);
  });
});
