import { audio } from '../audio';
import { MAX_STAMPS } from '../data/stamps';
import type { Piece } from '../game/bag';
import { type CrossingResult, type RunState, buyStamp, due, leaveBackroom, pay, sellStamp, stampPrice } from '../game/run';
import { L, fmt } from '../i18n';
import { saveRun } from '../save';
import { button, h, img, onKeys, show } from './dom';
import { stampSeal } from './stampseal';
import { itemName } from './text';

/** The other side of the border: what sold, what was seized, the crossing's total. */
export function showResult(run: RunState, before: Piece[], result: CrossingResult, onNext: () => void): void {
  const t = L();
  const nameOf = (uid: number) => itemName(before.find((p) => p.uid === uid)!.id);
  const rows: HTMLElement[] = [];
  for (const s of result.sales) {
    rows.push(h('div.res-row.sold', {}, img(`it_${s.id}`, 'res-art'), h('span', {}, `${t.result.sold} · ${nameOf(s.uid)}`), h('span.amount', {}, `+${s.amount}`)));
  }
  for (const f of result.fines) {
    const note = f.pardoned === 'favour' ? t.result.favour : f.pardoned === 'beard' ? t.result.beard : f.dossier ? t.result.dossier : t.result.fine;
    rows.push(h(`div.res-row.seized${f.dossier ? '.dossier' : ''}` as 'div', {}, img(`it_${f.id}`, 'res-art'),
      h('span', {}, `${t.result.seized} · ${nameOf(f.uid)} — ${note}`), h('span.amount.neg', {}, f.amount ? `−${f.amount}` : '0')));
  }
  if (result.toll) rows.push(h('div.res-row', {}, h('span.res-art'), h('span', {}, t.result.toll), h('span.amount.neg', {}, `−${result.toll}`)));
  for (const b of result.bonuses) {
    rows.push(h('div.res-row.bonus', {}, h('span.res-art'), h('span', {}, t.result.bonus[b.key]), h('span.amount', {}, `+${b.amount}`)));
  }
  if (!rows.length) rows.push(h('p.muted', {}, t.result.nothing));

  const label = run.phase === 'payment' ? t.result.toPayment : t.result.next;
  const go = () => { onKeys(null); onNext(); };
  const scene = h('div.scene.result', {},
    h('div.bg', { style: "background-image:url('img/bg_poste.webp')" }),
    h('div.ticket', {},
      h('h1', {}, t.result.title),
      h('div.res-list', {}, ...rows),
      h('div.res-total', {}, h('span', {}, t.result.net), h(`span.amount${result.net < 0 ? '.neg' : ''}` as 'span', {}, `${result.net >= 0 ? '+' : ''}${result.net}`)),
      h('div.res-money', {}, fmt(t.market.money, { n: run.money })),
      button(label, go, 'primary')));
  show(scene);
  audio.track('cave');
  if (result.net > 0) audio.play('coin');
  onKeys((e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); go(); } });
}

/** Olga collects her instalment; failing to pay ends the run. */
export function showPayment(run: RunState, onPaid: () => void, onLost: () => void): void {
  const t = L();
  const amount = due(run);
  const can = run.money >= amount;
  const act = () => {
    onKeys(null);
    if (pay(run)) {
      audio.play('coin');
      saveRun(run);
      onPaid();
    } else onLost();
  };
  const scene = h('div.scene.payment', {},
    h('div.bg', { style: "background-image:url('img/bg_cave.webp')" }),
    h('div.olga-card', {},
      img('pt_olga', 'olga'),
      h('div.olga-text', {},
        h('h1', {}, t.payment.title),
        h('p.speech', {}, fmt(t.payment.line, { b: run.border, n: amount })),
        h('p.big-money', {}, fmt(t.market.money, { n: run.money })),
        can ? null : h('p.warn', {}, fmt(t.payment.cannot, { m: run.money })),
        button(can ? fmt(t.payment.pay, { n: amount }) : t.payment.give, act, can ? 'primary' : 'danger'))));
  show(scene);
  audio.track('cave');
  audio.play('bell');
  onKeys((e) => { if (e.code === 'Enter') act(); });
}

/** Back room: stamps for friends who pay on time. */
export function showBackroom(run: RunState, onLeave: () => void): void {
  const t = L();
  const offers = h('div.stamp-offers');
  const owned = h('div.stamp-owned');
  const money = h('p.big-money');
  const render = () => {
    money.textContent = fmt(t.market.money, { n: run.money });
    offers.replaceChildren(...run.backroomOffers.map((id, slot) => {
      if (!id) return h('div.stamp-card.sold');
      const tx = t.stamps[id];
      const price = stampPrice(id);
      const full = run.stamps.length >= MAX_STAMPS;
      const b = button(full ? t.backroom.full : fmt(t.backroom.buy, { n: price }), () => {
        if (buyStamp(run, slot)) { audio.play('stamp'); saveRun(run); render(); } else audio.play('deny');
      }, 'primary small');
      b.disabled = full || run.money < price;
      return h('div.stamp-card', {}, stampSeal(id), h('h3', {}, tx.name), h('p', {}, tx.desc), b);
    }));
    owned.replaceChildren(h('h3', {}, fmt(t.backroom.owned, { n: run.stamps.length, max: MAX_STAMPS })),
      h('div.owned-list', {}, ...run.stamps.map((id) => h('div.owned', {}, stampSeal(id, true),
        h('div', {}, h('strong', {}, t.stamps[id].name), h('p', {}, t.stamps[id].desc)),
        button(fmt(t.backroom.sell, { n: Math.floor(stampPrice(id) / 2) }), () => { sellStamp(run, id); audio.play('coin'); saveRun(run); render(); }, 'small ghost')))));
  };
  const leave = () => {
    onKeys(null);
    leaveBackroom(run);
    saveRun(run);
    audio.play('zip');
    onLeave();
  };
  const scene = h('div.scene.backroom', {},
    h('div.bg', { style: "background-image:url('img/bg_cave.webp')" }),
    h('div.backroom-box', {},
      h('div.backroom-head', {}, img('pt_olga', 'olga small'), h('div', {}, h('h1', {}, t.backroom.title), h('p.speech', {}, t.backroom.line)), money),
      offers, owned,
      button(t.backroom.leave, leave, 'primary')));
  show(scene);
  render();
}
