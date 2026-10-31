import { audio } from '../audio';
import { PERKS } from '../data/content';
import * as G from '../game/state';
import type { GameState } from '../game/state';
import { L, fmt } from '../i18n';
import { clearGame, howtoSeen, markHowtoSeen, saveGame } from '../save';
import { button, fill, h, img, onKeys, show, typewriter } from './dom';
import { showDesk, stopDesk } from './desk';
import { money, perkText } from './forms';
import { openHowto } from './howto';
import { showTitle } from './title';

export function goTitle(): void {
  showTitle();
}

export function startNewGame(): void {
  clearGame();
  const g = G.newGame();
  saveGame(g);
  const go = () => showDesk(g);
  if (!howtoSeen()) { markHowtoSeen(); go(); openHowto(); } else go();
}

export function continueGame(g: GameState): void {
  const away = G.offlineProgress(g);
  saveGame(g);
  showDesk(g, away);
}

const realmName = (g: GameState) => (L().realms as Record<string, { name: string; desc: string }>)[G.realmOf(g).id];

/** After a fraudulent bankruptcy: the holding's board, where shares buy permanent perks. */
export function showBoard(g: GameState, gained: number): void {
  stopDesk();
  saveGame(g);
  onKeys(null);
  audio.track('title');
  audio.play('coin');
  const t = L();
  const shares = h('p.board-shares');
  const list = h('div.board-perks');
  const render = () => {
    fill(shares, fmt(t.hud.shares, { n: g.shares }));
    fill(list, ...PERKS.map((p) => {
      const level = G.perk(g, p.id);
      const maxed = level >= p.max;
      const cost = G.perkCost(g, p.id);
      const b = button(maxed ? t.hud.bought : fmt(t.hud.shares, { n: cost }), () => {
        if (G.buyPerk(g, p.id)) { audio.play('buy'); saveGame(g); render(); }
      }, 'buy');
      b.disabled = maxed || g.shares < cost;
      return h(`div.perk${maxed ? '.owned' : ''}` as 'div', {},
        h('div.row-name', {}, perkText(p.id).name, p.max > 1 ? h('span.row-extra', {}, `${level}/${p.max}`) : null),
        h('div.row-desc', {}, perkText(p.id).desc), b);
    }));
  };
  render();
  const realm = realmName(g);
  show(h('div.scene.parchment.board', {},
    h('div.board-left', {},
      img('pt_grisard', 'board-face'),
      h('h1', {}, t.bankruptcy.title),
      h('p.board-line', {}, t.bankruptcy.line),
      h('p.board-gain', {}, fmt(t.bankruptcy.gained, { n: gained })),
      h('div.board-next', {}, h('h3', {}, realm.name), h('p', {}, realm.desc)),
      button(fmt(t.bankruptcy.next, { realm: realm.name }), () => { saveGame(g); showDesk(g); }, 'primary')),
    h('div.board-right', {}, h('h2', {}, t.hud.board), shares, list)));
}

/** The apocalypse, denied. Then the endless year, in the Underworld. */
export function showEnding(g: GameState): void {
  stopDesk();
  saveGame(g);
  onKeys(null);
  audio.track('title');
  audio.play('win');
  const t = L();
  const body = h('p.ending-body');
  const buttons = h('div.row');
  show(h('div.scene.parchment.ending', {},
    h('div.ending-art-wrap', {}, img('fin_apocalypse', 'ending-art'), h('div.ending-stamp', {}, t.hud.refuse)),
    h('div.ending-text', {},
      h('h1', {}, t.ending.title),
      body,
      h('p.ending-stats', {}, fmt(t.ending.stats, { r: g.stats.refused, a: g.stats.approved, e: g.stats.riots, b: g.stats.bankruptcies })),
      h('p.ending-money', {}, money(g.ecus)),
      buttons)));
  void typewriter(body, t.ending.body).then(() => {
    fill(buttons,
      button(t.ending.endless, () => showDesk(g), 'primary'),
      button(t.options.toTitle, () => goTitle()));
  });
}
