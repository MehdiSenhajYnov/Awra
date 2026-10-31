import { en } from './en';
import { fr, type Locale } from './fr';

export type Lang = 'fr' | 'en';
export const LOCALES: Record<Lang, Locale> = { fr, en };

let current: Locale = fr;
let currentLang: Lang = 'fr';

export function setLang(lang: Lang): void {
  current = LOCALES[lang];
  currentLang = lang;
  document.documentElement.lang = lang;
}

export function lang(): Lang {
  return currentLang;
}

export function L(): Locale {
  return current;
}

export function detectLang(): Lang {
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

/** Replaces {key} placeholders. */
export function fmt(text: string, params: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
