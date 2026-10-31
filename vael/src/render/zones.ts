/** Visual identity of each zone: paintings, terrain colours, light, fog and decor. */
export interface ZoneLook {
  bgs: string[];
  tex: string;
  rim: [number, number, number];
  deep: [number, number, number];
  top: [number, number, number];
  ambient: number;
  fog: number;
  /** Tint applied to the far painting (darkens it behind the action). */
  bgTint: number;
  mid: string[];
  back: string[];
  fg: string[];
  plat: string;
  edge: string;
  motes: number;
  hero: number;
  music: string;
}

const C = (r: number, g: number, b: number): [number, number, number] => [r / 255, g / 255, b / 255];

export const ZONES: Record<string, ZoneLook> = {
  couronne: {
    bgs: ['bg_couronne_a', 'bg_couronne_b', 'bg_couronne_c'], tex: 'tex_couronne',
    rim: C(110, 135, 210), deep: C(6, 7, 16), top: C(255, 214, 140), ambient: 0xaab2d8, fog: 0x1a2140, bgTint: 0x7c86ac,
    mid: ['prop_pillar', 'prop_arch', 'prop_chain', 'prop_statue'], back: ['prop_arch', 'prop_crystals', 'prop_statue', 'prop_candles', 'prop_banner', 'prop_pillar'],
    fg: ['fg_couronne_a', 'fg_couronne_b'], plat: 'plat_couronne', edge: 'edge_top', motes: 0xffe2a8, hero: 0xffd89a, music: 'couronne',
  },
  jardins: {
    bgs: ['bg_jardins_a', 'bg_jardins_b'], tex: 'tex_jardins',
    rim: C(80, 200, 190), deep: C(3, 12, 12), top: C(150, 255, 220), ambient: 0x9cc8c4, fog: 0x0c2a2c, bgTint: 0x7aa8a4,
    mid: ['prop_roots', 'prop_tree', 'prop_greenhouse'], back: ['prop_flower', 'prop_mushrooms', 'prop_tree', 'prop_greenhouse'],
    fg: ['fg_jardins_a', 'fg_jardins_b'], plat: 'plat_jardins', edge: 'edge_top', motes: 0x9ff8e0, hero: 0xffd89a, music: 'jardins',
  },
};

export function zoneLook(z: string): ZoneLook {
  return ZONES[z] ?? ZONES.couronne;
}
