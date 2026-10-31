/** Everything that persists between sessions. */
export interface Save {
  version: 1;
  slot: number;
  /** Room and shrine of the last rest. */
  shrine: string;
  shrineRoom: string;
  abilities: string[];
  arts: string[];
  maxHp: number;
  /** Life shards collected toward the next heart (4 per heart). */
  shards: number;
  /** Lumen capacity: 99 + 33 per vessel. */
  vessels: number;
  vesselFrags: number;
  ore: number;
  /** Blade forge level (damage). */
  forge: number;
  dust: number;
  /** Equipped and owned seals. */
  seals: string[];
  sealsOn: string[];
  notches: number;
  flags: Record<string, boolean | number>;
  /** Rooms seen, for the map. */
  seen: string[];
  /** Fallen star holding the dust lost at death. */
  lost: { room: string; x: number; y: number; dust: number } | null;
  playTime: number;
  deaths: number;
  hard: boolean;
}

export function newSave(slot: number): Save {
  return {
    version: 1, slot, shrine: 'start', shrineRoom: 'c_reveil', abilities: [], arts: [], maxHp: 5, shards: 0, vessels: 0, vesselFrags: 0, ore: 0,
    forge: 0, dust: 0, seals: [], sealsOn: [], notches: 3, flags: {}, seen: [], lost: null, playTime: 0, deaths: 0, hard: false,
  };
}

const KEY = (slot: number) => `vael.slot${slot}`;

export function loadSave(slot: number): Save | null {
  try {
    const raw = localStorage.getItem(KEY(slot));
    if (!raw) return null;
    const s = JSON.parse(raw) as Save;
    return s.version === 1 ? { ...newSave(slot), ...s } : null;
  } catch {
    return null;
  }
}

export function writeSave(s: Save): void {
  try {
    localStorage.setItem(KEY(s.slot), JSON.stringify(s));
  } catch {
    /* storage unavailable: play on without saving */
  }
}

export function deleteSave(slot: number): void {
  try {
    localStorage.removeItem(KEY(slot));
  } catch {
    /* ignore */
  }
}

export interface Settings {
  music: number;
  sfx: number;
  shake: number;
  lang: 'fr' | 'en';
  fullscreen: boolean;
  bindings?: Record<string, string[]>;
  flashes: boolean;
}

export function loadSettings(): Settings {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  const d: Settings = { music: 0.7, sfx: 0.8, shake: 1, lang, fullscreen: true, flashes: true };
  try {
    const raw = localStorage.getItem('vael.settings');
    return raw ? { ...d, ...JSON.parse(raw) } : d;
  } catch {
    return d;
  }
}

export function writeSettings(s: Settings): void {
  try {
    localStorage.setItem('vael.settings', JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
