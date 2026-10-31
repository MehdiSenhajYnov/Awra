// Letter bags and values, after the usual Scrabble distributions of each language.
export type Lang = 'fr' | 'en';

export const VALUES: Record<Lang, Record<string, number>> = {
  fr: {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 10, L: 1, M: 2,
    N: 1, O: 1, P: 3, Q: 8, R: 1, S: 1, T: 1, U: 1, V: 4, W: 10, X: 10, Y: 10, Z: 10,
  },
  en: {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3,
    N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
  },
};

export const COUNTS: Record<Lang, Record<string, number>> = {
  fr: {
    A: 9, B: 2, C: 2, D: 3, E: 15, F: 2, G: 2, H: 2, I: 8, J: 1, K: 1, L: 5, M: 3,
    N: 6, O: 6, P: 2, Q: 1, R: 6, S: 6, T: 6, U: 6, V: 2, W: 1, X: 1, Y: 1, Z: 1,
  },
  en: {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2,
    N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
  },
};

export const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
export const RARE = new Set(['J', 'K', 'Q', 'W', 'X', 'Y', 'Z']);
/** The blank tile from the "joker" ink: any letter, worth nothing. */
export const BLANK = '?';

export function fullBag(lang: Lang): string[] {
  return Object.entries(COUNTS[lang]).flatMap(([l, n]) => Array.from({ length: n }, () => l));
}
