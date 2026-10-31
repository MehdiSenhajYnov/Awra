import type { RoomDef } from '../room';
import { COURONNE } from './couronne';
import { JARDINS } from './jardins';
import { FORGE } from './forge';
import { ARCHIVES } from './archives';
import { BASTION } from './bastion';
import { FIRMAMENT } from './firmament';
import { PENOMBRE } from './penombre';
import { COEUR } from './coeur';

export const ALL_ROOMS: RoomDef[] = [...COURONNE, ...JARDINS, ...FORGE, ...ARCHIVES, ...BASTION, ...FIRMAMENT, ...PENOMBRE, ...COEUR];
