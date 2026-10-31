import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { audio } from '../engine/audio';
import { input } from '../engine/input';
import { fx } from '../engine/core';
import { type Save, deleteSave, loadSave } from '../game/save';
import { t } from '../i18n';
import { hasTex, tex } from '../render/assets';
import { fxTextures } from '../render/textures';
import { GOLD, PALE, divider, style, text } from './draw';
import { Menu } from './menu';

export interface TitleHooks {
  play(slot: number, save: Save | null, hard: boolean): void;
  options(): void;
  credits(): void;
  quit(): void;
}

/** Key art with slow drift, motes of light, the name in large capitals, then the menus. */
export class TitleScreen {
  readonly c = new Container();
  private art: Sprite;
  private motes: { s: Sprite; vx: number; vy: number; ph: number }[] = [];
  private logo: Text;
  private tag: Text;
  private press: Text;
  private line = divider(560);
  private menu: Menu | null = null;
  private stage: 'press' | 'main' | 'slots' = 'press';
  private tt = 0;
  private fade = new Graphics();
  private eraseArm = -1;
  hard = false;

  constructor(private hooks: TitleHooks) {
    this.art = new Sprite(hasTex('key_title') ? tex('key_title') : fxTextures().glow);
    this.art.anchor.set(0.5);
    this.c.addChild(this.art);
    const shade = new Graphics();
    // Darken the left third for the title.
    for (let i = 0; i < 30; i++) shade.rect(i * 30, 0, 30, 1080).fill({ color: 0x020206, alpha: 0.62 * Math.pow(1 - i / 30, 1.4) });
    this.c.addChild(shade);
    const ft = fxTextures();
    for (let i = 0; i < 70; i++) {
      const s = new Sprite(ft.dot);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.tint = fx.chance(0.7) ? 0xffe2a8 : 0xa8c0ff;
      s.scale.set(fx.range(0.08, 0.3));
      s.position.set(fx.range(0, 1920), fx.range(0, 1080));
      this.c.addChild(s);
      this.motes.push({ s, vx: fx.range(-0.2, 0.2), vy: fx.range(-0.6, -0.1), ph: fx.range(0, 6) });
    }
    this.logo = text(t('title.name'), style('display', 0xfff4dc, 170, 'center'), 370, 360, 0.5, 0.5);
    this.tag = text(t('title.tagline'), style('italic', PALE, 32, 'center', 620), 370, 478, 0.5, 0.5);
    this.line.position.set(370, 430);
    this.press = text(t('title.press'), style('menu', GOLD, 26, 'center'), 330, 700, 0.5, 0.5);
    this.c.addChild(this.logo, this.line, this.tag, this.press, this.fade);
    this.fade.rect(0, 0, 1920, 1080).fill(0x000000);
  }

  private mainMenu(): void {
    const any = [1, 2, 3].some((s) => loadSave(s));
    this.setMenu(new Menu([
      { label: () => t('title.newGame'), action: () => this.slots() },
      ...(any ? [{ label: () => t('title.continue'), action: () => this.slots() }] : []),
      { label: () => t('title.options'), action: () => this.hooks.options() },
      { label: () => t('title.credits'), action: () => this.hooks.credits() },
      { label: () => t('title.quit'), action: () => this.hooks.quit() },
    ], 330, 610, 58, 'center', 30));
    this.stage = 'main';
  }

  private slots(): void {
    const label = (n: number) => () => {
      const s = loadSave(n);
      if (!s) return `${t('title.slot', { n })} — ${t('title.empty')}`;
      const h = Math.floor(s.playTime / 3600);
      const m = Math.floor((s.playTime % 3600) / 60);
      return `${t('title.slot', { n })} — ${t(`zones.${zoneOf(s)}`)} · ${t('title.time', { h, m })}${s.hard ? ' ✦' : ''}`;
    };
    this.setMenu(new Menu([
      ...[1, 2, 3].map((n) => ({
        label: label(n),
        action: () => this.hooks.play(n, loadSave(n), this.hard),
        hint: () => (this.eraseArm === n ? t('title.eraseConfirm') : loadSave(n) ? `${t('title.erase')} : ${input.keyName('blade')}` : ''),
      })),
      { label: () => `${t('title.hard')} : ${this.hard ? t('options.on') : t('options.off')}`, action: () => { this.hard = !this.hard; }, adjust: () => { this.hard = !this.hard; }, hint: () => t('title.hardDesc') },
      { label: () => t('menu.back'), action: () => this.mainMenu() },
    ], 360, 600, 58, 'center', 24));
    this.stage = 'slots';
  }

  private setMenu(m: Menu): void {
    if (this.menu) this.menu.c.destroy({ children: true });
    this.menu = m;
    m.c.x = 0;
    this.c.addChildAt(m.c, this.c.children.length - 1);
    // Menu hint text sits under the menu, centred on the title column.
    const hint = m.c.children[m.c.children.length - 1] as Text;
    hint.x = 360;
    hint.style.wordWrapWidth = 640;
  }

  update(): void {
    this.tt++;
    const now = this.tt / 60;
    this.art.position.set(960 + Math.sin(now * 0.05) * 20, 540 + Math.cos(now * 0.04) * 12);
    this.art.scale.set(Math.max(1920 / this.art.texture.width, 1080 / this.art.texture.height) * (1.06 + Math.sin(now * 0.03) * 0.01));
    for (const m of this.motes) {
      m.s.x += m.vx + Math.sin(now + m.ph) * 0.2;
      m.s.y += m.vy;
      if (m.s.y < -10) m.s.y = 1090;
      m.s.alpha = 0.4 + Math.sin(now * 2 + m.ph) * 0.35;
    }
    this.fade.alpha = Math.max(0, 1 - this.tt / 90);
    const k = Math.max(0, Math.min(1, (this.tt - 40) / 60));
    this.logo.alpha = k;
    this.logo.scale.set(1.04 - 0.04 * k);
    this.line.alpha = k;
    this.tag.alpha = Math.max(0, Math.min(1, (this.tt - 80) / 60));
    if (this.stage === 'press') {
      this.press.alpha = this.tt > 120 ? 0.5 + Math.sin(now * 3) * 0.4 : 0;
      if (this.tt > 60 && (input.pressed('confirm') || input.pressed('jump') || input.pressed('attack') || input.pressed('pause'))) {
        audio.init();
        audio.play('ui');
        audio.playMusic('title');
        this.press.visible = false;
        this.mainMenu();
      }
      return;
    }
    if (!this.menu) return;
    this.menu.update();
    if (this.stage === 'slots') {
      const n = this.menu.index + 1;
      if (n <= 3 && input.pressed('blade') && loadSave(n)) {
        if (this.eraseArm === n) {
          deleteSave(n);
          this.eraseArm = -1;
          this.menu.refresh();
          audio.play('break');
        } else this.eraseArm = n;
      }
      if (input.pressed('back')) this.mainMenu();
    }
  }
}

function zoneOf(s: Save): string {
  const id = s.shrineRoom;
  const map: Record<string, string> = { c: 'couronne', j: 'jardins', f: 'forge', a: 'archives', b: 'bastion', i: 'firmament', p: 'penombre', h: 'coeur' };
  return map[id[0]] ?? 'couronne';
}
