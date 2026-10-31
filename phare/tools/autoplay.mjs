// A long watch through the real interface: days of in-game time fast-forwarded, with the player
// maintaining the light, fishing wrecks, steering storms and shopping between bursts.
// Usage: node tools/autoplay.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:4177', out = 'autoplay', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript((l) => {
  if (!localStorage.getItem('phare.settings')) localStorage.setItem('phare.settings', JSON.stringify({ lang: l, fast: true, master: 0 }));
}, lang);
const f = { force: true };
const hook = (fn, ...args) => page.evaluate(([fn, args]) => window.__phare[fn](...args), [fn, args]);
const state = () => page.evaluate(() => { const g = window.__phare.game(); return { time: g.time, sous: g.sous, lens: g.lens, ships: Object.keys(g.registry).length, wrecks: Object.keys(g.wrecks).length, deco: g.decorations.length, phase: g.storm.phase, saved: g.stats.saved, complete: g.completeShown }; });
await page.goto(`${url}?autoplay`);
await page.locator('.welcome input').fill('Autoplay');
await page.locator('.welcome .btn.primary').click(f);
for (let i = 0; i < 4; i++) await page.locator('.howto .btn.primary').click(f);
let tab = 0;
let s;
for (let step = 0; step < 400; step++) {
  // Close any modal (away summary, completion letter, bottle letters).
  while (await page.locator('.modal .btn.primary').count()) { await page.locator('.modal .btn.primary').last().click(f); await page.waitForTimeout(260); }
  await hook('advance', 300);
  s = await state();
  if (s.phase === 'waiting' || s.phase === 'warning') {
    if (s.phase === 'warning') await hook('advance', 70);
    if (await page.locator('.storm-banner .btn').count()) await page.locator('.storm-banner .btn').click(f);
    for (let k = 0; k < 60 && (await state()).phase === 'active'; k++) { await hook('aimAll'); await hook('advance', 1); }
  }
  // Maintain the light through its gauges.
  for (let k = 0; k < 3; k++) await page.locator('.gauge').nth(k).click(f);
  // Fish whatever drifts.
  const hits = await hook('stripHits');
  const box = await page.locator('.strip-canvas').boundingBox();
  for (const h of hits.filter((x) => x.kind === 'wreck')) {
    await page.mouse.click(box.x + h.x + h.w / 2, box.y + h.y + h.h / 2);
    if (await page.evaluate(() => document.body.classList.contains('strip-mode'))) {
      const at = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 120), [box.x + h.x + h.w / 2, box.y + h.y + h.h / 2]);
      console.log('mode switched by click on', JSON.stringify(h), at);
      await hook('setMode', 'full');
    }
  }
  // Shop: workshop then cottage, buying anything affordable.
  const shopTab = [2, 3][tab++ % 2];
  try {
    await page.locator('.tab').nth(shopTab).click({ force: true, timeout: 3000 });
  } catch (e) {
    await page.screenshot({ path: `${out}/fail.png` });
    console.log('tab click failed', await page.evaluate(() => ({ body: document.body.className, house: JSON.stringify(document.querySelector('.house')?.getBoundingClientRect()), tabs: JSON.stringify(document.querySelector('.tabs')?.getBoundingClientRect()) })));
    throw e;
  }
  await page.waitForTimeout(80);
  for (let k = 0; k < 4; k++) {
    const b = page.locator('.tab-body .btn.primary:not([disabled]), .tab-body .btn.buy:not([disabled])');
    if (!(await b.count())) break;
    await b.first().click(f);
    await page.waitForTimeout(60);
  }
  if (step % 40 === 0) {
    console.log(`step ${step} day ${(s.time / 1200).toFixed(1)} sous ${Math.round(s.sous)} lens ${s.lens} ships ${s.ships} wrecks ${s.wrecks} deco ${s.deco} saved ${s.saved}`);
    await page.locator('.tab').nth(0).click(f);
    await page.screenshot({ path: `${out}/step-${String(step).padStart(3, '0')}.png` });
  }
  if (s.complete) break;
}
s = await state();
console.log('final', JSON.stringify(s));
await page.locator('.tab').nth(0).click(f);
await page.screenshot({ path: `${out}/final.png` });
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
