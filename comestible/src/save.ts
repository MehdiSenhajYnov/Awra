import type { Lang } from './i18n';
import type { EndingId, GameState } from './game/state';

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

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export interface Settings {
  lang: Lang | null;
  master: number;
  ambience: number;
  effects: number;
  shake: boolean;
  largeText: boolean;
}

export interface Profile {
  endings: EndingId[];
  campaignDone: boolean;
  bestEndless: number;
}

const SETTINGS = 'comestible.settings';
const PROFILE = 'comestible.profile';
const SAVE = 'comestible.save';

export const DEFAULT_SETTINGS: Settings = { lang: null, master: 0.8, ambience: 0.7, effects: 0.9, shake: true, largeText: false };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>(SETTINGS) ?? {}) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS, s);
}

export function loadProfile(): Profile {
  return { endings: [], campaignDone: false, bestEndless: 0, ...(read<Partial<Profile>>(PROFILE) ?? {}) };
}

export function saveProfile(p: Profile): void {
  write(PROFILE, p);
}

export function recordEnding(id: EndingId): Profile {
  const p = loadProfile();
  if (!p.endings.includes(id)) p.endings.push(id);
  if (['officine', 'mycologue', 'lison', 'brume'].includes(id)) p.campaignDone = true;
  saveProfile(p);
  return p;
}

/** The campaign is saved at the start of each night. */
export function loadGame(): GameState | null {
  const s = read<GameState>(SAVE);
  return s && s.version === 1 ? s : null;
}

export function saveGame(s: GameState): void {
  if (s.mode === 'campaign') write(SAVE, s);
}

export function clearGame(): void {
  remove(SAVE);
}
