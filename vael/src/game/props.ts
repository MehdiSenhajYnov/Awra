import { Entity } from './entity';
import type { Scene } from './scene';

/** Something the hero can interact with by pressing up nearby. */
export abstract class Interactive extends Entity {
  prompt = '';
  constructor(scene: Scene, x: number, feet: number, w: number, h: number) {
    super(scene, x, feet, w, h);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.brandable = false;
  }

  inRange(): boolean {
    const p = this.scene.player;
    return Math.abs(p.cx - this.cx) < this.body.w / 2 + 40 && Math.abs(p.feet - (this.body.y + this.body.h)) < 60 && p.body.onGround;
  }

  abstract interact(): void;
}

/** The Star Altar: rest, save, heal, respawn point. */
export class Shrine extends Interactive {
  constructor(scene: Scene, x: number, feet: number, public key: string) {
    super(scene, x, feet, 120, 150);
    this.sprite = 'shrine';
    this.prompt = 'rest';
  }

  update(): void {}

  interact(): void {
    this.scene.rest(this.key);
  }
}

/** What a pickup gives. */
export type PickupKind = 'ability' | 'art' | 'shard' | 'vessel' | 'ore' | 'notch' | 'chant' | 'seal' | 'map' | 'key';

/** A floating mote of starlight holding a reward. Collected on touch. */
export class Pickup extends Entity {
  constructor(scene: Scene, x: number, feet: number, public kind: PickupKind, public value: string, public flag: string) {
    super(scene, x, feet - 30, 60, 60);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.brandable = false;
    this.sprite = kind === 'ability' || kind === 'art' ? 'pickupBig' : 'pickup';
    this.body.noClip = true;
  }

  update(): void {
    const p = this.scene.player;
    if (Math.abs(p.cx - this.cx) < 60 && Math.abs(p.cy - this.cy) < 80 && !p.dead) {
      this.dead = true;
      this.scene.collect(this);
    }
  }
}

/** A fresco or plaque to read. */
export class Tablet extends Interactive {
  constructor(scene: Scene, x: number, feet: number, public lore: string) {
    super(scene, x, feet, 110, 150);
    this.sprite = 'tablet';
    this.prompt = 'read';
  }

  update(): void {}

  interact(): void {
    this.scene.setFlag(`read_${this.lore}`);
    this.scene.ui('lore', this.lore);
  }
}

/** A character to talk to. */
export class Npc extends Interactive {
  constructor(scene: Scene, x: number, feet: number, public who: string) {
    super(scene, x, feet, 90, 150);
    this.sprite = `npc_${who}`;
    this.prompt = 'talk';
  }

  update(): void {
    const p = this.scene.player;
    if (Math.abs(p.cx - this.cx) < 400) this.facing = Math.sign(p.cx - this.cx) || 1;
  }

  interact(): void {
    this.scene.ui('npc', this.who);
  }
}

/** The fallen star holding the dust lost at death: strike it or throw the blade at it. */
export class FallenStar extends Entity {
  constructor(scene: Scene, x: number, feet: number, public amount: number) {
    super(scene, x, feet, 60, 70);
    this.hp = this.maxHp = 1;
    this.contact = 0;
    this.prop = true;
    this.brandable = false;
    this.sprite = 'fallen';
  }

  update(): void {}

  onDeath(): void {
    this.scene.save.dust += this.amount;
    this.scene.save.lost = null;
    this.scene.emit({ t: 'dust', x: this.cx, y: this.cy, n: Math.min(30, this.amount) });
    this.scene.emit({ t: 'boom', x: this.cx, y: this.cy, r: 160, color: 0xffe0a0 });
    this.scene.say(this.scene.text('toast.recovered'), 120);
  }
}

/** A cracked wall: a few blows open it (flag). */
export class Crack extends Entity {
  constructor(scene: Scene, x: number, feet: number, w: number, h: number, public flag: string) {
    super(scene, x, feet, w, h);
    this.hp = this.maxHp = 30;
    this.contact = 0;
    this.prop = true;
    this.heavy = true;
    this.brandable = false;
    this.sprite = 'crack';
    this.body.noClip = true;
  }

  update(): void {}

  onDeath(): void {
    this.scene.openBreakable(this.flag);
  }
}

/** A star eye on the wall: when the thrown blade (or a strike) touches it, it opens a gate. */
export class Eye extends Entity {
  constructor(scene: Scene, x: number, feet: number, public flag: string, public timed = 0) {
    super(scene, x, feet - 20, 60, 60);
    this.hp = this.maxHp = 1;
    this.contact = 0;
    this.prop = true;
    this.heavy = true;
    this.brandable = false;
    this.sprite = 'eye';
    this.body.noClip = true;
    this.keep = true;
    if (scene.flags[flag]) this.open = true;
  }

  keep = true;
  open = false;
  timer = 0;

  update(): void {
    if (this.timed && this.open && --this.timer <= 0) {
      this.open = false;
      this.scene.closeBreakable(this.flag);
    }
  }

  damage(): boolean {
    if (this.open && !this.timed) return false;
    this.open = true;
    this.timer = this.timed;
    this.flash = 10;
    this.scene.openBreakable(this.flag, !this.timed);
    this.scene.emit({ t: 'shockwave', x: this.cx, y: this.cy, r: 200, color: 0xffe0a0 });
    this.scene.sfx('door');
    return true;
  }
}

/** An astral ring floating in the air: with Tether, the blade catches in it. */
export class Ring extends Entity {
  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet - 40, 80, 80);
    this.hurtable = false;
    this.contact = 0;
    this.prop = true;
    this.brandable = false;
    this.sprite = 'ring';
    this.body.noClip = true;
  }

  update(): void {}
}
