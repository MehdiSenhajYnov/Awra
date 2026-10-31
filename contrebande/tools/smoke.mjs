// Drives a first crossing in headless Chromium (title, how-to, setup, buying, drag & drop,
// X-ray view, inspection, result) and saves a screenshot of each step.
// Usage: node tools/smoke.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5174', out = 'shots', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((l) => localStorage.setItem('contrebande.settings', JSON.stringify({ lang: l, fast: true })), lang);

const shot = async (name) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
const click = (sel) => page.locator(sel).first().click({ force: true });

await page.goto(url);
await shot('01-title');
await click('.title-menu .btn:has-text("Nouvelle"), .title-menu .btn:has-text("New run")');
await shot('02-howto');
for (let i = 0; i < 4; i++) await click('.howto .btn.primary');
await shot('03-setup');
await click('.setup-box .btn.primary');
await page.waitForTimeout(600);

// Buy everything affordable.
for (let i = 0; i < 5; i++) {
  const b = page.locator('.offer .buy:not([disabled])').first();
  if (await b.count()) await b.click({ force: true });
}
await shot('04-market-bought');

// Drag each stock piece onto the first free spot of the grid.
const grid = await page.locator('.market .grid').boundingBox();
const spots = [];
for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) spots.push([x, y]);
let spot = 0;
for (let i = 0; i < 8; i++) {
  const piece = page.locator('.stock .piece').first();
  if (!(await piece.count())) break;
  const box = await piece.boundingBox();
  const cellPx = grid.width / 6;
  let placed = false;
  while (!placed && spot < spots.length) {
    const [x, y] = spots[spot++];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(grid.x + (x + 0.5) * cellPx, grid.y + (y + 0.5) * cellPx, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    placed = (await page.locator('.stock .piece').count()) < (await page.locator('.stock .piece').count() + 1) && !(await piece.isVisible().catch(() => false));
  }
}
await shot('05-market-packed');
await click('.view-btn:nth-child(2)');
await shot('06-xray');
await click('.view-btn:nth-child(3)');
await shot('07-nose');
await click('.view-btn:nth-child(1)');
await click('.lane .go');
const confirm = page.locator('.confirm .btn.danger');
if (await confirm.count()) await confirm.click({ force: true });
await page.waitForTimeout(1500);
await shot('08-inspection');
await page.waitForSelector('.insp-side .btn.primary', { state: 'visible', timeout: 20000 });
await shot('09-inspection-done');
await click('.insp-side .btn.primary');
await shot('10-result');
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
