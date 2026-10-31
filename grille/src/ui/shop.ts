import { audio } from '../audio';
import { BOSSES, MAX_INKS, MAX_PENS } from '../data/content';
import {
  type RunState, buyInk, buyPen, inkPrice, lastGridReward, leaveShop, penPrice, rerollCost, rerollShop, sellPen,
} from '../game/run';
import { L, fmt } from '../i18n';
import { saveRun } from '../save';
import { button, fill, h, onKeys, show } from './dom';

/** Between grids: the reward, then pens and inks for sale. */
export function showShop(run: RunState, onNext: () => void): void {
  const t = L();
  const reward = lastGridReward();
  const box = h('div.shop-box');
  const render = () => {
    const shop = run.shop!;
    const nextBossIdx = run.gridIdx === 1 ? (run.edition - 1) % BOSSES.length : null;
    const nextBoss = nextBossIdx !== null ? BOSSES[nextBossIdx] : null;
    const reroll = button(fmt(t.shop.reroll, { n: rerollCost(run) }), () => {
      if (rerollShop(run)) { audio.play('paper'); saveRun(run); render(); } else audio.play('deny');
    }, 'small');
    reroll.disabled = run.francs < rerollCost(run);
    fill(box, 
      h('div.shop-head', {},
        h('div', {}, h('h1', {}, t.shop.title), h('p.morel', {}, t.shop.line)),
        h('div.wallet', {}, fmt(t.hud.francs, { n: run.francs }))),
      reward ? h('div.receipt', {},
        h('h3', {}, t.shop.reward),
        row(t.shop.base, reward.base), row(t.shop.words, reward.words), row(t.shop.interest, reward.interest),
        reward.bonus ? row(t.shop.bonus, reward.bonus) : null,
        h('div.receipt-total', {}, h('span', {}, t.shop.total), h('span', {}, `+${reward.total} F`))) : null,
      nextBoss ? h('p.next-boss', {}, fmt(t.shop.nextBoss, { name: t.bosses[nextBoss].name, desc: t.bosses[nextBoss].desc })) : null,
      h('div.shelves', {},
        h('section', {},
          h('h2', {}, t.shop.pensShelf),
          h('div.cards', {}, ...shop.pens.map((id, i) => {
            if (!id) return h('div.card.empty');
            const b = button(run.pens.length >= MAX_PENS ? t.shop.full : fmt(t.shop.buy, { n: penPrice(id) }), () => {
              if (buyPen(run, i)) { audio.play('coin'); saveRun(run); render(); } else audio.play('deny');
            }, 'primary small');
            b.disabled = run.pens.length >= MAX_PENS || run.francs < penPrice(id);
            return h('div.card.pen-card', {}, h('div.nib'), h('h3', {}, t.pens[id].name), h('p', {}, t.pens[id].desc), b);
          }))),
        h('section', {},
          h('h2', {}, fmt(t.shop.inks, { n: run.inks.length, max: MAX_INKS })),
          h('div.cards', {}, ...shop.inks.map((id, i) => {
            if (!id) return h('div.card.empty');
            const b = button(run.inks.length >= MAX_INKS ? t.shop.full : fmt(t.shop.buy, { n: inkPrice(id) }), () => {
              if (buyInk(run, i)) { audio.play('coin'); saveRun(run); render(); } else audio.play('deny');
            }, 'primary small');
            b.disabled = run.inks.length >= MAX_INKS || run.francs < inkPrice(id);
            return h('div.card.ink-card', {}, h('div.bottle'), h('h3', {}, t.inks[id].name), h('p', {}, t.inks[id].desc), b);
          })))),
      h('div.owned', {},
        h('h3', {}, fmt(t.shop.myPens, { n: run.pens.length, max: MAX_PENS })),
        h('div.owned-list', {}, ...run.pens.map((id) => h('div.owned-pen', {},
          h('strong', {}, t.pens[id].name),
          button(fmt(t.shop.sell, { n: Math.floor(penPrice(id) / 2) }), () => { sellPen(run, id); audio.play('coin'); saveRun(run); render(); }, 'small ghost'))))),
      h('div.row', {}, reroll, button(t.shop.next, () => go(), 'primary')));
  };
  const go = () => {
    onKeys(null);
    leaveShop(run);
    saveRun(run);
    audio.play('zip');
    onNext();
  };
  show(h('div.scene.paper.shop', {}, box));
  audio.track('cafe');
  render();
  onKeys((e) => { if (e.code === 'Enter') go(); });
}

function row(label: string, n: number): HTMLElement {
  return h('div.receipt-row', {}, h('span', {}, label), h('span', {}, `+${n} F`));
}
