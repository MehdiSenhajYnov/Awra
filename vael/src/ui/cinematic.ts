import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { input } from '../engine/input';
import { hasTex, tex } from '../render/assets';
import { fxTextures } from '../render/textures';
import { GOLD, PALE, style, text } from './draw';
import type { Modal } from './modals';

export interface Slide {
  image?: string;
  lines: string[];
  title?: string;
}

/** Full-screen painted slides with slow camera drift and narrated lines. Any key advances. */
export class Cinematic implements Modal {
  c = new Container();
  private i = 0;
  private tt = 0;
  private img = new Sprite();
  private lines: Text[] = [];
  private title: Text;
  private shade = new Graphics();
  private fade = new Graphics();

  constructor(private slides: Slide[], private done: () => void) {
    this.c.addChild(new Graphics().rect(0, 0, 1920, 1080).fill(0x000000), this.img, this.shade);
    this.shade.rect(0, 700, 1920, 380).fill({ color: 0x000000, alpha: 0.55 });
    this.img.anchor.set(0.5);
    this.img.position.set(960, 540);
    this.title = text('', style('title', GOLD, 64, 'center'), 960, 160, 0.5, 0.5);
    this.c.addChild(this.title, this.fade);
    this.show();
  }

  private show(): void {
    for (const l of this.lines) l.destroy();
    this.lines = [];
    const sl = this.slides[this.i];
    this.img.texture = sl.image && hasTex(sl.image) ? tex(sl.image) : fxTextures().glow;
    this.img.visible = !!(sl.image && hasTex(sl.image));
    this.title.text = sl.title ?? '';
    sl.lines.forEach((ln, k) => {
      const tx = text(ln, style('italic', PALE, 38, 'center', 1500), 960, 800 + k * 62 - (sl.lines.length - 1) * 20, 0.5, 0.5);
      tx.alpha = 0;
      this.lines.push(tx);
      this.c.addChildAt(tx, this.c.children.length - 1);
    });
    this.tt = 0;
  }

  update(): boolean {
    this.tt++;
    const sc = Math.max(1920 / this.img.texture.width, 1080 / this.img.texture.height) * (1.04 + this.tt * 0.00012);
    this.img.scale.set(sc);
    this.img.x = 960 + Math.sin(this.tt * 0.002) * 20;
    this.title.alpha = Math.min(1, this.tt / 60);
    this.lines.forEach((l, k) => (l.alpha = Math.max(0, Math.min(1, (this.tt - 30 - k * 70) / 50))));
    const ready = this.tt > 40;
    this.fade.clear();
    if (this.tt < 30) this.fade.rect(0, 0, 1920, 1080).fill({ color: 0x000000, alpha: 1 - this.tt / 30 });
    const go = input.pressed('confirm') || input.pressed('jump') || input.pressed('attack');
    if (go && ready) {
      if (this.lines.some((l) => l.alpha < 1)) {
        this.tt = 30 + this.lines.length * 70 + 50;
      } else {
        this.i++;
        if (this.i >= this.slides.length) {
          this.done();
          return true;
        }
        this.show();
      }
    }
    if (input.pressed('pause')) {
      this.done();
      return true;
    }
    return false;
  }
}

export const CINE_GOLD = GOLD;
