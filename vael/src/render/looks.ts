import { defineLook } from './entities';

/** Visual definitions of every entity sprite key. */
export function registerLooks(): void {
  defineLook('coquille', { sheet: 'en_coquille', image: 'en_test', height: 150, facesLeft: true, light: { color: 0x9a60ff, radius: 200, dy: -30 } });
  defineLook('acarien', { sheet: 'en_acarien', image: 'prop_crystals', height: 58, facesLeft: true, light: { color: 0x80a8ff, radius: 140 } });
  defineLook('lampion', { sheet: 'en_lampion', image: 'prop_crystals', height: 96, facesLeft: true, bob: 6, light: { color: 0xb070ff, radius: 320 } });
  defineLook('pretre', { sheet: 'en_pretre', height: 150, facesLeft: true, bob: 4, light: { color: 0xa070ff, radius: 220 } });
  defineLook('chevalier', { sheet: 'en_chevalier', image: 'en_test', height: 150, facesLeft: true, light: { color: 0x9a60ff, radius: 200 } });
  defineLook('ronce', { sheet: 'en_ronce', height: 130, facesLeft: true, light: { color: 0x70ffd8, radius: 200 } });
  defineLook('spore', { sheet: 'en_spore', height: 110, facesLeft: true, bob: 8, light: { color: 0xff9ad8, radius: 260 } });
  defineLook('mante', { sheet: 'en_mante', height: 170, facesLeft: true, light: { color: 0x70ffd8, radius: 200 } });
  defineLook('orb', { image: '', height: 70, additive: true, sink: 0.5, light: { color: 0xb070ff, radius: 200 } });
  defineLook('shrine', { image: 'shrine', height: 170, sink: 0.02, light: { color: 0xffe0a0, radius: 520, dy: -40 } });
  defineLook('fallen', { image: 'fallen_star', height: 90, light: { color: 0xffe0a0, radius: 300 } });
  defineLook('gardien', { sheet: 'boss_gardien_a', height: 380, facesLeft: true, light: { color: 0xffd890, radius: 420, dy: -60 } });
}
