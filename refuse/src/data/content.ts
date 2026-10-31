// Realms, claimants, claim types, clauses, staff, upgrades and board perks.
// Names and flavour text live in the locale files under the same ids.

export type Tag = 'feu' | 'metamorphose' | 'vol' | 'eau' | 'sable' | 'monstre' | 'fantome' | 'nuit' | 'sang' | 'royal';
export type RealmId = 'dragon' | 'desert' | 'mer' | 'enfer';

export interface ClaimType {
  id: string;
  claimant: string;
  tags: Tag[];
  /** Base amount in écus, before floor and realm multipliers. */
  amount: number;
  /** 1-5: how much a refusal shocks the village. */
  severity: number;
  /** Signed in blood: form-defect clauses do not apply. */
  blood?: boolean;
}

export interface Realm {
  id: RealmId;
  mult: number;
  claims: ClaimType[];
  boss: ClaimType;
  /** Window art prefix (enfer reuses the sea, aflame). */
  window: 'dragon' | 'desert' | 'mer';
}

export const REALMS: Realm[] = [
  {
    id: 'dragon', mult: 1, window: 'dragon',
    claims: [
      { id: 'grange', claimant: 'cl_paysan', tags: ['feu'], amount: 40, severity: 2 },
      { id: 'crapaud', claimant: 'cl_crapaud', tags: ['metamorphose'], amount: 120, severity: 3 },
      { id: 'vie', claimant: 'cl_fantome', tags: ['fantome'], amount: 200, severity: 4 },
      { id: 'mouton', claimant: 'cl_berger', tags: ['vol', 'monstre'], amount: 12, severity: 1 },
      { id: 'forge', claimant: 'cl_forgeron', tags: ['feu'], amount: 80, severity: 2 },
      { id: 'tour', claimant: 'cl_princesse', tags: ['monstre'], amount: 300, severity: 4 },
      { id: 'moulin', claimant: 'cl_meuniere', tags: ['feu'], amount: 60, severity: 2 },
    ],
    boss: { id: 'langue', claimant: 'cl_dragon', tags: ['feu', 'monstre'], amount: 2000, severity: 5 },
  },
  {
    id: 'desert', mult: 40, window: 'desert',
    claims: [
      { id: 'caravane', claimant: 'cl_marchand', tags: ['sable'], amount: 90, severity: 2 },
      { id: 'chameau', claimant: 'cl_chamelier', tags: ['monstre', 'vol'], amount: 70, severity: 2 },
      { id: 'jarres', claimant: 'cl_potiere', tags: ['sable'], amount: 30, severity: 1 },
      { id: 'piqure', claimant: 'cl_scorpion', tags: ['monstre'], amount: 150, severity: 3, blood: true },
      { id: 'oasis', claimant: 'cl_oasis', tags: ['eau', 'sable'], amount: 220, severity: 4 },
      { id: 'mirage', claimant: 'cl_fantome', tags: ['fantome', 'sable'], amount: 180, severity: 3 },
    ],
    boss: { id: 'indigestion', claimant: 'cl_ver', tags: ['monstre', 'sable'], amount: 5000, severity: 5 },
  },
  {
    id: 'mer', mult: 1600, window: 'mer',
    claims: [
      { id: 'filet', claimant: 'cl_pecheur', tags: ['eau', 'monstre'], amount: 25, severity: 1 },
      { id: 'naufrage', claimant: 'cl_capitaine', tags: ['eau'], amount: 500, severity: 4 },
      { id: 'peigne', claimant: 'cl_sirene', tags: ['eau', 'vol'], amount: 40, severity: 1 },
      { id: 'coffre', claimant: 'cl_pirate', tags: ['vol'], amount: 300, severity: 2, blood: true },
      { id: 'noyade', claimant: 'cl_noye', tags: ['fantome', 'eau'], amount: 260, severity: 3 },
    ],
    boss: { id: 'tentacule', claimant: 'cl_kraken', tags: ['monstre', 'eau'], amount: 12000, severity: 5 },
  },
  {
    id: 'enfer', mult: 64000, window: 'mer',
    claims: [
      { id: 'pluie_feu', claimant: 'cl_cavalier', tags: ['feu', 'monstre'], amount: 800, severity: 4 },
      { id: 'contrat', claimant: 'cl_demon', tags: ['sang'], amount: 600, severity: 3, blood: true },
      { id: 'ames', claimant: 'cl_fantome', tags: ['fantome', 'feu'], amount: 400, severity: 3 },
      { id: 'grange_enfer', claimant: 'cl_paysan', tags: ['feu'], amount: 120, severity: 2 },
    ],
    boss: { id: 'apocalypse', claimant: 'cl_cavalier', tags: ['feu', 'monstre', 'sang'], amount: 50000, severity: 5 },
  },
];

export const REALM_BY_ID: Record<RealmId, Realm> = Object.fromEntries(REALMS.map((r) => [r.id, r])) as Record<RealmId, Realm>;

/** The King's claim: refusing it costs half your écus. */
export const ROYAL: ClaimType = { id: 'royal', claimant: 'cl_roi', tags: ['royal'], amount: 1000, severity: 5 };

export interface ClauseDef {
  id: string;
  /** Tags it can refuse; empty = any claim. */
  tags: Tag[];
  /** Share of the claim kept as profit. */
  yield: number;
  /** Multiplier on the scandal a refusal causes. */
  scandal: number;
  /** Forbidden during a guild audit. */
  fraud?: boolean;
  /** Only works at night. */
  night?: boolean;
  /** Cannot be used on claims signed in blood. */
  notBlood?: boolean;
  /** First realm where the guild sells it. */
  realm: number;
  price: number;
  /** Legendary clauses are only bought with holding shares. */
  legendary?: boolean;
}

