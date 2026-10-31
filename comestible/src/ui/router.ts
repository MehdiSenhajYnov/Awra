import { audio } from '../audio';
import { type EndingId, type GameState, finalEnding, isFinalNight, newGame, payAndAdvance, planNight, resolveNight } from '../game/state';
import { clearGame, loadProfile, recordEnding, saveGame, saveProfile } from '../save';
import { showEnding } from './ending';
import { showIntro } from './intro';
import { showMorning } from './morning';
import { showNightCard } from './nightcard';
import { runNight } from './night';
import { showTitle } from './title';

export function goTitle(): void {
  showTitle();
}

export function startCampaign(relaxed: boolean): void {
  const state = newGame('campaign', relaxed);
  showIntro(() => beginNight(state));
}

export function continueCampaign(state: GameState): void {
  beginNight(state);
}

export function startEndless(): void {
  beginNight(newGame('endless', false));
}

function beginNight(state: GameState): void {
  saveGame(state);
  audio.music('none');
  showNightCard(state, () => {
    const plan = planNight(state);
    runNight(state, plan, (report) => {
      const morning = resolveNight(state, report);
      const final = !morning.gameOver && isFinalNight(state);
      showMorning(state, morning, final, (expenses) => {
        if (morning.gameOver) return finish(state, morning.gameOver);
        if (final) return finish(state, finalEnding(state));
        const ending = payAndAdvance(state, expenses!);
        if (ending) return finish(state, ending);
        beginNight(state);
      });
    });
  });
}

function finish(state: GameState, ending: EndingId): void {
  if (state.mode === 'endless') {
    const profile = loadProfile();
    const nights = state.night - 1;
    if (nights > profile.bestEndless) {
      profile.bestEndless = nights;
      saveProfile(profile);
    }
    showEnding(state, ending, nights);
    return;
  }
  clearGame();
  recordEnding(ending);
  showEnding(state, ending, null);
}
