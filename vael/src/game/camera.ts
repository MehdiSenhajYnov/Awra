import { VIEW_H, VIEW_W, clamp, damp, fx, noise1 } from '../engine/core';

/**
 * A calm camera: dead zone around the hero, a slow look-ahead in the facing direction, a look-down while falling,
 * spring smoothing, and short directional shakes driven by "trauma" (squared, so small hits barely move it).
 */
export class Camera {
  x = 0;
  y = 0;
  /** Final position after shake, used for rendering. */
  rx = 0;
  ry = 0;
  angle = 0;
  zoom = 1;
  private zoomTarget = 1;
  private lookX = 0;
  private lookY = 0;
  private trauma = 0;
  private kickX = 0;
  private kickY = 0;
  private t = 0;
  /** Player setting, 0..1. */
  shakeScale = 1;
  boundsW = VIEW_W;
  boundsH = VIEW_H;
  /** Optional fixed focus (boss intros, cutscenes). */
  focus: { x: number; y: number } | null = null;

  snap(tx: number, ty: number): void {
    this.lookX = 0;
    this.lookY = 0;
    const [cx, cy] = this.clampPos(tx - this.viewW() / 2, ty - this.viewH() / 2 - 60);
    this.x = cx;
    this.y = cy;
    this.rx = cx;
    this.ry = cy;
  }

  viewW(): number {
    return VIEW_W / this.zoom;
  }

  viewH(): number {
    return VIEW_H / this.zoom;
  }

  private clampPos(x: number, y: number): [number, number] {
    const vw = this.viewW();
    const vh = this.viewH();
    const cx = this.boundsW <= vw ? (this.boundsW - vw) / 2 : clamp(x, 0, this.boundsW - vw);
    const cy = this.boundsH <= vh ? (this.boundsH - vh) / 2 : clamp(y, 0, this.boundsH - vh);
    return [cx, cy];
  }

  setZoom(z: number): void {
    this.zoomTarget = z;
  }

  /** px, py: hero centre. */
  update(px: number, py: number, facing: number, vy: number, onGround: boolean): void {
    this.t++;
    this.zoom += (this.zoomTarget - this.zoom) * damp(4);
    // Look-ahead eases slowly so turning around does not whip the view.
    this.lookX += (facing * 150 - this.lookX) * damp(1.6);
    const wantDown = !onGround && vy > 14 ? 220 : 0;
    this.lookY += (wantDown - this.lookY) * damp(wantDown ? 2.5 : 3.5);
    let tx = px + this.lookX - this.viewW() / 2;
    let ty = py + this.lookY - this.viewH() / 2 - 70;
    if (this.focus) {
      tx = this.focus.x - this.viewW() / 2;
      ty = this.focus.y - this.viewH() / 2;
    }
    const [cx, cy] = this.clampPos(tx, ty);
    // Dead zone: small offsets are ignored horizontally; vertical follows a bit faster when falling.
    const dx = cx - this.x;
    const dy = cy - this.y;
    const deadX = 40;
    const deadY = onGround ? 30 : 90;
    const ex = Math.abs(dx) > deadX ? dx - Math.sign(dx) * deadX : 0;
    const ey = Math.abs(dy) > deadY ? dy - Math.sign(dy) * deadY : 0;
    this.x += ex * damp(this.focus ? 3 : 7);
    this.y += ey * damp(vy > 18 ? 10 : 6);
    if (onGround) this.y += (cy - this.y) * damp(2.2);
    [this.x, this.y] = this.clampPos(this.x, this.y);
    // Shake.
    this.trauma = Math.max(0, this.trauma - 1 / 30);
    const s = this.trauma * this.trauma * this.shakeScale;
    const ox = noise1(this.t * 0.9, 1) * 26 * s + this.kickX;
    const oy = noise1(this.t * 0.9, 2) * 20 * s + this.kickY;
    this.angle = noise1(this.t * 0.6, 3) * 0.012 * s;
    this.kickX *= 0.72;
    this.kickY *= 0.72;
    this.rx = this.x + ox;
    this.ry = this.y + oy;
  }

  /** Adds trauma (0..1). */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A single directional jolt (hits), in pixels. */
  kick(dx: number, dy: number): void {
    this.kickX += dx * this.shakeScale;
    this.kickY += dy * this.shakeScale;
  }

  jitter(): number {
    return fx.range(-1, 1);
  }
}
