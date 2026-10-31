import type { Tool, VisualAnomaly } from './species';

/** A hand-placed specimen in a scripted basket. */
export interface SpecimenTemplate {
  sp?: string;
  anomaly?: VisualAnomaly;
  /** The specimen looks like `sp` but is a mimic; this tool reveals it. */
  mimic?: Tool;
  size?: number;
  noBase?: boolean;
  wormy?: boolean;
  lisonGift?: boolean;
}

export interface ScriptedClient {
  char: string;
  /** Dialogue key in the locale (`clients.<key>`). Defaults to the character's generic lines. */
  lines?: string;
  basket?: SpecimenTemplate[];
  /** Random specimens added after the scripted ones. */
  extra?: number;
  /** Hands show mycelium for this visit (infected). */
  infected?: boolean;
  /** Visit without a basket (announcement only). */
  noBasket?: boolean;
}

export interface NightScript {
  /** Scripted clients, in order. `null` entries are random villagers. */
  clients: (ScriptedClient | null)[];
  /** Specimens per random client. */
  basket: [number, number];
  /** Probabilities for random specimens. */
  noBase: number;
  wormy: number;
  anomaly: number;
  mimic: number;
  /** Extra weight given to pied-bleu (night 8 rule). */
  favour?: string[];
  /** Chance that a random villager is infected (night 9+). */
  infected: number;
}

export const NIGHT_COUNT = 10;

