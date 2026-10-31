import '@fontsource/marcellus-sc/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './styles.css';
import { STEP, VIEW_H, VIEW_W } from './engine/core';
import { input } from './engine/input';
import { audio } from './engine/audio';
import { App } from './ui/app';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
input.attach();
const app = new App();

/** The 640×360 view is scaled to fit the window with letterboxing, rendered at device resolution. */
function resize(): { scale: number; ox: number; oy: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const scale = Math.min(w / VIEW_W, h / VIEW_H) * dpr;
  return { scale, ox: (canvas.width - VIEW_W * scale) / 2, oy: (canvas.height - VIEW_H * scale) / 2 };
}
let view = resize();
window.addEventListener('resize', () => { view = resize(); });
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());
window.addEventListener('contextmenu', (e) => e.preventDefault());

let acc = 0;
let last = performance.now();
function frame(now: number): void {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  // Fixed 60 Hz simulation, whatever the display rate.
  while (acc >= STEP) {
    input.poll();
    app.update();
    acc -= STEP;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();
  app.draw(ctx);
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test hooks (dev builds and ?autoplay only).
if (import.meta.env.DEV || location.search.includes('autoplay')) {
  (window as unknown as { __carillon: unknown }).__carillon = { app, input };
}
