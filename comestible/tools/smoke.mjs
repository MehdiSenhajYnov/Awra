// Drives the game in headless Chromium and saves screenshots of each scene.
// Usage: node tools/smoke.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

// Playwright is installed globally in the dev environment, not as a project dependency.
const { chromium } = createRequire(import.meta.url)('playwright');

const [url = 'http://localhost:5173', out = 'shots', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`failed: ${r.url()}`));
await page.addInitScript((l) => localStorage.setItem('comestible.settings', JSON.stringify({ lang: l })), lang);

const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
const click = (sel) => page.locator(sel).first().click({ force: true });

await page.goto(url);
await shot('01-title');
await click('.title-menu .btn.primary');
await shot('02-difficulty');
await click('.choice');
await page.waitForTimeout(400);
await shot('03-intro');
await click('.letter .btn.ghost');
await shot('04-nightcard');
await click('.card .btn.primary');
await page.waitForTimeout(1800);
await shot('05-night-client');
await click('.basket');
await page.waitForTimeout(600);
await page.keyboard.press('KeyQ');
await page.keyboard.press('KeyW');
await shot('06-night-loupe');
await page.keyboard.press('KeyG');
await shot('07-guide');
await page.keyboard.press('KeyG');

// Play the rest of night 1 with the tutorial-free stamps until the shop closes.
for (let i = 0; i < 40; i++) {
  if (await page.locator('.close-shop').count()) break;
  const stamp = page.locator('.stamp.edible:not([disabled])');
  if (await stamp.count()) {
    await stamp.click({ force: true });
    await page.waitForTimeout(1400);
    continue;
  }
  const basket = page.locator('.basket.ready');
  if (await basket.count()) await basket.click({ force: true });
  await page.waitForTimeout(900);
}
await shot('08-night-end');
await click('.close-shop');
await shot('09-gazette');
await click('.next');
await shot('10-ledger');
await click('.next');
await shot('11-night2-card');
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
