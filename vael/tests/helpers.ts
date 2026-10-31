import { NO_CONTROLS, type Controls } from '../src/game/controls';
import { newSave } from '../src/game/save';
import { Scene } from '../src/game/scene';
import { spawnEntity } from '../src/game/spawn';
import type { RoomDef } from '../src/world/room';
import { neighbour, roomDef } from '../src/world/world';

export function makeScene(abilities: string[] = [], room?: RoomDef | string): Scene {
  const save = newSave(1);
  save.abilities = abilities;
  const extra = typeof room === 'object' ? room : null;
  const s = new Scene(save, {
    roomDef: (id) => (extra && id === extra.id ? extra : roomDef(id)),
    neighbour,
    spawn: spawnEntity,
  });
  s.headless = true;
  s.enter(room ?? 'c_reveil');
  return s;
}

export function ctl(o: Partial<Controls> = {}): Controls {
  return { ...NO_CONTROLS, ...o };
}

export function run(s: Scene, frames: number, c: Partial<Controls> | ((f: number) => Partial<Controls>) = {}): void {
  for (let f = 0; f < frames; f++) s.update(ctl(typeof c === 'function' ? c(f) : c));
}

/** A flat test room with optional walls. */
export function flatRoom(id: string, extra: Partial<RoomDef> = {}): RoomDef {
  return { id, zone: 'couronne', at: [90, 90], solid: [[0, 22, 48, 5], ...(extra.solid ?? [])], ...extra, ents: extra.ents ?? [] } as RoomDef;
}
