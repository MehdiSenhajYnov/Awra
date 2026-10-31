import { Rng, TILE, VIEW_H, VIEW_W, hash } from '../engine/core';
import type { Scene } from '../game/scene';
import type { Room, ZoneId } from '../world/room';
import { PALETTES } from '../world/zones';

const images = new Map<string, HTMLImageElement>();
/** Backdrops are pre-softened once (slight blur, darker, less saturated) so foreground silhouettes stay readable. */
const softened = new Map<string, HTMLCanvasElement>();
function soft(name: string): HTMLCanvasElement | null {
  const done = softened.get(name);
  if (done) return done;
  const im = image(name);
  if (!im.complete || !im.naturalWidth) return null;
  const c = document.createElement('canvas');
  const w = 1024;
  const h = Math.round((w * im.naturalHeight) / im.naturalWidth);
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.filter = 'blur(1.6px) saturate(0.85)';
  ctx.drawImage(im, 0, 0, w, h);
  softened.set(name, c);
  return c;
}
function image(name: string): HTMLImageElement {
  let im = images.get(name);
  if (!im) {
    im = new Image();
    im.src = `img/${name}.webp`;
    images.set(name, im);
  }
  return im;
}

export function preloadZone(zone: ZoneId): void {
  image(`bg_${zone}_a`);
  image(`bg_${zone}_b`);
}

/** Painted backdrop (slow parallax), procedural silhouettes (mid parallax) and fog. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, room: Room, camX: number, camY: number, time: number): void {
  const zone = room.def.zone;
  const pal = PALETTES[zone];
  const W = room.w * TILE;
  const H = room.h * TILE;
  const im = soft(`bg_${zone}_${room.def.bg ?? 'a'}`);
  ctx.fillStyle = pal.fog;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (im) {
    // Cover the view with a margin that slides a little as the camera moves through the room.
    const scale = Math.max((VIEW_W * 1.25) / im.width, (VIEW_H * 1.25) / im.height);
    const iw = im.width * scale;
    const ih = im.height * scale;
    const vw = VIEW_W / 1.2;
    const vh = VIEW_H / 1.2;
    const kx = W > vw ? camX / (W - vw) : 0.5;
    const ky = H > vh ? camY / (H - vh) : 0.5;
    ctx.drawImage(im, -(iw - VIEW_W) * kx, -(ih - VIEW_H) * ky, iw, ih);
  }
  ctx.fillStyle = `rgba(4,5,9,${pal.dim})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawMid(ctx, room, camX, camY, time);
  const g = ctx.createLinearGradient(0, VIEW_H * 0.35, 0, VIEW_H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, hexA(pal.fog, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Silhouettes of the zone's architecture at half parallax. */
function drawMid(ctx: CanvasRenderingContext2D, room: Room, camX: number, camY: number, time: number): void {
  const zone = room.def.zone;
  const pal = PALETTES[zone];
  const r = new Rng(hash(room.id, 'mid'));
  const par = 0.45;
  const ox = -camX * par;
  const oy = -camY * par;
  const span = room.w * TILE * par + VIEW_W;
  ctx.save();
  ctx.fillStyle = hexA(pal.vein, 0.85);
  ctx.strokeStyle = hexA(pal.vein, 0.85);
  const count = Math.ceil(span / 120) + 2;
  for (let i = 0; i < count; i++) {
    const x = ox + i * 120 + r.range(-30, 30);
    const kind = r.next();
    switch (zone) {
      case 'beffroi':
      case 'crypte': {
        // Hanging bells on ropes, beams, arches.
        if (kind < 0.5) {
          const len = r.range(40, 160);
          const sway = Math.sin(time * 0.01 + i) * 3;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, oy - 50); ctx.lineTo(x + sway, oy + len); ctx.stroke();
          bellShape(ctx, x + sway, oy + len, r.range(10, 26));
        } else {
          ctx.fillRect(x - 6, oy - 40, 12, VIEW_H + room.h * TILE);
          ctx.beginPath();
          ctx.arc(x + 60, oy + r.range(60, 140), 60, Math.PI, 0);
          ctx.lineWidth = 8;
          ctx.stroke();
        }
        break;
      }
      case 'gouttieres': {
        const top = oy + r.range(60, 200);
        ctx.fillRect(x - 30, top, 60, 900);
        ctx.beginPath(); ctx.moveTo(x - 36, top); ctx.lineTo(x, top - r.range(30, 70)); ctx.lineTo(x + 36, top); ctx.fill();
        break;
      }
      case 'fonderie': {
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, oy - 50); ctx.lineTo(x, oy + r.range(60, 220)); ctx.stroke();
        if (kind < 0.4) { ctx.beginPath(); ctx.moveTo(x - 22, oy + 220); ctx.lineTo(x + 22, oy + 220); ctx.lineTo(x + 14, oy + 250); ctx.lineTo(x - 14, oy + 250); ctx.fill(); }
        break;
      }
      case 'orgues': {
        const w = r.range(12, 26);
        const top = oy + r.range(-40, 120);
        ctx.fillRect(x, top, w, 1200);
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w / 2, top - w * 0.8); ctx.lineTo(x + w, top); ctx.fill();
        break;
      }
      case 'jardin': {
        const h = r.range(60, 200);
        const base = oy + room.h * TILE * 0.5 + 200;
        ctx.beginPath(); ctx.moveTo(x - 14, base); ctx.lineTo(x, base - h); ctx.lineTo(x + 14, base); ctx.fill();
        break;
      }
      case 'cisternes': {
        ctx.fillRect(x - 10, oy - 40, 20, 1200);
        ctx.beginPath(); ctx.arc(x + 60, oy + 120, 60, Math.PI, 0); ctx.lineWidth = 10; ctx.stroke();
        break;
      }
      case 'horlogerie': {
        gear(ctx, x, oy + r.range(40, 260), r.range(20, 60), time * 0.004 * (i % 2 ? 1 : -1));
        break;
      }
      case 'bourdon': {
        const y = oy + r.range(30, 300) + Math.sin(time * 0.01 + i) * 6;
        ctx.save(); ctx.translate(x, y); ctx.rotate(r.range(0, 6) + time * 0.001);
        ctx.fillRect(-r.range(4, 14), -r.range(3, 8), r.range(8, 28), r.range(6, 16));
        ctx.restore();
        break;
      }
    }
  }
  ctx.restore();
}

