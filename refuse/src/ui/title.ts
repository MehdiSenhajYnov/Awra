import { audio } from '../audio';
import * as G from '../game/state';
import { L, fmt } from '../i18n';
import { loadGame } from '../save';
import { button, confirmBox, h, img, modal, onKeys, show } from './dom';
import { openHowto } from './howto';
import { openOptions } from './options';
import { continueGame, startNewGame } from './router';

declare global {
  interface Window {
    refuseDesktop?: { quit(): void };
  }
}

export function showTitle(): void {
  const t = L();
  const saved = loadGame();
  audio.track('title');
  onKeys(null);
  const menu = h('nav.menu');
  if (saved) {
    const realm = (t.realms as Record<string, { name: string }>)[G.REALMS_IDS[saved.realm]].name;
    const floor = saved.ended && saved.floor >= 3 ? t.hud.endless : t.floors[saved.floor];
    menu.append(button(fmt(t.title.continue, { realm, floor }), () => { audio.unlock(); continueGame(saved); }, 'primary'));
  }
  menu.append(button(t.title.play, async () => {
    audio.unlock();
    if (saved && !(await confirmBox(t.title.resetConfirm, t.hud.yes, t.hud.no))) return;
    startNewGame();
  }, saved ? '' : 'primary'));
  menu.append(button(t.title.howto, () => openHowto()));
  menu.append(button(t.title.options, () => openOptions(() => showTitle())));
  menu.append(button(t.title.credits, () => {
    const box = h('div.menu-box', {}, h('h2', {}, t.credits.title), h('p.credits', {}, t.credits.body));
    const m = modal(box);
    box.append(button(t.options.close, () => m.close(), 'primary'));
  }));
  if (window.refuseDesktop) menu.append(button(t.title.quit, () => window.refuseDesktop!.quit()));

  show(h('div.scene.parchment.title', { onpointerdown: () => audio.unlock() },
    h('div.title-art', {}, img('bg_titre')),
    h('div.title-side', {},
      h('h1.logo', {}, t.title.name, h('span.logo-stamp', {}, t.hud.refuse)),
      h('p.tagline', {}, t.title.tagline),
      menu,
      h('p.version', {}, 'v1.0'))));
}
