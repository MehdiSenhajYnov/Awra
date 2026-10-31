import { audio } from '../audio';
import * as G from '../game/state';
import { L } from '../i18n';
import { saveGame } from '../save';
import { button, h, img } from './dom';
import { startApp } from './app';
import { openHowto } from './howto';
import { openOptions } from './options';

/** First launch only: the title card, the keeper's name, then the strip. Later launches go straight to the watch. */
export function showWelcome(): void {
  const t = L();
  const app = document.getElementById('app')!;
  const name = h('input.text', { type: 'text', maxlength: 18, placeholder: t.title.keeperDefault, 'aria-label': t.title.keeperPrompt }) as HTMLInputElement;
  const start = () => {
    audio.unlock();
    const g = G.newGame();
    g.keeperName = name.value.trim();
    saveGame(g);
    startApp(g);
    openHowto();
  };
  app.replaceChildren(h('div.welcome', {},
    h('div.welcome-art', {}, img('bg_titre')),
    h('div.welcome-card', {},
      h('h1.logo', {}, t.title.name),
      h('p.tagline', {}, t.title.tagline),
      h('label.keeper', {}, h('span', {}, t.title.keeperPrompt), name),
      h('nav.menu', {},
        button(t.title.start, start, 'primary'),
        button(t.title.howto, () => openHowto()),
        button(t.title.options, () => openOptions({ onLangChange: showWelcome })),
        window.phareDesktop ? button(t.title.quit, () => window.phareDesktop!.quit()) : null))));
}
