import { SHIP_BY_ID } from '../data/content';
import { REEF_X, type GameState, type Lane, hourOf, inStorm, isNight, weather } from '../game/state';
import { Rng, hashSeed } from '../game/rng';

// The strip: sky, sea, rock, lighthouse and cottage are painted by code every frame;
// ships, wrecks and the cat are the watercolour cut-outs.

type RGB = [number, number, number];
export type Hit = { kind: 'ship' | 'wreck' | 'cat'; uid: number; x: number; y: number; w: number; h: number };

const images = new Map<string, HTMLImageElement>();
function image(name: string): HTMLImageElement {
  let im = images.get(name);
  if (!im) {
    im = new Image();
    im.src = `img/${name}.webp`;
    images.set(name, im);
  }
  return im;
}

const SKY: [number, RGB, RGB][] = [
  [0, [10, 18, 42], [28, 40, 72]],
  [4.5, [16, 26, 54], [44, 58, 92]],
  [6.2, [92, 104, 150], [236, 168, 124]],
  [8, [120, 168, 210], [214, 230, 240]],
  [17, [112, 162, 206], [222, 232, 238]],
  [19.4, [96, 108, 160], [244, 162, 96]],
  [21, [24, 34, 70], [70, 70, 110]],
  [24, [10, 18, 42], [28, 40, 72]],
];

const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const grey = (c: RGB, k: number): RGB => { const g = (c[0] + c[1] + c[2]) / 3; return mix(c, [g, g, g], k); };

function skyAt(hour: number): [RGB, RGB] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i];
    const [h1, t1, b1] = SKY[i + 1];
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return [mix(t0, t1, k), mix(b0, b1, k)];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}

export interface StripView {
  /** Pointer position in CSS pixels, or null. */
  pointer: { x: number; y: number } | null;
  /** Uid of the storm ship under the beam, for the aiming beam. */
  aimed: number | null;
  /** Flash intensity 0..1 (lightning). */
  flash: number;
  reduced: boolean;
}

export class Strip {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  hits: Hit[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'strip-canvas';
    this.ctx = this.canvas.getContext('2d')!;
    for (const id of Object.keys(SHIP_BY_ID)) image(`sh_${id}`);
    image('chr_bernique');
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get u(): number {
    return this.h / 210;
  }

  get horizon(): number {
    return this.h * 0.42;
  }

  /** Lighthouse lantern position, in CSS pixels. */
  get lantern(): { x: number; y: number } {
    return { x: 178 * this.u, y: 30 * this.u };
  }

  private reefPx(): number {
    return Math.max(REEF_X * this.w, 340 * this.u);
  }

  /** Maps the engine's normalised x so that REEF_X always lands on the painted reefs. */
  px(x: number): number {
    const reef = this.reefPx();
    return x < REEF_X ? (x / REEF_X) * reef : reef + ((x - REEF_X) / (1 - REEF_X)) * (this.w - reef);
  }

  laneY(lane: Lane): number {
    const hz = this.horizon;
    return lane === 'far' ? hz + 12 * this.u : lane === 'mid' ? hz + 48 * this.u : this.h - 18 * this.u;
  }

  laneScale(lane: Lane): number {
    return (lane === 'far' ? 0.46 : lane === 'mid' ? 0.74 : 1) * this.u;
  }

  render(s: GameState, now: number, view: StripView): void {
    const ctx = this.ctx;
    const { w, h } = this;
    if (!w || !h) return;
    this.hits = [];
    const t = s.time;
    const hour = hourOf(t);
    const night = isNight(t);
    const storm = inStorm(s);
    const wx = storm ? 'tempete' : weather(s);
    const dull = wx === 'clair' ? 0 : wx === 'nuageux' ? 0.35 : wx === 'vent' ? 0.3 : 0.55;
    let [top, bottom] = skyAt(hour);
    top = grey(top, storm ? 0.8 : dull);
    bottom = grey(bottom, storm ? 0.85 : dull);
    if (storm) { top = mix(top, [30, 34, 44], 0.6); bottom = mix(bottom, [60, 64, 76], 0.6); }
    const hz = this.horizon;

    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, css(top));
    sky.addColorStop(1, css(bottom));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hz + 1);
    const darkness = night ? 1 : hour < 7 ? Math.max(0, (7 - hour) / 1.5) : hour > 19.5 ? Math.min(1, (hour - 19.5) / 1.5) : 0;
    if (darkness > 0 && wx !== 'brouillard' && !storm) this.stars(s, darkness * (1 - dull));
    this.celestial(hour, dull);
    this.clouds(t, wx, darkness);

