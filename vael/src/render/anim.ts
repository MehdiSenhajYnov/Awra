import { Sprite } from 'pixi.js';
import { type Frame, sheet } from './assets';

/** One clip: frames picked from a sheet, a speed and looping. */
export interface Clip {
  sheet: string;
  frames: number[];
  /** Frames of the game (60 per second) per drawing. */
  hold: number;
  loop: boolean;
}

/** A sprite showing frames from sheets, anchored at the feet / head column of each drawing. */
export class AnimSprite extends Sprite {
  private current: Frame | null = null;

  show(clip: Clip, t: number, facing: number, scale = 1): boolean {
    const s = sheet(clip.sheet);
    if (!s) return false;
    let i = Math.floor(t / clip.hold);
    i = clip.loop ? i % clip.frames.length : Math.min(i, clip.frames.length - 1);
    const f = s.frames[clip.frames[i]] ?? s.frames[0];
    if (!f) return false;
    if (f !== this.current) {
      this.current = f;
      this.texture = f.tex;
      this.anchor.set(f.ax / f.tex.frame.width, f.ay / f.tex.frame.height);
    }
    this.scale.set(facing * scale, scale);
    return true;
  }

  /** Length of a non-looping clip in game frames. */
  static duration(clip: Clip): number {
    return clip.frames.length * clip.hold;
  }
}

export const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