export const CLAUSES: ClauseDef[] = [
  { id: 'franchise', tags: [], yield: 0.5, scandal: 1.6, realm: 1, price: 0 },
  { id: 'dragon', tags: ['feu'], yield: 1, scandal: 1, realm: 1, price: 0 },
  { id: 'crapaud', tags: ['metamorphose'], yield: 1.3, scandal: 0.9, realm: 1, price: 30 },
  { id: 'vice_forme', tags: [], yield: 0.9, scandal: 1.2, fraud: true, notBlood: true, realm: 1, price: 0 },
  { id: 'minuit', tags: [], yield: 1.4, scandal: 0.8, night: true, realm: 1, price: 60 },
  { id: 'defunt', tags: ['fantome'], yield: 1.5, scandal: 1, realm: 1, price: 80 },
  { id: 'force_majeure', tags: ['monstre'], yield: 1, scandal: 1, realm: 1, price: 50 },
  { id: 'gardiennage', tags: ['vol'], yield: 1.2, scandal: 1, realm: 1, price: 40 },
  { id: 'ensablement', tags: ['sable'], yield: 1.2, scandal: 0.9, realm: 2, price: 3000 },
  { id: 'mirage', tags: ['eau', 'sable'], yield: 1.4, scandal: 1.1, fraud: true, realm: 2, price: 5000 },
  { id: 'kraken', tags: ['eau'], yield: 1.2, scandal: 1, realm: 3, price: 120000 },
  { id: 'naufrage', tags: ['eau', 'vol'], yield: 1.6, scandal: 1.3, fraud: true, realm: 3, price: 200000 },
  { id: 'sang', tags: ['sang'], yield: 1.3, scandal: 1, realm: 4, price: 6000000 },
  { id: 'eternite', tags: ['fantome', 'feu'], yield: 1.6, scandal: 1, realm: 4, price: 9000000 },
  // Legendary clauses, bought from the holding's board with shares.
  { id: 'petits_caracteres', tags: [], yield: 1.5, scandal: 0.6, realm: 1, price: 3, legendary: true },
  { id: 'acte_divin', tags: ['feu', 'eau', 'sable', 'monstre'], yield: 2, scandal: 0.8, realm: 1, price: 5, legendary: true },
  { id: 'jamais', tags: [], yield: 2.5, scandal: 1.5, realm: 1, price: 8, legendary: true },
];

export const CLAUSE_BY_ID: Record<string, ClauseDef> = Object.fromEntries(CLAUSES.map((c) => [c.id, c]));
export const STARTING_DECK = ['franchise', 'franchise', 'dragon', 'dragon', 'vice_forme', 'vice_forme'];

export interface StaffDef {
  id: string;
  /** Claims handled per minute, each. */
  rate: number;
  /** Scandal added per second, each (automation is careless). Negative calms the village. */
  scandal: number;
  cost: number;
  growth: number;
  /** Floor (0 bureau, 1 étage, 2 tour) needed to hire. */
  floor: number;
  icon: string;
}

export const STAFF: StaffDef[] = [
  { id: 'clerc', rate: 6, scandal: 0.06, cost: 25, growth: 1.15, floor: 0, icon: 'ic_clerc' },
  { id: 'archiviste', rate: 0, scandal: -0.35, cost: 120, growth: 1.25, floor: 0, icon: 'ic_archives' },
  { id: 'hibou', rate: 20, scandal: 0.15, cost: 500, growth: 1.16, floor: 1, icon: 'ic_hibou' },
  { id: 'machine', rate: 70, scandal: 0.4, cost: 8000, growth: 1.17, floor: 1, icon: 'ic_machine' },
  { id: 'oracle', rate: 260, scandal: 0.5, cost: 150000, growth: 1.18, floor: 2, icon: 'ic_oracle' },
];

export interface UpgradeDef {
  id: string;
  cost: number;
  floor: number;
  icon: string;
}

/** One-off purchases; effects are applied in the engine by id. */
export const UPGRADES: UpgradeDef[] = [
  { id: 'tampon_fer', cost: 60, floor: 0, icon: 'ic_tampon' },
  { id: 'encre_rouge', cost: 150, floor: 0, icon: 'ic_encrier' },
  { id: 'main_large', cost: 250, floor: 0, icon: 'ic_encrier' },
  { id: 'tubes', cost: 900, floor: 1, icon: 'ic_tube' },
  { id: 'communication', cost: 1500, floor: 1, icon: 'ic_hibou' },
  { id: 'coffre', cost: 3000, floor: 1, icon: 'ic_coffre' },
  { id: 'main_large2', cost: 8000, floor: 1, icon: 'ic_encrier' },
  { id: 'sablier', cost: 20000, floor: 2, icon: 'ic_sablier' },
  { id: 'tampon_or', cost: 50000, floor: 2, icon: 'ic_tampon' },
  { id: 'propagande', cost: 120000, floor: 2, icon: 'ic_oracle' },
];

export interface PerkDef {
  id: string;
  cost: number;
  max: number;
}

/** Permanent perks bought with holding shares, kept across bankruptcies. */
export const PERKS: PerkDef[] = [
  { id: 'dividendes', cost: 1, max: 10 },
  { id: 'stagiaires', cost: 2, max: 5 },
  { id: 'calme', cost: 2, max: 5 },
  { id: 'memoire', cost: 3, max: 3 },
  { id: 'clause_petits_caracteres', cost: 3, max: 1 },
  { id: 'clause_acte_divin', cost: 5, max: 1 },
  { id: 'clause_jamais', cost: 8, max: 1 },
];

/** Lifetime écus (in this realm, before realm multiplier) needed to request the next floor's trial. */
export const FLOOR_GOALS = [500, 6000, 60000];
export const FLOORS = 3;
export const SCANDAL_MAX = 100;
