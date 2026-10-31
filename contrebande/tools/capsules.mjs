// Renders Steam store/library capsules from the game's own art and fonts.
// Usage: node tools/capsules.mjs [out-dir=store] [lang=fr|en]
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [out = join(root, 'store'), lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const title = lang === 'fr' ? 'Contrebande' : 'Contraband';
const tagline = lang === 'fr' ? 'Le roguelite de la valise' : 'The suitcase roguelite';
const img = (n) => pathToFileURL(join(root, 'public/img', `${n}.webp`)).href;
const font = pathToFileURL(join(root, 'node_modules/@fontsource/shrikhand/files/shrikhand-latin-400-normal.woff2')).href;

const SIZES = {
  header: [920, 430], main: [1232, 706], small: [462, 174], vertical: [748, 896], library: [600, 900], hero: [3840, 1240],
};

function html(w, h, kind) {
  const portrait = h > w;
  const showLogo = kind !== 'hero';
  const logoSize = Math.round(portrait ? w * 0.125 : h * 0.22);
  return `<!doctype html><html><head><style>
  @font-face { font-family: Fell; src: url('${font}'); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #4a2b1b; }
  .bg { position: absolute; inset: 0; background: url('${img('bg_titre')}') center/cover; filter: brightness(0.8); }
  .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 55%, transparent 35%, #000c 100%); }
  .tray { position: absolute; left: ${portrait ? '50%' : '75%'}; ${portrait ? 'top: 44%' : 'top: 52%'}; transform: translate(-50%, -50%) rotate(-2deg);
    width: ${portrait ? w * 0.62 : h * 0.62}px; height: ${portrait ? w * 0.62 : h * 0.62}px;
    background: #e8d2a6; border: ${Math.max(4, h * 0.012)}px solid #1f1a16; box-shadow: ${h * 0.02}px ${h * 0.02}px 0 #1f1a16; border-radius: 14px; }
  .shroom { position: absolute; left: 50%; top: 50%; width: 82%; transform: translate(-50%, -50%) rotate(-12deg); }
  .stamp { position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%) rotate(-14deg); font-family: Fell;
    font-size: ${(portrait ? w : h) * 0.09}px; color: #8e2a1e; border: ${Math.max(3, h * 0.008)}px double #8e2a1e; padding: 0 0.35em;
    border-radius: 8px; mix-blend-mode: multiply; opacity: 0.85; white-space: nowrap; }
  .logo { position: absolute; left: 0; right: 0; top: ${h * (portrait ? 0.05 : 0.06)}px; text-align: center; transform: rotate(-3deg);
    font-family: Fell; font-size: ${logoSize}px; color: #e3a728; text-shadow: ${logoSize * 0.04}px ${logoSize * 0.04}px 0 #a63b28, ${logoSize * 0.08}px ${logoSize * 0.08}px 0 #1f1a16; }
  .tag { display: table; margin-left: auto; margin-right: auto; font-size: 0.22em; background: #1f1a16; color: #f3e7cc; padding: 0.1em 0.5em; margin-top: 0.2em; text-shadow: none; font-family: monospace; }
  </style></head><body><div class="bg"></div><div class="vignette"></div>

  ${showLogo && kind !== 'small' ? `<div class="logo">${title}<span class="tag">${tagline}</span></div>` : ''}
  ${kind === 'small' ? `<div class="logo" style="font-size:${h * 0.34}px;top:${h * 0.22}px">${title}</div>` : ''}
  </body></html>`;
}

const browser = await chromium.launch();
for (const [kind, [w, h]] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const file = join(out, `_${kind}.html`);
  writeFileSync(file, html(w, h, kind));
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `capsule_${kind}_${lang}.jpg`), type: 'jpeg', quality: 90 });
  await page.close();
  rmSync(file);
  console.log('capsule', kind, w, h);
}
await browser.close();
