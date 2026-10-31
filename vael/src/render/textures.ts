import { Texture } from 'pixi.js';

/** Small procedural textures for particles and lights (soft discs, streaks, rings, stars). */
function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  return Texture.from(c);
}

let cache: Record<string, Texture> | null = null;

export function fxTextures(): Record<string, Texture> {
  if (cache) return cache;
  const glow = canvasTex(128, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    r.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  const light = canvasTex(256, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    r.addColorStop(0.75, 'rgba(255,255,255,0.1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  const dot = canvasTex(32, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  const streak = canvasTex(128, (g, s) => {
    const r = g.createLinearGradient(0, 0, s, 0);
    r.addColorStop(0, 'rgba(255,255,255,0)');
    r.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.beginPath();
    g.ellipse(s / 2, s / 2, s / 2, s / 14, 0, 0, Math.PI * 2);
    g.fill();
  });
  const ring = canvasTex(256, (g, s) => {
    g.strokeStyle = 'white';
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = [0.08, 0.18, 0.5, 1, 0.5, 0.15][i];
      g.lineWidth = [14, 9, 5, 2.5, 5, 9][i];
      g.beginPath();
      g.arc(s / 2, s / 2, s / 2 - 12, 0, Math.PI * 2);
      g.stroke();
    }
  });
  const star = canvasTex(128, (g, s) => {
    const c = s / 2;
    const r = g.createRadialGradient(c, c, 0, c, c, c);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.2, 'rgba(255,255,255,0.3)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'white';
    for (const a of [0, Math.PI / 2]) {
      g.save();
      g.translate(c, c);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-c, 0);
      g.quadraticCurveTo(0, -3, c, 0);
      g.quadraticCurveTo(0, 3, -c, 0);
      g.fill();
      g.restore();
    }
  });
  const smoke = canvasTex(128, (g, s) => {
    for (let i = 0; i < 9; i++) {
      const x = s / 2 + (Math.random() - 0.5) * s * 0.35;
      const y = s / 2 + (Math.random() - 0.5) * s * 0.35;
      const rr = s * (0.18 + Math.random() * 0.16);
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, 'rgba(255,255,255,0.35)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, s, s);
    }
  });
  const shaft = canvasTex(256, (g, s) => {
    const r = g.createLinearGradient(0, 0, s, 0);
    r.addColorStop(0, 'rgba(255,255,255,0)');
    r.addColorStop(0.5, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
    const v = g.createLinearGradient(0, 0, 0, s);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.15, 'rgba(0,0,0,1)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = v;
    g.fillRect(0, 0, s, s);
  });
  const vignette = canvasTex(512, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.72);
    r.addColorStop(0, 'rgba(0,0,0,0)');
    r.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = r;
    g.fillRect(0, 0, s, s);
  });
  cache = { glow, light, dot, streak, ring, star, smoke, shaft, vignette };
  return cache;
}
