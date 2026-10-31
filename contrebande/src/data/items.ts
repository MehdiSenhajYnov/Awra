// Goods and concealment tools. Footprints are given lying flat (w >= h); players rotate them.
// Text (names, flavour) lives in the locale files under the same id.

export type Category = 'epicerie' | 'musique' | 'technique' | 'luxe' | 'mode' | 'lettres' | 'jouets';
export type Kind = 'legal' | 'contra' | 'tool';

export interface ItemDef {
  id: string;
  kind: Kind;
  w: number;
  h: number;
  /** Visible to the X-ray scanner. */
  dense: boolean;
  /** 0-3: what the dog can pick up. */
  smell: number;
  buy: number;
  sell: number;
  cat?: Category;
  /** Caught = a "dossier" on your record. */
  major?: boolean;
  /** Lead: hides from the scanner every cell within this distance. */
  shield?: number;
  /** Masks smell of neighbouring items (not itself). */
  mask?: { power: number; radius: number };
  /** First border where the item shows up at Olga's. */
  from?: number;
}

const L = (id: string, w: number, h: number, buy: number, sell: number, o: Partial<ItemDef> = {}): ItemDef =>
  ({ id, kind: 'legal', w, h, dense: false, smell: 0, buy, sell, ...o });
const C = (id: string, cat: Category, w: number, h: number, buy: number, sell: number, o: Partial<ItemDef> = {}): ItemDef =>
  ({ id, kind: 'contra', cat, w, h, dense: false, smell: 0, buy, sell, ...o });
const T = (id: string, w: number, h: number, buy: number, o: Partial<ItemDef>): ItemDef =>
  ({ id, kind: 'tool', w, h, dense: false, smell: 0, buy, sell: 0, ...o });

export const ITEMS: ItemDef[] = [
  // Legal goods: cover and decoys, sold at a small margin.
  L('chaussettes', 1, 1, 1, 2, { smell: 1 }),
  L('pull', 2, 2, 2, 3),
  L('saucisson', 2, 1, 2, 3, { smell: 2 }),
  L('comte', 3, 2, 3, 5, { smell: 3 }),
  L('chou', 1, 1, 1, 2, { smell: 1 }),
  L('conserves', 1, 1, 1, 2, { dense: true }),
  L('casserole', 2, 2, 2, 3, { dense: true }),
  L('thermos', 2, 1, 2, 3, { dense: true }),
  L('bottes', 2, 2, 2, 3, { smell: 1 }),
  L('parapluie', 3, 1, 2, 3),
  L('poupee', 1, 1, 1, 2),
  L('pain', 2, 1, 1, 2, { smell: 1 }),
  L('outils', 3, 1, 2, 3, { dense: true }),
  L('linge', 1, 1, 1, 1),
  L('oignons', 2, 1, 1, 2, { smell: 2 }),
  L('cartes', 1, 1, 1, 2),
  // Contraband.
  C('bananes', 'epicerie', 2, 1, 3, 8, { smell: 1 }),
  C('chocolat', 'epicerie', 2, 1, 4, 10, { smell: 1 }),
  C('chewing', 'epicerie', 1, 1, 2, 5, { smell: 1 }),
  C('caviar', 'epicerie', 1, 1, 12, 30, { dense: true, smell: 1, major: true, from: 2 }),
  C('whisky', 'epicerie', 2, 1, 6, 15, { dense: true, smell: 1 }),
  C('disque_jazz', 'musique', 2, 2, 6, 16),
  C('disque_rock', 'musique', 2, 2, 6, 15),
  C('cassettes', 'musique', 1, 1, 3, 8, { dense: true }),
  C('guitare', 'musique', 4, 2, 18, 46, { dense: true, major: true, from: 3 }),
  C('transistor', 'technique', 2, 1, 11, 28, { dense: true, major: true, from: 2 }),
  C('calculatrice', 'technique', 1, 1, 5, 13, { dense: true }),
  C('pellicule', 'technique', 1, 1, 3, 8, { dense: true }),
  C('montre', 'luxe', 1, 1, 13, 32, { dense: true, major: true, from: 2 }),
  C('bijoux', 'luxe', 1, 1, 15, 38, { dense: true, major: true, from: 3 }),
  C('eau_paris', 'luxe', 1, 1, 5, 14, { smell: 3 }),
  C('cigares', 'luxe', 2, 1, 6, 15, { smell: 2 }),
  C('bas_nylon', 'mode', 1, 1, 2, 6),
  C('jean', 'mode', 2, 2, 5, 13),
  C('lunettes', 'mode', 2, 1, 4, 10),
  C('roman', 'lettres', 2, 1, 4, 11),
  C('magazines', 'lettres', 2, 2, 4, 10),
  C('manuscrit', 'lettres', 2, 1, 14, 34, { major: true, from: 3 }),
  C('rubik', 'jouets', 1, 1, 3, 9),
  C('jouet', 'jouets', 2, 2, 6, 14, { dense: true }),
  // Concealment tools: kept from one crossing to the next.
  T('plomb', 2, 1, 5, { dense: true, shield: 1 }),
  T('plaque_plomb', 2, 2, 9, { dense: true, shield: 1, from: 2 }),
  T('cologne', 1, 1, 4, { mask: { power: 2, radius: 1 } }),
  T('cafe', 2, 1, 8, { smell: 1, mask: { power: 3, radius: 2 }, from: 2 }),
  T('naphtaline', 1, 1, 3, { mask: { power: 1, radius: 2 } }),
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const CATEGORIES: Category[] = ['epicerie', 'musique', 'technique', 'luxe', 'mode', 'lettres', 'jouets'];

export interface BagDef {
  id: string;
  cols: number;
  rows: number;
  /** Last row is a false bottom: manual searches never open it. */
  falseBottom?: boolean;
  /** These columns are accordion bellows: the scanner cannot see through them. */
  bellows?: [number, number];
  /** Extra cells opened by every manual search (big trunks attract attention). */
  extraSearch?: number;
}

export const BAGS: BagDef[] = [
  { id: 'carton', cols: 6, rows: 4 },
  { id: 'poussette', cols: 5, rows: 4, falseBottom: true },
  { id: 'accordeon', cols: 8, rows: 3, bellows: [3, 4] },
  { id: 'malle', cols: 7, rows: 5, extraSearch: 2 },
];

export const BAG_BY_ID: Record<string, BagDef> = Object.fromEntries(BAGS.map((b) => [b.id, b]));