function bellShape(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y);
  ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.8, x - s * 0.8, y + s);
  ctx.lineTo(x + s * 0.8, y + s);
  ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.8, x + s * 0.35, y);
  ctx.closePath();
  ctx.fill();
}

export function gear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  const teeth = Math.max(8, Math.round(r / 4));
  for (let i = 0; i < teeth * 2; i++) {
    const rr = i % 2 ? r : r * 1.15;
    const t = (i / (teeth * 2)) * Math.PI * 2;
    ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Drifting motes in screen space and a soft vignette. */
export function drawForeground(ctx: CanvasRenderingContext2D, room: Room, camX: number, camY: number, time: number): void {
  const pal = PALETTES[room.def.zone];
  const r = new Rng(hash(room.id, 'motes'));
  ctx.save();
  const n = pal.motes === 'rain' ? 90 : 40;
  for (let i = 0; i < n; i++) {
    const bx = r.next() * (VIEW_W + 100);
    const by = r.next() * (VIEW_H + 100);
    const sp = r.range(0.3, 1);
    let x = 0;
    let y = 0;
    switch (pal.motes) {
      case 'rain':
        x = (bx - time * 2 * sp - camX * 0.9) % (VIEW_W + 100);
        y = (by + time * 9 * sp - camY * 0.9) % (VIEW_H + 100);
        x = (x + VIEW_W + 100) % (VIEW_W + 100) - 50;
        y = (y + VIEW_H + 100) % (VIEW_H + 100) - 50;
        ctx.strokeStyle = hexA(pal.rim, 0.35 * sp);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 10 * sp); ctx.stroke();
        continue;
      case 'embers':
        y = (by - time * 0.6 * sp - camY * 0.6) % (VIEW_H + 100);
        x = bx + Math.sin(time * 0.02 + i) * 10 - camX * 0.6;
        break;
      case 'drips':
        y = (by + time * 3 * sp - camY * 0.7) % (VIEW_H + 100);
        x = bx - camX * 0.7;
        break;
      default:
        x = bx + Math.sin(time * 0.006 * sp + i) * 20 - camX * 0.7;
        y = by + Math.cos(time * 0.005 * sp + i * 2) * 14 - camY * 0.7 - time * 0.05 * sp;
    }
    x = ((x % (VIEW_W + 100)) + VIEW_W + 100) % (VIEW_W + 100) - 50;
    y = ((y % (VIEW_H + 100)) + VIEW_H + 100) % (VIEW_H + 100) - 50;
    const glow = pal.motes === 'embers' || pal.motes === 'wisps' || pal.motes === 'glints';
    ctx.fillStyle = pal.motes === 'ink' ? 'rgba(0,0,0,0.6)' : hexA(glow ? pal.accent : pal.rim, glow ? 0.7 * sp : 0.3 * sp);
    const s = pal.motes === 'cogs' ? 2 : glow ? 1.6 : 1.2;
    ctx.fillRect(x, y, s * sp + 0.6, s * sp + 0.6);
  }
  const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

let lightCanvas: HTMLCanvasElement | null = null;

/** Dark rooms: only the Sonneur's bell, echoes and lamps cut through. */
export function drawLighting(ctx: CanvasRenderingContext2D, scene: Scene, camX: number, camY: number): void {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = VIEW_W;
    lightCanvas.height = VIEW_H;
  }
  const l = lightCanvas.getContext('2d')!;
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0, 0, VIEW_W, VIEW_H);
  l.fillStyle = 'rgba(2,2,6,0.9)';
  l.fillRect(0, 0, VIEW_W, VIEW_H);
  l.globalCompositeOperation = 'destination-out';
  const hole = (x: number, y: number, r: number, a = 1) => {
    const g = l.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g;
    l.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const p = scene.player;
  const Z = 1.2;
  hole((p.cx - camX) * Z, (p.cy - camY) * Z, (70 + p.res * 14) * Z);
  for (const e of scene.echoes) if (e.active) hole((e.frame.x + 6 - camX) * Z, (e.frame.y + 13 - camY) * Z, 60 * Z, 0.8);
  for (const e of scene.entities) {
    const light = (e as unknown as { light?: number }).light;
    if (light) hole((e.cx - camX) * Z, (e.cy - camY) * Z, light * Z, 0.9);
  }
  ctx.drawImage(lightCanvas, 0, 0);
}
