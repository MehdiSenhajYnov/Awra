import { Rng, TILE, hash } from '../engine/core';
import { type Room, T, isSolid, tileAt } from '../world/room';
import { PALETTES } from '../world/zones';

const SCALE = 2;

/**
 * Pre-renders a room's static terrain into an offscreen canvas at twice the logical resolution:
 * dark silhouettes with a rim of zone light on exposed edges, carved veins, beams, spikes.
 */
export function renderTerrain(room: Room): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = room.w * TILE * SCALE;
  c.height = room.h * TILE * SCALE;
  const ctx = c.getContext('2d')!;
  ctx.scale(SCALE, SCALE);
  paintTerrain(ctx, room);
  return c;
}

export function paintTerrain(ctx: CanvasRenderingContext2D, room: Room): void {
  const pal = PALETTES[room.def.zone];
  const r = new Rng(hash(room.id));
  const solid = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= room.w || y >= room.h) return true;
    const t = tileAt(room, x, y);
    return t === T.Solid;
  };
  // Solid mass, with rounded outer corners for a hand-cut look.
  ctx.fillStyle = pal.rock;
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
    if (tileAt(room, x, y) !== T.Solid) continue;
    const px = x * TILE;
    const py = y * TILE;
    const up = solid(x, y - 1);
    const dn = solid(x, y + 1);
    const lf = solid(x - 1, y);
    const rt = solid(x + 1, y);
    const rad = 6;
    ctx.beginPath();
    ctx.roundRect(px - 0.5, py - 0.5, TILE + 1, TILE + 1, [!up && !lf ? rad : 0, !up && !rt ? rad : 0, !dn && !rt ? rad : 0, !dn && !lf ? rad : 0]);
    ctx.fill();
  }
  // Veins: short dark strokes inside the mass.
  ctx.strokeStyle = pal.vein;
  ctx.lineWidth = 1.5;
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
    if (tileAt(room, x, y) !== T.Solid || !r.chance(0.18)) continue;
    const px = x * TILE + r.range(3, 17);
    const py = y * TILE + r.range(3, 17);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + r.range(-8, 8), py + r.range(-4, 4));
    ctx.stroke();
  }
  // Rim light on exposed top edges, fainter on sides.
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
    if (tileAt(room, x, y) !== T.Solid) continue;
    const px = x * TILE;
    const py = y * TILE;
    if (!solid(x, y - 1) && y > 0) {
      const g = ctx.createLinearGradient(0, py, 0, py + 7);
      g.addColorStop(0, pal.rim);
      g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = g;
      ctx.fillRect(px, py, TILE, 7);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = pal.rim;
      ctx.fillRect(px, py, TILE, 1.2);
      // Tufts and stones along walkable tops.
      ctx.globalAlpha = 0.6;
      if (r.chance(0.35)) ctx.fillRect(px + r.range(2, 16), py - r.range(1, 3), 1.2, 3);
    }
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = pal.rim;
    if (!solid(x - 1, y) && x > 0) ctx.fillRect(px, py, 1, TILE);
    if (!solid(x + 1, y) && x < room.w - 1) ctx.fillRect(px + TILE - 1, py, 1, TILE);
    ctx.globalAlpha = 1;
  }
  // Special tiles.
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
    const t = tileAt(room, x, y);
    const px = x * TILE;
    const py = y * TILE;
    if (t === T.Platform) {
      ctx.fillStyle = '#2a1f17';
      ctx.fillRect(px, py, TILE, 6);
      ctx.fillStyle = pal.rim;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(px, py, TILE, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1a130e';
      if (x % 2 === 0) ctx.fillRect(px + 8, py + 6, 3, 6);
    } else if (t === T.Spikes) {
      const up = !isSolid(tileAt(room, x, y - 1));
      const dn = isSolid(tileAt(room, x, y + 1)) || !up;
      ctx.fillStyle = '#6e5a3c';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        if (dn) {
          ctx.moveTo(px + i * 5, py + TILE);
          ctx.lineTo(px + i * 5 + 2.5, py + 4);
          ctx.lineTo(px + i * 5 + 5, py + TILE);
        } else {
          ctx.moveTo(px + i * 5, py);
          ctx.lineTo(px + i * 5 + 2.5, py + TILE - 4);
          ctx.lineTo(px + i * 5 + 5, py);
        }
        ctx.fill();
      }
      ctx.fillStyle = '#c9a56a';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + i * 5 + 2, dn ? py + 5 : py + TILE - 7, 1, 2);
    } else if (t === T.Breakable || t === T.Slam) {
      ctx.fillStyle = t === T.Slam ? '#241c14' : '#1c1a1e';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = pal.rim;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 4);
      ctx.lineTo(px + 10, py + 11);
      ctx.lineTo(px + 7, py + 17);
      ctx.moveTo(px + 10, py + 11);
      ctx.lineTo(px + 17, py + 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (t === T.Slam) { ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.5; ctx.fillRect(px, py, TILE, 1.5); ctx.globalAlpha = 1; }
    } else if (t === T.Ink || t === T.Water) {
      const zone = room.def.zone;
      const top = tileAt(room, x, y - 1) !== t;
      const color = zone === 'fonderie' ? ['#ff7a2a', '#7a1e08'] : zone === 'bourdon' ? ['#e8e4dc', '#000000'] : zone === 'jardin' ? ['#a8fff4', '#0a3a3a'] : ['#6fb8a0', '#020806'];
      ctx.fillStyle = color[1];
      ctx.fillRect(px, py, TILE, TILE);
      if (top) {
        ctx.fillStyle = color[0];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(px, py + 2, TILE, 1.5);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(px, py + 4, TILE, 3);
        ctx.globalAlpha = 1;
      }
    } else if (t === T.Gate) {
      ctx.fillStyle = '#16181c';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#5a5f6a';
      ctx.fillRect(px + 3, py, 3, TILE);
      ctx.fillRect(px + 13, py, 3, TILE);
      if (y % 3 === 0) ctx.fillRect(px, py + 8, TILE, 3);
    }
  }
}
