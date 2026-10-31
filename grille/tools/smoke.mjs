// Plays the first grid in headless Chromium through the test hook and saves screenshots.
// Usage: node tools/smoke.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5175', out = 'shots', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((l) => {
  localStorage.setItem('grille.settings', JSON.stringify({ lang: l, fast: true }));
}, lang);
const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const f = { force: true };
await page.goto(url);
await shot('01-title');
await page.locator('.menu .btn.primary').click(f);
await shot('02-howto');
for (let i = 0; i < 4; i++) await page.locator('.howto .btn.primary').click(f);
await shot('03-setup');
await page.locator('.setup-box .btn.primary').click(f);
await page.waitForSelector('.board', { timeout: 30000 });
await shot('04-grid');
// Type the best word found through the keyboard, like a player.
for (let w = 0; w < 3; w++) {
  const best = await page.evaluate(() => window.__grid.best());
  if (!best) break;
  const first = best.tiles[0];
  const dir = best.tiles.length > 1 && best.tiles[1].y === first.y ? 'h' : best.tiles.length > 1 ? 'v' : 'h';
  await page.evaluate(([x, y, d]) => window.__grid.cursor(x, y, d), [first.x, first.y, dir]);
  for (const t of best.tiles) await page.keyboard.press(`Key${t.letter}`);
  if (w === 0) await shot('05-typed');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  if (w === 0) await shot('06-scored');
}
await shot('07-after');
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
