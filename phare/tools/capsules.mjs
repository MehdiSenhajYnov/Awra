// Renders the app icon and Steam capsules from the title watercolour and the game's typography.
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
const title = lang === 'fr' ? 'Phare' : 'Lighthouse';
const tag = lang === 'fr' ? 'Le gardien qui veille en bas de votre écran' : 'The keeper at the bottom of your screen';

const SIZES = { header: [920, 430], main: [1232, 706], small: [462, 174], vertical: [748, 896], library: [600, 900], hero: [3840, 1240], icon: [512, 512] };

function html(w, h, kind) {
  const unit = Math.min(w, h);
  const css = `
  @font-face { font-family: Display; src: url('${font('young-serif', 'young-serif-latin-400-normal.woff2')}'); }
  @font-face { font-family: Body; src: url('${font('lora', 'lora-latin-400-italic.woff2')}'); }
  html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #f4efe3; color: #fff; }
  body { position: relative; background: url('${file('public/img/bg_titre.webp')}') center / cover no-repeat; }
  body::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #10161fcc, #10161f22 60%); }
  
  .logo { font-family: Display; line-height: 1; position: relative; text-shadow: 0 4px 20px #0008; }
  .tag { font-family: Body; font-style: italic; text-shadow: 0 2px 8px #000a; }`;
  if (kind === 'icon') {
    // A lighthouse drawn in CSS: red and white bands, a lit lantern, a beam.
    return `<!doctype html><html><head><style>${css}
      body{background:linear-gradient(#1d3550,#10161f);border-radius:96px;overflow:hidden}
      body::before{display:none}
      .beam{position:absolute;left:256px;top:150px;width:320px;height:90px;background:linear-gradient(90deg,#fff3c0dd,#fff3c000);clip-path:polygon(0 45%,100% 0,100% 100%,0 55%)}
      .tower{position:absolute;left:206px;top:170px;width:100px;height:260px;clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);background:repeating-linear-gradient(180deg,#f4f1ea 0 52px,#b8322a 52px 104px)}
      .lamp{position:absolute;left:221px;top:118px;width:70px;height:52px;background:#fff2b0;border-radius:6px;box-shadow:0 0 60px 20px #fff2b088}
      .roof{position:absolute;left:206px;top:84px;width:100px;height:40px;background:#2a2a2a;clip-path:polygon(50% 0,100% 100%,0 100%)}
      .sea{position:absolute;left:0;right:0;bottom:0;height:90px;background:#2a4a66}
    </style></head><body><div class="beam"></div><div class="sea"></div><div class="tower"></div><div class="lamp"></div><div class="roof"></div></body></html>`;
  }
  if (kind === 'small') {
    return `<!doctype html><html><head><style>${css} body{display:flex;align-items:center;justify-content:center}</style></head>
      <body><div class="logo" style="font-size:${h * 0.5}px;position:relative">${title}</div></body></html>`;
  }
  const portrait = h > w;
  return `<!doctype html><html><head><style>${css}</style></head><body>
    <div style="position:absolute;${portrait ? `left:0;right:0;top:${h * 0.07}px;text-align:center` : `left:${w * 0.06}px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center`};gap:${unit * 0.02}px">
      <div class="logo" style="font-size:${Math.min(unit * (portrait ? 0.2 : kind === 'hero' ? 0.24 : 0.2), (w * 1.5) / title.length)}px">${title}</div>
      ${kind === 'hero' ? '' : `<div class="tag" style="font-size:${unit * (portrait ? 0.05 : 0.055)}px;margin-top:${unit * 0.02}px">${tag}</div>`}
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
