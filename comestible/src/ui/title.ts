import { audio } from '../audio';
import { L, fmt } from '../i18n';
import { loadGame, loadProfile } from '../save';
import { button, h, modal, onKeys, show } from './dom';
import { openOptions } from './options';
import { continueCampaign, startCampaign, startEndless } from './router';

declare global {
  interface Window {
    comestibleDesktop?: { quit(): void };
  }
}

export function showTitle(): void {
  const t = L();
  const save = loadGame();
  const profile = loadProfile();
  audio.music('title');
  onKeys(null);

  const menu = h('nav.title-menu');
  if (save) menu.append(button(fmt(t.title.continue, { n: save.night }), () => { audio.unlock(); continueCampaign(save); }, 'primary'));
  menu.append(button(t.title.newGame, () => { audio.unlock(); chooseDifficulty(); }, save ? '' : 'primary'));
  const endless = button(profile.campaignDone ? t.title.endless : t.title.endlessLocked, () => { audio.unlock(); startEndless(); });
  endless.disabled = !profile.campaignDone;
  menu.append(endless,
    button(t.title.options, () => openOptions(true, () => showTitle())),
    button(t.title.credits, () => credits()));
  if (window.comestibleDesktop) menu.append(button(t.title.quit, () => window.comestibleDesktop!.quit()));

  const scene = h('div.scene.title', { onpointerdown: () => audio.unlock() },
    h('div.bg.title-bg', { style: "background-image:url('img/bg_titre.webp')" }),
    h('div.title-fog'),
    h('header.title-head', {}, h('h1.logo', {}, t.title.name), h('p.tagline', {}, t.title.tagline)),
    menu,
    h('footer.title-foot', {},
      h('span', {}, fmt(t.title.endings, { n: profile.endings.length })),
      profile.bestEndless ? h('span', {}, fmt(t.title.best, { n: profile.bestEndless })) : null,
      h('span', {}, 'v1.0')));
  show(scene);
}

function chooseDifficulty(): void {
  const t = L();
  const box = h('div.menu-box.difficulty', {}, h('h2', {}, t.difficulty.title));
  const m = modal(box);
  const choice = (label: string, desc: string, relaxed: boolean) =>
    h('button.choice', { onclick: () => { audio.play('click'); m.close(); startCampaign(relaxed); } }, h('strong', {}, label), h('span', {}, desc));
  box.append(
    choice(t.difficulty.normal, t.difficulty.normalDesc, false),
    choice(t.difficulty.relaxed, t.difficulty.relaxedDesc, true),
    button(t.difficulty.back, () => m.close(), 'ghost'));
}

function credits(): void {
  const t = L();
  const box = h('div.menu-box.credits', {}, h('h2', {}, t.credits.title), h('p.credits-body', {}, t.credits.body));
  const m = modal(box);
  box.append(button(t.options.close, () => m.close(), 'primary'));
}
