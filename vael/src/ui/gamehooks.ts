import { audio } from '../engine/audio';
import { input } from '../engine/input';
import { FallenStar, Shrine } from '../game/props';
import { writeSave } from '../game/save';
import type { Scene } from '../game/scene';
import { has, t, tl } from '../i18n';
import { zoneLook } from '../render/zones';
import type { App } from './app';
import { Banner, BossCard, ChoiceBox, Dialogue, Revelation } from './modals';
import { Shop } from './shop';
import { Cinematic } from './cinematic';
import { ROOMS } from '../world/world';

/** Replaces {action} placeholders with the key bound to it. */
export function keys(s: string): string {
  return s.replace(/\{(\w+)\}/g, (_, a) => `[${input.keyName(a)}]`);
}

/** Game-level reactions to the scene: rests, deaths, respawns, pickups, bosses, dialogues. */
export class GameHooks {
  /** How many times each NPC was spoken to. */
  private talks: Record<string, number> = {};

  constructor(private app: App) {}

  get scene(): Scene {
    return this.app.scene;
  }

  attach(scene: Scene): void {
    scene.onRest = () => {
      writeSave(scene.save);
      scene.emit({ t: 'heal', x: scene.player.cx, y: scene.player.cy });
      const box: ChoiceBox = new ChoiceBox(t('rest.title'), [
        { label: () => t('rest.leave'), action: () => { box.closed = true; } },
      ]);
      this.app.push(box);
      scene.say(t('toast.saved'), 120);
    };
    scene.ui = (kind, arg) => this.ui(kind, arg);
  }

  private ui(kind: string, arg: string): void {
    const s = this.scene;
    switch (kind) {
      case 'reveal':
        this.app.push(new Revelation(t(`abilities.${arg}.name`), t(`abilities.${arg}.desc`), keys(t(`abilities.${arg}.how`)), `ic_ab_${arg}`));
        writeSave(s.save);
        break;
      case 'revealArt':
        this.app.push(new Revelation(t(`arts.${arg}.name`), t(`arts.${arg}.desc`), has(`arts.${arg}.how`) ? keys(t(`arts.${arg}.how`)) : '', `ic_art_${arg}`));
        writeSave(s.save);
        break;
      case 'banner':
        this.app.push(new Banner(t(`items.${arg}.name`), t(`items.${arg}.desc`)));
        break;
      case 'bannerSeal':
        this.app.push(new Banner(t(`seals.${arg}.name`), t(`seals.${arg}.desc`)));
        break;
      case 'bannerMap':
        this.app.push(new Banner(t('items.map.name', { zone: t(`zones.${arg}`) }), t('items.map.desc')));
        break;
      case 'lore':
        this.app.push(new Dialogue(t(`lore.${arg}.title`), [t(`lore.${arg}.text`)]));
        break;
      case 'npc':
        this.talk(arg);
        break;
      case 'bossIntro': {
        audio.playMusic('boss', 0.3);
        const b = s.boss!;
        s.cameraFocus = { x: (s.player.cx + b.cx) / 2, y: b.cy - 80 };
        this.app.view.camera.setZoom(0.9);
        this.app.hideZoneTitle();
        this.app.push(new BossCard(arg));
        setTimeout(() => {
          s.cameraFocus = null;
        }, 1600);
        break;
      }
      case 'heart':
        this.heart();
        break;
      case 'bossDown':
        if (arg === 'etoile') {
          setTimeout(() => this.ending('c'), 2500);
          break;
        }
        this.app.view.camera.setZoom(1);
        audio.playMusic(zoneLook(s.room.def.zone).music);
        writeSave(s.save);
        break;
    }
  }

  /** The heart of the star: the secret keeper for those who sang the eight songs with Pip, else the choice. */
  private heart(): void {
    const s = this.scene;
    const chants = Object.keys(s.flags).filter((f) => f.startsWith('chant_')).length;
    const pip = Object.keys(s.flags).filter((f) => f.startsWith('pip_')).length;
    if (chants >= 8 && pip >= 4 && !s.flags.boss_etoile) {
      this.app.push(new Dialogue(t('npc.pip.name'), tl('npc.pip.home')));
      s.startBoss('etoile', s.room.pxW / 2, 21 * 40);
      return;
    }
    const box: ChoiceBox = new ChoiceBox(t('ending.choose'), [
      { label: () => t('ending.a.title'), action: () => { box.closed = true; this.ending('a'); }, hint: () => t('ending.a.hint') },
      { label: () => t('ending.b.title'), action: () => { box.closed = true; this.ending('b'); }, hint: () => t('ending.b.hint') },
      { label: () => t('ending.wait'), action: () => { box.closed = true; } },
    ]);
    this.app.push(box);
  }