    // Sea.
    const seaTop = mix(bottom, [30, 60, 90], 0.55);
    const seaBottom = mix(top, [10, 30, 50], 0.65);
    const sea = ctx.createLinearGradient(0, hz, 0, h);
    sea.addColorStop(0, css(seaTop));
    sea.addColorStop(1, css(seaBottom));
    ctx.fillStyle = sea;
    ctx.fillRect(0, hz, w, h - hz);
    const rough = storm ? 2.6 : wx === 'vent' ? 1.7 : wx === 'pluie' ? 1.3 : 1;
    this.waves(t, hz, h, seaTop, rough, view.reduced);

    this.island(hz, top, night);
    // Ships and wrecks, back to front.
    const lanes: Lane[] = ['far', 'mid', 'near'];
    for (const lane of lanes) {
      for (const ship of s.ships) if (ship.lane === lane) this.ship(s, ship, now, night, rough);
      for (const wr of s.floating) if (wr.lane === lane) this.wreck(wr.uid, wr.id, this.px(wr.x), this.laneY(lane), this.laneScale(lane), now);
      if (lane === 'mid') this.reefs(now, rough);
    }

    this.shore(s, now, night);
    this.beam(s, now, view, night, wx === 'brouillard' || storm);
    if (wx === 'pluie' || storm) this.rain(now, storm ? 1 : 0.6, view.reduced);
    if (wx === 'brouillard') {
      const fog = ctx.createLinearGradient(0, hz - 40 * this.u, 0, h);
      fog.addColorStop(0, 'rgba(210,214,220,0)');
      fog.addColorStop(0.4, `rgba(210,214,220,${night ? 0.35 : 0.55})`);
      fog.addColorStop(1, `rgba(200,206,214,${night ? 0.25 : 0.4})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, w, h);
    }
    if (darkness > 0) {
      ctx.fillStyle = `rgba(6,10,30,${0.22 * darkness})`;
      ctx.fillRect(0, 0, w, h);
      this.lights(s, darkness);
    }
    if (view.flash > 0) {
      ctx.fillStyle = `rgba(230,236,255,${view.flash * 0.6})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private stars(s: GameState, a: number): void {
    const ctx = this.ctx;
    const r = new Rng(hashSeed(s.seed, 'stars'));
    for (let i = 0; i < 70; i++) {
      const x = r.next() * this.w;
      const y = r.next() * this.horizon * 0.9;
      ctx.fillStyle = `rgba(255,250,230,${a * (0.4 + r.next() * 0.6)})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }

  private celestial(hour: number, dull: number): void {
    const ctx = this.ctx;
    const hz = this.horizon;
    if (dull > 0.5) return;
    // The sun rises behind the sea on the right and sets on the left; the moon follows at night.
    const dayK = (hour - 6) / 15;
    if (dayK > 0 && dayK < 1) {
      const x = this.w * (0.95 - dayK * 0.8);
      const y = hz - Math.sin(dayK * Math.PI) * hz * 0.75;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 40 * this.u);
      g.addColorStop(0, `rgba(255,240,200,${0.95 - dull})`);
      g.addColorStop(0.25, `rgba(255,220,150,${0.6 - dull})`);
      g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 50 * this.u, y - 50 * this.u, 100 * this.u, 100 * this.u);
    } else {
      const nk = ((hour + 24 - 21) % 24) / 9;
      const x = this.w * (0.9 - nk * 0.7);
      const y = hz - Math.sin(Math.min(1, nk) * Math.PI) * hz * 0.6 - 10;
      ctx.fillStyle = `rgba(240,236,214,${0.9 - dull})`;
      ctx.beginPath();
      ctx.arc(x, y, 7 * this.u, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private clouds(t: number, wx: string, darkness: number): void {
    const ctx = this.ctx;
    const count = wx === 'clair' ? 3 : wx === 'brouillard' ? 2 : 7;
    const alpha = wx === 'clair' ? 0.35 : wx === 'tempete' ? 0.8 : 0.6;
    const speed = wx === 'vent' || wx === 'tempete' ? 6 : 2;
    const shade = wx === 'tempete' ? 70 : wx === 'pluie' ? 140 : 235 - darkness * 150;
    for (let i = 0; i < count; i++) {
      const span = this.w + 300;
      const x = ((i * 397 + t * speed * (1 + (i % 3) * 0.3)) % span) - 150;
      const y = (12 + ((i * 53) % 50)) * this.u;
      ctx.fillStyle = `rgba(${shade},${shade},${shade + 8},${alpha})`;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x + k * 26 * this.u, y + (k % 2) * 5 * this.u, (30 + (k % 2) * 12) * this.u, 11 * this.u, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private waves(t: number, top: number, bottom: number, base: RGB, rough: number, reduced: boolean): void {
    const ctx = this.ctx;
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const k = r / (rows - 1);
      const y = top + 4 + k * (bottom - top - 6);
      const amp = (1 + k * 3) * rough * this.u;
      ctx.strokeStyle = css(mix(base, [235, 240, 245], 0.25 + k * 0.15), 0.25 + k * 0.2);
      ctx.lineWidth = 1 + k;
      ctx.beginPath();
      for (let x = 0; x <= this.w; x += 12) {
        const yy = y + Math.sin(x * (0.02 - k * 0.012) + (reduced ? 0 : t * (0.8 + k)) + r) * amp;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    if (rough > 1.5) {
      // Whitecaps in a blow.
      const r = new Rng(Math.floor(t * 2));
      ctx.fillStyle = 'rgba(240,244,248,0.7)';
      for (let i = 0; i < 30 * rough; i++) ctx.fillRect(r.next() * this.w, top + 8 + r.next() * (bottom - top - 10), 6 * this.u, 1.5);
    }
  }

  /** A low island on the horizon with its own little light, for depth. */
  private island(hz: number, sky: RGB, night: boolean): void {
    const ctx = this.ctx;
    const u = this.u;
    const x = this.w * 0.78;
    ctx.fillStyle = css(mix(sky, [40, 50, 60], 0.55), 0.85);
    ctx.beginPath();
    ctx.moveTo(x - 90 * u, hz + 1);
    ctx.quadraticCurveTo(x - 50 * u, hz - 14 * u, x - 10 * u, hz - 10 * u);
    ctx.quadraticCurveTo(x + 30 * u, hz - 18 * u, x + 70 * u, hz + 1);
    ctx.fill();
    ctx.fillRect(x - 2 * u, hz - 22 * u, 3 * u, 10 * u);
    if (night && Math.floor(performance.now() / 1500) % 3 === 0) {
      ctx.fillStyle = 'rgba(255,240,180,0.95)';
      ctx.beginPath(); ctx.arc(x - 0.5 * u, hz - 23 * u, 2.2 * u, 0, Math.PI * 2); ctx.fill();
    }
  }

  private reefs(now: number, rough: number): void {
    const ctx = this.ctx;
    const x0 = this.reefPx();
    const y = this.laneY('near') - 6 * this.u;
    const rocks = [[-30, 10, 16], [0, 22, 24], [26, 8, 14], [-8, -26, 12], [18, -30, 10]];
    for (const [dx, dy, size] of rocks) {
      const x = x0 + dx * this.u;
      const yy = y - dy * this.u * 0.6;
      ctx.fillStyle = '#2b2a2c';
      ctx.beginPath();
      ctx.moveTo(x - size * this.u, yy);
      ctx.lineTo(x - size * 0.3 * this.u, yy - size * 0.8 * this.u);
      ctx.lineTo(x + size * 0.2 * this.u, yy - size * 0.5 * this.u);
      ctx.lineTo(x + size * this.u, yy);
      ctx.fill();
      const foam = 0.4 + 0.3 * Math.sin(now / 400 + dx);
      ctx.strokeStyle = `rgba(245,248,250,${foam * Math.min(1, rough / 1.5)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, yy, size * 1.2 * this.u, 3 * this.u, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // A red channel buoy that blinks at the edge of the reefs.
    const bx = x0 + 70 * this.u;
    const by = this.laneY('mid') + 10 * this.u + Math.sin(now / 700) * 2;
    ctx.fillStyle = '#b8322a';
    ctx.fillRect(bx - 3 * this.u, by - 12 * this.u, 6 * this.u, 12 * this.u);
    ctx.fillStyle = '#222';
    ctx.fillRect(bx - 4 * this.u, by - 2 * this.u, 8 * this.u, 3 * this.u);
    if (Math.floor(now / 1000) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,90,70,0.9)';
      ctx.beginPath(); ctx.arc(bx, by - 14 * this.u, 2 * this.u, 0, Math.PI * 2); ctx.fill();
    }
  }

  private ship(s: GameState, ship: GameState['ships'][number], now: number, night: boolean, rough: number): void {
    const ctx = this.ctx;
    const d = SHIP_BY_ID[ship.id];
    const im = image(`sh_${ship.id}`);
    if (!im.complete || !im.naturalWidth) return;
    const scale = this.laneScale(ship.lane);
    const sw = d.size * scale;
    const sh = sw * (im.naturalHeight / im.naturalWidth);
    const x = this.px(ship.x);
    const base = this.laneY(ship.lane);
    const bob = Math.sin(now / 600 + ship.uid) * 1.6 * rough * scale;
    let tilt = Math.sin(now / 900 + ship.uid * 2) * 0.02 * rough;
    let sink = 0;
    let alpha = ship.id === 'fantome' ? 0.55 + 0.2 * Math.sin(now / 700) : 1;
    if (ship.storm?.state === 'aground') {
      const k = Math.min(1, (s.time - ship.storm.at) / 12);
      tilt = -0.22 * Math.min(1, k * 4);
      sink = k * sh * 0.6;
      alpha *= 1 - Math.max(0, k - 0.6) * 2.5;
    }
    const faceLeft = ship.id !== 'yacht';
    const flip = (ship.dir === -1) !== faceLeft;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(x, base + bob + sink);
    ctx.rotate(tilt);
    if (flip) ctx.scale(-1, 1);
    if (night) ctx.filter = 'brightness(0.72) saturate(0.75)';
    ctx.drawImage(im, -sw / 2, -sh, sw, sh);
    ctx.filter = 'none';
    ctx.restore();
    this.hits.push({ kind: 'ship', uid: ship.uid, x: x - sw / 2, y: base - sh, w: sw, h: sh });
    if (night && !d.free) {
      // Navigation lights.
      ctx.fillStyle = 'rgba(255,230,140,0.95)';
      ctx.fillRect(x - sw * 0.1, base - sh * 0.55 + bob, 2.5, 2.5);
      ctx.fillStyle = ship.dir === -1 ? 'rgba(255,70,60,0.95)' : 'rgba(80,230,120,0.95)';
      ctx.fillRect(x - sw * 0.35 * ship.dir * -1, base - sh * 0.25 + bob, 2.5, 2.5);
    }
    if (ship.storm?.state === 'approach' && ship.storm.progress > 0) {
      ctx.strokeStyle = 'rgba(255,236,160,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, base - sh - 10 * this.u, 8 * this.u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ship.storm.progress));
      ctx.stroke();
    }
  }

  private wreck(uid: number, id: string, x: number, y: number, scale: number, now: number): void {
    const ctx = this.ctx;
    const im = image(`ep_${id}`);
    const size = 46 * scale;
    const bob = Math.sin(now / 500 + uid) * 2 * scale;
    const glow = 0.4 + 0.3 * Math.sin(now / 300 + uid);
    ctx.strokeStyle = `rgba(255,240,180,${glow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + bob, size * 0.7, size * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (im.complete && im.naturalWidth) ctx.drawImage(im, x - size / 2, y - size * 0.8 + bob, size, size);
    this.hits.push({ kind: 'wreck', uid, x: x - size, y: y - size, w: size * 2, h: size * 1.4 });
  }

  /** Rock, cottage, decorations, the tower and the cat. */
  private shore(s: GameState, now: number, night: boolean): void {
    const ctx = this.ctx;
    const u = this.u;
    const hz = this.horizon;
    const ground = hz + 34 * u;
    // Rock.
    ctx.fillStyle = night ? '#2a2620' : '#5a5246';
    ctx.beginPath();
    ctx.moveTo(0, ground - 8 * u);
    ctx.quadraticCurveTo(90 * u, ground - 22 * u, 200 * u, ground - 14 * u);
    ctx.quadraticCurveTo(270 * u, ground - 6 * u, 300 * u, this.h);
    ctx.lineTo(0, this.h);
    ctx.fill();
    ctx.fillStyle = night ? '#1e2a1c' : '#5f7a46';
    ctx.beginPath();
    ctx.moveTo(0, ground - 8 * u);
    ctx.quadraticCurveTo(90 * u, ground - 22 * u, 200 * u, ground - 14 * u);
    ctx.lineTo(200 * u, ground - 9 * u);
    ctx.quadraticCurveTo(90 * u, ground - 16 * u, 0, ground - 3 * u);
    ctx.fill();
    const top = ground - 18 * u;
    const has = (id: string) => s.decorations.includes(id);
    // Cottage.
    const hx = 52 * u;
    ctx.fillStyle = night ? '#9a968a' : '#efeadc';
    ctx.fillRect(hx, top - 26 * u, 60 * u, 26 * u);
    ctx.fillStyle = night ? '#3a3a44' : '#4a5260';
    ctx.beginPath();
    ctx.moveTo(hx - 5 * u, top - 26 * u);
    ctx.lineTo(hx + 30 * u, top - 44 * u);
    ctx.lineTo(hx + 65 * u, top - 26 * u);
    ctx.fill();
    ctx.fillStyle = '#c9c2b0';
    ctx.fillRect(hx + 44 * u, top - 50 * u, 7 * u, 14 * u);
    ctx.fillStyle = night ? 'rgba(255,210,120,0.95)' : '#5d7da0';
    ctx.fillRect(hx + 8 * u, top - 19 * u, 10 * u, 9 * u);
    ctx.fillRect(hx + 40 * u, top - 19 * u, 10 * u, 9 * u);
    ctx.fillStyle = '#3d6b8a';
    ctx.fillRect(hx + 24 * u, top - 16 * u, 9 * u, 16 * u);
    if (has('pots')) for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#a0522d';
      ctx.fillRect(hx + (2 + i * 6) * u, top - 4 * u, 4 * u, 4 * u);
      ctx.fillStyle = '#d23b3b';
      ctx.beginPath(); ctx.arc(hx + (4 + i * 6) * u, top - 6 * u, 2.4 * u, 0, Math.PI * 2); ctx.fill();
    }
    if (has('girouette')) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(hx + 30 * u, top - 44 * u); ctx.lineTo(hx + 30 * u, top - 54 * u); ctx.stroke();
      const a = Math.sin(now / 2000) * 0.6;
      ctx.beginPath(); ctx.moveTo(hx + 30 * u - Math.cos(a) * 6 * u, top - 54 * u); ctx.lineTo(hx + 30 * u + Math.cos(a) * 6 * u, top - 54 * u); ctx.stroke();
    }
    if (has('drapeau')) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(22 * u, top); ctx.lineTo(22 * u, top - 46 * u); ctx.stroke();
      const wave = Math.sin(now / 300) * 2 * u;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.moveTo(22 * u, top - 46 * u); ctx.lineTo(40 * u, top - 42 * u + wave); ctx.lineTo(22 * u, top - 37 * u); ctx.fill();
    }
    if (has('potager')) {
      ctx.fillStyle = '#4c3a28';
      ctx.fillRect(4 * u, top - 2 * u, 34 * u, 6 * u);
      ctx.fillStyle = '#6aa04a';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((8 + i * 5.5) * u, top - 2 * u, 2.2 * u, 0, Math.PI * 2); ctx.fill(); }
    }
    if (has('linge')) {
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(116 * u, top - 22 * u); ctx.lineTo(150 * u, top - 22 * u); ctx.stroke();
      ['#f2f2f2', '#3a6ea5', '#e0b84a', '#c0392b'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect((118 + i * 8) * u, top - 22 * u, 6 * u, (8 + Math.sin(now / 250 + i) * 1.5) * u);
      });
      ctx.fillStyle = '#6b5a44';
      ctx.fillRect(115 * u, top - 24 * u, 2 * u, 24 * u);
      ctx.fillRect(150 * u, top - 24 * u, 2 * u, 24 * u);
    }
    if (has('banc')) { ctx.fillStyle = '#8a8478'; ctx.fillRect(118 * u, top - 6 * u, 20 * u, 3 * u); ctx.fillRect(120 * u, top - 3 * u, 3 * u, 3 * u); ctx.fillRect(133 * u, top - 3 * u, 3 * u, 3 * u); }
    if (has('velo')) {
      ctx.strokeStyle = '#2b3a55';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(30 * u, top - 4 * u, 4 * u, 0, Math.PI * 2); ctx.arc(44 * u, top - 4 * u, 4 * u, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(30 * u, top - 4 * u); ctx.lineTo(37 * u, top - 10 * u); ctx.lineTo(44 * u, top - 4 * u); ctx.stroke();
    }
    // Tower: tapered, red and white bands, gallery and lantern room.
    const lx = this.lantern.x;
    const baseY = top + 2 * u;
    const towerTop = 40 * u;
    const bw = 15 * u;
    const tw = 10 * u;
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const y0 = baseY - ((baseY - towerTop) * i) / bands;
      const y1 = baseY - ((baseY - towerTop) * (i + 1)) / bands;
      const w0 = bw - ((bw - tw) * i) / bands;
      const w1 = bw - ((bw - tw) * (i + 1)) / bands;
      ctx.fillStyle = i % 2 ? (night ? '#7a2420' : '#b8322a') : (night ? '#a8a49c' : '#f4f1ea');
      ctx.beginPath();
      ctx.moveTo(lx - w0, y0); ctx.lineTo(lx + w0, y0); ctx.lineTo(lx + w1, y1); ctx.lineTo(lx - w1, y1);
      ctx.fill();
    }
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(lx - 13 * u, towerTop - 3 * u, 26 * u, 3 * u);
    const lit = s.oil > 0;
    ctx.fillStyle = lit ? (night ? '#fff2b0' : '#f8e7a0') : '#55606a';
    ctx.fillRect(lx - 7 * u, towerTop - 13 * u, 14 * u, 10 * u);
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.moveTo(lx - 9 * u, towerTop - 13 * u); ctx.lineTo(lx, towerTop - 21 * u); ctx.lineTo(lx + 9 * u, towerTop - 13 * u);
    ctx.fill();
    if (has('casiers')) for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#8a6a3a';
      ctx.beginPath(); ctx.arc((206 + i * 9) * u, top + 6 * u - (i === 2 ? 7 : 0) * u, 5 * u, Math.PI, 0); ctx.fill();
    }
    if (has('cloche')) {
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(238 * u, top - 14 * u, 2 * u, 20 * u);
      ctx.fillStyle = '#7a8a5a';
      ctx.beginPath(); ctx.arc(241 * u, top - 12 * u, 4 * u, Math.PI, 0); ctx.fill();
    }
    // Bernique.
    const cat = image('chr_bernique');
    if (cat.complete && cat.naturalWidth) {
      const ch = 24 * u;
      const cw = ch * (cat.naturalWidth / cat.naturalHeight);
      const cx = 132 * u;
      const cy = top + 4 * u;
      if (s.decorations.includes('panier')) {
        ctx.fillStyle = '#9a6a3a';
        ctx.beginPath(); ctx.ellipse(cx, cy - 1 * u, 13 * u, 4 * u, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      if (night) ctx.filter = 'brightness(0.6)';
      ctx.drawImage(cat, cx - cw / 2, cy - ch, cw, ch);
      ctx.restore();
      this.hits.push({ kind: 'cat', uid: 0, x: cx - cw / 2, y: cy - ch, w: cw, h: ch });
    }
  }

  private beam(s: GameState, now: number, view: StripView, night: boolean, misty: boolean): void {
    if (s.oil <= 0) return;
    const ctx = this.ctx;
    const { x, y } = this.lantern;
    const strength = (night ? 0.5 : misty ? 0.35 : 0.14) * (0.5 + 0.5 * (s.clean / 100));
    let dirX: number;
    let reach: number;
    let tx: number;
    let ty: number;
    const aimed = view.aimed !== null ? this.hits.find((hh) => hh.kind === 'ship' && hh.uid === view.aimed) : undefined;
    if (aimed) {
      tx = aimed.x + aimed.w / 2;
      ty = aimed.y + aimed.h / 2;
    } else {
      // A rotating lens seen from the side: the beam sweeps out to sea and back.
      const turning = s.spring > 0 && !view.reduced;
      const angle = turning ? now / 1600 : 0.4;
      dirX = Math.cos(angle);
      reach = Math.abs(dirX) * this.w * 1.1;
      tx = x + Math.sign(dirX || 1) * reach;
      ty = y + 14 * this.u + Math.sin(angle * 2) * 6;
    }
    const spread = 26 * this.u;
    const g = ctx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, `rgba(255,244,190,${strength + 0.15})`);
    g.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - 3 * this.u);
    ctx.lineTo(tx, ty - spread);
    ctx.lineTo(tx, ty + spread);
    ctx.lineTo(x, y + 3 * this.u);
    ctx.fill();
    const glow = ctx.createRadialGradient(x, y, 1, x, y, 26 * this.u);
    glow.addColorStop(0, `rgba(255,248,210,${0.5 + strength})`);
    glow.addColorStop(1, 'rgba(255,248,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 30 * this.u, y - 30 * this.u, 60 * this.u, 60 * this.u);
    ctx.restore();
  }

  private lights(s: GameState, darkness: number): void {
    const ctx = this.ctx;
    const u = this.u;
    const top = this.horizon + 16 * u;
    const g = ctx.createRadialGradient(80 * u, top - 14 * u, 2, 80 * u, top - 14 * u, 40 * u);
    g.addColorStop(0, `rgba(255,200,110,${0.35 * darkness})`);
    g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(30 * u, top - 60 * u, 100 * u, 80 * u);
    void s;
  }

  private rain(now: number, amount: number, reduced: boolean): void {
    const ctx = this.ctx;
    const r = new Rng(reduced ? 1 : Math.floor(now / 60));
    ctx.strokeStyle = 'rgba(200,214,230,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = Math.floor((this.w / 8) * amount);
    for (let i = 0; i < n; i++) {
      const x = r.next() * this.w;
      const y = r.next() * this.h;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4 * this.u, y + 12 * this.u);
    }
    ctx.stroke();
  }

  hitAt(x: number, y: number): Hit | null {
    // Wrecks and the cat sit on top of ships.
    const order = ['wreck', 'cat', 'ship'];
    for (const kind of order) {
      for (let i = this.hits.length - 1; i >= 0; i--) {
        const hh = this.hits[i];
        if (hh.kind === kind && x >= hh.x && x <= hh.x + hh.w && y >= hh.y && y <= hh.y + hh.h) return hh;
      }
    }
    return null;
  }
}
