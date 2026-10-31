import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { audio } from '../engine/audio';
import { input } from '../engine/input';
import { hasTex, tex } from '../render/assets';
import { fxTextures } from '../render/textures';
import { t } from '../i18n';
import { GOLD, PALE, divider, panel, star, style, text } from './draw';
import { Menu, type MenuItem } from './menu';

export interface Modal {
  c: Container;
  /** Returns true when finished. */
  update(): boolean;
  /** The world keeps running underneath (e.g. a toast); default false. */
  live?: boolean;
}

const confirm = () => input.pressed('confirm') || input.pressed('jump') || input.pressed('attack');

/** Lines of dialogue in a panel at the bottom, revealed letter by letter. */
export class Dialogue implements Modal {
  c = new Container();
  private i = 0;
  private shown = 0;
  private body: Text;
  private arrow = new Graphics();
  private tt = 0;

  constructor(name: string, private lines: string[], portrait?: string) {
    const w = 1300;
    const h = 250;
    const x = 960 - w / 2;
    const y = 760;
    const p = panel(w, h, 0.88);
    p.position.set(x, y);
    this.c.addChild(p);
    let tx = x + 60;
    if (portrait && hasTex(portrait)) {
      const s = new Sprite(tex(portrait));
      s.anchor.set(0.5, 1);
      const sc = 330 / s.texture.height;
      s.scale.set(sc);
      s.position.set(x + 150, y + h - 10);
      this.c.addChild(s);
      tx = x + 300;
    }
    this.c.addChild(text(name, style('menu', GOLD, 28), tx, y + 34));
    this.body = text('', style('body', PALE, 34, 'left', w - (tx - x) - 60), tx, y + 84);
    this.c.addChild(this.body, this.arrow);
    audio.play('ui');
  }

  update(): boolean {
    this.tt++;
    const line = this.lines[this.i] ?? '';
    if (this.shown < line.length) this.shown = Math.min(line.length, this.shown + 1.4);
    this.body.text = line.slice(0, Math.floor(this.shown));
    this.arrow.clear();
    if (this.shown >= line.length) star(this.arrow, 1560, 975 + Math.sin(this.tt * 0.15) * 4, 10, GOLD, 0.9);
    if (confirm()) {
      if (this.shown < line.length) this.shown = line.length;
      else {
        this.i++;
        this.shown = 0;
        audio.play('uiMove');
        if (this.i >= this.lines.length) return true;
      }
    }
    return false;
  }
}

/**
 * The great moment of a new ability or art: the screen dims, rays of light, a glyph opens, the name in large
 * capitals, then how to use it.
 */
export class Revelation implements Modal {
  c = new Container();
  private tt = 0;
  private rays = new Container();
  private glyph: Sprite;
  private title: Text;
  private sub: Text;
  private how: Text;
  private dim = new Graphics();
  private line = divider(700);

  constructor(name: string, desc: string, how: string, icon?: string) {
    this.dim.rect(0, 0, 1920, 1080).fill({ color: 0x020206, alpha: 1 });
    this.c.addChild(this.dim, this.rays);
    const ft = fxTextures();
    for (let i = 0; i < 14; i++) {
      const r = new Sprite(ft.shaft);
      r.anchor.set(0.5, 0);
      r.position.set(960, 430);
      r.rotation = (i / 14) * Math.PI * 2;
      r.width = 140;
      r.height = 1200;
      r.tint = 0xffe6b0;
      r.blendMode = 'add';
      r.alpha = 0.25;
      this.rays.addChild(r);
    }
    this.glyph = new Sprite(hasTex('fx_glyph') ? tex('fx_glyph') : ft.ring);
    this.glyph.anchor.set(0.5);
    this.glyph.position.set(960, 430);
    this.glyph.blendMode = 'add';
    this.c.addChild(this.glyph);
    if (icon && hasTex(icon)) {
      const s = new Sprite(tex(icon));
      s.anchor.set(0.5);
      s.position.set(960, 430);
      s.scale.set(220 / Math.max(s.texture.width, s.texture.height));
      this.c.addChild(s);
    }
    this.title = text(name.toUpperCase(), style('title', 0xfff4dc, 76, 'center'), 960, 690, 0.5, 0.5);
    this.line.position.set(960, 750);
    this.sub = text(desc, style('italic', PALE, 34, 'center', 1200), 960, 790, 0.5, 0);
    this.how = text(how, style('body', GOLD, 30, 'center', 1200), 960, 930, 0.5, 0);
    this.c.addChild(this.title, this.line, this.sub, this.how);
    audio.play('pickup');
  }

