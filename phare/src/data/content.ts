// Ships, wrecks, upgrades, decorations and missions. Names and texts live in the locale files.

export type Weather = 'clair' | 'nuageux' | 'pluie' | 'brouillard' | 'vent';
export type Season = 'printemps' | 'ete' | 'automne' | 'hiver';
export const SEASONS: Season[] = ['printemps', 'ete', 'automne', 'hiver'];
export const WEATHERS: Weather[] = ['clair', 'nuageux', 'pluie', 'brouillard', 'vent'];

/** 1 common, 2 uncommon, 3 rare, 4 legendary. */
export type Rarity = 1 | 2 | 3 | 4;

export interface ShipDef {
  id: string;
  rarity: Rarity;
  /** "Droits de feu" paid when passing a lit lighthouse. */
  fee: number;
  /** Width on the strip in the near lane, in CSS pixels. */
  size: number;
  /** Seconds to cross the strip (lower is faster). */
  crossing: number;
  /** Spawn conditions; all given ones must hold. */
  night?: boolean;
  day?: boolean;
  weather?: Weather[];
  season?: Season[];
  /** 0 Monday … 6 Sunday. */
  weekday?: number;
  /** Minimum lens order bought (0 = 6th order, 5 = 1st order). */
  lens?: number;
  /** Only shows up right after a storm. */
  afterStorm?: boolean;
  /** Animals and aircraft do not pay and never drop wrecks. */
  free?: boolean;
  /** Floats above the water line (seaplane landing, whale spout…). */
  lane?: 'far' | 'mid' | 'near';
}

export const SHIPS: ShipDef[] = [
  { id: 'thonier', rarity: 1, fee: 6, size: 120, crossing: 70 },
  { id: 'sardinier', rarity: 1, fee: 5, size: 110, crossing: 60, day: true },
  { id: 'chalutier', rarity: 1, fee: 8, size: 140, crossing: 75 },
  { id: 'langoustier', rarity: 1, fee: 7, size: 110, crossing: 80, weather: ['clair', 'nuageux', 'vent'] },
  { id: 'cargo', rarity: 1, fee: 14, size: 230, crossing: 90, lane: 'far' },
  { id: 'caboteur', rarity: 2, fee: 12, size: 170, crossing: 80 },
  { id: 'ferry', rarity: 1, fee: 20, size: 220, crossing: 70, weekday: 1, day: true },
  { id: 'remorqueur', rarity: 2, fee: 10, size: 110, crossing: 65 },
  { id: 'pilote', rarity: 2, fee: 9, size: 100, crossing: 40, afterStorm: true },
  { id: 'voilier', rarity: 2, fee: 6, size: 100, crossing: 85, weather: ['clair', 'nuageux', 'vent'], season: ['printemps', 'ete'] },
  { id: 'goelette', rarity: 2, fee: 15, size: 170, crossing: 90, weather: ['clair', 'vent'] },
  { id: 'dundee', rarity: 2, fee: 11, size: 150, crossing: 85, season: ['ete', 'automne'] },
  { id: 'canot', rarity: 2, fee: 0, size: 90, crossing: 50, afterStorm: true, free: true },
  { id: 'petrolier', rarity: 2, fee: 30, size: 280, crossing: 110, lane: 'far' },
  { id: 'conteneurs', rarity: 2, fee: 40, size: 290, crossing: 100, lens: 1, lane: 'far' },
  { id: 'paquebot', rarity: 3, fee: 80, size: 300, crossing: 100, weekday: 6 },
  { id: 'brise_glace', rarity: 3, fee: 45, size: 190, crossing: 95, season: ['hiver'] },
  { id: 'hydro', rarity: 3, fee: 35, size: 180, crossing: 90, lens: 2 },
  { id: 'trois_mats', rarity: 3, fee: 60, size: 260, crossing: 110, lens: 3, weather: ['clair', 'vent'] },
  { id: 'aviso', rarity: 3, fee: 40, size: 200, crossing: 60, lens: 2 },
  { id: 'peniche', rarity: 3, fee: 25, size: 170, crossing: 120, weather: ['brouillard'] },
  { id: 'yacht', rarity: 2, fee: 50, size: 190, crossing: 55, season: ['ete'], day: true },
  { id: 'sous_marin', rarity: 3, fee: 0, size: 180, crossing: 80, night: true, lens: 1, free: true },
  { id: 'hydravion', rarity: 3, fee: 0, size: 120, crossing: 35, day: true, weather: ['clair'], free: true },
  { id: 'baleine', rarity: 3, fee: 0, size: 200, crossing: 120, season: ['printemps', 'automne'], free: true, lane: 'far' },
  { id: 'dauphins', rarity: 2, fee: 0, size: 120, crossing: 45, season: ['ete'], free: true },
  { id: 'fantome', rarity: 4, fee: 0, size: 230, crossing: 140, night: true, weather: ['brouillard'], lens: 5, free: true },
  { id: 'drakkar', rarity: 4, fee: 99, size: 170, crossing: 100, season: ['automne'], weather: ['brouillard', 'vent'], lens: 4 },
];

