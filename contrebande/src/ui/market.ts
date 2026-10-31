import { audio } from '../audio';
import { ITEM_BY_ID } from '../data/items';
import { type Piece, canPlace, cellsOf, def, effectiveSmell, footprint, isPlaced, shieldedCells } from '../game/bag';
import { expectedLoss, packGreedy } from '../game/autopack';
import { inspect, searchCells } from '../game/inspect';
import {
  type RunState, STOCK_LIMIT, buy, crossing, dossierLimit, due, has, inspectionRules, layout, priceOf, reroll,
  rerollCost, saleValue, sellBack,
} from '../game/run';
import { L, fmt, lang } from '../i18n';
import { saveRun } from '../save';
import { type BagView, bagView, pieceEl } from './bagview';
import { button, confirmBox, h, img, onKeys, show } from './dom';
import { openPause } from './pause';
import { stampSeal } from './stampseal';
import { checkIcon, checkLabel, itemName, itemTags } from './text';

type View = 'normal' | 'xray' | 'nose';

export function showMarket(run: RunState, onCross: (lane: number) => void): void {
  const t = L();
  const c = crossing(run);
  const lay = layout(run);
  const cell = Math.min(84, Math.floor(600 / lay.cols), Math.floor(430 / lay.rows));
  let view: View = 'normal';
  let selected: number | null = null;
  let drag: { piece: Piece; ghost: HTMLElement; rot: boolean; from: 'grid' | 'stock'; ox: number; oy: number } | null = null;

  const save = () => saveRun(run);

  // ---------- layout ----------
  const topbar = h('div.topbar');
  const bulletin = h('div.bulletin');
  const stampsRow = h('div.my-stamps');
  const left = h('aside.left', {}, bulletin, stampsRow);

  const bag: BagView = bagView(lay, cell);
  const overlay = h('div.overlay-layer');
  bag.el.append(overlay);
  const viewBtns = h('div.view-btns');
  const bagHead = h('div.bag-head', {}, h('h2', {}, t.bags[run.bag as keyof typeof t.bags].name), viewBtns);
  const stock = h('div.stock');
  const stockHead = h('div.stock-head');
  const center = h('section.center', {}, bagHead, h('div.bag-frame', {}, bag.el), stockHead, stock);

  const offers = h('div.offers');
  const rerollBtn = button('', () => { if (reroll(run)) { audio.play('paper'); save(); refresh(); } else audio.play('deny'); }, 'small');
  const info = h('div.info');
  const right = h('aside.right', {}, h('div.stall-head', {}, h('h2', {}, t.market.stalls), rerollBtn), offers, info);

  const scene = h('div.scene.market', {},
    h('div.bg', { style: "background-image:url('img/bg_cave.webp')" }),
    topbar, left, center, right);
  show(scene);
  audio.track('cave');

  // ---------- render ----------
  const renderTop = () => {
    const boss = c.boss;
    const dossiers = h('span.dossiers', { title: fmt(t.market.dossiers, { n: run.dossiers, max: dossierLimit(run) }) },
      ...Array.from({ length: dossierLimit(run) }, (_, i) => h(`span.folder${i < run.dossiers ? '.full' : ''}` as 'span')));
    topbar.replaceChildren(
      h('div.where', {},
        h('strong', {}, fmt(t.market.border, { b: run.border })),
        h('span', {}, boss ? t.market.bossNext : fmt(t.market.crossing, { i: run.index + 1 }))),
      h('div.due', {}, fmt(t.market.due, { b: run.border, n: due(run) })),
      dossiers,
      h('div.money', {}, fmt(t.market.money, { n: run.money })),
      h('button.pause-btn', { onclick: () => pause(), title: t.options.resume }, '❚❚'));
  };

  const renderBulletin = () => {
    const goods = run.pieces.filter((p) => isPlaced(p) && def(p).kind !== 'tool').length;
    bulletin.replaceChildren(
      h('h2', {}, t.market.bulletin),
      h('p.demand', {}, fmt(t.market.demand, { cat: t.cats[c.demand] })),
      ...c.lanes.map((lane, i) => {
        const o = t.officers[lane.officer];
        const toll = has(run, 'potdevin') ? 0 : lane.toll;
        const extras: string[] = [];
        if (toll) extras.push(fmt(t.market.toll, { n: toll }));
        if (lane.priceMult !== 1) extras.push(fmt(t.market.priceMult, { m: decimal(lane.priceMult) }));
        const certain = certainSeizures(i);
        return h(`div.lane${c.boss ? '.boss' : ''}` as 'div', {},
          h('div.lane-head', {},
            img(`pt_${lane.officer}`, 'lane-portrait'),
            h('div', {},
              h('div.lane-title', {}, c.boss ? t.market.bossNext : i === 0 ? fmt(t.market.lane, { n: 1 }) : `${fmt(t.market.lane, { n: 2 })} · ${t.market.express}`),
              h('div.lane-officer', {}, o.name),
              h('div.lane-quote', {}, `« ${o.quote} »`))),
          h('ul.checks', {}, ...(lane.checks.length ? lane.checks.map((ch) => h('li', { title: t.checks.help[ch.kind] }, checkIcon(ch), h('span', {}, checkLabel(ch))))
            : [h('li', {}, h('span', {}, t.checks.none))])),
          extras.length ? h('div.lane-extra', {}, extras.join(' · ')) : null,
          h(`div.forecast${certain ? '.bad' : ''}` as 'div', {}, fmt(t.market.expected, { n: certain })),
          button(t.market.take, () => void go(i, goods), 'primary go'));
      }));
  };

  const renderStamps = () => {
    stampsRow.replaceChildren(h('h3', {}, t.market.stamps),
      run.stamps.length ? h('div.seals', {}, ...run.stamps.map((s) => stampSeal(s, true))) : h('p.muted', {}, t.market.noStamps));
  };

  const renderViewBtns = () => {
    viewBtns.replaceChildren(...(['normal', 'xray', 'nose'] as View[]).map((v) =>
      h(`button.view-btn${view === v ? '.on' : ''}` as 'button', { onclick: () => { view = v; audio.play('click'); refresh(); } },
        v === 'normal' ? t.bags[run.bag as keyof typeof t.bags].name.split(' ')[0] : v === 'xray' ? t.market.xray : t.market.nose)));
  };

  const renderGrid = () => {
    bag.render(run.pieces);
    bag.el.classList.toggle('xray', view === 'xray');
    bag.el.classList.toggle('nose', view === 'nose');
    for (const [uid, el] of bag.pieces) {
      el.addEventListener('pointerdown', (e) => startDrag(e, uid, 'grid'));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); rotatePlaced(uid); });
      el.addEventListener('pointerenter', () => showInfo(uid));
      if (uid === selected) el.classList.add('selected');
    }
    overlay.replaceChildren();
    for (const cEl of bag.cells.values()) cEl.classList.remove('shielded', 'searched');
    const rules = inspectionRules(run);
    if (view === 'xray') {
      const hidden = shieldedCells(lay, run.pieces, rules);
      for (const key of hidden) bag.cells.get(key)?.classList.add('shielded');
      for (const p of run.pieces.filter(isPlaced)) {
        const el = bag.pieces.get(p.uid)!;
        const d = def(p);
        if (!d.dense) el.classList.add('ghosted');
        else if (cellsOf(p).every(([x, y]) => hidden.has(`${x},${y}`))) el.classList.add('hidden-ok');
        else el.classList.add(d.kind === 'contra' ? 'exposed' : 'seen');
      }
    }
    if (view === 'nose') {
      const smell = effectiveSmell(run.pieces, rules);
      for (const p of run.pieces.filter(isPlaced)) {
        const s = smell.get(p.uid) ?? 0;
        const el = bag.pieces.get(p.uid)!;
        el.append(h(`span.smell-bubble.s${Math.min(s, 3)}` as 'span', {}, String(s)));
        if (s > 0 && def(p).kind === 'contra') el.classList.add('exposed');
      }
    }
    if (has(run, 'oeil')) {
      c.lanes.forEach((lane) => lane.checks.forEach((ch, i) => {
        if (ch.kind !== 'search') return;
        for (const [x, y] of searchCells(lay, c.searchSeed, ch.cells, i)) bag.cells.get(`${x},${y}`)?.classList.add('searched');
      }));
    }
  };

  const renderStock = () => {
    const inStock = run.pieces.filter((p) => !isPlaced(p));
    stockHead.replaceChildren(h('h3', {}, `${t.market.stock} (${inStock.length}/${STOCK_LIMIT})`),
      h('span.muted', {}, t.market.rotate),
      button(t.market.unpack, () => { run.pieces.forEach((p) => { if (def(p).kind !== 'tool') p.x = -1; }); audio.play('zip'); save(); refresh(); }, 'small ghost'));
    const scale = Math.min(cell, 56);
    stock.replaceChildren(...(inStock.length ? inStock.map((p) => {
      const el = pieceEl({ ...p, rot: false }, scale);
      el.classList.add('in-stock');
      if (p.uid === selected) el.classList.add('selected');
      el.addEventListener('pointerdown', (e) => startDrag(e, p.uid, 'stock'));
      el.addEventListener('pointerenter', () => showInfo(p.uid));
      return el;
    }) : [h('p.muted', {}, t.market.stockEmpty)]));
  };

  const renderOffers = () => {
    const cost = rerollCost(run);
    rerollBtn.textContent = cost === 0 ? t.market.rerollFree : fmt(t.market.reroll, { n: cost });
    rerollBtn.disabled = run.money < cost;
    offers.replaceChildren(...run.offers.map((id, slot) => {
      if (!id) return h('div.offer.sold');
      const d = ITEM_BY_ID[id];
      const price = priceOf(run, id);
      const sell = d.kind === 'tool' ? t.tags.keep : fmt(t.tags.sell, { n: saleValue(run, c, 0, d) });
      const full = run.pieces.filter((p) => !isPlaced(p)).length >= STOCK_LIMIT;
      const b = button(`${t.market.buy} · ${price}`, () => {
        if (buy(run, slot)) { audio.play('coin'); save(); refresh(); } else audio.play('deny');
      }, 'small buy');
      b.disabled = run.money < price || full;
      return h(`div.offer.k-${d.kind}` as 'div', { onpointerenter: () => showInfoDef(id) },
        h('div.offer-art', {}, img(`it_${id}`)),
        h('div.offer-name', {}, itemName(id)),
        h('div.offer-sell', {}, sell, d.cat === c.demand && d.kind === 'contra' ? h('span.hot', {}, ` ×${decimal(1.5)}`) : null),
        b);
    }));
  };

  const showInfoDef = (id: string, uid?: number) => {
    const d = ITEM_BY_ID[id];
    const tx = t.items[id as keyof typeof t.items];
    const actions = h('div.info-actions');
    if (uid !== undefined) {
      const p = run.pieces.find((q) => q.uid === uid)!;
      const refund = Math.floor((d.kind === 'tool' ? d.buy : priceOf(run, d.id)) / 2);
      actions.append(button(fmt(t.market.sellBack, { n: refund }), () => {
        sellBack(run, p.uid);
        selected = null;
        audio.play('coin');
        save();
        refresh();
        info.replaceChildren();
      }, 'small ghost'));
    }
    info.replaceChildren(
      h('div.info-art', {}, img(`it_${id}`)),
      h('div.info-body', {},
        h('h3', {}, tx.name),
        itemTags(d),
        h('p', {}, tx.note),
        d.kind === 'contra' ? h('p.muted', {}, `${t.cats[d.cat!]} · ${fmt(t.tags.sell, { n: saleValue(run, c, 0, d) })}`) : null,
        actions));
  };
  const showInfo = (uid: number) => {
    const p = run.pieces.find((q) => q.uid === uid);
    if (p) showInfoDef(p.id, uid);
  };

  const refresh = () => {
    renderTop();
    renderBulletin();
    renderStamps();
    renderViewBtns();
    renderGrid();
    renderStock();
    renderOffers();
  };

  // ---------- forecasting ----------
  // Seizures that do not depend on luck (scanner, dog, biggest item); searches stay a gamble
  // unless the "customs eye" stamp shows them.
  function certainSeizures(laneIdx: number): number {
    const lane = c.lanes[laneIdx];
    const sure = { ...lane, checks: lane.checks.filter((ch) => ch.kind !== 'search' || has(run, 'oeil')) };
    return inspect(lay, run.pieces, sure, c.searchSeed, inspectionRules(run)).caught.length;
  }

  // ---------- drag & drop ----------
  const cellAt = (clientX: number, clientY: number, piece: Piece, rot: boolean): [number, number] | null => {
    const rect = bag.el.getBoundingClientRect();
    const zoom = rect.width / bag.el.offsetWidth;
    const [w, hgt] = rot ? [def(piece).h, def(piece).w] : [def(piece).w, def(piece).h];
    const x = Math.round(((clientX - rect.left) / zoom - (w * cell) / 2) / cell);
    const y = Math.round(((clientY - rect.top) / zoom - (hgt * cell) / 2) / cell);
    if (x < -w || y < -hgt || x > lay.cols || y > lay.rows) return null;
    return [x, y];
  };

  const ghostFor = (p: Piece, rot: boolean) => {
    const g = pieceEl({ ...p, rot }, cell);
    g.classList.add('ghost');
    scene.append(g);
    return g;
  };

  const startDrag = (e: PointerEvent, uid: number, from: 'grid' | 'stock') => {
    if (e.button === 2) return;
    e.preventDefault();
    const piece = run.pieces.find((p) => p.uid === uid);
    if (!piece) return;
    selected = uid;
    audio.play('pick');
    const rot = from === 'grid' ? piece.rot : false;
    drag = { piece, ghost: ghostFor(piece, rot), rot, from, ox: 0, oy: 0 };
    moveGhost(e.clientX, e.clientY);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const highlight = (target: [number, number] | null) => {
    for (const el of bag.cells.values()) el.classList.remove('drop-ok', 'drop-bad');
    if (!drag || !target) return;
    const ok = canPlace(lay, run.pieces, drag.piece, target[0], target[1], drag.rot);
    const [w, hgt] = drag.rot ? [def(drag.piece).h, def(drag.piece).w] : [def(drag.piece).w, def(drag.piece).h];
    for (let dy = 0; dy < hgt; dy++) for (let dx = 0; dx < w; dx++) {
      bag.cells.get(`${target[0] + dx},${target[1] + dy}`)?.classList.add(ok ? 'drop-ok' : 'drop-bad');
    }
  };

  const moveGhost = (x: number, y: number) => {
    if (!drag) return;
    const stageRect = scene.getBoundingClientRect();
    const zoom = stageRect.width / scene.offsetWidth;
    const [w, hgt] = drag.rot ? [def(drag.piece).h, def(drag.piece).w] : [def(drag.piece).w, def(drag.piece).h];
    drag.ghost.style.left = `${(x - stageRect.left) / zoom - (w * cell) / 2}px`;
    drag.ghost.style.top = `${(y - stageRect.top) / zoom - (hgt * cell) / 2}px`;
    highlight(cellAt(x, y, drag.piece, drag.rot));
  };
  let lastPointer: [number, number] = [0, 0];
  const onMove = (e: PointerEvent) => {
    lastPointer = [e.clientX, e.clientY];
    moveGhost(e.clientX, e.clientY);
  };

  const onUp = (e: PointerEvent) => {
    window.removeEventListener('pointermove', onMove);
    if (!drag) return;
    const d = drag;
    drag = null;
    d.ghost.remove();
    highlight(null);
    const target = cellAt(e.clientX, e.clientY, d.piece, d.rot);
    if (target && canPlace(lay, run.pieces, d.piece, target[0], target[1], d.rot)) {
      Object.assign(d.piece, { x: target[0], y: target[1], rot: d.rot });
      audio.play('place');
    } else if (target && target[0] >= 0 && target[1] >= 0 && target[0] < lay.cols && target[1] < lay.rows) {
      audio.play('deny');
    } else if (d.from === 'grid') {
      d.piece.x = -1;
      audio.play('zip');
    }
    save();
    refresh();
    showInfo(d.piece.uid);
  };

  const rotateDrag = () => {
    if (!drag) return;
    drag.rot = !drag.rot;
    const old = drag.ghost;
    drag.ghost = ghostFor(drag.piece, drag.rot);
    old.remove();
    audio.play('rotate');
    moveGhost(lastPointer[0], lastPointer[1]);
  };

  const rotatePlaced = (uid: number) => {
    if (drag) { rotateDrag(); return; }
    const p = run.pieces.find((q) => q.uid === uid);
    if (!p || !isPlaced(p)) return;
    const [w, hgt] = footprint(p);
    if (w === hgt) return;
    if (canPlace(lay, run.pieces, p, p.x, p.y, !p.rot)) {
      p.rot = !p.rot;
      audio.play('rotate');
      save();
      refresh();
    } else audio.play('deny');
  };

  scene.addEventListener('contextmenu', (e) => { e.preventDefault(); if (drag) rotateDrag(); });

  // ---------- actions ----------
  async function go(laneIdx: number, goods: number) {
    if (!goods) {
      const ok = await confirmBox(t.market.noGoods, t.market.goAnyway, t.market.cancel);
      if (!ok) return;
    }
    onKeys(null);
    audio.play('zip');
    onCross(laneIdx);
  }

  const pause = () => openPause(run);

  onKeys((e) => {
    if (document.querySelector('.modal.open')) return;
    if (e.code === 'KeyR') {
      if (drag) rotateDrag();
      else if (selected !== null) rotatePlaced(selected);
    }
    if (e.code === 'Escape') pause();
    if (e.code === 'KeyX') { view = view === 'xray' ? 'normal' : 'xray'; refresh(); }
    if (e.code === 'KeyN') { view = view === 'nose' ? 'normal' : 'nose'; refresh(); }
  });

  // Test hook for tools/autoplay.mjs (dev server, or a build opened with ?autoplay).
  if (import.meta.env.DEV || location.search.includes('autoplay')) {
    (window as unknown as { __market: unknown }).__market = {
      autopack: () => { packGreedy(run); save(); refresh(); },
      bestLane: () => c.lanes.map((_, i) => i).sort((a, b) => expectedLoss(run, a) - expectedLoss(run, b))[0],
      money: () => run.money,
    };
  }

  refresh();
}

function decimal(n: number): string {
  return lang() === 'fr' ? n.toFixed(1).replace('.', ',') : n.toFixed(1);
}
