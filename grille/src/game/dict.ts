import type { Lang } from '../data/letters';
import { type Dictionary, buildDictionary } from './solver';

const cache = new Map<Lang, Promise<Dictionary>>();

/** Loads a word list shipped next to the page (one uppercase word per line). */
export function loadDictionary(lang: Lang): Promise<Dictionary> {
  let p = cache.get(lang);
  if (!p) {
    p = fetch(`dict/${lang}.txt`).then((r) => {
      if (!r.ok) throw new Error(`dictionary ${lang}: ${r.status}`);
      return r.text();
    }).then((text) => buildDictionary(text.split('\n')));
    cache.set(lang, p);
  }
  return p;
}
