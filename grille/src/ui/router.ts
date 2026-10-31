import { audio } from '../audio';
import { DECKS, EDITIONS } from '../data/content';
import type { Lang } from '../data/letters';
import { loadDictionary } from '../game/dict';
import { hashSeed } from '../game/rng';
import { type RunState, newRun, score } from '../game/run';
import { L } from '../i18n';
import { clearRun, loadProfile, saveProfile, saveRun } from '../save';
import { h, show } from './dom';
import { showEnding } from './ending';
import { showGrid } from './gridscene';
import { showShop } from './shop';
import { showTitle } from './title';

export function goTitle(): void {
  showTitle();
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startRun(lang: Lang, deck: string, stake: number): void {
  const p = loadProfile();
  p.howtoSeen = true;
  p.gridLang = lang;
  saveProfile(p);
  void loop(newRun(lang, deck, stake, Math.floor(Math.random() * 2 ** 31)));
}

export function startDaily(lang: Lang): void {
  const day = todayKey();
  void loop(newRun(lang, 'classique', 0, hashSeed('daily', day, lang), day));
}

export function continueRun(run: RunState): void {
  void loop(run);
}

function persist(run: RunState): void {
  if (!run.daily) saveRun(run);
  const p = loadProfile();
  if (run.edition > p.bestEdition) {
    p.bestEdition = run.edition;
    saveProfile(p);
  }
}

async function loop(run: RunState): Promise<void> {
  persist(run);
  const t = L();
  if (run.phase === 'grid') {
    show(h('div.scene.paper.loading', {}, h('p', {}, t.hud.loading)));
    const dict = await loadDictionary(run.lang);
    showGrid(run, dict, () => void loop(run));
    return;
  }
  if (run.phase === 'shop') {
    showShop(run, () => void loop(run));
    return;
  }
  finishRun(run);
}

export function finishRun(run: RunState): void {
  const t = L();
  const p = loadProfile();
  const unlockedBefore = DECKS.filter((d) => p.bestEdition >= d.unlock).map((d) => d.id);
  const s = score(run);
  p.bestEdition = Math.max(p.bestEdition, run.phase === 'won' ? EDITIONS + 1 : run.edition);
  if (run.phase === 'won' && !run.endless) {
    p.wins++;
    p.maxStake = Math.min(5, Math.max(p.maxStake, run.stake + 1));
  }
  p.bestScore = Math.max(p.bestScore, s);
  if (run.daily) p.daily[run.daily] = Math.max(p.daily[run.daily] ?? 0, s);
  saveProfile(p);
  if (!run.daily && run.phase !== 'won') clearRun();
  if (run.phase === 'won') saveRun(run);
  const unlocked = DECKS.filter((d) => p.bestEdition >= d.unlock && !unlockedBefore.includes(d.id)).map((d) => t.decks[d.id].name);
  if (run.phase === 'won' && !run.endless && p.maxStake > run.stake) unlocked.push(`${t.setup.stake} ${run.stake + 1}`);
  audio.track('none');
  showEnding(run, run.daily ? p.daily[run.daily] : p.bestScore, unlocked);
}
