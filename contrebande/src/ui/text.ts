import { type ItemDef, ITEM_BY_ID } from '../data/items';
import type { Check } from '../game/inspect';
import { L, fmt } from '../i18n';
import { h } from './dom';

export function checkLabel(c: Check): string {
  const t = L().checks;
  switch (c.kind) {
    case 'scanner':
      if (c.leadless) return t.leadless + (c.half ? ` · ${t.scannerHalf}` : '');
      return c.half ? t.scannerHalf : t.scanner;
    case 'dog':
      if (c.alerts >= 99) return t.dogAll;
      return (c.sensitivity >= 2 ? `${t.dogLazy} · ` : '') + fmt(c.alerts > 1 ? t.dogPlural : t.dog, { n: c.alerts });
    case 'search':
      return fmt(c.cells > 1 ? t.searchPlural : t.search, { n: c.cells });
    case 'largest':
      return t.largest;
  }
}

/** Round badge for a check; the dog check shows Brutus himself. */
export function checkIcon(c: Check): HTMLElement {
  if (c.kind === 'dog') return h('span.check-icon.dog', {}, h('img', { src: 'img/chr_brutus.webp', alt: '' }));
  const glyph = { scanner: 'X', search: '?', largest: '▣' }[c.kind];
  return h(`span.check-icon.${c.kind}` as 'span', {}, glyph);
}

export function itemName(id: string): string {
  return L().items[id as keyof ReturnType<typeof L>['items']].name;
}

/** Small tag row: footprint, kind, dense, smell, file, lead, mask. */
export function itemTags(d: ItemDef): HTMLElement {
  const t = L();
  const tags: [string, string][] = [
    [fmt(t.tags.size, { w: d.w, h: d.h }), 'size'],
    [t.kinds[d.kind], d.kind],
  ];
  if (d.major) tags.push([t.tags.major, 'major']);
  if (d.dense) tags.push([t.tags.dense, 'dense']);
  if (d.smell) tags.push([fmt(t.tags.smell, { n: d.smell }), 'smell']);
  if (d.shield) tags.push([t.tags.shield, 'shield']);
  if (d.mask) tags.push([fmt(t.tags.mask, { p: d.mask.power, r: d.mask.radius }), 'mask']);
  return h('div.tags', {}, ...tags.map(([label, cls]) => h(`span.tag.${cls}` as 'span', {}, label)));
}

export function itemDef(id: string): ItemDef {
  return ITEM_BY_ID[id];
}
