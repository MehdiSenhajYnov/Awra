import { audio } from '../audio';
import type { Lang } from '../data/letters';
import { L, fmt, lang, num } from '../i18n';
import { loadProfile, loadRun } from '../save';
import { button, h, modal, onKeys, show } from './dom';
import { openHowto } from './howto';
import { openOptions } from './options';
import { continueRun, startDaily, todayKey } from './router';
import { showSetup } from './setup';

declare global {
  interface Window {
    grilleDesktop?: { quit(): void };
  }
}

export function showTitle(): void {
  const t = L();
  const saved = loadRun();
  const profile = loadProfile();
  const gridLang: Lang = profile.gridLang ?? (lang() as Lang);
  audio.track('title');
  onKeys(null);
  const menu = h('nav.menu');
  if (saved && !saved.daily && saved.phase !== 'won') menu.append(button(fmt(t.title.continue, { e: saved.edition }), () => { audio.unlock(); continueRun(saved); }, 'primary'));
  menu.append(button(t.title.newRun, () => {
    audio.unlock();
    if (!profile.howtoSeen) openHowto(() => showSetup());
    else showSetup();
  }, saved && !saved.daily && saved.phase !== 'won' ? '' : 'primary'));
  const best = profile.daily[todayKey()];
  menu.append(button(best !== undefined ? fmt(t.title.dailyDone, { n: num(best) }) : t.title.daily, () => { audio.unlock(); startDaily(gridLang); }));
  menu.append(button(t.title.howto, () => openHowto()));
  menu.append(button(t.title.options, () => openOptions(() => showTitle())));
  menu.append(button(t.title.credits, () => {
    const box = h('div.menu-box', {}, h('h2', {}, t.credits.title), h('p.credits', {}, t.credits.body));
    const m = modal(box);
    box.append(button(t.options.close, () => m.close(), 'primary'));
  }));
  if (window.grilleDesktop) menu.append(button(t.title.quit, () => window.grilleDesktop!.quit()));

  // The title screen is a front page, with a little crossword built from the game's name.
  const deco = h('div.title-grid');
  const across = t.title.name.toUpperCase();
  const down = lang() === 'fr' ? 'ECRIRE' : 'WRITE';
  const crossAt = down.indexOf(across[2]);
  const letterAt = (x: number, y: number) => {
    if (y === 3 && x >= 1 && x - 1 < across.length) return across[x - 1];
    const dy = y - (3 - crossAt);
    if (x === 3 && dy >= 0 && dy < down.length) return down[dy];
    return '';
  };
  for (let y = 0; y < 7; y++) for (let x = 0; x < 9; x++) {
    const letter = letterAt(x, y);
    const black = !letter && (x * 7 + y * 3) % 5 === 0;
    deco.append(h(`div.tg${black ? '.black' : ''}${letter ? '.full' : ''}` as 'div', {}, letter));
  }
  show(h('div.scene.paper.title', { onpointerdown: () => audio.unlock() },
    h('header.front-head', {},
      h('div.front-meta', {}, h('span', {}, 'Paris'), h('span', {}, '1956'), h('span', {}, '15 c.')),
      h('h1.front-title', {}, 'L’Écho du Soir'),
      h('div.front-rule')),
    h('div.front-body', {},
      h('div.front-left', {}, h('h2.logo', {}, t.title.name), h('p.tagline', {}, t.title.tagline), deco),
      h('article.notice', {}, h('h3', {}, t.title.noticeTitle), h('p', {}, t.title.notice)),
      menu),
    h('footer.front-foot', {},
      h('span', {}, fmt(t.title.best, { n: num(profile.bestScore) })),
      h('span', {}, fmt(t.title.wins, { n: profile.wins })),
      h('span', {}, 'v1.0'))));
}
