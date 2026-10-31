import { BASE_STATS, type Stats } from './player';
import type { Save } from './save';

/** Notes are equippable charms. Cost is in slots (3 at first, up to 6). */
export interface NoteDef {
  id: string;
  cost: number;
}

export const NOTES: NoteDef[] = [
  { id: 'fermata', cost: 1 },
  { id: 'staccato', cost: 2 },
  { id: 'fortissimo', cost: 3 },
  { id: 'legato', cost: 1 },
  { id: 'canon', cost: 3 },
  { id: 'pedale', cost: 1 },
  { id: 'soupir', cost: 2 },
  { id: 'diapason', cost: 2 },
  { id: 'point_orgue', cost: 2 },
  { id: 'bourdon', cost: 2 },
  { id: 'glas', cost: 1 },
  { id: 'aigue', cost: 1 },
  { id: 'contrepoint', cost: 2 },
  { id: 'tremolo', cost: 1 },
  { id: 'silence', cost: 1 },
  { id: 'or', cost: 1 },
];

export const NOTE_BY_ID: Record<string, NoteDef> = Object.fromEntries(NOTES.map((n) => [n.id, n]));

export const on = (save: Save, id: string) => save.notesOn.includes(id);

export function usedSlots(save: Save): number {
  return save.notesOn.reduce((n, id) => n + (NOTE_BY_ID[id]?.cost ?? 0), 0);
}

export function canEquip(save: Save, id: string): boolean {
  return save.notesOwned.includes(id) && !on(save, id) && usedSlots(save) + NOTE_BY_ID[id].cost <= save.slots;
}

export function toggleNote(save: Save, id: string): boolean {
  if (on(save, id)) { save.notesOn = save.notesOn.filter((n) => n !== id); return true; }
  if (!canEquip(save, id)) return false;
  save.notesOn.push(id);
  return true;
}

/** Player modifiers from equipped notes and hammer upgrades. */
export function computeStats(save: Save): Stats {
  const s: Stats = { ...BASE_STATS };
  s.damage = 1 + save.tin * 0.5;
  if (on(save, 'fermata')) s.parryWindow = 14;
  if (on(save, 'staccato')) s.attackCooldown = 15;
  if (on(save, 'fortissimo')) s.damage *= 1.4;
  if (on(save, 'legato')) s.echoFrames = 150;
  if (on(save, 'canon')) s.echoCopies = 2;
  if (on(save, 'pedale')) s.healFrames = 32;
  if (on(save, 'soupir')) { s.dashCooldown = 20; s.dashInvuln = true; }
  if (on(save, 'tremolo')) s.pogoVel = 10;
  if (on(save, 'aigue')) s.resPerHit = 0.4;
  return s;
}

/** Extra health bells granted by notes. */
export const bonusHp = (save: Save) => (on(save, 'bourdon') ? 2 : 0);
/** Fortissimo makes every blow taken hurt more. */
export const takenMul = (save: Save) => (on(save, 'fortissimo') ? 2 : 1) * (save.hard ? 2 : 1);
