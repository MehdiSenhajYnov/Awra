import type { Scene } from '../game/scene';
import { Shrine } from '../game/props';
import { t } from '../i18n';
import type { App } from './app';
import { ChoiceBox } from './modals';
import { writeSave } from '../game/save';

/** Game-level reactions to the scene: rests, deaths, respawns, pickups, bosses. */
export class GameHooks {
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

  respawn(): void {
    const s = this.scene;
    const p = s.player;
    s.save.dust = 0;
    s.killed.clear();
    s.enter(s.save.shrineRoom);
    this.placeAtShrine();
    p.dead = false;
    p.hp = p.maxHp;
    p.invuln = 60;
    p.hurtT = 0;
    p.body.vx = 0;
    p.body.vy = 0;
    s.lumen = 0;
    this.app.view.buildRoom(s);
    this.app.view.camera.snap(p.cx, p.cy);
  }

  update(): void {}
}
