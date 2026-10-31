import { VIEW_H, VIEW_W } from '../engine/core';
import type { Entity } from '../game/entity';
import type { Scene } from '../game/scene';
import { tx } from '../i18n';
import { COLORS, FONT_DISPLAY, bellIcon, drawImg, text } from './draw';

/** Heads-up display: health bells, résonance, bronze, boss bar, area titles and toasts. */
export class Hud {
  title: { text: string; sub: string; t: number } | null = null;
  toasts: { text: string; icon?: string; t: number }[] = [];
  boss: { e: Entity; name: string } | null = null;
  private shownHp = 0;
  private lostT = 0;
  private bronzeShown = 0;

  areaTitle(zone: string): void {
    this.title = { text: tx(`zones.${zone}.name`), sub: tx(`zones.${zone}.sub`), t: 0 };
  }

  bossTitle(name: string): void {
    this.title = { text: tx(`bosses.${name}.name`), sub: tx(`bosses.${name}.title`), t: 0 };
  }

  toast(text: string, icon?: string): void {
    this.toasts.push({ text, icon, t: 0 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  draw(ctx: CanvasRenderingContext2D, scene: Scene): void {
    const p = scene.player;
    // Health: a row of small bells.
    if (p.hp < this.shownHp) this.lostT = 30;
    this.shownHp = p.hp;
    if (this.lostT > 0) this.lostT--;
    for (let i = 0; i < p.maxHp; i++) {
      const x = 24 + i * 15;
      const shake = this.lostT > 0 && i === Math.floor(p.hp) ? (Math.random() - 0.5) * 3 : 0;
      bellIcon(ctx, x + shake, 30, 9, i < p.hp, i < p.hp && p.healT > 0 ? 0.3 : 0);
    }
    // Résonance: orbs that fill, with the partial charge.
    for (let i = 0; i < p.maxRes; i++) {
      const x = 26 + i * 13;
      const y = 44;
      ctx.strokeStyle = 'rgba(168,240,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.stroke();
      const fill = i < p.res ? 1 : i === p.res ? p.resPartial : 0;
      if (fill > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(168,240,255,${0.35 + 0.6 * fill})`;
        ctx.beginPath(); ctx.arc(x, y, 4.5 * Math.sqrt(fill), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    // Bronze, counting up smoothly.
    const target = scene.save.bronze;
    this.bronzeShown += Math.sign(target - this.bronzeShown) * Math.max(1, Math.abs(target - this.bronzeShown) * 0.15);
    if (Math.abs(target - this.bronzeShown) < 1) this.bronzeShown = target;
    ctx.fillStyle = COLORS.bronze;
    ctx.beginPath(); ctx.arc(26, 60, 3.5, 0, Math.PI * 2); ctx.fill();
    text(ctx, String(Math.round(this.bronzeShown)), 34, 64, 11, COLORS.paper);
    if (scene.save.glas) {
      ctx.fillStyle = 'rgba(201,143,69,0.6)';
      text(ctx, '⌂', 70, 64, 9, COLORS.bronze);
    }
    // Boss health.
    if (this.boss && !this.boss.e.dead) {
      const w = 300;
      const x = (VIEW_W - w) / 2;
      const y = VIEW_H - 26;
      text(ctx, tx(`bosses.${this.boss.name}.name`), VIEW_W / 2, y - 5, 10, COLORS.paper, 'center', FONT_DISPLAY);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, w, 5);
      const k = Math.max(0, this.boss.e.hp / this.boss.e.maxHp);
      ctx.fillStyle = '#c9b48a';
      ctx.fillRect(x, y, w * k, 5);
      ctx.strokeStyle = 'rgba(232,220,192,0.4)';
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 6);
    }
    // Area / boss title.
    if (this.title) {
      const t = ++this.title.t;
      const a = t < 40 ? t / 40 : t > 200 ? Math.max(0, 1 - (t - 200) / 50) : 1;
      if (a <= 0 && t > 200) this.title = null;
      else {
        ctx.globalAlpha = a;
        text(ctx, this.title.sub, VIEW_W / 2, 98, 11, COLORS.dim, 'center');
        text(ctx, this.title.text, VIEW_W / 2, 126, 26, COLORS.paper, 'center', FONT_DISPLAY);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(VIEW_W / 2 - 60 * a, 136, 120 * a, 1);
        ctx.globalAlpha = 1;
      }
    }
    // Toasts.
    this.toasts.forEach((t, i) => {
      t.t++;
      const a = t.t < 15 ? t.t / 15 : t.t > 200 ? Math.max(0, 1 - (t.t - 200) / 30) : 1;
      ctx.globalAlpha = a;
      const y = VIEW_H - 70 + i * 18;
      ctx.font = `11px ${FONT_DISPLAY}`;
      const w = ctx.measureText(t.text).width + (t.icon ? 26 : 16);
      ctx.fillStyle = 'rgba(8,8,12,0.7)';
      ctx.fillRect(VIEW_W - w - 14, y - 12, w, 16);
      if (t.icon) drawImg(ctx, t.icon, VIEW_W - w - 10, y - 11, 14, 14);
      text(ctx, t.text, VIEW_W - 22, y, 11, COLORS.paper, 'right', FONT_DISPLAY);
      ctx.globalAlpha = 1;
    });
    this.toasts = this.toasts.filter((t) => t.t < 230);
  }
}
