// Permanent rule changers bought in Olga's back room (the run's "jokers").
export type StampId =
  | 'diplomatique' | 'cousin' | 'os' | 'faveur' | 'contacts' | 'plomberie' | 'toilette' | 'avocat'
  | 'soufflet' | 'dent' | 'reseau' | 'oeil' | 'indemnite' | 'barbe' | 'tapis' | 'solde'
  | 'collection' | 'jazz' | 'gourmet' | 'potdevin';

export interface StampDef {
  id: StampId;
  price: number;
  /** Two-letter mark printed on the seal. */
  mark: string;
  hue: number;
}

export const STAMPS: StampDef[] = [
  { id: 'diplomatique', price: 14, mark: 'CD', hue: 210 },
  { id: 'cousin', price: 8, mark: 'Co', hue: 30 },
  { id: 'os', price: 10, mark: 'Os', hue: 40 },
  { id: 'faveur', price: 9, mark: 'Pf', hue: 100 },
  { id: 'contacts', price: 16, mark: 'Mn', hue: 0 },
  { id: 'plomberie', price: 12, mark: 'Pb', hue: 220 },
  { id: 'toilette', price: 10, mark: 'Et', hue: 140 },
  { id: 'avocat', price: 14, mark: 'Av', hue: 270 },
  { id: 'soufflet', price: 15, mark: 'Vs', hue: 20 },
  { id: 'dent', price: 8, mark: 'Au', hue: 50 },
  { id: 'reseau', price: 9, mark: 'Rp', hue: 160 },
  { id: 'oeil', price: 13, mark: 'Oe', hue: 190 },
  { id: 'indemnite', price: 8, mark: 'In', hue: 80 },
  { id: 'barbe', price: 12, mark: 'Fb', hue: 330 },
  { id: 'tapis', price: 9, mark: 'Mt', hue: 10 },
  { id: 'solde', price: 11, mark: 'So', hue: 120 },
  { id: 'collection', price: 12, mark: 'Cl', hue: 300 },
  { id: 'jazz', price: 10, mark: 'Jz', hue: 240 },
  { id: 'gourmet', price: 10, mark: 'Gt', hue: 60 },
  { id: 'potdevin', price: 11, mark: 'Pv', hue: 350 },
];

export const STAMP_BY_ID: Record<string, StampDef> = Object.fromEntries(STAMPS.map((s) => [s.id, s]));
export const MAX_STAMPS = 5;
