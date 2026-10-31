// Jumps straight to a campaign night through a crafted save, uses every tool on the first
// specimens and screenshots the result. Dev server only (imports game modules from /src).
// Usage: node tools/night_shot.mjs <url> <out-dir> <night> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173', out = 'shots', nightArg = '5', lang = 'fr'] = process.argv.slice(2);
const night = Number(nightArg);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((l) => localStorage.setItem('comestible.settings', JSON.stringify({ lang: l })), lang);
await page.goto(url);
await page.evaluate(async (n) => {
  const m = await import('/src/game/state.ts');
  const s = m.newGame('campaign', false, 7);
  s.night = n;
  s.money = 30;
  s.brume = Math.max(0, n - 4);
  s.contamination = Math.max(0, n - 6);
  localStorage.setItem('comestible.save', JSON.stringify(s));
}, night);
await page.reload();
await page.waitForTimeout(800);
await page.locator('.title-menu .btn.primary').click({ force: true });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/n${night}-card.png` });
await page.locator('.card .btn.primary').click({ force: true });
await page.waitForTimeout(2200);
if (night >= 7) {
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/n${night}-hands.png` });
  await page.waitForTimeout(3000);
}
await page.locator('.basket').click({ force: true });
await page.waitForTimeout(700);
for (const key of ['KeyQ', 'KeyW', 'KeyE', 'KeyR']) {
  await page.keyboard.press(key);
  await page.waitForTimeout(250);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/n${night}-tools.png` });
if (night >= 3) {
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${out}/n${night}-spores.png` });
}
if (night >= 4) {
  await page.keyboard.press('KeyY');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/n${night}-dark.png` });
  await page.waitForTimeout(2000);
}
if (night >= 6) {
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/n${night}-cat.png` });
}
await page.keyboard.press('Digit3');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/n${night}-stamp.png` });
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