  /** Plays an ending, records it, then returns to the title. */
  ending(which: 'a' | 'b' | 'c'): void {
    const s = this.scene;
    s.setFlag(`ending_${which}`);
    s.setFlag('finished');
    writeSave(s.save);
    const img = { a: 'fin_lien', b: 'fin_liberation', c: 'fin_aube' }[which];
    const lines = tl(`ending.${which}.lines`);
    const h = Math.floor(s.save.playTime / 3600);
    const m = Math.floor((s.save.playTime % 3600) / 60);
    const seen = new Set(s.save.seen).size;
    const pct = Math.round((seen / ROOMS.length) * 100);
    audio.playMusic(which === 'b' ? 'firmament' : 'coeur');
    this.app.fadeTo(() => {
      this.app.push(new Cinematic([
        ...lines.map((l, i) => ({ image: img, lines: [l], title: i === 0 ? t(`ending.${which}.title`) : undefined })),
        { lines: [t('ending.thanks'), t('ending.stats', { time: `${h} h ${m} min`, deaths: s.save.deaths, pct })], title: 'VAEL' },
      ], () => this.app.fadeTo(() => { this.app.clearModals(); this.app.showTitle(); })));
    });
  }

  private talk(who: string): void {
    if (who === 'pip') this.scene.setFlag(`pip_${this.scene.room.id}`);
    const n = (this.talks[who] = (this.talks[who] ?? 0) + 1);
    const f = this.scene.flags;
    let key = n === 1 && !f[`met_${who}`] ? 'first' : 'again';
    if (who === 'veilleur') key = f.boss_geoliers ? 'third' : f.boss_forgeron ? 'second' : 'first';
    if (who === 'lunelle' && f.boss_geoliers) key = 'later';
    if (who === 'orsa' && f.boss_bibliothecaire && n > 1) key = 'later';
    if (!has(`npc.${who}.${key}`)) key = 'first';
    this.scene.setFlag(`met_${who}`);
    const d = new Dialogue(t(`npc.${who}.name`), tl(`npc.${who}.${key}`), `pt_${who}`);
    if (['orsa', 'lunelle', 'murmure', 'vey'].includes(who)) {
      // Merchants open their wares after speaking.
      const orig = d.update.bind(d);
      d.update = () => {
        const done = orig();
        if (done) setTimeout(() => this.app.push(new Shop(this.scene, who)), 0);
        return done;
      };
    }
    this.app.push(d);
  }

  placeAtShrine(): void {
    const s = this.scene;
    const shrine = s.entities.find((e) => e instanceof Shrine) as Shrine | undefined;
    if (shrine) {
      s.player.body.x = shrine.cx + 60;
      s.player.body.y = shrine.body.y + shrine.body.h - s.player.body.h;
      s.player.facing = -1;
    }
  }

  /** After a room is entered: the fallen star waits where the hero died. */
  entered(): void {
    const s = this.scene;
    const lost = s.save.lost;
    if (lost && lost.room === s.room.id) s.add(new FallenStar(s, lost.x, lost.y, lost.dust));
  }

  respawn(): void {
    const s = this.scene;
    const p = s.player;
    // The dust stays where the hero fell (only the last death counts).
    if (s.save.dust > 0) s.save.lost = { room: s.room.id, x: p.cx, y: p.safe.y + p.body.h, dust: s.save.dust };
    else s.save.lost = null;
    s.save.dust = 0;
    s.killed.clear();
    s.enter(s.save.shrineRoom);
    this.placeAtShrine();
    this.entered();
    p.dead = false;
    p.hp = p.maxHp;
    p.invuln = 60;
    p.hurtT = 0;
    p.body.vx = 0;
    p.body.vy = 0;
    s.lumen = 0;
    s.eclipse = 0;
    s.boss = null;
    this.app.view.camera.setZoom(1);
    this.app.view.buildRoom(s);
    this.app.view.camera.snap(p.cx, p.cy);
    writeSave(s.save);
    audio.playMusic(zoneLook(s.room.def.zone).music);
  }

  update(): void {}
}
