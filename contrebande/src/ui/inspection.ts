import { audio } from '../audio';
import { type Layout, type Piece, def } from '../game/bag';
import type { Lane } from '../game/inspect';
import type { CrossingResult } from '../game/run';
import { L, fmt } from '../i18n';
import { settings } from '../settings';
import { bagView } from './bagview';
import { button, h, img, onKeys, show, wait } from './dom';
import { checkIcon, checkLabel, itemName } from './text';

/** Plays the inspection of a crossing step by step, then hands over to the result screen. */
export function showInspection(lay: Layout, pieces: Piece[], lane: Lane, result: CrossingResult, onDone: () => void): void {
  const t = L();
  const cell = Math.min(96, Math.floor(720 / lay.cols), Math.floor(470 / lay.rows));
  const bag = bagView(lay, cell);
  bag.render(pieces);
  const sweep = h('div.sweep');
  bag.el.append(sweep);
  const dog = img('chr_brutus', 'dog');
  bag.el.append(dog);

  const o = t.officers[lane.officer];
  const log = h('div.insp-log');
  const status = h('div.insp-status');
  const nextBtn = button(t.inspection.next, () => finish(), 'primary');
  nextBtn.style.visibility = 'hidden';
  const skipBtn = button(t.inspection.skip, () => { fast = true; }, 'small ghost');

  const scene = h('div.scene.inspection', {},
    h('div.bg', { style: "background-image:url('img/bg_poste.webp')" }),
    h('aside.officer', {},
      img(`pt_${lane.officer}`, 'officer-portrait'),
      h('h2', {}, o.name),
      h('p.quote', {}, `« ${o.quote} »`),
      h('ul.checks', {}, ...lane.checks.map((c) => h('li', {}, checkIcon(c), h('span', {}, checkLabel(c)))))),
    h('section.desk', {}, h('h1.insp-title', {}, fmt(t.inspection.title, { officer: o.name })), status, h('div.bag-frame', {}, bag.el)),
    h('aside.insp-side', {}, log, h('div.row', {}, skipBtn, nextBtn)));
  show(scene);
  audio.track('poste');

  let fast = settings().fast;
  let done = false;
  const pace = (ms: number) => wait(fast ? ms * 0.25 : ms);
  const uidName = (uid: number) => itemName(pieces.find((p) => p.uid === uid)!.id);
  const say = (text: string, cls = '') => {
    status.textContent = text;
    log.prepend(h(`p${cls ? `.${cls}` : ''}` as 'p', {}, text));
  };
  const shake = () => {
    if (!settings().shake) return;
    scene.classList.remove('shake');
    void scene.offsetWidth;
    scene.classList.add('shake');
  };
  const seize = async (uids: number[]) => {
    for (const u of uids) {
      const el = bag.pieces.get(u);
      el?.classList.add('caught');
      el?.append(h('span.seized-stamp', {}, t.result.seized));
      audio.play('alarm');
      audio.play('stamp');
      shake();
      say(fmt(t.inspection.caught, { name: uidName(u) }), 'bad');
      await pace(700);
    }
  };
  const center = (uid: number): [number, number] => {
    const p = pieces.find((q) => q.uid === uid)!;
    const [w, hh] = p.rot ? [def(p).h, def(p).w] : [def(p).w, def(p).h];
    return [(p.x + w / 2) * cell, (p.y + hh / 2) * cell];
  };

  const run = async () => {
    await pace(700);
    for (const step of result.inspection.steps) {
      switch (step.kind) {
        case 'scanner': {
          say(t.inspection.scanner);
          audio.play('scanner');
          bag.el.classList.add('xray');
          sweep.style.left = `${step.region[0] * cell}px`;
          sweep.style.width = '6px';
          sweep.classList.add('on');
          const width = (step.region[1] - step.region[0] + 1) * cell;
          sweep.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${width}px)` }], { duration: fast ? 300 : 1300, easing: 'ease-in-out' });
          await pace(1300);
          sweep.classList.remove('on');
          for (const u of step.seen) bag.pieces.get(u)?.classList.add('seen');
          say(fmt(t.inspection.seen, { n: step.seen.length }));
          await pace(500);
          await seize(step.caught);
          if (!step.caught.length) say(t.inspection.clean, 'good');
          await pace(500);
          bag.el.classList.remove('xray');
          break;
        }
        case 'dog': {
          say(t.inspection.dog);
          dog.classList.add('on');
          audio.play('sniff');
          dog.style.transform = `translate(${-cell}px, ${-cell * 0.9}px)`;
          await pace(300);
          dog.style.transform = `translate(${lay.cols * cell * 0.5}px, ${-cell * 0.9}px)`;
          await pace(700);
          for (const u of step.alerts) {
            const [cx, cy] = center(u);
            dog.style.transform = `translate(${cx - cell * 0.8}px, ${cy - cell * 1.1}px)`;
            await pace(600);
            audio.play('bark');
            bag.pieces.get(u)?.classList.add('alerted');
            if (!step.caught.includes(u)) say(fmt(t.inspection.alertLegal, { name: uidName(u) }), 'good');
            else await seize([u]);
            await pace(400);
          }
          if (!step.alerts.length) say(t.inspection.clean, 'good');
          dog.style.transform = `translate(${lay.cols * cell + cell}px, ${-cell * 0.9}px)`;
          await pace(600);
          dog.classList.remove('on');
          break;
        }
        case 'search': {
          if (step.skipped) {
            say(t.inspection.skipped, 'good');
            await pace(900);
            break;
          }
          say(t.inspection.search);
          for (const [x, y] of step.cells) {
            bag.cells.get(`${x},${y}`)?.classList.add('searched');
            audio.play('search');
            await pace(260);
          }
          await seize(step.caught);
          if (!step.caught.length) say(t.inspection.clean, 'good');
          await pace(500);
          break;
        }
        case 'largest': {
          say(t.inspection.largest);
          if (step.target !== null) {
            bag.pieces.get(step.target)?.classList.add('opened');
            audio.play('zip');
            await pace(800);
          }
          await seize(step.caught);
          if (!step.caught.length) say(t.inspection.clean, 'good');
          await pace(400);
          break;
        }
      }
    }
    if (!result.inspection.steps.length) say(t.checks.none, 'good');
    skipBtn.style.visibility = 'hidden';
    nextBtn.style.visibility = 'visible';
    audio.play(result.inspection.caught.length ? 'lose' : 'win');
  };

  const finish = () => {
    if (done) return;
    done = true;
    onKeys(null);
    onDone();
  };
  onKeys((e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (nextBtn.style.visibility === 'visible') finish();
      else fast = true;
    }
  });
  void run();
}
