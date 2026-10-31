import { Assets, Rectangle, Texture } from 'pixi.js';

export interface Frame {
  tex: Texture;
  /** Anchor in pixels inside the frame (feet / head column). */
  ax: number;
  ay: number;
}

export interface Sheet {
  frames: Frame[];
}

interface SheetJson {
  frames: { x: number; y: number; w: number; h: number; ax: number; ay: number }[];
}

const textures: Record<string, Texture> = {};
const sheets: Record<string, Sheet> = {};

const base = () => (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');

export function tex(name: string): Texture {
  return textures[name] ?? Texture.WHITE;
}

export function hasTex(name: string): boolean {
  return !!textures[name];
}

export function sheet(name: string): Sheet | null {
  return sheets[name] ?? null;
}

/** Loads images from public/img (webp) and sprite atlases from public/sprites (png + json). Missing files are skipped. */
export async function loadAssets(images: string[], atlases: string[], progress?: (p: number) => void): Promise<void> {
  const total = images.length + atlases.length;
  let done = 0;
  const step = () => progress?.(++done / total);
  await Promise.all([
    ...images.map(async (n) => {
      try {
        const t = await Assets.load<Texture>({ alias: n, src: `${base()}img/${n}.webp` });
        t.source.scaleMode = 'linear';
        t.source.autoGenerateMipmaps = true;
        textures[n] = t;
      } catch {
        /* missing asset: the game falls back gracefully */
      }
      step();
    }),
    ...atlases.map(async (n) => {
      try {
        const [t, json] = await Promise.all([
          Assets.load<Texture>({ alias: `sheet:${n}`, src: `${base()}sprites/${n}.png` }),
          fetch(`${base()}sprites/${n}.json`).then((r) => r.json() as Promise<SheetJson>),
        ]);
        sheets[n] = {
          frames: json.frames.map((f) => ({
            tex: new Texture({ source: t.source, frame: new Rectangle(f.x, f.y, f.w, f.h) }),
            ax: f.ax,
            ay: f.ay,
          })),
        };
      } catch {
        /* missing */
      }
      step();
    }),
  ]);
}
