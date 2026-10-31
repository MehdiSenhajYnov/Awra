import { EN } from './en';
import { FR } from './fr';

export type Dict = typeof FR;
let current: Dict = FR;
export let lang: 'fr' | 'en' = 'fr';

export function setLang(l: 'fr' | 'en'): void {
  lang = l;
  current = l === 'fr' ? FR : (EN as Dict);
}

/** Dotted key lookup ("menu.newGame"), with {name} substitutions. Missing keys show the key. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let v: unknown = current;
  for (const k of key.split('.')) v = (v as Record<string, unknown> | undefined)?.[k];
  let s = typeof v === 'string' ? v : key;
  if (vars) for (const [k, x] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(x));
  return s;
}

export function tl(key: string): string[] {
  let v: unknown = current;
  for (const k of key.split('.')) v = (v as Record<string, unknown> | undefined)?.[k];
  return Array.isArray(v) ? (v as string[]) : [t(key)];
}

export function has(key: string): boolean {
  let v: unknown = current;
  for (const k of key.split('.')) v = (v as Record<string, unknown> | undefined)?.[k];
  return v !== undefined;
}
