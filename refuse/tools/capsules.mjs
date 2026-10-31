// Renders the app icon and Steam capsules from the title illustration and the game's typography.
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
const title = lang === 'fr' ? 'Refusé' : 'Denied';
const stampWord = lang === 'fr' ? 'REFUSÉ' : 'DENIED';
const tag = lang === 'fr' ? 'L’assureur médiéval qui dit non' : 'The medieval insurer who says no';

const SIZES = { header: [920, 430], main: [1232, 706], small: [462, 174], vertical: [748, 896], library: [600, 900], hero: [3840, 1240], icon: [512, 512] };

function html(w, h, kind) {
  const portrait = h > w;
  const unit = Math.min(w, h);
  const css = `
  @font-face { font-family: Uncial; src: url('${font('uncial-antiqua', 'uncial-antiqua-latin-400-normal.woff2')}'); }
  @font-face { font-family: Fell; src: url('${font('im-fell-dw-pica', 'im-fell-dw-pica-latin-400-italic.woff2')}'); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #f1e6cc; color: #3b2a1a; }
  body { position: relative; background: radial-gradient(ellipse at 30% 20%, #fff8e6, #e4d3ab); }
  .art { position: absolute; background: url('${file('public/img/bg_titre.webp')}') center / cover no-repeat; mix-blend-mode: multiply; -webkit-mask-image: linear-gradient(90deg, transparent, #000 18%); }
  .art.down { -webkit-mask-image: linear-gradient(180deg, transparent, #000 15%); }
  .logo { font-family: Uncial; line-height: 1; position: relative; }
  .stamp { font-family: Uncial; color: #b0281c; border: solid #b0281c; border-radius: 0.12em; padding: 0 0.25em; transform: rotate(-12deg); display: inline-block; mix-blend-mode: multiply; }
  .tag { font-family: Fell; font-style: italic; }`;
  if (kind === 'icon') {
    return `<!doctype html><html><head><style>${css} body{background:#f1e6cc;border-radius:96px;display:flex;align-items:center;justify-content:center;border:14px solid #3b2a1a;box-sizing:border-box}</style></head>
      <body><div class="stamp" style="font-size:210px;border-width:18px;padding:0 40px">R</div></body></html>`;
  }
  if (kind === 'small') {
    return `<!doctype html><html><head><style>${css} body{display:flex;align-items:center;justify-content:center;gap:16px}</style></head>
      <body><div class="logo" style="font-size:${h * 0.42}px">${title}</div></body></html>`;
  }
  if (portrait) {
    return `<!doctype html><html><head><style>${css}</style></head><body>
      <div class="art down" style="left:-${w * 0.35}px;right:-${w * 0.35}px;top:${h * 0.34}px;bottom:0"></div>
      <div style="position:absolute;top:${h * 0.06}px;left:0;right:0;text-align:center">
        <div class="logo" style="font-size:${w * 0.2}px">${title}</div>
        <div class="stamp" style="font-size:${w * 0.07}px;border-width:${w * 0.008}px;margin-top:${h * 0.01}px">${stampWord}</div>
        <div class="tag" style="font-size:${w * 0.045}px;margin-top:${h * 0.015}px">${tag}</div>
      </div></body></html>`;
  }
  const showTag = kind !== 'hero';
  return `<!doctype html><html><head><style>${css}</style></head><body>
    <div class="art" style="left:${w * 0.4}px;right:0;top:0;bottom:0"></div>
    <div style="position:absolute;left:${w * 0.05}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:${unit * 0.03}px">
      <div class="logo" style="font-size:${unit * (kind === 'hero' ? 0.26 : 0.21)}px">${title}</div>
      <div><span class="stamp" style="font-size:${unit * 0.09}px;border-width:${unit * 0.012}px">${stampWord}</span></div>
      ${showTag ? `<div class="tag" style="font-size:${unit * 0.06}px">${tag}</div>` : ''}
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
