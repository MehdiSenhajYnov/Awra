import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { audio } from '../engine/audio';
import { input } from '../engine/input';
import type { PickupKind } from '../game/props';
import type { Scene } from '../game/scene';
import { SEALS } from '../game/seals';
import { t, tl } from '../i18n';
import { hasTex, tex } from '../render/assets';
import { DIM, GOLD, PALE, divider, panel, star, style, text } from './draw';
import type { Modal } from './modals';

interface Ware {
  kind: PickupKind | 'forge';
  value: string;
  price: number;
  flag: string;
  /** Extra requirement (forge needs star iron). */
  needs?: () => boolean;
}

const SEAL_ICON = (k: string) => `ic_seal_${Object.keys(SEALS).indexOf(k)}`;

export function wares(who: string, scene: Scene): Ware[] {
  const f = scene.flags;
  const sealWare = (k: string): Ware => ({ kind: 'seal', value: k, price: SEALS[k].price, flag: `buy_seal_${k}` });
  switch (who) {
    case 'orsa':
      return [
        ...(['jardins', 'forge', 'archives', 'bastion', 'firmament', 'penombre', 'coeur'] as const).map((z, i) => ({ kind: 'map' as PickupKind, value: z, price: 60 + i * 30, flag: `buy_map_${z}` })),
        { kind: 'shard', value: '', price: 380, flag: 'buy_shard_orsa' },
      ];
    case 'lunelle':
      return [
        ...['longfil', 'paume', 'coureur', 'rebond', 'guet', 'marque'].map(sealWare),
        ...(f.boss_forgeron ? ['sang', 'avare'].map(sealWare) : []),
        { kind: 'vessel', value: '', price: 300, flag: 'buy_vessel_lunelle' },
        { kind: 'notch', value: '', price: 450, flag: 'buy_notch_lunelle' },
      ];
    case 'murmure':
      return [
        ...['fragile', 'jumelle', 'eclipse', 'moisson', 'lueur'].map(sealWare),
        { kind: 'shard', value: '', price: 520, flag: 'buy_shard_murmure' },
        { kind: 'vessel', value: '', price: 480, flag: 'buy_vessel_murmure' },
        { kind: 'notch', value: '', price: 800, flag: 'buy_notch_murmure' },
      ];
    case 'vey': {
      const lvl = scene.save.forge;
      const costs = [200, 450, 800, 1200];
      return lvl >= 4 ? [] : [{ kind: 'forge', value: String(lvl + 1), price: costs[lvl], flag: `forge_${lvl + 1}`, needs: () => scene.save.ore > 0 }];
    }
  }
  return [];
}

/** A merchant's wares: a list with prices; stardust buys. */
export class Shop implements Modal {
  c = new Container();
  private sel = 0;
  private g = new Graphics();
  private rows: Text[] = [];
  private icons = new Container();
  private desc: Text;
  private dust: Text;
  private list: Ware[];

  constructor(private scene: Scene, private who: string) {
    this.list = wares(who, scene);
    this.c.addChild(new Graphics().rect(0, 0, 1920, 1080).fill({ color: 0x020206, alpha: 0.7 }));
    const p = panel(1400, 800, 0.9);
    p.position.set(260, 140);
    this.c.addChild(p, this.g, this.icons);
    this.c.addChild(text(t(`npc.${who}.name`), style('title', GOLD, 40, 'center'), 960, 200, 0.5, 0.5));
    const d = divider(1200);
    d.position.set(960, 245);
    this.c.addChild(d);
    this.desc = text('', style('italic', PALE, 30, 'left', 520), 1080, 300);
    this.dust = text('', style('body', GOLD, 32, 'right'), 1600, 880, 1, 0.5);
    this.c.addChild(this.desc, this.dust);
    this.list.forEach((w, i) => {
      const r = text('', style('body', PALE, 32), 380, 300 + i * 56, 0, 0.5);
      this.rows.push(r);
      this.c.addChild(r);
      const icon = w.kind === 'seal' ? SEAL_ICON(w.value) : w.kind === 'map' ? 'ic_item_8' : w.kind === 'shard' ? 'ic_item_0' : w.kind === 'vessel' ? 'ic_item_2' : w.kind === 'notch' ? 'ic_item_5' : 'ic_item_10';
      if (hasTex(icon)) {
        const s = new Sprite(tex(icon));
        s.anchor.set(0.5);
        s.scale.set(44 / Math.max(s.texture.width, s.texture.height));
        s.position.set(340, 300 + i * 56);
        this.icons.addChild(s);
      }
    });
    if (!this.list.length) this.c.addChild(text(tl(`npc.${who}.done`)[0] ?? '', style('italic', PALE, 32, 'center', 1100), 960, 500, 0.5, 0.5));
  }

  private label(w: Ware): string {
    if (w.kind === 'seal') return t(`seals.${w.value}.name`);
    if (w.kind === 'map') return t('items.map.name', { zone: t(`zones.${w.value}`) });
    if (w.kind === 'forge') return `${t('ui.forge', { n: Number(w.value) })} (+ ${t('items.ore.name')})`;
    return t(`items.${w.kind}.name`);
  }

  private descr(w: Ware): string {
    if (w.kind === 'seal') return t(`seals.${w.value}.desc`);
    if (w.kind === 'map') return t('items.map.desc');
    if (w.kind === 'forge') return t('items.ore.desc');
    return t(`items.${w.kind}.desc`);
  }

  update(): boolean {
    const n = this.list.length;
    if (n) {
      if (input.pressed('down')) { this.sel = (this.sel + 1) % n; audio.play('uiMove'); }
      if (input.pressed('up')) { this.sel = (this.sel + n - 1) % n; audio.play('uiMove'); }
      if (input.pressed('confirm') || input.pressed('jump') || input.pressed('attack')) this.buy(this.list[this.sel]);
    }
    const g = this.g;
    g.clear();
    this.list.forEach((w, i) => {
      const sold = !!this.scene.flags[w.flag];
      this.rows[i].text = `${this.label(w)}${sold ? `  —  ${t('ui.sold')}` : `  —  ${t('ui.price', { n: w.price })}`}`;
      this.rows[i].alpha = sold ? 0.35 : i === this.sel ? 1 : 0.65;
      if (i === this.sel) star(g, 305, 300 + i * 56, 10, GOLD);
    });
    if (n) this.desc.text = this.descr(this.list[this.sel]);
    this.dust.text = `${this.scene.save.dust} ✦`;
    void DIM;
    return input.pressed('back') || input.pressed('pause');
  }

  private buy(w: Ware): void {
    const s = this.scene;
    if (s.flags[w.flag]) return;
    if (s.save.dust < w.price || (w.needs && !w.needs())) {
      audio.play('clank');
      s.say(t('ui.tooPoor'), 90);
      return;
    }
    s.save.dust -= w.price;
    if (w.kind === 'forge') {
      s.save.ore--;
      s.save.forge = Number(w.value);
      s.setFlag(w.flag);
      s.emit({ t: 'boom', x: s.player.cx, y: s.player.cy, r: 200, color: 0xffb060 });
      this.list = wares(this.who, s);
      s.say(tl('npc.vey.upgrade')[0], 150);
    } else s.give(w.kind, w.value, w.flag);
    audio.play('pickup');
  }
}