export const SHIP_BY_ID: Record<string, ShipDef> = Object.fromEntries(SHIPS.map((s) => [s.id, s]));

export interface WreckDef {
  id: string;
  rarity: Rarity;
  /** Sous earned when sold to the antique dealer (duplicates only). */
  value: number;
}

export const WRECKS: WreckDef[] = [
  { id: 'bouteille', rarity: 1, value: 10 },
  { id: 'bouee', rarity: 1, value: 8 },
  { id: 'rame', rarity: 1, value: 6 },
  { id: 'casier', rarity: 1, value: 8 },
  { id: 'flotteur', rarity: 1, value: 10 },
  { id: 'chapeau', rarity: 2, value: 15 },
  { id: 'lanterne', rarity: 2, value: 25 },
  { id: 'ancre', rarity: 2, value: 30 },
  { id: 'bananes', rarity: 2, value: 20 },
  { id: 'boussole', rarity: 2, value: 40 },
  { id: 'longue_vue', rarity: 3, value: 70 },
  { id: 'cloche', rarity: 3, value: 90 },
  { id: 'carte', rarity: 3, value: 80 },
  { id: 'medaillon', rarity: 3, value: 120 },
  { id: 'coffre', rarity: 4, value: 300 },
  { id: 'figure', rarity: 4, value: 400 },
];

export const WRECK_BY_ID: Record<string, WreckDef> = Object.fromEntries(WRECKS.map((w) => [w.id, w]));

/** Lens orders, from the 6th (start) to the 1st. Cost of reaching each next order. */
export const LENS_COSTS = [150, 700, 2500, 8000, 25000];

export interface UpgradeDef {
  id: string;
  /** Costs per level. */
  costs: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'reservoir', costs: [100, 600, 3500] },
  { id: 'horlogerie', costs: [80, 500, 3000] },
  { id: 'vitres', costs: [250, 2000] },
  { id: 'corne', costs: [300] },
  { id: 'radio', costs: [450] },
  { id: 'epuisette', costs: [1200] },
  { id: 'longue_vue', costs: [2000] },
  { id: 'canot', costs: [6000] },
];

/** Decorations around the keeper's house, drawn on the strip. */
export const DECORATIONS: { id: string; cost: number }[] = [
  { id: 'pots', cost: 150 },
  { id: 'banc', cost: 400 },
  { id: 'linge', cost: 800 },
  { id: 'casiers', cost: 1500 },
  { id: 'velo', cost: 2500 },
  { id: 'girouette', cost: 4000 },
  { id: 'drapeau', cost: 6000 },
  { id: 'potager', cost: 9000 },
  { id: 'cloche', cost: 13000 },
  { id: 'panier', cost: 18000 },
];

export type MissionKind = 'see' | 'fish' | 'oil' | 'save' | 'new';
export const MISSION_REWARD: Record<MissionKind, number> = { see: 40, fish: 50, oil: 25, save: 80, new: 120 };

/** Messages found in drifting bottles: lore from other keepers along the coast. */
export const BOTTLE_MESSAGES = 12;
