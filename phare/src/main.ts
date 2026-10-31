import '@fontsource/young-serif/400.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/lora/600.css';
import '@fontsource/caveat/500.css';
import './styles.css';
import { offlineProgress } from './game/state';
import { loadGame, saveGame } from './save';
import { applySettings, settings } from './settings';
import { game, startApp } from './ui/app';
import { showWelcome } from './ui/welcome';

// Save when the window is hidden or closed, so the absence is counted from that moment.
function saveNow(): void {
  const g = game();
  if (g) {
    g.lastSeen = Date.now();
    saveGame(g);
  }
}

window.addEventListener('pagehide', saveNow);
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  const g = game();
  if (document.hidden) saveNow();
  else if (g && Date.now() - g.lastSeen > 60000) {
    // Back after a long hidden spell: account for it like a closed game.
    offlineProgress(g, Date.now(), { stormEvery: settings().storms });
  }
});
applySettings();
const saved = loadGame();
if (saved) startApp(saved, offlineProgress(saved, Date.now(), { stormEvery: settings().storms }));
else showWelcome();
