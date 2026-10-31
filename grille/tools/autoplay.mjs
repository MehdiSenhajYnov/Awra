// Plays whole games through the real UI: types the solver's words on the keyboard, shops, and
// goes on until an ending. Usage: node tools/autoplay.mjs <url> <out-dir> [lang] [daily]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5175', out = 'shots', lang = 'fr', mode = 'run'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((l) => {
  localStorage.setItem('grille.settings', JSON.stringify({ lang: l, fast: true }));
  localStorage.setItem('grille.profile', JSON.stringify({ howtoSeen: true, bestEdition: 9, wins: 1, maxStake: 1, bestScore: 0, daily: {}, gridLang: l }));
}, lang);
await page.goto(url);
await page.waitForTimeout(500);
const f = { force: true };
const visible = async (sel) => (await page.locator(sel).count()) > 0;
if (mode === 'daily') await page.locator('.menu .btn').nth(1).click(f);
else {
  await page.locator('.menu .btn.primary').click(f);
  await page.locator('.setup-box .btn.primary').click(f);
}
let words = 0;
let grids = 0;
for (let step = 0; step < 2000; step++) {
  if (await visible('.ending')) break;
  if (await visible('.shop-box')) {
    grids++;
    if (grids % 4 === 1) await page.screenshot({ path: `${out}/auto-shop-${grids}.png` });
    const b = page.locator('.pen-card .btn:not([disabled])').first();
    if (await b.count()) await b.click(f);
    await page.locator('.shop-box > .row .btn.primary').click(f);
    continue;
  }
  if (await visible('.board')) {
    const st = await page.evaluate(() => window.__grid?.state());
    if (!st || st.busy) { await page.waitForTimeout(200); continue; }
    const best = await page.evaluate(() => window.__grid.best());
    if (!best) {
      const ok = await page.evaluate(() => window.__grid.discardAll());
      if (!ok) {
        await page.keyboard.press('Escape');
        await page.locator('.menu-box .btn.ghost').first().click(f);
        await page.locator('.confirm .btn').first().click(f);
      }
      await page.waitForTimeout(300);
      continue;
    }
    const first = best.tiles[0];
    const dir = best.tiles.length > 1 && best.tiles[1].y === first.y ? 'h' : best.tiles.length > 1 ? 'v' : 'h';
    await page.evaluate(([x, y, d]) => window.__grid.cursor(x, y, d), [first.x, first.y, dir]);
    for (const t of best.tiles) await page.keyboard.press(`Key${t.letter}`);
    await page.keyboard.press('Enter');
    words++;
    if (words % 15 === 1) await page.screenshot({ path: `${out}/auto-grid-${words}.png` });
    await page.waitForTimeout(700);
    continue;
  }
  await page.waitForTimeout(250);
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/auto-ending-${mode}.png` });
const title = await page.locator('.front h1').textContent().catch(() => null);
console.log(`words=${words} grids=${grids} ending=${title}`);
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
