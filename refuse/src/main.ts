import '@fontsource/uncial-antiqua/400.css';
import '@fontsource/im-fell-dw-pica/400.css';
import '@fontsource/im-fell-dw-pica/400-italic.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './styles.css';
import { saveGame } from './save';
import { applySettings } from './settings';
import { currentGame } from './ui/desk';
import { goTitle } from './ui/router';

const STAGE_W = 1600;
const STAGE_H = 900;

/** The game is laid out on a fixed 1600×900 stage scaled to fit the window. */
function fit(): void {
  const stage = document.getElementById('stage')!;
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// Save when the window is hidden or closed, so the staff's offline work is counted from that moment.
function saveNow(): void {
  const g = currentGame();
  if (g && document.querySelector('.desk')) {
    g.lastSeen = Date.now();
    saveGame(g);
  }
}

window.addEventListener('resize', fit);
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
applySettings();
fit();
goTitle();
