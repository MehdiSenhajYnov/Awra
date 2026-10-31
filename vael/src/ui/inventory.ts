import { Container, Graphics, Sprite, type Text } from 'pixi.js';
import { audio } from '../engine/audio';
import { input } from '../engine/input';
import type { Scene } from '../game/scene';
import { SEALS, SEAL_ORDER, notchesUsed } from '../game/seals';
import { t } from '../i18n';
import { hasTex, tex } from '../render/assets';
import { DIM, GOLD, PALE, divider, panel, star, style, text } from './draw';
import { keys } from './gamehooks';
import type { Modal } from './modals';

const ABILITY_ORDER = ['blade', 'dash', 'walljump', 'blink', 'double', 'ring', 'comet'];
const ART_ORDER = ['comete', 'ascension', 'chute', 'comete2', 'ascension2', 'chute2', 'constellation'];
const LORE_ORDER = Array.from({ length: 16 }, (_, i) => `l${i + 1}`);

interface Entry {
  icon: string;
  name: string;
  desc: string;
  owned: boolean;
  equipped?: boolean;
  cost?: number;
}

/** The inventory: Seals (equip), abilities and arts, items, frescoes read. */
export class Inventory implements Modal {
  c = new Container();
  private tab = 0;
  private sel = 0;
  private g = new Graphics();
  private icons = new Container();
  private tabTexts: Text[] = [];
  private name: Text;
  private desc: Text;
  private info: Text;
  private tt = 0;

  constructor(private scene: Scene) {
    this.c.addChild(new Graphics().rect(0, 0, 1920, 1080).fill({ color: 0x020206, alpha: 0.86 }));
    const p = panel(1640, 860, 0.6);
    p.position.set(140, 110);
    this.c.addChild(p, this.g, this.icons);
    const tabs = [t('ui.seals'), t('ui.abilities'), t('ui.items'), t('ui.lore')];
    tabs.forEach((s, i) => {
      const tx = text(s, style('menu', PALE, 30, 'center'), 400 + i * 380, 170, 0.5, 0.5);
      this.tabTexts.push(tx);
      this.c.addChild(tx);
    });
    const d = divider(1500);
    d.position.set(960, 215);
    this.c.addChild(d);
    this.name = text('', style('title', GOLD, 40), 1140, 290);
    this.desc = text('', style('body', PALE, 32, 'left', 560), 1140, 360);
    this.info = text('', style('italic', DIM, 28, 'left', 1500), 200, 900);
    this.c.addChild(this.name, this.desc, this.info);
    audio.play('ui');
  }

  private entries(): Entry[] {
    const s = this.scene.save;
    if (this.tab === 0) {
      return SEAL_ORDER.map((k, i) => ({
        icon: `ic_seal_${i}`, name: t(`seals.${k}.name`), desc: t(`seals.${k}.desc`), owned: s.seals.includes(k), equipped: s.sealsOn.includes(k), cost: SEALS[k].cost,
      }));
    }
    if (this.tab === 1) {
      return [
        ...ABILITY_ORDER.map((k) => ({ icon: `ic_ab_${k}`, name: t(`abilities.${k}.name`), desc: `${t(`abilities.${k}.desc`)}\n\n${keys(t(`abilities.${k}.how`))}`, owned: k === 'blade' || s.abilities.includes(k) })),
        ...ART_ORDER.map((k) => ({ icon: `ic_art_${k}`, name: t(`arts.${k}.name`), desc: t(`arts.${k}.desc`), owned: s.arts.includes(k) })),
      ];
    }
    if (this.tab === 2) {
      const chants = Object.keys(s.flags).filter((f) => f.startsWith('chant_')).length;
      return [
        { icon: 'ic_item_0', name: t('items.shard.name'), desc: `${t('items.shard.desc')}\n\n${t('ui.shards', { n: s.shards })}`, owned: true },
        { icon: 'ic_item_3', name: t('items.vesselFull.name'), desc: `${t('items.vessel.desc')}\n\n${t('ui.vessels', { n: s.vesselFrags })}`, owned: true },
        { icon: 'ic_item_4', name: t('items.ore.name'), desc: `${t('items.ore.desc')}\n\n× ${s.ore}\n${t('ui.forge', { n: s.forge })}`, owned: s.ore > 0 || s.forge > 0 },
        { icon: 'ic_item_6', name: t('items.chant.name'), desc: `${t('items.chant.desc')}\n\n${t('ui.chants', { n: chants })}`, owned: chants > 0 },
        { icon: 'ic_item_7', name: t('items.key.name'), desc: t('items.key.desc'), owned: !!s.flags.key_geole },
      ];
    }
    return LORE_ORDER.map((k) => ({ icon: 'ic_art_11', name: t(`lore.${k}.title`), desc: t(`lore.${k}.text`), owned: !!s.flags[`read_${k}`] }));
  }

