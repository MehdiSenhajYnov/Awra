import { Boss, Debris, HitZone } from './boss';
import type { Scene } from './scene';
import { Bibliothecaire, Enchaineur, Etoile, Forgeron, Geolier, Oiseau, Racine, Reine, Veilleur } from './bosses2';

/** Le Gardien Brisé: the stone knight of the Crown. Slams, low sweeps, leaps; crystals fall in phase two. */
export class Gardien extends Boss {
  private next = '';
  private leaps = 0;

  constructor(scene: Scene, x: number, feet: number) {
    super(scene, x, feet, 150, 300, 'gardien', 420);
    this.sprite = 'gardien';
    this.staggerAt = 10;
  }

  private A = 'boss_gardien_a';
  private B = 'boss_gardien_b';
  private C = 'boss_gardien_c';

  think(): void {
    const b = this.body;
    const d = this.dx();
    const ad = Math.abs(d);
    switch (this.state) {
      case 'idle':
      case 'walk': {
        this.face();
        this.play(this.A, [0, 1, 2, 3], 10, true);
        b.vx = ad > 260 ? this.facing * 2.6 * this.pace : 0;
        if (this.st > this.f(40)) {
          const r = this.scene.rng.next();
          if (ad > 520 || (r < 0.3 && ad > 260)) this.to('leapWind');
          else if (ad < 320 && r < 0.6) this.to('slamWind');
          else this.to('sweepWind');
          if (this.phase >= 2 && this.scene.rng.chance(0.25)) this.to('summon');
          this.telegraph(-0.35, true);
        }
        break;
      }
      case 'slamWind':
        b.vx = 0;
        this.play(this.A, [4, 5], this.f(18));
        if (this.st >= this.f(38)) this.to('slam');
        break;
      case 'slam':
        this.play(this.A, [6, 7], 6);
        if (this.st === 1) {
          this.scene.add(new HitZone(this.scene, this.reachBox(280, 260, 0, 40, 1), 7));
          this.scene.emit({ t: 'shockwave', x: this.cx + this.facing * 200, y: b.y + b.h, r: 260, color: 0xffd890 });
          this.scene.emit({ t: 'boom', x: this.cx + this.facing * 200, y: b.y + b.h - 20, r: 120, color: 0xffd890 });
          if (this.phase >= 2) {
            this.wave(1, 12);
            this.wave(-1, 12);
          }
        }
        if (this.st >= this.f(40)) this.to('walk');
        break;
      case 'sweepWind':
        b.vx = 0;
        this.face();
        this.play(this.B, [0, 1], this.f(14));
        if (this.st >= this.f(30)) this.to('sweep');
        break;
      case 'sweep':
        this.play(this.B, [2, 3], 6);
        b.vx = this.facing * 6;
        if (this.st <= 8) this.active = [this.reachBox(380, 130, 0, 60, 1)];
        if (this.st >= this.f(34)) this.to('walk');
        break;
      case 'leapWind':
        b.vx = 0;
        this.face();
        this.play(this.B, [4], 1);
        if (this.st >= this.f(22)) {
          this.to('leap');
          const tx = this.p.cx;
          b.vy = -27;
          b.vx = Math.max(-16, Math.min(16, (tx - this.cx) / 38));
        }
        break;
      case 'leap':
        this.play(this.B, [5], 1);
        if (b.onGround && this.st > 4) {
          this.to('land');
          this.scene.emit({ t: 'boom', x: this.cx, y: b.y + b.h - 10, r: 160, color: 0xffd890 });
          this.wave(1, this.phase >= 3 ? 14 : 11);
          this.wave(-1, this.phase >= 3 ? 14 : 11);
          this.scene.add(new HitZone(this.scene, { box: { x: this.cx - 170, y: b.y + b.h - 120, w: 340, h: 120 }, damage: 1 }, 5));
          if (this.phase >= 2) for (let i = 0; i < 2 + this.phase; i++) this.scene.add(new Debris(this.scene, this.p.cx + (i - 1.5) * 220 + this.scene.rng.range(-60, 60)));
        }
        break;
      case 'land':
        b.vx = 0;
        this.play(this.B, [6, 7], 8);
        if (this.st >= this.f(30)) {
          if (this.phase >= 3 && this.leaps++ % 2 === 0) this.to('leapWind');
          else this.to('walk');
        }
        break;
      case 'summon':
      case 'roar':
        b.vx = 0;
        this.play(this.C, [0, 1, 2, 3], 9, true);
        if (this.st === 20) {
          this.scene.emit({ t: 'roar', x: this.cx, y: this.cy });
          for (let i = 0; i < 4 + this.phase; i++) this.scene.add(new Debris(this.scene, this.scene.rng.range(200, this.scene.room.pxW - 200)));
        }
        if (this.st >= 60) this.to('walk');
        break;
    }
    void this.next;
    this.fall();
    this.clampToRoom();
  }

  setAnim(a: string): void {
    // Stagger and death use the last row of the third sheet.
    if (a === 'stagger') a = `@${this.C}|4,5|20|0`;
    else if (a === 'death') a = `@${this.C}|4,5,6,7|14|0`;
    else if (a === 'idle') a = `@${this.A}|0|1|0`;
    super.setAnim(a);
  }
}

export function makeBoss(scene: Scene, key: string, x: number, feet: number): Boss | null {
  switch (key) {
    case 'gardien': return new Gardien(scene, x, feet);
    case 'racine': return new Racine(scene, x, feet);
    case 'forgeron': return new Forgeron(scene, x, feet);
    case 'bibliothecaire': return new Bibliothecaire(scene, x, feet);
    case 'geoliers': return new Geolier(scene, x, feet);
    case 'oiseau': return new Oiseau(scene, x, feet);
    case 'reine': return new Reine(scene, x, feet);
    case 'enchaineur': return new Enchaineur(scene, x, feet);
    case 'etoile': return new Etoile(scene, x, feet);
    case 'veilleur': return new Veilleur(scene, x, feet);
  }
  return null;
}