export const NIGHTS: Record<number, NightScript> = {
  1: {
    clients: [
      { char: 'gaudin', lines: 'gaudin1', basket: [{ sp: 'cepe', size: 12 }, { sp: 'girolle' }] },
      { char: 'cure', lines: 'cure1', basket: [{ sp: 'rose_pres' }, { sp: 'blanche_mort' }] },
      null,
      null,
    ],
    basket: [1, 2], noBase: 0, wormy: 0, anomaly: 0, mimic: 0, infected: 0,
  },
  2: {
    clients: [
      { char: 'lison', lines: 'lison2', basket: [{ sp: 'girolle' }, { sp: 'fausse_girolle' }] },
      { char: 'bucheron', lines: 'bucheron2', basket: [{ sp: 'coulemelle', size: 22 }, { sp: 'lepiote_veuve', size: 6 }] },
      null,
      { char: 'tissot', lines: 'tissot2', basket: [{ sp: 'vesse' }, { sp: 'amanite_oeuf' }, { sp: 'rose_pres', noBase: true }] },
      null,
    ],
    basket: [1, 3], noBase: 0.18, wormy: 0, anomaly: 0, mimic: 0, infected: 0,
  },
  3: {
    clients: [
      { char: 'docteur', lines: 'docteur3', extra: 2 },
      { char: 'institutrice', lines: 'institutrice3', basket: [{ sp: 'lactaire_delicieux' }, { sp: 'lactaire_chaux' }, { sp: 'pied_bleu' }] },
      null,
      { char: 'tissot', lines: 'tissot3', basket: [{ anomaly: 'an_doigt' }, { sp: 'cepe' }] },
      null,
      null,
    ],
    basket: [1, 3], noBase: 0.15, wormy: 0, anomaly: 0.04, mimic: 0, infected: 0,
  },
  4: {
    clients: [
      { char: 'garde', lines: 'garde4', basket: [{ sp: 'cepe', size: 18 }, { sp: 'lactaire_delicieux' }] },
      null,
      { char: 'lison', lines: 'lison4', basket: [{ anomaly: 'an_cheveux', lisonGift: true }, { sp: 'girolle' }] },
      null,
      { char: 'gaudin', lines: 'gaudin4', basket: [{ sp: 'pleurote' }, { sp: 'lanterne' }, { sp: 'cepe', size: 16 }] },
      null,
    ],
    basket: [1, 3], noBase: 0.15, wormy: 0, anomaly: 0.05, mimic: 0, infected: 0,
  },
  5: {
    clients: [
      { char: 'gaudin', lines: 'gaudin5', basket: [{ sp: 'cepe', size: 11, mimic: 'couteau' }, { sp: 'cepe', size: 9 }] },
      null,
      { char: 'cure', lines: 'cure5', basket: [{ sp: 'russule_emetique' }, { sp: 'russule_charbon' }, { sp: 'girolle', wormy: true }] },
      null,
      null,
      null,
      null,
    ],
    basket: [1, 3], noBase: 0.12, wormy: 0.12, anomaly: 0.05, mimic: 0.07, infected: 0,
  },
  6: {
    clients: [
      { char: 'lison', lines: 'lison6', basket: [{ anomaly: 'an_coeur', lisonGift: true }, { sp: 'morille' }] },
      null,
      { char: 'bucheron', lines: 'bucheron6', basket: [{ sp: 'gyromitre' }, { sp: 'morille' }, { sp: 'pied_bleu', mimic: 'mousse' }] },
      null,
      null,
      null,
      null,
    ],
    basket: [2, 3], noBase: 0.12, wormy: 0.12, anomaly: 0.06, mimic: 0.09, infected: 0,
  },
  7: {
    clients: [
      { char: 'valet', lines: 'valet7', basket: [{ sp: 'lactaire_delicieux' }, { sp: 'cepe', size: 17 }, { sp: 'lactaire_chaux' }] },
      null,
      { char: 'cueilleur', lines: 'cueilleur7', basket: [{ sp: 'girolle', mimic: 'sporee' }, { anomaly: 'an_langue' }, { sp: 'morille', mimic: 'nez' }] },
      null,
      { char: 'docteur', lines: 'docteur7', extra: 2 },
      null,
      null,
    ],
    basket: [2, 3], noBase: 0.12, wormy: 0.12, anomaly: 0.06, mimic: 0.1, infected: 0,
  },
  8: {
    clients: [
      { char: 'garde', lines: 'garde8', basket: [{ sp: 'lactaire_delicieux' }, { sp: 'pied_bleu' }] },
      null,
      null,
      { char: 'cueilleuse', lines: 'cueilleuse8', basket: [{ anomaly: 'an_dents' }, { sp: 'coulemelle', size: 20, mimic: 'bougie' }] },
      null,
      null,
      null,
      null,
    ],
    basket: [2, 3], noBase: 0.12, wormy: 0.12, anomaly: 0.06, mimic: 0.11, infected: 0, favour: ['pied_bleu'],
  },
  9: {
    clients: [
      null,
      { char: 'lison', lines: 'lison9', infected: true, basket: [{ anomaly: 'an_oeil', lisonGift: true }, { sp: 'girolle' }] },
      null,
      null,
      { char: 'cure', lines: 'cure9', extra: 3 },
      null,
      null,
      null,
    ],
    basket: [2, 4], noBase: 0.12, wormy: 0.12, anomaly: 0.07, mimic: 0.13, infected: 0.2,
  },
  10: {
    clients: [
      { char: 'cueilleur', lines: 'cueilleur10', basket: [{ sp: 'cepe', mimic: 'loupe' }, { sp: 'rose_pres', mimic: 'regle' }] },
      null,
      null,
      { char: 'docteur', lines: 'docteur10', infected: true, extra: 2 },
      null,
      null,
      { char: 'cueilleuse', lines: 'cueilleuse10', basket: [{ anomaly: 'an_cheveux' }, { sp: 'girolle', mimic: 'cuillere' }, { sp: 'morille' }] },
      null,
      { char: 'garde', lines: 'garde10', basket: [{ sp: 'cepe', size: 19 }, { sp: 'blanche_mort', noBase: true }, { sp: 'lepiote_veuve' }] },
    ],
    basket: [2, 4], noBase: 0.12, wormy: 0.12, anomaly: 0.08, mimic: 0.15, infected: 0.25,
  },
};

/** Endless mode: everything unlocked, rising difficulty. */
export function endlessScript(night: number): NightScript {
  const clients = Math.min(5 + Math.floor(night / 2), 11);
  return {
    clients: Array.from({ length: clients }, () => null),
    basket: [2, Math.min(3 + Math.floor(night / 4), 5)],
    noBase: 0.12,
    wormy: 0.12,
    anomaly: Math.min(0.05 + night * 0.006, 0.12),
    mimic: Math.min(0.08 + night * 0.01, 0.2),
    infected: Math.min(0.08 + night * 0.02, 0.3),
  };
}