  update(): boolean {
    this.tt++;
    const list = this.entries();
    const cols = this.tab === 3 ? 4 : 4;
    if (input.pressed('dash') || input.pressed('heal')) {
      this.tab = (this.tab + (input.pressed('dash') ? 1 : 3)) % 4;
      this.sel = 0;
      audio.play('uiMove');
    }
    const move = (d: number) => {
      this.sel = Math.max(0, Math.min(list.length - 1, this.sel + d));
      audio.play('uiMove');
    };
    if (input.pressed('right')) move(1);
    if (input.pressed('left')) move(-1);
    if (input.pressed('down')) move(cols);
    if (input.pressed('up')) move(-cols);
    const cur = list[this.sel];
    if (this.tab === 0 && cur?.owned && (input.pressed('confirm') || input.pressed('jump') || input.pressed('attack'))) this.toggleSeal(SEAL_ORDER[this.sel]);
    this.draw(list, cols);
    return input.pressed('back') || input.pressed('pause');
  }

  private toggleSeal(k: string): void {
    const s = this.scene.save;
    if (s.sealsOn.includes(k)) {
      s.sealsOn = s.sealsOn.filter((x) => x !== k);
      audio.play('uiMove');
    } else if (notchesUsed(s.sealsOn) + SEALS[k].cost <= s.notches) {
      s.sealsOn.push(k);
      audio.play('ui');
    } else {
      this.scene.say(t('ui.noRoom'), 90);
      audio.play('clank');
    }
  }

  private draw(list: Entry[], cols: number): void {
    const g = this.g;
    g.clear();
    for (const ch of this.icons.removeChildren()) ch.destroy();
    this.tabTexts.forEach((tx, i) => {
      tx.alpha = i === this.tab ? 1 : 0.45;
      if (i === this.tab) star(g, tx.x - tx.width / 2 - 26, tx.y, 10, GOLD);
    });
    const x0 = 230;
    const y0 = 300;
    const cell = 200;
    for (const [i, e] of list.entries()) {
      const cx = x0 + (i % cols) * cell + cell / 2;
      const cy = y0 + Math.floor(i / cols) * 150 + 60;
      const sel = i === this.sel;
      g.circle(cx, cy, 58).fill({ color: 0x0a0d1c, alpha: 0.9 }).stroke({ color: e.equipped ? 0xfff0c8 : sel ? GOLD : 0x3a4060, width: e.equipped ? 4 : 2, alpha: 0.9 });
      if (e.owned && hasTex(e.icon)) {
        const s = new Sprite(tex(e.icon));
        s.anchor.set(0.5);
        s.scale.set(96 / Math.max(s.texture.width, s.texture.height));
        s.position.set(cx, cy);
        this.icons.addChild(s);
      } else if (e.owned) star(g, cx, cy, 26, GOLD, 0.9);
      else g.circle(cx, cy, 8).fill({ color: 0x3a4060 });
      if (sel) star(g, cx, cy - 74, 9 + Math.sin(this.tt * 0.15) * 2, GOLD);
      if (e.cost && e.owned) for (let k = 0; k < e.cost; k++) g.circle(cx - (e.cost - 1) * 9 + k * 18, cy + 72, 5).fill({ color: GOLD, alpha: 0.8 });
    }
    const cur = list[this.sel];
    this.name.text = cur?.owned ? cur.name : '???';
    this.desc.text = cur?.owned ? cur.desc : '';
    const s = this.scene.save;
    this.info.text = this.tab === 0
      ? `${t('ui.notches', { used: notchesUsed(s.sealsOn), max: s.notches })}  ·  [${input.keyName('heal')}] / [${input.keyName('dash')}]`
      : `[${input.keyName('heal')}] / [${input.keyName('dash')}]`;
  }
}
