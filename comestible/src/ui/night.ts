import { audio } from '../audio';
import { CHARACTER_BY_ID } from '../data/characters';
import { SPECIES_BY_ID, TOOL_NIGHT, type Tool } from '../data/species';
import { L, fmt } from '../i18n';
import { Rng, hashSeed } from '../game/rng';
import { type Specimen, type Verdict, correctVerdict, judge, payFor } from '../game/rules';
import {
  type ClientVisit, type GameState, type NightPlan, type NightReport,
  CONTAMINATION_MAX, emptyReport, tasteContamination,
} from '../game/state';
import { settings } from '../settings';
import { button, confirmBox, h, img, onKeys, show, typewriter, wait } from './dom';
import { closeGuide, isGuideOpen, toggleGuide } from './guide';
import { keyLabel } from './keys';
import { openPause } from './pause';

const TOOL_KEYS: Record<Tool, string> = {
  loupe: 'KeyQ', nez: 'KeyW', couteau: 'KeyE', regle: 'KeyR', sporee: 'KeyT', bougie: 'KeyY', cuillere: 'KeyU', mousse: 'KeyI',
};
const TOOL_ICON: Record<Tool, string> = {
  loupe: 'ui_loupe', nez: 'ui_nez', couteau: 'ui_couteau', regle: 'ui_regle', sporee: 'ui_sporee', bougie: 'ui_bougie', cuillere: 'ui_cuillere', mousse: 'chr_mousse',
};
const STAMP_KEYS: Record<Verdict, string> = { edible: 'Digit1', toxic: 'Digit2', burn: 'Digit3', seize: 'Digit4' };
const CUT_IMG: Record<string, string> = { chair: 'ct_chair', creux: 'ct_creux', chambres: 'ct_chambres', vesse: 'ct_vesse', oeuf: 'ct_oeuf' };

type TutorialStep = 'basket' | 'loupe' | 'guide' | 'stamp' | 'done' | null;

