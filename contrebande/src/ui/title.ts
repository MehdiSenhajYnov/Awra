import { audio } from '../audio';
import { L, fmt } from '../i18n';
import { loadProfile, loadRun } from '../save';
import { button, h, modal, onKeys, show } from './dom';
import { openHowto } from './howto';
import { openOptions } from './options';
import { continueRun, startDaily, todayKey } from './router';
import { showSetup } from './setup';

declare global {
  interface Window {
    contrebandeDesktop?: { quit(): void };
  }
}

export function showTitle(): void {
  const t = L();
  const saved = loadRun();
  const profile = loadProfile();
  audio.track('title');
  onKeys(null);
  const menu = h('nav.title-menu');
  if (saved && !saved.daily) menu.append(button(fmt(t.title.continue, { b: saved.border }), () => { audio.unlock(); continueRun(saved); }, 'primary'));
  menu.append(button(t.title.newRun, () => {
    audio.unlock();
    if (!profile.howtoSeen) openHowto(() => showSetup());
    else showSetup();
  }, saved && !saved.daily ? '' : 'primary'));
  const dailyBest = profile.daily[todayKey()];
  menu.append(button(dailyBest !== undefined ? fmt(t.title.dailyDone, { n: dailyBest }) : t.title.daily, () => { audio.unlock(); startDaily(); }));
  menu.append(button(t.title.howto, () => openHowto()));
  menu.append(button(t.title.options, () => openOptions(() => showTitle())));
  menu.append(button(t.title.credits, () => {
    const box = h('div.menu-box', {}, h('h2', {}, t.credits.title), h('p.credits', {}, t.credits.body));
    const m = modal(box);
    box.append(button(t.options.close, () => m.close(), 'primary'));
  }));
  if (window.contrebandeDesktop) menu.append(button(t.title.quit, () => window.contrebandeDesktop!.quit()));

  const scene = h('div.scene.title', { onpointerdown: () => audio.unlock() },
    h('div.bg.title-bg', { style: "background-image:url('img/bg_titre.webp')" }),
    h('header.title-head', {}, h('h1.logo', {}, t.title.name), h('p.tagline', {}, t.title.tagline)),
    menu,
    h('footer.title-foot', {},
      h('span', {}, fmt(t.title.best, { n: profile.bestScore })),
      h('span', {}, fmt(t.title.wins, { n: profile.wins })),
      h('span', {}, 'v1.0')));
  show(scene);
}
