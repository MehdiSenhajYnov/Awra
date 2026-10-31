// Pens (permanent jokers), inks (one-shot consumables), Sunday bosses and stationery decks.
// Names and descriptions live in the locale files.

export type PenId =
  | 'rouge' | 'plume_or' | 'bic' | 'criterium' | 'feutre' | 'encre_chine' | 'court' | 'machine'
  | 'cafe' | 'gomme' | 'coquille' | 'correcteur' | 'pigiste' | 'rotative' | 'linotype' | 'crayon_gras'
  | 'abonne' | 'tampon' | 'dernier' | 'alliteration' | 'pluriel' | 'colonne' | 'masque' | 'archive';

export interface PenDef {
  id: PenId;
  price: number;
  rarity: 1 | 2 | 3;
}

export const PENS: PenDef[] = [
  { id: 'rouge', price: 5, rarity: 1 },
  { id: 'plume_or', price: 7, rarity: 2 },
  { id: 'bic', price: 4, rarity: 1 },
  { id: 'criterium', price: 5, rarity: 1 },
  { id: 'feutre', price: 6, rarity: 2 },
  { id: 'encre_chine', price: 6, rarity: 2 },
  { id: 'court', price: 4, rarity: 1 },
  { id: 'machine', price: 6, rarity: 2 },
  { id: 'cafe', price: 7, rarity: 2 },
  { id: 'gomme', price: 4, rarity: 1 },
  { id: 'coquille', price: 6, rarity: 2 },
  { id: 'correcteur', price: 6, rarity: 2 },
  { id: 'pigiste', price: 5, rarity: 1 },
  { id: 'rotative', price: 6, rarity: 2 },
  { id: 'linotype', price: 6, rarity: 2 },
  { id: 'crayon_gras', price: 5, rarity: 1 },
  { id: 'abonne', price: 4, rarity: 1 },
  { id: 'tampon', price: 5, rarity: 1 },
  { id: 'dernier', price: 6, rarity: 2 },
  { id: 'alliteration', price: 5, rarity: 2 },
  { id: 'pluriel', price: 4, rarity: 1 },
  { id: 'colonne', price: 7, rarity: 3 },
  { id: 'masque', price: 8, rarity: 3 },
  { id: 'archive', price: 8, rarity: 3 },
];

export const PEN_BY_ID: Record<string, PenDef> = Object.fromEntries(PENS.map((p) => [p.id, p]));
export const MAX_PENS = 5;

export type InkId = 'pioche' | 'liquide' | 'revelation' | 'recharge' | 'echange' | 'double' | 'joker' | 'epreuve';
export const INKS: { id: InkId; price: number }[] = [
  { id: 'pioche', price: 3 },
  { id: 'liquide', price: 3 },
  { id: 'revelation', price: 2 },
  { id: 'recharge', price: 4 },
  { id: 'echange', price: 2 },
  { id: 'double', price: 4 },
  { id: 'joker', price: 4 },
  { id: 'epreuve', price: 3 },
];
export const MAX_INKS = 2;

export type BossId = 'censure' | 'greve' | 'dimanche' | 'courts' | 'coquilles' | 'gel' | 'masque' | 'bouclage';
/** Sunday bosses, one per edition, in order. */
export const BOSSES: BossId[] = ['censure', 'greve', 'dimanche', 'courts', 'coquilles', 'gel', 'masque', 'bouclage'];

export type DeckId = 'classique' | 'lenoir' | 'morel' | 'rival';
export interface DeckDef {
  id: DeckId;
  words: number;
  discards: number;
  hand: number;
  targetMult: number;
  francs: number;
  /** Edition to reach once to unlock it. */
  unlock: number;
}
export const DECKS: DeckDef[] = [
  { id: 'classique', words: 6, discards: 3, hand: 8, targetMult: 1, francs: 4, unlock: 0 },
  { id: 'lenoir', words: 6, discards: 5, hand: 7, targetMult: 1, francs: 4, unlock: 3 },
  { id: 'morel', words: 7, discards: 3, hand: 8, targetMult: 1.15, francs: 4, unlock: 5 },
  { id: 'rival', words: 6, discards: 3, hand: 8, targetMult: 1, francs: 0, unlock: 9 },
];
export const DECK_BY_ID: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.id, d]));

export const EDITIONS = 8;
export const GRIDS_PER_EDITION = 3;
