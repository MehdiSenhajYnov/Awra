import type { ZoneId } from './room';

export interface Palette {
  /** Foreground rock silhouette. */
  rock: string;
  /** Inner texture lines on the rock. */
  vein: string;
  /** Light catching the top edges. */
  rim: string;
  /** Colour of the fog between layers. */
  fog: string;
  /** Glows, lamps, important things. */
  accent: string;
  /** Darkening applied over the painted backdrop (0..1). */
  dim: number;
  /** Ambient particles drifting in the air. */
  motes: 'dust' | 'rain' | 'embers' | 'spores' | 'wisps' | 'glints' | 'drips' | 'cogs' | 'ink';
  /** Pitch class of the zone's drone, for the music. */
  key: number;
}

export const PALETTES: Record<ZoneId, Palette> = {
  beffroi: { rock: '#0d0f16', vein: '#1b2030', rim: '#8fa3c8', fog: '#2a3550', accent: '#e8c27a', dim: 0.45, motes: 'dust', key: 0 },
  gouttieres: { rock: '#0a0e14', vein: '#18222e', rim: '#7fb0c9', fog: '#1d3344', accent: '#9ad0e8', dim: 0.5, motes: 'rain', key: 3 },
  fonderie: { rock: '#120a08', vein: '#2a1510', rim: '#f08a3a', fog: '#4a2416', accent: '#ffb35a', dim: 0.4, motes: 'embers', key: 5 },
  orgues: { rock: '#0a100d', vein: '#17241d', rim: '#8fc4a2', fog: '#1f3a2c', accent: '#c9f0b4', dim: 0.48, motes: 'spores', key: 7 },
  crypte: { rock: '#0e0a13', vein: '#1e1628', rim: '#a68ad0', fog: '#2c2140', accent: '#d8b8ff', dim: 0.55, motes: 'wisps', key: 2 },
  jardin: { rock: '#071214', vein: '#0f2427', rim: '#7fe8e0', fog: '#14383a', accent: '#a8fff4', dim: 0.42, motes: 'glints', key: 9 },
  cisternes: { rock: '#071010', vein: '#10201e', rim: '#6fb8a0', fog: '#123028', accent: '#9fe0c0', dim: 0.52, motes: 'drips', key: 10 },
  horlogerie: { rock: '#110e07', vein: '#2a2210', rim: '#e8c060', fog: '#3a3018', accent: '#ffd98a', dim: 0.42, motes: 'cogs', key: 4 },
  bourdon: { rock: '#050506', vein: '#141416', rim: '#e8e4dc', fog: '#1c1c22', accent: '#ffffff', dim: 0.5, motes: 'ink', key: 0 },
};
