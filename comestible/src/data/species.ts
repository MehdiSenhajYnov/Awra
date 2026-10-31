// Fictional species modelled on real look-alike pairs. Text lives in the locale files under the same id.

export type Underside =
  | 'lames_blanches' | 'lames_roses' | 'lames_lilas' | 'lames_orange' | 'plis'
  | 'pores_blancs' | 'pores_roses' | 'alveoles' | 'cerveau' | 'granuleux' | 'lisse' | 'cortine';

export type CutView = 'chair' | 'creux' | 'chambres' | 'vesse' | 'oeuf';

export interface Species {
  id: string;
  /** 0 = edible, 1 = makes people sick, 2 = deadly. */
  danger: 0 | 1 | 2;
  size: [number, number];
  underside: Underside;
  cut: CutView;
  /** Colour the flesh turns after cutting (null = unchanged). */
  cutTint: string | null;
  /** Milk drop colour for milkcaps. */
  milk?: string;
  spore: string;
  glows?: boolean;
  /** Night from which the species can appear and is listed in the guide. */
  night: number;
  /** Id of the look-alike species. */
  twin: string;
}

export const SPECIES: Species[] = [
  { id: 'cepe', danger: 0, size: [8, 20], underside: 'pores_blancs', cut: 'chair', cutTint: null, spore: '#6b5a2e', night: 1, twin: 'bolet_menteur' },
  { id: 'bolet_menteur', danger: 1, size: [8, 18], underside: 'pores_roses', cut: 'chair', cutTint: '#d9a3a8', spore: '#8a5d5a', night: 1, twin: 'cepe' },
  { id: 'girolle', danger: 0, size: [3, 8], underside: 'plis', cut: 'chair', cutTint: null, spore: '#e9dca8', night: 1, twin: 'fausse_girolle' },
  { id: 'fausse_girolle', danger: 1, size: [3, 8], underside: 'lames_orange', cut: 'chair', cutTint: null, spore: '#f4f1ea', night: 1, twin: 'girolle' },
  { id: 'rose_pres', danger: 0, size: [5, 10], underside: 'lames_roses', cut: 'chair', cutTint: null, spore: '#3b2a22', night: 1, twin: 'blanche_mort' },
  { id: 'blanche_mort', danger: 2, size: [6, 12], underside: 'lames_blanches', cut: 'chair', cutTint: null, spore: '#f4f1ea', night: 1, twin: 'rose_pres' },
  { id: 'coulemelle', danger: 0, size: [15, 30], underside: 'lames_blanches', cut: 'chair', cutTint: null, spore: '#f4f1ea', night: 2, twin: 'lepiote_veuve' },
  { id: 'lepiote_veuve', danger: 2, size: [4, 9], underside: 'lames_blanches', cut: 'chair', cutTint: null, spore: '#f4f1ea', night: 2, twin: 'coulemelle' },
  { id: 'vesse', danger: 0, size: [3, 7], underside: 'granuleux', cut: 'vesse', cutTint: null, spore: '#7d7350', night: 2, twin: 'amanite_oeuf' },
  { id: 'amanite_oeuf', danger: 2, size: [3, 6], underside: 'lisse', cut: 'oeuf', cutTint: null, spore: '#f4f1ea', night: 2, twin: 'vesse' },
  { id: 'lactaire_delicieux', danger: 0, size: [5, 12], underside: 'lames_orange', cut: 'chair', cutTint: '#c9d3a2', milk: '#e2731f', spore: '#efe3c8', night: 3, twin: 'lactaire_chaux' },
  { id: 'lactaire_chaux', danger: 1, size: [5, 11], underside: 'lames_blanches', cut: 'chair', cutTint: null, milk: '#fbfbf6', spore: '#efe3c8', night: 3, twin: 'lactaire_delicieux' },
  { id: 'pied_bleu', danger: 0, size: [6, 14], underside: 'lames_lilas', cut: 'chair', cutTint: null, spore: '#e8c9c4', night: 3, twin: 'cortinaire_sang' },
  { id: 'cortinaire_sang', danger: 2, size: [5, 12], underside: 'cortine', cut: 'chair', cutTint: null, spore: '#8c4a20', night: 3, twin: 'pied_bleu' },
  { id: 'pleurote', danger: 0, size: [5, 14], underside: 'lames_blanches', cut: 'chair', cutTint: null, spore: '#e6dcef', night: 4, twin: 'lanterne' },
  { id: 'lanterne', danger: 1, size: [5, 12], underside: 'lames_orange', cut: 'chair', cutTint: null, spore: '#efe3c8', glows: true, night: 4, twin: 'pleurote' },
  { id: 'russule_charbon', danger: 0, size: [6, 14], underside: 'lames_blanches', cut: 'chair', cutTint: null, spore: '#f4f1ea', night: 5, twin: 'russule_emetique' },
  { id: 'russule_emetique', danger: 1, size: [4, 9], underside: 'lames_blanches', cut: 'chair', cutTint: null, spore: '#f4f1ea', night: 5, twin: 'russule_charbon' },
  { id: 'morille', danger: 0, size: [5, 12], underside: 'alveoles', cut: 'creux', cutTint: null, spore: '#efe3c8', night: 6, twin: 'gyromitre' },
  { id: 'gyromitre', danger: 2, size: [5, 12], underside: 'cerveau', cut: 'chambres', cutTint: null, spore: '#efe3c8', night: 6, twin: 'morille' },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

/** Visual anomalies: things that are not mushrooms at all. Always burned. */
export const VISUAL_ANOMALIES = ['an_doigt', 'an_oeil', 'an_dents', 'an_langue', 'an_cheveux', 'an_coeur'] as const;
export type VisualAnomaly = (typeof VISUAL_ANOMALIES)[number];

export const TOOLS = ['loupe', 'nez', 'couteau', 'regle', 'sporee', 'bougie', 'cuillere', 'mousse'] as const;
export type Tool = (typeof TOOLS)[number];

/** Night from which each tool is on the counter. */
export const TOOL_NIGHT: Record<Tool, number> = {
  loupe: 1, nez: 1, couteau: 2, regle: 2, sporee: 3, bougie: 4, cuillere: 5, mousse: 6,
};

export function speciesForNight(night: number): Species[] {
  return SPECIES.filter((s) => s.night <= night);
}

export function toolsForNight(night: number): Tool[] {
  return TOOLS.filter((t) => TOOL_NIGHT[t] <= night);
}