  update(): boolean {
    this.tt++;
    const k = Math.min(1, this.tt / 40);
    this.dim.alpha = 0.82 * k;
    this.rays.rotation += 0.002;
    this.rays.alpha = k;
    this.glyph.rotation += 0.004;
    this.glyph.scale.set(0.15 + 0.45 * Math.min(1, this.tt / 50));
    this.glyph.alpha = k;
    const tk = Math.max(0, Math.min(1, (this.tt - 30) / 30));
    this.title.alpha = tk;
    this.title.scale.set(1.15 - 0.15 * tk);
    this.line.alpha = tk;
    this.sub.alpha = Math.max(0, Math.min(1, (this.tt - 50) / 30));
    this.how.alpha = Math.max(0, Math.min(1, (this.tt - 70) / 30));
    return this.tt > 90 && confirm();
  }
}

/** Boss title card: letterbox bars, the name in huge letters, a subtitle. Runs while the world keeps moving. */
export class BossCard implements Modal {
  c = new Container();
  live = true;
  private tt = 0;
  private bars = new Graphics();
  private name: Text;
  private sub: Text;
  private line = divider(900);

  constructor(key: string) {
    this.name = text(t(`bosses.${key}.name`), style('title', 0xfff4dc, 92, 'center'), 960, 760, 0.5, 0.5);
    this.sub = text(t(`bosses.${key}.sub`), style('italic', PALE, 36, 'center'), 960, 850, 0.5, 0.5);
    this.line.position.set(960, 815);
    this.c.addChild(this.bars, this.name, this.line, this.sub);
  }

  update(): boolean {
    this.tt++;
    const inK = Math.min(1, this.tt / 25);
    const outK = Math.max(0, (this.tt - 170) / 30);
    const k = inK * (1 - outK);
    this.bars.clear();
    this.bars.rect(0, 0, 1920, 110 * k).fill(0x000000);
    this.bars.rect(0, 1080 - 110 * k, 1920, 110 * k).fill(0x000000);
    const tk = Math.max(0, Math.min(1, (this.tt - 20) / 30)) * (1 - outK);
    this.name.alpha = tk;
    this.name.scale.set(1 + (1 - tk) * 0.1);
    this.line.alpha = tk;
    this.sub.alpha = Math.max(0, Math.min(1, (this.tt - 45) / 30)) * (1 - outK);
    return this.tt >= 200;
  }
}

/** A small "obtained" banner for items, at the top of the screen; does not stop the game. */
export class Banner implements Modal {
  c = new Container();
  live = true;
  private tt = 0;

  constructor(title: string, desc: string) {
    const p = panel(900, 150, 0.85);
    p.position.set(510, 120);
    this.c.addChild(p, text(title, style('menu', GOLD, 32, 'center'), 960, 165, 0.5, 0.5), text(desc, style('italic', PALE, 28, 'center', 820), 960, 200, 0.5, 0));
    this.c.alpha = 0;
    audio.play('pickup', { vol: 0.6 });
  }

  update(): boolean {
    this.tt++;
    this.c.alpha = Math.min(1, this.tt / 15) * (this.tt > 220 ? Math.max(0, 1 - (this.tt - 220) / 30) : 1);
    return this.tt > 250;
  }
}

/** A list of choices in a panel (rest, pause). */
export class ChoiceBox implements Modal {
  c = new Container();
  private menu: Menu;
  closed = false;

  constructor(title: string, items: MenuItem[], private cancel = true) {
    const h = 160 + items.length * 70;
    const p = panel(720, h, 0.9);
    p.position.set(600, 540 - h / 2);
    this.c.addChild(new Graphics().rect(0, 0, 1920, 1080).fill({ color: 0x000000, alpha: 0.5 }), p);
    this.c.addChild(text(title, style('title', GOLD, 40, 'center'), 960, 540 - h / 2 + 60, 0.5, 0.5));
    this.menu = new Menu(items, 960, 540 - h / 2 + 140, 70, 'center', 32);
    this.c.addChild(this.menu.c);
  }

  update(): boolean {
    this.menu.update();
    if (this.cancel && (input.pressed('back') || input.pressed('pause'))) return true;
    return this.closed;
  }
}
