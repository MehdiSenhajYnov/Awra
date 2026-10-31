import { audio } from './audio';
import { detectLang, setLang } from './i18n';
import { type Settings, loadSettings, saveSettings } from './save';

let current: Settings = loadSettings();

export function settings(): Settings {
  return current;
}

export function applySettings(): void {
  setLang(current.lang ?? detectLang());
  audio.setVolumes({ master: current.master, music: current.music, effects: current.effects });
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  saveSettings(current);
  applySettings();
}
