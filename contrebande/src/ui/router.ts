import { audio } from '../audio';
import { BAGS } from '../data/items';
import { BORDERS } from '../game/inspect';
import { hashSeed } from '../game/rng';
import { type RunState, cross, crossing, layout, newRun, score } from '../game/run';
import { L } from '../i18n';
import { clearRun, loadProfile, saveProfile, saveRun } from '../save';
import { showEnding } from './ending';
import { showInspection } from './inspection';
import { showMarket } from './market';
import { showBackroom, showPayment, showResult } from './olga';
import { bagUnlocked } from './setup';
import { showTitle } from './title';

export function goTitle(): void {
  showTitle();
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startRun(bag: string, alert: number): void {
  const p = loadProfile();
  if (!p.howtoSeen) {
    p.howtoSeen = true;
    saveProfile(p);
  }
  loop(newRun(bag, alert, Math.floor(Math.random() * 2 ** 31)));
}

export function startDaily(): void {
  const day = todayKey();
  loop(newRun('carton', 0, hashSeed('daily', day), day));
}

export function continueRun(run: RunState): void {
  loop(run);
}

function persist(run: RunState): void {
  if (!run.daily) saveRun(run);
  const p = loadProfile();
  if (run.border > p.bestBorder) {
    p.bestBorder = run.border;
    saveProfile(p);
  }
}

function loop(run: RunState): void {
  persist(run);
  switch (run.phase) {
    case 'market':
      showMarket(run, (laneIdx) => {
        const lane = crossing(run).lanes[laneIdx];
        const lay = layout(run);
        const before = run.pieces.map((p) => ({ ...p }));
        const result = cross(run, laneIdx);
        persist(run);
        showInspection(lay, before, lane, result, () => showResult(run, before, result, () => loop(run)));
      });
      return;
    case 'payment':
      showPayment(run, () => loop(run), () => finish(run));
      return;
    case 'backroom':
      showBackroom(run, () => loop(run));
      return;
    default:
      finish(run);
  }
}

function finish(run: RunState): void {
  const t = L();
  const before = BAGS.filter((b) => bagUnlocked(b.id)).map((b) => b.id);
  const p = loadProfile();
  const s = score(run);
  p.bestBorder = Math.max(p.bestBorder, run.phase === 'won' ? BORDERS + 1 : run.border);
  if (run.phase === 'won') {
    p.wins++;
    p.maxAlert = Math.min(5, Math.max(p.maxAlert, run.alert + 1));
  }
  p.bestScore = Math.max(p.bestScore, s);
  if (run.daily) p.daily[run.daily] = Math.max(p.daily[run.daily] ?? 0, s);
  saveProfile(p);
  if (!run.daily) clearRun();
  const unlocked = BAGS.filter((b) => bagUnlocked(b.id) && !before.includes(b.id)).map((b) => t.bags[b.id as keyof typeof t.bags].name);
  if (run.phase === 'won' && p.maxAlert > run.alert) unlocked.push(`${t.setup.alert} ${run.alert + 1}`);
  audio.track('none');
  showEnding(run, run.daily ? p.daily[run.daily] : p.bestScore, unlocked);
}
