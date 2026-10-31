import { fx } from './core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  kind: 'dot' | 'spark' | 'ring' | 'shard';
  rot: number;
}

/** A small pool of cosmetic particles in room space. */
export class Particles {
  list: Particle[] = [];

  burst(x: number, y: number, n: number, color: string, opts: { speed?: number; life?: number; size?: number; gravity?: number; kind?: Particle['kind']; dir?: number; spread?: number } = {}): void {
    const speed = opts.speed ?? 3;
    for (let i = 0; i < n; i++) {
      const a = opts.dir !== undefined ? opts.dir + (fx.next() - 0.5) * (opts.spread ?? 1.2) : fx.next() * Math.PI * 2;
      const s = speed * (0.3 + fx.next() * 0.9);
      const life = (opts.life ?? 30) * (0.6 + fx.next() * 0.6);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: (opts.size ?? 2) * (0.6 + fx.next() * 0.8), color, gravity: opts.gravity ?? 0.12, kind: opts.kind ?? 'dot', rot: fx.next() * 6 });
    }
    if (this.list.length > 700) this.list.splice(0, this.list.length - 700);
  }

  ring(x: number, y: number, color: string, size = 30, life = 18): void {
    this.list.push({ x, y, vx: 0, vy: 0, life, max: life, size, color, gravity: 0, kind: 'ring', rot: 0 });
  }

  update(): void {
    for (const p of this.list) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.rot += 0.2;
      p.life--;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * k + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k) + 4, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.stroke();
      } else if (p.kind === 'shard') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
