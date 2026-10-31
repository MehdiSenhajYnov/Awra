import './styles.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import { Application } from 'pixi.js';
import { audio } from './engine/audio';
import { input } from './engine/input';
import { App } from './ui/app';

async function boot(): Promise<void> {
  const app = new Application();
  await app.init({ resizeTo: window, background: '#020205', preference: 'webgl', antialias: false, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio || 1) });
  document.getElementById('game')!.appendChild(app.canvas);
  input.attach();
  const game = new App(app);
  await game.start();
  const unlock = () => audio.init();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  // Fixed 60 Hz simulation, rendering every display frame.
  let acc = 0;
  let last = performance.now();
  const testMode = new URLSearchParams(location.search).has('test');
  app.ticker.add(() => {
    if (testMode) return;
    const now = performance.now();
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 4) {
      input.poll();
      game.update();
      acc -= 1 / 60;
      steps++;
    }
    game.render(steps);
  });
  (window as unknown as { __vael: unknown }).__vael = { game, input };
}

void boot();
