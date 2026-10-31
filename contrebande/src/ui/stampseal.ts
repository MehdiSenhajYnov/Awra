import { STAMP_BY_ID, type StampId } from '../data/stamps';
import { L } from '../i18n';
import { h } from './dom';

/** A rubber-stamp seal: a coloured ring with two letters, the full rule in its tooltip. */
export function stampSeal(id: StampId, small = false): HTMLElement {
  const s = STAMP_BY_ID[id];
  const tx = L().stamps[id];
  const seal = h(`div.seal${small ? '.small' : ''}` as 'div', { title: `${tx.name} — ${tx.desc}`, style: `--hue:${s.hue}` },
    h('span.seal-mark', {}, s.mark));
  return seal;
}
