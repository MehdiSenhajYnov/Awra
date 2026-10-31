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

const title = lang === 'fr' ? 'Comestible ?' : 'Edible?';
const tagline = lang === 'fr' ? 'Une horreur de comptoir' : 'A counter horror';
const img = (n) => pathToFileURL(join(root, 'public/img', `${n}.webp`)).href;
const font = pathToFileURL(join(root, 'node_modules/@fontsource/im-fell-english/files/im-fell-english-latin-400-normal.woff2')).href;

const SIZES = {
  header: [920, 430], main: [1232, 706], small: [462, 174], vertical: [748, 896], library: [600, 900], hero: [3840, 1240],
};

function html(w, h, kind) {
  const portrait = h > w;
  const showLogo = kind !== 'hero';
  const logoSize = Math.round(portrait ? w * 0.15 : h * 0.2);
  return `<!doctype html><html><head><style>
  @font-face { font-family: Fell; src: url('${font}'); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #0a0705; }
  .bg { position: absolute; inset: 0; background: url('${img('bg_titre')}') center/cover; filter: brightness(0.62) saturate(0.85); }
  .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 55%, transparent 35%, #000c 100%); }
  .tray { position: absolute; left: ${portrait ? '50%' : '75%'}; ${portrait ? 'top: 44%' : 'top: 52%'}; transform: translate(-50%, -50%) rotate(-2deg);
    width: ${portrait ? w * 0.62 : h * 0.62}px; height: ${portrait ? w * 0.62 : h * 0.62}px;
    background: #efe3c8 url('${img('tx_papier')}') center/cover; box-shadow: 0 ${h * 0.03}px ${h * 0.08}px #000e, inset 0 0 ${h * 0.06}px #6b4b2a99; border-radius: 6px; }
  .shroom { position: absolute; left: 50%; bottom: 6%; height: 86%; transform: translateX(-50%); filter: drop-shadow(0 10px 10px #3b28165a); }
  .stamp { position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%) rotate(-14deg); font-family: Fell;
    font-size: ${(portrait ? w : h) * 0.09}px; color: #8e2a1e; border: ${Math.max(3, h * 0.008)}px double #8e2a1e; padding: 0 0.35em;
    border-radius: 8px; mix-blend-mode: multiply; opacity: 0.85; white-space: nowrap; }
  .logo { position: absolute; ${portrait ? `left: 0; right: 0; bottom: ${h * 0.07}px; text-align: center;` : `left: ${w * 0.05}px; top: 50%; transform: translateY(-50%); text-align: left;`}
    font-family: Fell; font-size: ${logoSize}px; color: #f3e6c4; text-shadow: 0 0 ${logoSize * 0.4}px #e8b25a77, 0 4px 16px #000; }
  .tag { display: block; font-size: 0.26em; font-style: italic; opacity: 0.9; margin-top: 0.1em; }
  </style></head><body><div class="bg"></div><div class="vignette"></div>
  ${kind === 'hero' || kind === 'small' ? '' : `<div class="tray"><img class="shroom" src="${img('sp_blanche_mort')}"></div>`}
  ${showLogo && kind !== 'small' ? `<div class="logo">${title}<span class="tag">${tagline}</span></div>` : ''}
  ${kind === 'small' ? `<div class="logo" style="font-size:${h * 0.3}px">${title}</div>` : ''}
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
