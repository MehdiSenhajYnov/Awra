import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/playfair-display/700-italic.css';
import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource/old-standard-tt/400-italic.css';
import '@fontsource/special-elite/400.css';
import './styles.css';
import { applySettings } from './settings';
import { loadKeyLabels } from './ui/keys';
import { goTitle } from './ui/router';

const STAGE_W = 1600;
const STAGE_H = 900;

/** The game is laid out on a fixed 1600×900 stage scaled to fit the window. */
function fit(): void {
  const stage = document.getElementById('stage')!;
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('resize', fit);
window.addEventListener('contextmenu', (e) => e.preventDefault());
applySettings();
fit();
void loadKeyLabels().finally(goTitle);
