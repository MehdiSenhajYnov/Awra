import type { Entity } from './entity';
import { Acarien, Coquille, Lampion } from './foes';
import { Anguille, Astrelet, Chevalier, Corbeau, Enclume, Etincelle, Geolier, Lecteur, Mante, OmbreMere, Pretre, Ronce, Sentinelle, Souffle, Spore, setWaveCtor } from './foes2';
import { GroundWave } from './boss';

setWaveCtor(GroundWave);
import { Arena, FallenStar, Heart, Hint, Npc, Pickup, type PickupKind, Ring, Shrine, Tablet, Crack, Eye } from './props';
import { TILE } from '../engine/core';
import type { Scene } from './scene';

type Maker = (s: Scene, x: number, y: number, o: Record<string, unknown>, uid: string) => Entity | null;

const MAKERS: Record<string, Maker> = {
  coquille: (s, x, y) => new Coquille(s, x, y),
  acarien: (s, x, y) => new Acarien(s, x, y),
  lampion: (s, x, y) => new Lampion(s, x, y),
  pretre: (s, x, y) => new Pretre(s, x, y),
  chevalier: (s, x, y) => new Chevalier(s, x, y),
  ronce: (s, x, y) => new Ronce(s, x, y),
  spore: (s, x, y) => new Spore(s, x, y),
  mante: (s, x, y) => new Mante(s, x, y),
  souffle: (s, x, y) => new Souffle(s, x, y),
  enclume: (s, x, y) => new Enclume(s, x, y),
  etincelle: (s, x, y) => new Etincelle(s, x, y),
  lecteur: (s, x, y) => new Lecteur(s, x, y),
  anguille: (s, x, y) => new Anguille(s, x, y),
  geolier: (s, x, y) => new Geolier(s, x, y),
  corbeau: (s, x, y) => new Corbeau(s, x, y),
  astrelet: (s, x, y) => new Astrelet(s, x, y),
  ombre: (s, x, y) => new OmbreMere(s, x, y),
  sentinelle: (s, x, y) => new Sentinelle(s, x, y),
  shrine: (s, x, y, _o, uid) => new Shrine(s, x, y, uid),
  arena: (s, x, y, o) => {
    const [a, b] = (o.trigger as [number, number]) ?? [0, 999];
    return new Arena(s, x, y, o.boss as string, a * TILE, b * TILE, (o.door as string) ?? '');
  },
  tablet: (s, x, y, o) => new Tablet(s, x, y, o.lore as string),
  npc: (s, x, y, o) => new Npc(s, x, y, o.who as string),
  ring: (s, x, y) => new Ring(s, x, y),
  hint: (s, x, y, o) => new Hint(s, x, y, o.text as string),
  heart: (s, x, y) => new Heart(s, x, y),
  eye: (s, x, y, o) => new Eye(s, x, y, o.flag as string, (o.timed as number) ?? 0),
  crack: (s, x, y, o) => (s.flags[o.flag as string] ? null : new Crack(s, x, y, ((o.w as number) ?? 2) * TILE, ((o.h as number) ?? 3) * TILE, o.flag as string)),
  fallen: (s, x, y, o) => new FallenStar(s, x, y, o.amount as number),
};

for (const kind of ['ability', 'art', 'shard', 'vessel', 'ore', 'notch', 'chant', 'seal', 'map', 'key'] as PickupKind[]) {
  MAKERS[kind] = (s, x, y, o, uid) => {
    const flag = (o.id as string) ?? `pk_${uid}`;
    return s.flags[flag] ? null : new Pickup(s, x, y, kind, (o.value as string) ?? '', flag);
  };
}

export function spawnEntity(s: Scene, kind: string, x: number, y: number, o: Record<string, unknown>, uid: string): Entity | null {
  const m = MAKERS[kind];
  return m ? m(s, x, y, o, uid) : null;
}
