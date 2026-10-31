import type { Lang } from './i18n';
import type { Lang as GridLang } from './data/letters';
import type { RunState } from './game/run';

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
}

export interface Profile {
  bestEdition: number;
  wins: number;
  maxStake: number;
  bestScore: number;
  daily: Record<string, number>;
  howtoSeen: boolean;
  gridLang: GridLang | null;
}

const SETTINGS = 'grille.settings';
const PROFILE = 'grille.profile';
const SAVE = 'grille.run';

export const DEFAULT_SETTINGS: Settings = { lang: null, master: 0.8, music: 0.5, effects: 0.9, fast: false };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>(SETTINGS) ?? {}) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS, s);
}

export function loadProfile(): Profile {
  return { bestEdition: 0, wins: 0, maxStake: 0, bestScore: 0, daily: {}, howtoSeen: false, gridLang: null, ...(read<Partial<Profile>>(PROFILE) ?? {}) };
}

export function saveProfile(p: Profile): void {
  write(PROFILE, p);
}

export function loadRun(): RunState | null {
  const r = read<RunState>(SAVE);
  return r && r.version === 1 && r.phase !== 'won' && r.phase !== 'lost' ? r : null;
}

export function saveRun(r: RunState): void {
  write(SAVE, r);
}

export function clearRun(): void {
  try {
    localStorage.removeItem(SAVE);
  } catch {
    /* ignore */
  }
}
