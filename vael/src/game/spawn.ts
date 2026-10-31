import type { Entity } from './entity';
import { Acarien, Coquille, Lampion } from './foes';
import { Shrine } from './props';
import type { Scene } from './scene';

type Maker = (s: Scene, x: number, y: number, o: Record<string, unknown>, uid: string) => Entity | null;

const MAKERS: Record<string, Maker> = {
  coquille: (s, x, y) => new Coquille(s, x, y),
  acarien: (s, x, y) => new Acarien(s, x, y),
  lampion: (s, x, y) => new Lampion(s, x, y),
  shrine: (s, x, y, _o, uid) => new Shrine(s, x, y, uid),
};

export function spawnEntity(s: Scene, kind: string, x: number, y: number, o: Record<string, unknown>, uid: string): Entity | null {
  const m = MAKERS[kind];
  return m ? m(s, x, y, o, uid) : null;
}
