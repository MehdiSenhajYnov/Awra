import type { Lang } from './i18n';
import type { GameState } from './game/state';

// Browser storage can be missing or throw (private windows, blocked storage): every access is guarded.
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the game keeps running without persistence */
  }
}

export interface Settings {
  lang: Lang | null;
  master: number;
  music: number;
  effects: number;
  fast: boolean;
  /** Minutes between storms; 0 turns them off. */
  storms: number;
  onTop: boolean;
  radio: boolean;
  /** Desktop build: the shape the window had when the game was closed. */
  mode: 'full' | 'strip';
}

const SETTINGS = 'phare.settings';
const SAVE = 'phare.game';

export const DEFAULT_SETTINGS: Settings = { lang: null, master: 0.8, music: 0.5, effects: 0.8, fast: false, storms: 45, onTop: true, radio: true, mode: 'full' };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>(SETTINGS) ?? {}) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS, s);
}

export function loadGame(): GameState | null {
  const g = read<GameState>(SAVE);
  return g && g.version === 1 && typeof g.registry === 'object' ? g : null;
}

export function saveGame(g: GameState): void {
  write(SAVE, g);
}

export function clearGame(): void {
  try {
    localStorage.removeItem(SAVE);
  } catch {
    /* ignore */
  }
}