export function runNight(state: GameState, plan: NightPlan, onEnd: (report: NightReport) => void): void {
  const t = L();
  const report = emptyReport();
  const rng = new Rng(hashSeed(state.seed, 'night-ui', state.night));
  const endless = state.mode === 'endless';

  let clientIdx = -1;
  let client: ClientVisit | null = null;
  let queue: Specimen[] = [];
  let current: Specimen | null = null;
  let used = new Set<Tool>();
  let busy = false;
  let handsShown = false;
  let ended = false;
  let paused = false;
  let remaining = plan.candleSeconds;
  let given: Verdict[] = [];
  let tutorial: TutorialStep = !endless && state.night === 1 ? 'basket' : null;

  // ---------- layout ----------
  const dateLabel = endless ? fmt(t.hud.endlessNight, { n: state.night }) : fmt(t.hud.night, { n: state.night, date: t.meta.date[state.night - 1] });
  const moneyEl = h('div.money', {}, fmt(t.hud.money, { n: state.money }));
  const flame = h('div.flame');
  const candleFill = h('div.candle-fill');
  const candle = h('div.candle', { title: plan.candleSeconds ? '' : '∞' }, h('div.candle-icon', {}, flame), h('div.candle-bar', {}, candleFill));
  const topbar = h('div.topbar', {}, h('div.date', {}, dateLabel), candle, moneyEl);

  const portrait = h('div.portrait');
  const nameplate = h('div.nameplate');
  const bubble = h('div.bubble');
  const handsBtn = button(t.hud.hands, () => showHands(), 'small');
  const denounceBtn = button(t.hud.denounce, () => void denounce(), 'small danger');
  const basketCount = h('div.basket-count');
  const basketBtn = h('button.basket', { onclick: () => takeSpecimen() }, img('obj_panier', 'basket-img'), basketCount);
  const clientPanel = h('div.client-panel', {}, portrait, nameplate, bubble, h('div.client-actions', {}, handsBtn, denounceBtn), basketBtn);

  const specimenImg = h('img.specimen', { draggable: 'false', alt: '' });
  const wormOverlay = h('div.worms');
  const specimenWrap = h('div.specimen-wrap', {}, specimenImg, wormOverlay);
  const ruler = h('div.ruler');
  const stampMark = h('div.stamp-mark');
  const trayLabel = h('div.tray-label');
  const tray = h('div.tray', {}, trayLabel, specimenWrap, ruler, stampMark);

  const stampBtns: Partial<Record<Verdict, HTMLButtonElement>> = {};
  const stamps = h('div.stamps');
  for (const v of ['edible', 'toxic', 'burn', 'seize'] as Verdict[]) {
    if (v === 'burn' && !plan.rules.burn) continue;
    if (v === 'seize' && !plan.rules.decree) continue;
    const b = h(`button.stamp.${v}` as 'button', { onclick: () => void stamp(v) },
      h('span.stamp-face', {}, t.stamps[v]), h('span.key', { 'data-code': STAMP_KEYS[v] }, keyLabel(STAMP_KEYS[v])));
    stampBtns[v] = b;
    stamps.append(b);
  }

  const toolBtns: Partial<Record<Tool, HTMLButtonElement>> = {};
  const toolsEl = h('div.tools');
  for (const tool of Object.keys(TOOL_ICON) as Tool[]) {
    const available = plan.rules.tools.includes(tool);
    const b = h(`button.tool${available ? '' : '.locked'}` as 'button', {
      title: available ? `${t.tools[tool].tip} [${keyLabel(TOOL_KEYS[tool])}]` : t.hud.toolLocked,
      onclick: () => void useTool(tool),
    }, img(TOOL_ICON[tool], 'tool-img'), h('span.tool-name', {}, available ? t.tools[tool].name : `${TOOL_NIGHT[tool]}`),
      available ? h('span.key', {}, keyLabel(TOOL_KEYS[tool])) : null);
    toolBtns[tool] = b;
    toolsEl.append(b);
  }

  const lens = h('div.lens');
  const log = h('div.log');
  const rightPanel = h('div.right-panel', {}, toolsEl, lens, log);

  const guideBtn = h('button.guide-btn', { onclick: () => openGuidePanel() }, h('span', {}, t.hud.guide), h('span.key', {}, keyLabel('KeyG')));
  const pauseBtn = h('button.pause-btn', { onclick: () => pause(), title: t.hud.pause }, '❚❚');
  const darkness = h('div.darkness');
  const fog = h('div.fog', { style: `--fog:${Math.min(state.brume / 8, 1)}` });
  const myco = h('div.myco', { style: `--myco:${Math.min(state.contamination / CONTAMINATION_MAX, 1)}` });
  const tutorialEl = h('div.tutorial');
  const cat = img('chr_mousse', 'cat');

  const scene = h('div.scene.night', {},
    h('div.bg', { style: "background-image:url('img/bg_comptoir.webp')" }), fog,
    topbar, clientPanel, tray, stamps, rightPanel, guideBtn, pauseBtn, cat, darkness, myco, tutorialEl);
  show(scene);
  audio.startAmbience();
  audio.setTension(Math.min((state.brume + state.contamination) / 10, 1));

  // ---------- helpers ----------
  const charName = (id: string) => t.chars[id as keyof typeof t.chars];
  const say = (text: string) => typewriter(bubble, text, 14);

  const addLog = (tool: Tool | 'info', text: string, cls = '') => {
    const entry = h(`div.entry${cls ? `.${cls}` : ''}` as 'div', {}, tool === 'info' ? null : img(TOOL_ICON[tool], 'log-icon'), h('span', {}, text));
    log.prepend(entry);
  };

  const setLens = (content: HTMLElement | null) => {
    lens.replaceChildren(...(content ? [content] : []));
    lens.classList.toggle('active', !!content);
  };

  const shake = (strength = 1) => {
    if (!settings().shake) return;
    scene.style.setProperty('--shake', String(strength));
    scene.classList.remove('shaking');
    void scene.offsetWidth;
    scene.classList.add('shaking');
  };

  const refreshButtons = () => {
    const hasSpec = !!current && !busy;
    for (const b of Object.values(stampBtns)) b!.disabled = !hasSpec;
    for (const [tool, b] of Object.entries(toolBtns)) {
      b!.classList.toggle('used', used.has(tool as Tool));
      b!.disabled = !plan.rules.tools.includes(tool as Tool) || !hasSpec;
    }
    basketBtn.disabled = busy || !client || !!current || queue.length === 0;
    basketBtn.classList.toggle('ready', !basketBtn.disabled);
    basketCount.textContent = client ? fmt(t.hud.basket, { n: queue.length }) : '';
    const handsOn = plan.rules.hands && !!client && !busy;
    handsBtn.style.display = plan.rules.hands ? '' : 'none';
    denounceBtn.style.display = plan.rules.hands ? '' : 'none';
    handsBtn.disabled = !handsOn;
    denounceBtn.disabled = !handsOn;
    moneyEl.textContent = fmt(t.hud.money, { n: state.money + report.verdicts.reduce((s, v) => s + v.pay, 0) });
  };

  const tutorialShow = (step: TutorialStep) => {
    tutorial = step;
    tutorialEl.className = 'tutorial';
    document.querySelectorAll('.tut-target').forEach((el) => el.classList.remove('tut-target'));
    if (!step) return;
    const targets: Record<Exclude<TutorialStep, null>, HTMLElement | null> = {
      basket: basketBtn, loupe: toolBtns.loupe!, guide: guideBtn, stamp: stamps, done: null,
    };
    tutorialEl.replaceChildren(h('p', {}, fmt(t.tutorial[step], { q: keyLabel('KeyQ'), g: keyLabel('KeyG'), a: keyLabel('Digit1'), b: keyLabel('Digit2') })));
    if (step === 'done') tutorialEl.append(button(t.tutorial.dismiss, () => tutorialShow(null), 'small'));
    tutorialEl.classList.add('show', `at-${step}`);
    targets[step]?.classList.add('tut-target');
  };

  const advanceTutorial = (event: TutorialStep) => {
    if (!tutorial || tutorial !== event) return;
    const order: TutorialStep[] = ['basket', 'loupe', 'guide', 'stamp', 'done'];
    tutorialShow(order[order.indexOf(event) + 1] ?? null);
  };

  // ---------- specimen display ----------
  const placeSpecimen = (s: Specimen) => {
    used = new Set();
    setLens(null);
    log.replaceChildren();
    ruler.className = 'ruler';
    stampMark.className = 'stamp-mark';
    specimenWrap.className = 'specimen-wrap';
    const name = s.anomaly ?? `sp_${s.speciesId}`;
    specimenImg.src = `img/${name}.webp`;
    wormOverlay.style.maskImage = `url('img/${name}.webp')`;
    wormOverlay.style.webkitMaskImage = `url('img/${name}.webp')`;
    const scale = s.anomaly ? 0.62 : 0.34 + Math.min(s.sizeCm, 30) / 30 * 0.66;
    specimenWrap.style.setProperty('--scale', String(scale));
    specimenWrap.style.setProperty('--rot', `${s.rot}deg`);
    specimenWrap.style.setProperty('--flip', s.flip ? '-1' : '1');
    specimenWrap.style.setProperty('--hue', `${s.hue}deg`);
    specimenWrap.classList.toggle('nobase', !s.hasBase);
    specimenWrap.classList.toggle('wormy', s.wormy);
    specimenWrap.classList.toggle('breathing', !!s.mimic || !!s.anomaly);
    specimenWrap.classList.add('enter');
    trayLabel.textContent = s.anomaly ? t.hud.unknown : '';
    audio.play('paper');
    if (s.anomaly) {
      audio.play('heartbeat');
      shake(0.6);
    }
    if (s.mimic && rng.chance(0.5)) setTimeout(() => current === s && audio.play('whisper'), 1800);
    if (!s.hasBase) addLog('info', t.hud.noBaseSeen, 'warn');
  };

  const takeSpecimen = () => {
    if (!client || current || busy || !queue.length) return;
    current = queue.shift()!;
    placeSpecimen(current);
    advanceTutorial('basket');
    refreshButtons();
  };

  // ---------- tools ----------
  const useTool = async (tool: Tool) => {
    if (!current || busy || !plan.rules.tools.includes(tool)) {
      if (!current && plan.rules.tools.includes(tool)) addLog('info', t.hud.examineFirst);
      return;
    }
    const s = current;
    const sp = s.speciesId ? SPECIES_BY_ID[s.speciesId] : null;
    const tx = s.speciesId ? t.species[s.speciesId as keyof typeof t.species] : null;
    const tell = s.mimic === tool;
    const strange = !!s.anomaly;
    used.add(tool);
    refreshButtons();
    if (tool === 'loupe') advanceTutorial('loupe');

    switch (tool) {
      case 'loupe': {
        audio.play('click');
        const view = img(strange ? s.anomaly! : `lp_${sp!.underside}`, tell ? 'lens-img blinking' : 'lens-img');
        if (strange) view.classList.add('zoom');
        setLens(view);
        if (strange) addLog(tool, t.anomalyResults.loupe, 'bad');
        else if (tell) { addLog(tool, t.mimic.loupe, 'bad'); audio.play('whisper'); }
        else addLog(tool, tx!.under);
        if (s.wormy) addLog(tool, t.hud.wormySeen, 'warn');
        break;
      }
      case 'nez':
        audio.play('sniff');
        addLog(tool, strange ? t.anomalyResults.nez : tell ? t.mimic.nez : tx!.smell, strange || tell ? 'bad' : '');
        break;
      case 'couteau': {
        audio.play('knife');
        const view = h('div.cut-view', {}, img(strange ? s.anomaly! : CUT_IMG[sp!.cut], 'lens-img'));
        if (sp?.cutTint && !tell) {
          // The tint is masked by the cut illustration so only the flesh changes colour.
          const mask = `url('img/${CUT_IMG[sp.cut]}.webp')`;
          view.append(h('div.cut-tint', { style: `--tint:${sp.cutTint};-webkit-mask-image:${mask};mask-image:${mask}` }));
        }
        if (sp?.milk && !tell) view.append(h('div.milk', { style: `--milk:${sp.milk}` }));
        if (tell || strange) {
          view.append(h('div.blood'));
          audio.play('heartbeat');
          shake(0.8);
        }
        setLens(view);
        addLog(tool, strange ? t.anomalyResults.couteau : tell ? t.mimic.couteau : tx!.cut, strange || tell ? 'bad' : '');
        break;
      }
      case 'regle': {
        audio.play('click');
        ruler.className = 'ruler show';
        const label = h('span.ruler-label', {}, strange ? '?' : `${s.sizeCm} cm`);
        ruler.replaceChildren(label);
        // Fit the ruler to the specimen as drawn, one graduation per centimetre.
        const zoom = tray.getBoundingClientRect().width / tray.offsetWidth;
        const box = specimenImg.getBoundingClientRect();
        const trayBox = tray.getBoundingClientRect();
        const height = box.height / zoom;
        ruler.style.height = `${height}px`;
        ruler.style.bottom = `${(trayBox.bottom - box.bottom) / zoom}px`;
        ruler.style.left = `${Math.min((box.right - trayBox.left) / zoom + 18, tray.offsetWidth - 70)}px`;
        ruler.style.setProperty('--cm', `${height / Math.max(s.sizeCm, 1)}px`);
        if (strange) {
          addLog(tool, t.anomalyResults.regle, 'bad');
        } else if (tell) {
          addLog(tool, t.mimic.regle, 'bad');
          let n = 0;
          const flicker = setInterval(() => {
            if (current !== s || n++ > 12) {
              clearInterval(flicker);
              return;
            }
            label.textContent = `${Math.round(rng.range(3, 40))} cm`;
          }, 220);
        } else {
          addLog(tool, fmt(t.results.size, { n: s.sizeCm }));
        }
        break;
      }
      case 'sporee': {
        busy = true;
        refreshButtons();
        audio.play('paper');
        const print = h('div.spore-print', { style: `--spore:${sp?.spore ?? '#f4f1ea'}` });
        const paper = h('div.spore-paper', {}, print, h('div.spore-wait', {}, t.hud.sporeWait));
        setLens(paper);
        await wait(2200);
        if (current !== s) break;
        print.classList.add('done');
        paper.querySelector('.spore-wait')?.remove();
        busy = false;
        if (strange) {
          print.classList.add('empty');
          addLog(tool, t.anomalyResults.sporee, 'bad');
        } else if (tell) {
          print.append(h('span.spore-letter', {}, 'V'));
          addLog(tool, t.mimic.sporee, 'bad');
          audio.play('whisper');
        } else {
          addLog(tool, fmt(t.results.sporeLabel, { color: tx!.spore }));
        }
        break;
      }
      case 'bougie': {
        busy = true;
        refreshButtons();
        audio.play('blow');
        darkness.classList.add('on');
        const glow = !!sp?.glows && !tell;
        specimenWrap.classList.toggle('glow', glow);
        specimenWrap.classList.toggle('face', tell);
        if (tell || strange) setTimeout(() => audio.play('whisper'), 500);
        await wait(2400);
        darkness.classList.remove('on');
        specimenWrap.classList.remove('glow', 'face');
        busy = false;
        if (strange) addLog(tool, t.anomalyResults.bougie, 'bad');
        else if (tell) addLog(tool, t.mimic.bougie, 'bad');
        else addLog(tool, tx!.glow || t.results.noGlow);
        break;
      }
      case 'cuillere': {
        const gain = tasteContamination(s);
        audio.play('click');
        if (strange) addLog(tool, t.anomalyResults.cuillere, 'bad');
        else if (tell) addLog(tool, t.mimic.cuillere, 'bad');
        else addLog(tool, tx!.taste || t.results.tasteNone);
        state.stats.tasted++;
        if (gain > 0) {
          state.contamination += gain;
          addLog('info', t.hud.contamination, 'bad');
          myco.style.setProperty('--myco', String(Math.min(state.contamination / CONTAMINATION_MAX, 1)));
          scene.classList.add('poisoned');
          setTimeout(() => scene.classList.remove('poisoned'), 2600);
          shake(1);
          audio.play('heartbeat');
          audio.setTension(Math.min((state.brume + state.contamination) / 10, 1));
        }
        break;
      }
      case 'mousse': {
        cat.classList.add('show');
        audio.play('sniff');
        await wait(700);
        if (current !== s) { cat.classList.remove('show'); break; }
        let reaction: 'good' | 'bad' | 'flee';
        if (strange || tell) reaction = 'flee';
        else {
          const truth = sp!.danger === 0 && !s.wormy;
          const right = rng.chance(0.8);
          reaction = truth === right ? 'good' : 'bad';
        }
        if (reaction === 'flee') {
          audio.play('hiss');
          cat.classList.add('flee');
          addLog(tool, t.results.catFlee, 'bad');
        } else if (reaction === 'good') {
          audio.play('purr');
          addLog(tool, t.results.catGood);
        } else {
          addLog(tool, t.results.catBad);
        }
        setTimeout(() => cat.classList.remove('show', 'flee'), 1600);
        break;
      }
    }
    refreshButtons();
  };

  // ---------- verdict ----------
  const stamp = async (v: Verdict) => {
    if (!current || busy || !client) return;
    if (v === 'burn' && !plan.rules.burn) return;
    if (v === 'seize' && !plan.rules.decree) return;
    busy = true;
    const s = current;
    const outcome = judge(s, v, plan.rules);
    const pay = payFor(outcome, v);
    report.verdicts.push({ char: client.char, specimen: s, given: v, outcome, pay });
    given.push(v);
    advanceTutorial('stamp');
    refreshButtons();
    stampMark.textContent = t.stamps[v];
    stampMark.className = `stamp-mark ${v} show`;
    stampBtns[v]?.classList.add('pressed');
    audio.play('stamp');
    shake(0.25);
    await wait(650);
    stampBtns[v]?.classList.remove('pressed');
    if (v === 'burn') {
      audio.play('fire');
      specimenWrap.classList.add('burning');
    } else {
      specimenWrap.classList.add(v === 'toxic' ? 'exit-right' : 'exit-left');
      if (pay > 0) audio.play('coin');
    }
    await wait(v === 'burn' ? 1100 : 600);
    current = null;
    specimenImg.removeAttribute('src');
    specimenWrap.className = 'specimen-wrap';
    stampMark.className = 'stamp-mark';
    ruler.className = 'ruler';
    setLens(null);
    log.replaceChildren();
    trayLabel.textContent = '';
    busy = false;
    if (queue.length) takeSpecimen();
    else await clientLeaves();
    refreshButtons();
  };

  // ---------- clients ----------
  const showHands = () => {
    if (!client || handsShown) return;
    handsShown = true;
    const c = CHARACTER_BY_ID[client.char];
    const infected = client.infected || c.hands.startsWith('mycelium');
    const handsImg = infected
      ? (c.hands === 'paysan' || c.hands === 'mycelium2' ? 'hd_mycelium2' : 'hd_mycelium')
      : c.hands === 'enfant' ? 'hd_enfant' : c.hands === 'fines' ? 'hd_fines' : 'hd_paysan';
    const hands = img(handsImg, 'hands-img');
    portrait.append(hands);
    audio.play('paper');
    addLog('info', infected ? t.handsLine.infected : t.handsLine.clean, infected ? 'bad' : '');
    if (infected) audio.play('whisper');
    setTimeout(() => hands.classList.add('fade'), 2600);
    setTimeout(() => hands.remove(), 3200);
  };

  const denounce = async () => {
    if (!client || busy) return;
    const target = client;
    const ok = await confirmBox(fmt(t.hud.denounceConfirm, { who: charName(target.char) }), t.hud.yes, t.hud.no);
    if (!ok || client !== target) return;
    const c = CHARACTER_BY_ID[target.char];
    report.denounced.push({ char: target.char, infected: target.infected || c.hands.startsWith('mycelium') });
    audio.play('thud');
    queue = [];
    current = null;
    specimenWrap.className = 'specimen-wrap';
    specimenImg.removeAttribute('src');
    setLens(null);
    portrait.classList.add('taken');
    await say('…');
    await wait(900);
    client = null;
    refreshButtons();
    nextClient();
  };

  const clientLeaves = async () => {
    if (!client) return;
    const c = client;
    let line: string;
    const scripted = c.lines ? t.scripted[c.lines as keyof typeof t.scripted] : null;
    if (scripted) line = scripted.leave;
    else {
      const edible = given.filter((v) => v === 'edible').length;
      const pool = edible === given.length && edible > 0 ? t.leave.edible : edible > 0 ? t.leave.mixed : t.leave.none;
      line = rng.pick(pool);
    }
    const infected = c.infected || CHARACTER_BY_ID[c.char].hands.startsWith('mycelium');
    if (plan.rules.hands && infected) report.ignoredInfected.push(c.char);
    busy = true;
    refreshButtons();
    await say(line);
    await wait(1100);
    portrait.classList.add('leave');
    await wait(500);
    busy = false;
    client = null;
    nextClient();
  };

  const nextClient = () => {
    if (ended) return;
    clientIdx++;
    given = [];
    handsShown = false;
    if (clientIdx >= plan.clients.length) {
      endNight(false);
      return;
    }
    client = plan.clients[clientIdx];
    queue = [...client.specimens];
    const c = CHARACTER_BY_ID[client.char];
    portrait.className = 'portrait enter';
    portrait.replaceChildren(img(c.portrait, 'portrait-img'));
    nameplate.textContent = t.charTitle[client.char as keyof typeof t.charTitle];
    audio.play('bell');
    const scripted = client.lines ? t.scripted[client.lines as keyof typeof t.scripted] : null;
    const greet = scripted ? scripted.greet : rng.pick(t.greet[client.char as keyof typeof t.greet]);
    busy = true;
    refreshButtons();
    setTimeout(() => {
      busy = false;
      refreshButtons();
      void say(greet);
      if (tutorial === 'basket') tutorialShow('basket');
    }, 450);
  };

  const endNight = (candleOut: boolean) => {
    if (ended) return;
    ended = true;
    onKeys(null);
    closeGuide();
    if (candleOut) {
      const rest = plan.clients.slice(clientIdx + (client ? 0 : 1));
      if (client && current) queue.unshift(current);
      report.turnedAway = rest.map((c) => c.char);
      if (client && plan.rules.hands && (client.infected || CHARACTER_BY_ID[client.char].hands.startsWith('mycelium'))) {
        report.ignoredInfected.push(client.char);
        report.turnedAway = report.turnedAway.filter((c) => c !== client!.char);
      }
    }
    current = null;
    client = null;
    refreshButtons();
    for (const b of Object.values(stampBtns)) b!.disabled = true;
    portrait.classList.add('leave');
    const msg = candleOut ? t.hud.candleOut : t.hud.lastClient;
    void say(msg);
    if (candleOut) {
      darkness.classList.add('on', 'out');
      audio.play('blow');
    }
    const close = button(t.hud.closeShop, () => { audio.setTension(0); onEnd(report); }, 'close-shop');
    scene.append(close);
  };

  // ---------- candle ----------
  if (plan.candleSeconds) {
    const total = plan.candleSeconds;
    const timer = setInterval(() => {
      if (ended) {
        clearInterval(timer);
        return;
      }
      if (paused || remaining === null) return;
      remaining = Math.max(0, remaining - 0.25);
      candleFill.style.width = `${(remaining / total) * 100}%`;
      candle.classList.toggle('low', remaining < total * 0.2);
      if (remaining <= 0) {
        clearInterval(timer);
        endNight(true);
      }
    }, 250);
  } else {
    candle.classList.add('infinite');
  }

  // Past half the contamination threshold, the mycelium starts talking.
  const whispers = setInterval(() => {
    if (ended) clearInterval(whispers);
    else if (!paused && state.contamination >= CONTAMINATION_MAX / 2 && rng.chance(0.35)) audio.play('whisper');
  }, 9000);

  // ---------- input ----------
  const openGuidePanel = () => {
    toggleGuide({ rules: plan.rules, night: state.night, endless }, () => advanceTutorial('guide'));
  };

  const pause = () => {
    if (ended) return;
    paused = true;
    closeGuide();
    openPause(() => { paused = false; });
  };

  onKeys((e) => {
    if (e.repeat || paused) return;
    if (document.querySelector('.modal.open')) return;
    if (e.code === 'Escape') {
      if (isGuideOpen()) closeGuide();
      else pause();
      return;
    }
    if (e.code === 'KeyG') { openGuidePanel(); return; }
    if (isGuideOpen()) return;
    for (const [tool, code] of Object.entries(TOOL_KEYS)) if (e.code === code) void useTool(tool as Tool);
    for (const [v, code] of Object.entries(STAMP_KEYS)) if (e.code === code) void stamp(v as Verdict);
    if (e.code === 'KeyH' && plan.rules.hands) showHands();
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); takeSpecimen(); }
  });

  // Test hook used by tools/autoplay.mjs to play whole campaigns through the real UI
  // (dev server, or a build opened with ?autoplay).
  if (import.meta.env.DEV || location.search.includes('autoplay')) {
    (window as unknown as { __night: unknown }).__night = {
      current: () => current,
      right: () => (current ? correctVerdict(current, plan.rules) : null),
      client: () => client,
      infected: () => !!client && (client.infected || CHARACTER_BY_ID[client.char].hands.startsWith('mycelium')),
      rules: plan.rules,
    };
  }

  refreshButtons();
  setTimeout(nextClient, 700);
}
