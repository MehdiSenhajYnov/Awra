// Renders the app icon and Steam capsules from the title painting and the game's typography.
// Usage: node tools/capsules.mjs [out-dir=store] [lang=fr|en]
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [out = join(root, 'store'), lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const file = (p) => pathToFileURL(join(root, p)).href;
const font = (pkg, f) => file(`node_modules/@fontsource/${pkg}/files/${f}`);
const tag = lang === 'fr' ? 'Les cloches se taisent. Le Silence monte.' : 'The bells fall quiet. The Silence rises.';

const SIZES = { header: [920, 430], main: [1232, 706], small: [462, 174], vertical: [748, 896], library: [600, 900], hero: [3840, 1240], icon: [512, 512] };

function html(w, h, kind) {
  const unit = Math.min(w, h);
  const portrait = h > w;
  const css = `
  @font-face { font-family: Display; src: url('${font('marcellus-sc', 'marcellus-sc-latin-400-normal.woff2')}'); }
  @font-face { font-family: Body; src: url('${font('cormorant-garamond', 'cormorant-garamond-latin-500-italic.woff2')}'); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #050507; color: #e8dcc0; }
  body { position: relative; background: url('${file('public/img/key_titre.webp')}') ${portrait ? '62% center' : 'right center'} / cover no-repeat; }
  body::before { content: ''; position: absolute; inset: 0; background: ${portrait ? 'linear-gradient(180deg, #050507ee, #05050744 45%, #05050700)' : 'linear-gradient(90deg, #050507f0, #05050799 45%, #05050700 75%)'}; }
  .logo { font-family: Display; letter-spacing: 0.06em; line-height: 1; position: relative; }
  .rule { height: ${Math.max(1, unit * 0.004)}px; background: #e8c27a; position: relative; }
  .tag { font-family: Body; font-style: italic; color: #b8ac94; position: relative; }`;
  if (kind === 'icon') {
    return `<!doctype html><html><head><style>${css}
      body{background:radial-gradient(circle at 50% 60%,#3a2a12,#050507 70%);border-radius:96px}
      body::before{display:none}
      .bell{position:absolute;left:136px;top:120px;width:240px;height:230px;background:linear-gradient(#e8c27a,#8a6224);clip-path:path('M120 0 C70 0 62 40 58 80 C52 140 30 180 0 230 L240 230 C210 180 188 140 182 80 C178 40 170 0 120 0 Z')}
      .clap{position:absolute;left:236px;top:340px;width:40px;height:40px;border-radius:50%;background:#e8c27a}
      .eye{position:absolute;top:250px;width:14px;height:20px;background:#fff4c8;border-radius:3px;box-shadow:0 0 18px #ffd98a}
    </style></head><body><div class="bell"></div><div class="clap"></div><div class="eye" style="left:228px"></div><div class="eye" style="left:270px"></div></body></html>`;
  }
  if (kind === 'small') {
    return `<!doctype html><html><head><style>${css} body{display:flex;align-items:center;padding-left:${w * 0.07}px}</style></head>
      <body><div class="logo" style="font-size:${h * 0.38}px">CARILLON</div></body></html>`;
  }
  const size = Math.min(unit * (kind === 'hero' ? 0.2 : portrait ? 0.15 : 0.16), (w * (portrait ? 0.85 : 0.55)) / 6.2);
  return `<!doctype html><html><head><style>${css}</style></head><body>
    <div style="position:absolute;${portrait ? `left:0;right:0;top:${h * 0.06}px;text-align:center;display:flex;flex-direction:column;align-items:center` : `left:${w * 0.06}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center`};gap:${unit * 0.025}px">
      <div class="logo" style="font-size:${size}px">CARILLON</div>
      <div class="rule" style="width:${size * 3}px"></div>
      ${kind === 'hero' ? '' : `<div class="tag" style="font-size:${unit * 0.05}px">${tag}</div>`}
    </div></body></html>`;
}

const browser = await chromium.launch();
for (const [kind, [w, h]] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const tmp = join(out, `_${kind}.html`);
  writeFileSync(tmp, html(w, h, kind));
  await page.goto(pathToFileURL(tmp).href);
  await page.waitForTimeout(500);
  if (kind === 'icon') { if (lang === 'fr') await page.screenshot({ path: join(root, 'public', 'icon.png'), omitBackground: true }); }
  else await page.screenshot({ path: join(out, `capsule_${kind}_${lang}.jpg`), type: 'jpeg', quality: 90 });
  await page.close();
  rmSync(tmp);
}
await browser.close();
console.log('capsules done');
