import type { Echo } from '../game/echo';
import { ATTACK_ACTIVE, type AttackDir, type Player, type Pose } from '../game/player';

interface Look {
  cloak: string;
  inner: string;
  eyes: string;
  bell: string;
  hammer: string;
  alpha: number;
  glow: number;
}

const SONNEUR: Look = { cloak: '#0b0b11', inner: '#1c1c28', eyes: '#ffd98a', bell: '#b8874a', hammer: '#c9955a', alpha: 1, glow: 0 };
const ECHO: Look = { cloak: '#7fd8f0', inner: '#c8f4ff', eyes: '#ffffff', bell: '#e0faff', hammer: '#d8f8ff', alpha: 0.5, glow: 1 };

/**
 * The Sonneur: a small hooded figure with glowing eyes, a bell at the chest and a bell-hammer.
 * (x, y) is the feet centre; everything is drawn procedurally from the pose so animation is free.
 */
export function drawSonneur(
  ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, pose: Pose, t: number,
  attack: { dir: AttackDir; t: number; combo: number } | null, look: Look, extra: { res?: number; maxRes?: number; vx?: number; vy?: number; heal?: number } = {},
): void {
  ctx.save();
  ctx.globalAlpha = look.alpha;
  if (look.glow) ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  const vx = extra.vx ?? 0;
  const vy = extra.vy ?? 0;
  let sx = 1;
  let sy = 1;
  if (pose === 'jump') { sx = 0.88; sy = 1.12; }
  if (pose === 'fall') { sx = 1.04; sy = 0.98; }
  if (pose === 'dash') { sx = 1.35; sy = 0.78; }
  if (pose === 'slam') { sx = 0.8; sy = 1.2; }
  ctx.scale(facing * sx, sy);
  const run = pose === 'run' ? t * 0.35 : 0;
  const bob = pose === 'run' ? Math.abs(Math.sin(run)) * -1.5 : pose === 'idle' ? Math.sin(t * 0.06) * 0.6 : 0;
  // Legs.
  ctx.strokeStyle = look.cloak;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const legA = pose === 'run' ? Math.sin(run) * 4 : pose === 'jump' ? -2 : pose === 'fall' ? 2 : 0;
  ctx.beginPath();
  ctx.moveTo(-2.5, -6 + bob);
  ctx.lineTo(-2.5 + legA, -0.5);
  ctx.moveTo(2.5, -6 + bob);
  ctx.lineTo(2.5 - legA, -0.5);
  ctx.stroke();
  // Cloak: rounded hood widening into a tattered hem that trails behind motion.
  const trail = Math.max(-4, Math.min(4, -vx * facing * 1.1)) + Math.sin(t * 0.1) * 0.6;
  const lift = Math.max(-3, Math.min(5, -vy * 0.6));
  ctx.fillStyle = look.cloak;
  ctx.beginPath();
  ctx.moveTo(-5, -20 + bob);
  ctx.quadraticCurveTo(-8 + trail * 0.3, -11 + bob, -9 + trail, -5 - lift * 0.4);
  ctx.lineTo(-6 + trail, -7 - lift * 0.3);
  ctx.lineTo(-3 + trail * 0.6, -4 - lift * 0.2);
  ctx.lineTo(0 + trail * 0.4, -6);
  ctx.lineTo(4 + trail * 0.3, -4);
  ctx.lineTo(8 + trail * 0.2, -6);
  ctx.quadraticCurveTo(7, -12 + bob, 5, -20 + bob);
  ctx.closePath();
  ctx.fill();
  // Hood.
  ctx.beginPath();
  ctx.ellipse(0, -21 + bob, 6.2, 6.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-5, -25 + bob);
  ctx.quadraticCurveTo(-7, -30 + bob, -2.5 - trail * 0.3, -31 + bob);
  ctx.quadraticCurveTo(-1, -27 + bob, 2, -26 + bob);
  ctx.fill();
  // Face opening and eyes.
  ctx.fillStyle = look.inner;
  ctx.beginPath();
  ctx.ellipse(2.4, -20.5 + bob, 3.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const blink = t % 220 < 6 && pose === 'idle';
  ctx.fillStyle = look.eyes;
  if (!blink) {
    ctx.fillRect(1.2, -21.5 + bob, 1.4, 2.2);
    ctx.fillRect(3.8, -21.5 + bob, 1.4, 2.2);
  }
  // Chest bell glowing with résonance.
  const res = extra.res ?? 0;
  const maxRes = extra.maxRes ?? 3;
  ctx.fillStyle = look.bell;
  ctx.beginPath();
  ctx.moveTo(-1.2, -14 + bob);
  ctx.quadraticCurveTo(-2.6, -10 + bob, -3, -9.5 + bob);
  ctx.lineTo(3, -9.5 + bob);
  ctx.quadraticCurveTo(2.6, -10 + bob, 1.2, -14 + bob);
  ctx.fill();
  if (res > 0 && !look.glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -11 + bob, 0, 0, -11 + bob, 7 + res * 1.5);
    g.addColorStop(0, `rgba(255,220,140,${0.25 + 0.5 * (res / maxRes)})`);
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-12, -24 + bob, 24, 26);
    ctx.restore();
  }
  // Hammer.
  drawHammer(ctx, pose, attack, bob, look, t);
  ctx.restore();
  if (attack) drawSlash(ctx, x, y, facing, attack, look);
  if (pose === 'heal' && extra.heal) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,226,160,${0.3 + 0.4 * Math.sin(t * 0.3) ** 2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - 13, 10 + extra.heal * 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHammer(ctx: CanvasRenderingContext2D, pose: Pose, attack: { dir: AttackDir; t: number; combo: number } | null, bob: number, look: Look, t: number): void {
  let angle = -2.3;
  let hx = -3;
  let hy = -13 + bob;
  if (attack) {
    const k = Math.min(1, attack.t / ATTACK_ACTIVE[1]);
    if (attack.dir === 'side') angle = attack.combo % 2 === 0 ? -2.4 + k * 3.2 : 1.2 - k * 3;
    else if (attack.dir === 'up') angle = -0.3 - k * 2.2;
    else if (attack.dir === 'down') angle = 0.6 + k * 2;
    else angle = Math.PI / 2;
    hx = 2;
  } else if (pose === 'parry') angle = -1.57;
  else if (pose === 'run') angle = -2.5 + Math.sin(t * 0.35) * 0.15;
  else if (pose === 'heal') angle = -1.2;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.strokeStyle = '#4a3422';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(13, 0);
  ctx.stroke();
  ctx.fillStyle = look.hammer;
  ctx.beginPath();
  ctx.roundRect(11, -3.6, 6, 7.2, 1.5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,200,0.5)';
  ctx.fillRect(12, -3, 1.2, 6);
  ctx.restore();
}

function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, a: { dir: AttackDir; t: number; combo: number }, look: Look): void {
  if (a.dir === 'slam') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = look.glow ? 'rgba(160,240,255,0.35)' : 'rgba(255,230,170,0.35)';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 34);
    ctx.lineTo(x + 6, y - 34);
    ctx.lineTo(x + 9, y + 4);
    ctx.lineTo(x - 9, y + 4);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (a.t < ATTACK_ACTIVE[0] - 1 || a.t > ATTACK_ACTIVE[1] + 2) return;
  const k = (a.t - ATTACK_ACTIVE[0] + 1) / (ATTACK_ACTIVE[1] - ATTACK_ACTIVE[0] + 3);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cy = y - 13;
  let start: number;
  let end: number;
  let cx = x;
  let ccy = cy;
  const r = 24;
  if (a.dir === 'side') {
    cx = x + facing * 4;
    const up = a.combo % 2 === 0;
    start = facing > 0 ? (up ? -1.4 : 1.4) : (up ? Math.PI + 1.4 : Math.PI - 1.4);
    end = facing > 0 ? (up ? 1.1 : -1.1) : (up ? Math.PI - 1.1 : Math.PI + 1.1);
  } else if (a.dir === 'up') {
    ccy = cy - 6;
    start = Math.PI + 0.3;
    end = -0.3;
  } else {
    ccy = cy + 10;
    start = 0.3;
    end = Math.PI - 0.3;
  }
  const sweep = start + (end - start) * Math.min(1, k * 1.4);
  const ccw = a.dir === 'side' ? (facing > 0 ? a.combo % 2 !== 0 : a.combo % 2 === 0) : a.dir === 'down' ? false : false;
  const color = look.glow ? '160,240,255' : '255,236,190';
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${color},${(0.75 - i * 0.22) * (1 - k * 0.6)})`;
    ctx.lineWidth = 5 - i * 1.5;
    ctx.beginPath();
    ctx.arc(cx, ccy, r - i * 4, start, sweep, ccw);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, t: number): void {
  if (p.invuln > 0 && p.hurtT === 0 && Math.floor(t / 3) % 2 === 0 && p.perfectT === 0) return;
  const b = p.body;
  // Dash afterimages.
  if (p.pose === 'dash') {
    for (let i = 1; i <= 3; i++) {
      const h = p.history[p.history.length - 1 - i * 2];
      if (!h) continue;
      drawSonneur(ctx, h.x + 6, h.y + 26, h.facing, 'dash', t, null, { ...SONNEUR, alpha: 0.25 / i, cloak: '#8fa3c8' });
    }
  }
  drawSonneur(ctx, b.x + b.w / 2, b.y + b.h, p.facing, p.pose, t, p.attack, SONNEUR, { res: p.res, maxRes: p.maxRes, vx: b.vx, vy: b.vy, heal: p.healT / p.stats.healFrames });
  if (p.perfectT > 60) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,240,190,${(p.perfectT - 60) / 40})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, b.y + 13, 18 + (90 - p.perfectT) * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawEcho(ctx: CanvasRenderingContext2D, e: Echo): void {
  const f = e.frame;
  const fadeIn = Math.min(1, e.i / 8);
  const fadeOut = Math.min(1, (e.frames.length - e.i) / 12);
  const look = { ...ECHO, alpha: ECHO.alpha * fadeIn * fadeOut, cloak: e.index ? '#d0a8ff' : ECHO.cloak };
  drawSonneur(ctx, f.x + 6, f.y + 26, f.facing, f.pose, e.i, f.attack ? { dir: f.attack, t: f.attackT, combo: f.combo } : null, look, { vx: f.vx, vy: f.vy });
}
