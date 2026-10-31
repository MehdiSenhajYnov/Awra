import type { RoomDef } from '../room';
import { BEFFROI } from './beffroi';
import { BOURDON } from './bourdon';
import { CISTERNES } from './cisternes';
import { CRYPTE } from './crypte';
import { FONDERIE } from './fonderie';
import { GOUTTIERES } from './gouttieres';
import { HORLOGERIE } from './horlogerie';
import { JARDIN } from './jardin';
import { ORGUES } from './orgues';

/** Every room of the world. Zones are placed on a grid of screens (see docs/gdd.md for the map). */
export const ALL_ROOMS: RoomDef[] = [...BEFFROI, ...GOUTTIERES, ...FONDERIE, ...ORGUES, ...CRYPTE, ...JARDIN, ...CISTERNES, ...HORLOGERIE, ...BOURDON];
