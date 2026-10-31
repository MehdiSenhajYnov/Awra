import { Container, Graphics, type Text } from 'pixi.js';
import type { Scene } from '../game/scene';
import { t } from '../i18n';
import { GOLD, PALE, star, style, text } from './draw';

/** Lives (star crystals), the Lumen orb, stardust and the boss bar. */
export class Hud {
  readonly c = new Container();
  private g = new Graphics();
  private dustText: Text;
  private bossName: Text;
  private bossSub: Text;
  private shownDust = 0;
  private dustFlash = 0;
  private lumenShown = 0;
  private hurtFlash = 0;
  private lastHp = 0;
  private bossShown = 0;
  private toastText: Text;

  constructor() {
    this.dustText = text('0', style('body', GOLD, 30), 216, 118, 0, 0.5);
    this.bossName = text('', style('menu', PALE, 26, 'center'), 960, 1002, 0.5, 1);
    this.bossSub = text('', style('italic', 0xb8bcd8, 22, 'center'), 960, 1004, 0.5, 0);
    this.toastText = text('', style('italic', PALE, 32, 'center'), 960, 200, 0.5, 0.5);
    this.c.addChild(this.g, this.dustText, this.bossName, this.bossSub, this.toastText);
  }

  update(scene: Scene): void {
    const g = this.g;
    g.clear();
    const p = scene.player;
    const now = performance.now() / 1000;
    if (p.hp < this.lastHp) this.hurtFlash = 1;
    this.lastHp = p.hp;
    this.hurtFlash *= 0.9;
    // Lumen orb.
    const max = scene.maxLumen();
    this.lumenShown += (scene.lumen - this.lumenShown) * 0.2;
    const k = this.lumenShown / max;
    const cx = 110;
    const cy = 100;
    const r = 52;
    g.circle(cx, cy, r + 8).fill({ color: 0x05060c, alpha: 0.7 });
    g.circle(cx, cy, r + 6).stroke({ color: GOLD, width: 2, alpha: 0.7 });
    // Liquid light: a filled cap with a wavy top.
    if (k > 0.001) {
      const top = cy + r - 2 * r * k;
      // A polygon clipped to the circle.
      const poly: number[] = [];
      for (let i = 0; i <= 32; i++) {
        const x = cx - r + (2 * r * i) / 32;
        const w = Math.sin(now * 3 + i * 0.6) * 3;
        const yTop = Math.max(top + w, cy - Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx))));
        poly.push(x, yTop);
      }
      for (let i = 32; i >= 0; i--) {
        const x = cx - r + (2 * r * i) / 32;
        poly.push(x, cy + Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx))));
      }
      const full = scene.lumen >= 33;
      g.poly(poly).fill({ color: full ? 0xfff0c8 : 0xc8b890, alpha: full ? 0.95 : 0.7 });
      g.circle(cx, cy, r * 0.55).fill({ color: 0xffffff, alpha: 0.08 + (full ? 0.1 : 0) });
    }
    // Cost marks every 33.
    for (let i = 1; i * 33 < max; i++) {
      const y = cy + r - (2 * r * i * 33) / max;
      const hw = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
      g.moveTo(cx + hw - 10, y).lineTo(cx + hw, y).stroke({ color: GOLD, width: 2, alpha: 0.6 });
    }
    // Lives: star crystals.
    for (let i = 0; i < p.maxHp; i++) {
      const x = 196 + i * 46;
      const y = 74;
      const on = i < p.hp;
      const pulse = on && i === p.hp - 1 && p.hp <= 1 ? 0.5 + Math.sin(now * 8) * 0.5 : 1;
      g.moveTo(x, y - 22).lineTo(x + 13, y).lineTo(x, y + 22).lineTo(x - 13, y).closePath()
        .fill({ color: on ? 0xf6ecd0 : 0x1a1e30, alpha: on ? 0.95 * pulse + 0.05 : 0.8 })
        .stroke({ color: on ? GOLD : 0x4a5070, width: 2, alpha: 0.9 });
      if (on) g.moveTo(x, y - 14).lineTo(x + 5, y).lineTo(x, y - 2).closePath().fill({ color: 0xffffff, alpha: 0.7 });
    }
    if (this.hurtFlash > 0.05) g.circle(cx, cy, r + 20).stroke({ color: 0xff3050, width: 4, alpha: this.hurtFlash });
    // Stardust.
    if (scene.save.dust !== this.shownDust) {
      const d = scene.save.dust - this.shownDust;
      this.shownDust += Math.sign(d) * Math.max(1, Math.floor(Math.abs(d) / 8));
      this.dustFlash = 1;
    }
    this.dustFlash *= 0.92;
    star(g, 198, 118, 11, GOLD, 0.8 + this.dustFlash * 0.2);
    this.dustText.text = String(this.shownDust);
    this.dustText.alpha = 0.85 + this.dustFlash * 0.15;
    // Boss bar.
    const b = scene.boss as (null | { hp: number; maxHp: number; bossKey?: string; dead: boolean });
    this.bossShown += ((b && !b.dead ? 1 : 0) - this.bossShown) * 0.06;
    this.bossName.alpha = this.bossShown;
    this.bossSub.alpha = 0;
    if (b && this.bossShown > 0.02) {
      const w = 900;
      const x = 960 - w / 2;
      const y = 1020;
      const kk = Math.max(0, b.hp / b.maxHp);
      g.rect(x - 4, y - 4, w + 8, 16).fill({ color: 0x05060c, alpha: 0.8 * this.bossShown });
      g.rect(x, y, w * kk, 8).fill({ color: 0xd8c08a, alpha: this.bossShown });
      g.rect(x, y, w, 8).stroke({ color: GOLD, width: 1, alpha: 0.5 * this.bossShown });
      this.bossName.text = b.bossKey ? t(`bosses.${b.bossKey}.name`) : '';
    }
    // Toast.
    const toast = scene.toast;
    this.toastText.text = toast?.text ?? '';
    this.toastText.alpha = toast ? Math.min(1, toast.t / 20) : 0;
  }
}
