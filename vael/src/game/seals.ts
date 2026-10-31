/** Seals: passive charms worn in notches. */
export const SEALS: Record<string, { cost: number; price: number }> = {
  braise: { cost: 2, price: 300 },
  longfil: { cost: 1, price: 150 },
  retour: { cost: 2, price: 280 },
  marque: { cost: 1, price: 200 },
  paume: { cost: 1, price: 120 },
  eclipse: { cost: 2, price: 350 },
  sang: { cost: 2, price: 320 },
  avare: { cost: 1, price: 180 },
  epines: { cost: 1, price: 220 },
  fragile: { cost: 3, price: 600 },
  coureur: { cost: 1, price: 160 },
  moisson: { cost: 2, price: 300 },
  rebond: { cost: 1, price: 140 },
  lueur: { cost: 1, price: 200 },
  jumelle: { cost: 3, price: 700 },
  guet: { cost: 1, price: 100 },
};

export const SEAL_ORDER = Object.keys(SEALS);

export function notchesUsed(on: string[]): number {
  return on.reduce((n, s) => n + (SEALS[s]?.cost ?? 0), 0);
}
