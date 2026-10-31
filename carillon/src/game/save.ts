import type { Lang } from '../i18n';
import type { Bindings } from '../engine/input';
import type { Ability } from './player';

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

export interface Save {
  version: 1;
  slot: number;
  /** Room and lectern where the player rests. */
  lectern: string;
  abilities: Ability[];
  maxHp: number;
  /** Shards toward the next bell of health (4 make one). */
  shards: number;
  maxRes: number;
  /** Tin upgrades of the hammer, 0..4. */
  tin: number;
  bronze: number;
  notesOwned: string[];
  notesOn: string[];
  slots: number;
  /** World state: broken walls, opened gates, defeated bosses, picked items, talked NPCs… */
  flags: Record<string, boolean | number>;
  visited: string[];
  /** Lecterns reached, for fast travel. */
  lecterns: string[];
  glas: { room: string; x: number; y: number; bronze: number } | null;
  time: number;
  deaths: number;
  /** "Fêlé" mode: double damage taken, bronze lost for good on death. */
  hard: boolean;
  ended: boolean;
  lastPlayed: number;
}

export interface Settings {
  lang: Lang | null;
  master: number;
  music: number;
  effects: number;
  shake: boolean;
  /** Flash on hits and parries. */
  flashes: boolean;
  keys: Bindings | null;
  /** Shows the parry/echo timing help on screen. */
  assist: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lang: null, master: 0.8, music: 0.55, effects: 0.9, shake: true, flashes: true, keys: null, assist: false };

const SETTINGS = 'carillon.settings';
const SLOT = (n: number) => `carillon.slot${n}`;

export function newSave(slot: number, hard = false): Save {
  return {
    version: 1, slot, lectern: 'b_cloche', abilities: [], maxHp: 5, shards: 0, maxRes: 3, tin: 0, bronze: 0, notesOwned: [], notesOn: [], slots: 3,
    flags: {}, visited: [], lecterns: [], glas: null, time: 0, deaths: 0, hard, ended: false, lastPlayed: Date.now(),
  };
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>(SETTINGS) ?? {}) };
}

export function saveSettings(s: Settings): void {
  write(SETTINGS, s);
}

export function loadSlot(n: number): Save | null {
  const s = read<Save>(SLOT(n));
  return s && s.version === 1 && Array.isArray(s.abilities) ? s : null;
}

export function writeSlot(s: Save): void {
  s.lastPlayed = Date.now();
  write(SLOT(s.slot), s);
}

export function clearSlot(n: number): void {
  try {
    localStorage.removeItem(SLOT(n));
  } catch {
    /* ignore */
  }
}
