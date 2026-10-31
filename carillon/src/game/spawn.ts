import { TILE } from '../engine/core';
import { audio } from '../engine/audio';
import { T } from '../world/room';
import { type Boss, makeBoss } from './bosses';
import { Drainer, Flyer, Gear, Guard, Hopper, Leaper, Mirror, Swordsman, Turret, Walker } from './enemies';
import { Entity } from './entity';
import { Anchor, BellSwitch, Coin, Crumble, Glas, Hint, Lamp, Lectern, Mover, Npc, Pickup, type ItemKind, Plate, Wind } from './props';
import type { Scene } from './scene';

type Opts = Record<string, unknown>;

/** What each great bell gives when its keeper falls. */
export const BOSS_REWARD: Record<string, { kind: ItemKind; value: string }> = {
  dechu: { kind: 'ability', value: 'dash' },
  gargouille: { kind: 'ability', value: 'walljump' },
  mere: { kind: 'ability', value: 'swap' },
  souffleur: { kind: 'ability', value: 'double' },
  jumeaux: { kind: 'ability', value: 'slam' },
  cantatrice: { kind: 'ability', value: 'grapple' },
  noye: { kind: 'vessel', value: 'noye' },
  echappement: { kind: 'slot', value: 'echappement' },
  silence: { kind: 'key', value: 'fin' },
  dechu_v: { kind: 'slot', value: 'dechu_v' },
  jumeaux_v: { kind: 'vessel', value: 'jumeaux_v' },
  echappement_v: { kind: 'shard', value: 'echappement_v' },
};

export const GREAT_BELLS = ['dechu', 'gargouille', 'mere', 'souffleur', 'jumeaux', 'cantatrice', 'noye', 'echappement'];

/** Locks the arena when the player walks in, raises the boss, and opens up again when it falls. */
export class Arena extends Entity {
  bosses: Boss[] = [];
  started = false;
  /** Flag name of this fight (variations reuse a keeper under another key). */
  flagKey: string;
  constructor(scene: Scene, x: number, y: number, public key: string, public doors: [number, number, number, number][], public trigger: [number, number], public hard = false, variant = '') {
    super(scene, x, y, 10, 10);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.back = true;
    this.flagKey = variant ? `${key}_${variant}` : key;
  }
  update(): void {
    const s = this.scene;
    const done = s.flags[`boss_${this.flagKey}`];
    if (!this.started) {
      const tx = s.player.cx / TILE;
      if (done || tx < this.trigger[0] || tx > this.trigger[1] || s.player.dead) return;
      this.started = true;
      s.setTiles(this.doors, T.Gate);
      s.locked = true;
      s.sfx('gate');
      this.bosses = makeBoss(s, this.key, this.cx, this.body.y + this.body.h, this.hard);
      for (const b of this.bosses) { b.flagKey = this.flagKey; s.spawn(b); }
      s.boss = this.bosses[0];
      s.bossName = this.key;
      s.ui.bossBar(this.bosses[0], this.key);
      audio.setIntensity(1);
      s.sfx('roar');
      s.shakeBy(6);
      return;
    }
    if (this.bosses.every((b) => b.dead) && s.locked) this.finish();
  }
  finish(): void {
    const s = this.scene;
    s.setTiles(this.doors, T.Empty);
    s.locked = false;
    audio.setIntensity(0);
    s.ui.bossBar(null);
  }
  draw(): void {}
}

export function spawnEntity(scene: Scene, kind: string, x: number, y: number, o: Opts, uid: string): Entity | null {
  const flagOf = () => (o.id as string) ?? `item:${uid}`;
  switch (kind) {
    // Props.
    case 'lectern': return new Lectern(scene, x, y);
    case 'coin': return new Coin(scene, x, y, (o.value as number) ?? 1);
    case 'glas': return new Glas(scene, x, y);
    case 'npc': return new Npc(scene, x, y, o.who as string);
    case 'hint': return new Hint(scene, x, y, o.text as string);
    case 'bell': return new BellSwitch(scene, x, y, o.flag as string, (o.group as string) ?? null, (o.ring as number) ?? 45, (o.timed as number) ?? 0, (o.bars as [number, number, number, number][]) ?? [], (o.needs as string) ?? null);
    case 'lamp': return new Lamp(scene, x, y);
    case 'plate': return new Plate(scene, x, y, o.bars as [number, number, number, number][]);
    case 'anchor': return new Anchor(scene, x, y);
    case 'wind': return new Wind(scene, x, y, (o.w as number) ?? 2, (o.h as number) ?? 8, (o.s as number) ?? 0.95);
    case 'mover': return new Mover(scene, x, y, (o.w as number) ?? 3, (o.dx as number) ?? 0, (o.dy as number) ?? 0, (o.period as number) ?? 240, (o.phase as number) ?? 0);
    case 'crumble': return new Crumble(scene, x, y, (o.w as number) ?? 3);
    case 'arena': return new Arena(scene, x, y, o.boss as string, (o.doors as [number, number, number, number][]) ?? [], (o.trigger as [number, number]) ?? [8, 24], !!scene.save.hard || !!o.variant, (o.variant as string) ?? '');
    // Items: removed for good once taken.
    case 'shard': case 'vessel': case 'tin': case 'page': case 'note': case 'ability': case 'key': case 'slot': {
      const flag = flagOf();
      if (scene.flags[flag]) return null;
      return new Pickup(scene, x, y - 10, kind as ItemKind, (o.value as string) ?? '', flag);
    }
    // Enemies.
    case 'ver': case 'scorie': case 'eclat': return new Walker(scene, x, y, kind);
    case 'chauve': case 'feu': case 'soufflet': return new Flyer(scene, x, y, kind);
    case 'bedeau': return new Guard(scene, x, y);
    case 'gargouillette': return new Turret(scene, x, y, 'gargouille');
    case 'tuyau': case 'choriste': case 'fondeur': return new Turret(scene, x, y, kind);
    case 'sonnaille': return new Hopper(scene, x, y);
    case 'squelette': case 'automate': return new Swordsman(scene, x, y, kind);
    case 'muet': return new Drainer(scene, x, y);
    case 'anguille': return new Leaper(scene, x, y);
    case 'engrenage': return new Gear(scene, x, y);
    case 'ombre': return new Mirror(scene, x, y);
  }
  console.warn(`unknown entity ${kind}`);
  return null;
}
