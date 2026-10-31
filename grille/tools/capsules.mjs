// Renders the app icon and Steam capsules: pure typography, like the game itself.
// Usage: node tools/capsules.mjs [out-dir=store] [lang=fr|en]
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [out = join(root, 'store'), lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const font = (pkg, file) => pathToFileURL(join(root, 'node_modules/@fontsource', pkg, 'files', file)).href;
const title = lang === 'fr' ? 'Grille' : 'Grid';
const tag = lang === 'fr' ? 'Le roguelite des mots croisés' : 'The crossword roguelite';
const word = title.toUpperCase();

const SIZES = { header: [920, 430], main: [1232, 706], small: [462, 174], vertical: [748, 896], library: [600, 900], hero: [3840, 1240], icon: [512, 512] };

function tiles(letters, size) {
  return letters.split('').map((l) => `<div class="tile" style="width:${size}px;height:${size * 1.12}px;font-size:${size * 0.62}px">${l}</div>`).join('');
}

function html(w, h, kind) {
  const portrait = h > w;
  const unit = Math.min(w, h);
  const css = `
  @font-face { font-family: Display; src: url('${font('playfair-display', 'playfair-display-latin-900-normal.woff2')}'); font-weight: 900; }
  @font-face { font-family: DisplayI; src: url('${font('playfair-display', 'playfair-display-latin-700-italic.woff2')}'); }
  @font-face { font-family: Type; src: url('${font('special-elite', 'special-elite-latin-400-normal.woff2')}'); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #f3eee2; color: #161412; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${unit * 0.04}px;
    background: repeating-linear-gradient(0deg, transparent 0 3px, #00000006 3px 4px), radial-gradient(ellipse at 30% 20%, #fffaf0, #e9e2d0); }
  .mast { font-family: Display; font-weight: 900; font-size: ${unit * (portrait ? 0.075 : 0.09)}px; border-bottom: ${Math.max(3, unit * 0.008)}px double #161412; padding: 0 ${unit * 0.05}px; }
  .logo { font-family: DisplayI; color: #b3261e; font-size: ${unit * (portrait ? 0.24 : 0.3)}px; line-height: 0.9; }
  .row { display: flex; gap: ${unit * 0.012}px; }
  .tile { background: linear-gradient(#4a4642, #3a3733); color: #f6f1e4; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-family: Type; box-shadow: 0 ${unit * 0.01}px 0 #1b1917; }
  .tag { font-family: Type; font-size: ${unit * 0.05}px; }`;
  if (kind === 'icon') {
    return `<!doctype html><html><head><style>${css} body{background:#161412;border-radius:96px}</style></head><body><div class="tile" style="width:360px;height:400px;font-size:300px;border-radius:30px">${word[0]}</div></body></html>`;
  }
  if (kind === 'small') {
    return `<!doctype html><html><head><style>${css}</style></head><body><div class="logo" style="font-size:${h * 0.55}px">${title}</div></body></html>`;
  }
  const showMast = kind !== 'hero';
  return `<!doctype html><html><head><style>${css}</style></head><body>
    ${showMast ? `<div class="mast">L’Écho du Soir</div>` : ''}
    <div class="logo">${title}</div>
    <div class="row">${tiles(word, unit * (portrait ? 0.12 : 0.1))}</div>
    ${kind === 'hero' ? '' : `<div class="tag">${tag}</div>`}
  </body></html>`;
}

const browser = await chromium.launch();
for (const [kind, [w, h]] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const file = join(out, `_${kind}.html`);
  writeFileSync(file, html(w, h, kind));
  await page.goto(pathToFileURL(file).href);
  await page.waitForTimeout(400);
  if (kind === 'icon') await page.screenshot({ path: join(root, 'public', 'icon.png'), omitBackground: true });
  else await page.screenshot({ path: join(out, `capsule_${kind}_${lang}.jpg`), type: 'jpeg', quality: 90 });
  await page.close();
  rmSync(file);
}
await browser.close();
console.log('capsules done');
