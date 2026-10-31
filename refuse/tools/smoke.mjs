// Plays the opening minutes in headless Chromium through the real UI and saves screenshots.
// Usage: node tools/smoke.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5176', out = 'shots', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript((l) => {
  if (!localStorage.getItem('refuse.settings')) localStorage.setItem('refuse.settings', JSON.stringify({ lang: l, fast: true }));
}, lang);
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const f = { force: true };
const hook = (fn, arg) => page.evaluate(([fn, arg]) => window.__refuse[fn](arg), [fn, arg]);
await page.goto(url.includes('?') ? url : `${url}?autoplay`);
await shot('01-title');
await page.locator('.menu .btn.primary').click(f);
await shot('02-howto');
for (let i = 0; i < 4; i++) await page.locator('.howto .btn.primary').click(f);
await shot('03-desk');
// Refuse a dozen claims through the cards, approve when nothing fits.
for (let i = 0; i < 14; i++) {
  while (await hook('isBusy')) await page.waitForTimeout(50);
  const idx = await hook('fitIndex');
  if (idx >= 0) await page.locator('.hand .card').nth(idx).click(f);
  else await page.locator('.btn.approve').click(f);
  if (i === 0) { await page.waitForTimeout(150); await page.screenshot({ path: `${out}/04-stamp.png` }); }
  await page.waitForTimeout(250);
}
await shot('05-after-refusals');
await page.locator('.panel .btn.buy').first().click(f);
await page.locator('.tab').nth(1).click(f);
await shot('06-upgrades');
await page.locator('.tab').nth(2).click(f);
await shot('07-guild');
// Fast-forward to a riot and to the first trial.
await page.evaluate(() => { const g = window.__refuse.game(); g.scandal = 99; });
while (await hook('isBusy')) await page.waitForTimeout(50);
for (let i = 0; i < 3; i++) {
  const idx = await hook('fitIndex');
  if (idx >= 0) { await page.locator('.hand .card').nth(idx).click(f); await page.waitForTimeout(500); }
}
await shot('08-riot');
await page.evaluate(() => { const g = window.__refuse.game(); g.lifetime = 1e9; g.riotUntil = 0; g.scandal = 10; g.time = 200; g.nextEvent = 9999; });
await page.waitForTimeout(600);
await shot('09-plead');
await page.locator('.plead').click(f);
await shot('10-trial');
for (let i = 0; i < 10; i++) {
  const ok = await page.evaluate(() => !!window.__refuse.game().trial);
  if (!ok) break;
  const cards = page.locator('.trial-hand .card.fits');
  if (await cards.count()) await cards.first().click(f); else await page.locator('.trial .btn.ghost').click(f);
  await page.waitForTimeout(500);
}
await shot('11-verdict');
await page.locator('.verdict .btn').click(f);
await page.evaluate(() => { const g = window.__refuse.game(); g.time = 175; });
await page.waitForTimeout(400);
await shot('12-night');
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
