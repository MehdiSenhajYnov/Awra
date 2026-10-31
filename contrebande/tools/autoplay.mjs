// Plays whole runs through the real UI (buying with clicks, packing through the test hook) to
// check that every scene chains up to an ending. Point it at the dev server or a build with ?autoplay.
// Usage: node tools/autoplay.mjs <url> <out-dir> [lang] [daily]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5174', out = 'shots', lang = 'fr', mode = 'run'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((l) => {
  localStorage.setItem('contrebande.settings', JSON.stringify({ lang: l, fast: true }));
  localStorage.setItem('contrebande.profile', JSON.stringify({ howtoSeen: true, bestBorder: 9, wins: 1, maxAlert: 1, bestScore: 0, daily: {} }));
}, lang);
await page.goto(url);
await page.waitForTimeout(500);
const f = { force: true };
const visible = async (sel) => (await page.locator(sel).count()) > 0 && page.locator(sel).first().isVisible();

if (mode === 'daily') await page.locator('.title-menu .btn').nth(1).click(f);
else {
  await page.locator('.title-menu .btn.primary').click(f);
  await page.locator('.setup-box .btn.primary').click(f);
}

let crossings = 0;
for (let step = 0; step < 3000; step++) {
  if (await visible('.ending-panel')) break;
  if (await visible('.scene.market')) {
    for (let i = 0; i < 8; i++) {
      const b = page.locator('.offer .buy:not([disabled])').first();
      if (!(await b.count())) break;
      await b.click(f);
    }
    await page.evaluate(() => window.__market.autopack());
    const lane = await page.evaluate(() => window.__market.bestLane());
    if (crossings % 4 === 0) await page.screenshot({ path: `${out}/auto-market-${crossings}.png` });
    await page.locator('.lane .go').nth(lane).click(f);
    await page.waitForTimeout(200);
    if (await visible('.confirm .btn.danger')) await page.locator('.confirm .btn.danger').click(f);
    crossings++;
    await page.waitForTimeout(400);
    continue;
  }
  if (await visible('.scene.inspection')) {
    const next = page.locator('.insp-side .btn.primary');
    if (await next.isVisible()) await next.click(f);
    else await page.waitForTimeout(300);
    continue;
  }
  if (await visible('.scene.result')) { await page.locator('.ticket .btn.primary').click(f); continue; }
  if (await visible('.scene.payment')) {
    await page.screenshot({ path: `${out}/auto-payment-${crossings}.png` });
    await page.locator('.olga-card .btn').click(f);
    continue;
  }
  if (await visible('.scene.backroom')) {
    const b = page.locator('.stamp-card .btn:not([disabled])').first();
    if (await b.count()) await b.click(f);
    await page.screenshot({ path: `${out}/auto-backroom-${crossings}.png` });
    await page.locator('.backroom-box > .btn.primary').click(f);
    continue;
  }
  await page.waitForTimeout(200);
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/auto-ending-${mode}.png` });
const title = await page.locator('.ending-panel h1').textContent().catch(() => null);
console.log(`crossings=${crossings} ending=${title}`);
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
