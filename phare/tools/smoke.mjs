// Drives the lighthouse in headless Chromium: first launch, maintenance, a storm, the cottage tabs, a bottle.
// Usage: node tools/smoke.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5177', out = 'shots', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript((l) => {
  if (!localStorage.getItem('phare.settings')) localStorage.setItem('phare.settings', JSON.stringify({ lang: l, fast: false }));
}, lang);
const shot = async (n) => { await page.waitForTimeout(600); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const f = { force: true };
const hook = (fn, ...args) => page.evaluate(([fn, args]) => window.__phare[fn](...args), [fn, args]);
await page.goto(url.includes('?') ? url : `${url}?autoplay`);
await shot('01-welcome');
await page.locator('.welcome input').fill('Maïwenn');
await page.locator('.welcome .btn.primary').click(f);
await shot('02-howto');
for (let i = 0; i < 4; i++) await page.locator('.howto .btn.primary').click(f);
await hook('advance', 200);
await shot('03-day');
await hook('setTime', 22);
await hook('advance', 120);
await shot('04-night');
// Let the lamp run low, then refill.
await page.evaluate(() => { const g = window.__phare.game(); g.oil = 10; g.clean = 15; });
await page.waitForTimeout(300);
await page.locator('.strip').hover({ position: { x: 1450, y: 30 } });
await shot('05-low');
await page.locator('.gauge').nth(0).click(f);
await page.locator('.gauge').nth(1).click(f);
// A storm: aim at each ship until it turns away.
await hook('setTime', 14);
await page.evaluate(() => { const g = window.__phare.game(); g.sous = 5000; });
await page.locator('.tab').nth(2).click(f);
await shot('06-workshop');
await page.locator('.up-row .btn.buy').nth(3).click(f);
await hook('storm');
await hook('advance', 2);
await shot('07-storm-waiting');
await page.locator('.storm-banner .btn').click(f);
for (let i = 0; i < 80; i++) {
  const g = await page.evaluate(() => ({ phase: window.__phare.game().storm.phase }));
  if (g.phase !== 'active') break;
  const hits = await hook('stripHits');
  const ships = await page.evaluate(() => window.__phare.game().ships.filter((s) => s.storm?.state === 'approach').map((s) => s.uid));
  const target = hits.find((h) => h.kind === 'ship' && ships.includes(h.uid));
  const box = await page.locator('.strip-canvas').boundingBox();
  if (target) await page.mouse.move(box.x + target.x + target.w / 2, box.y + target.y + target.h / 2);
  if (i === 12) await shot('08-storm-active');
  await page.waitForTimeout(250);
}
await shot('09-after-storm');
await page.evaluate(() => { const g = window.__phare.game(); for (const w of g.floating) w.born = g.time; });
await page.locator('.tab').nth(0).click(f);
await hook('advance', 3000);
await shot('10-registre');
await page.locator('.tab').nth(1).click(f);
await shot('11-epaves');
await page.locator('.tab').nth(3).click(f);
await shot('12-maison');
await page.evaluate(() => { const g = window.__phare.game(); g.bottles = 2; g.sous += 500; });
await page.locator('.tab').nth(4).click(f);
await page.waitForTimeout(700);
await page.locator('.bottles .form .btn.primary').click(f);
await shot('13-bottle-code');
const code = await page.locator('.code').textContent();
console.log('code', code);
await page.locator('.modal .btn.primary').last().click(f);
await page.locator('.tab').nth(5).click(f);
await shot('14-journal');
await hook('away', 5 * 3600);
await shot('15-away');
await page.locator('.modal .btn.primary').last().click(f);
await hook('setMode', 'strip');
await page.setViewportSize({ width: 1600, height: 170 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/16-strip-mode.png` });
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
