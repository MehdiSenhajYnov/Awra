// Plays a full campaign (or N Seasons nights) through the UI with a configurable accuracy,
// to check that every scene chains correctly up to an ending. Point it at the dev server or at
// a build served with `?autoplay` in the URL.
// Usage: node tools/autoplay.mjs <url> <out-dir> <accuracy 0..1> [lang] [mode=campaign|endless]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5173', out = 'shots', acc = '1', lang = 'fr', mode = 'campaign'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const accuracy = Number(acc);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript((l) => {
  localStorage.setItem('comestible.settings', JSON.stringify({ lang: l }));
  localStorage.setItem('comestible.profile', JSON.stringify({ endings: [], campaignDone: true, bestEndless: 0 }));
}, lang);
await page.goto(url);
await page.waitForTimeout(600);
const force = { force: true };

if (mode === 'endless') {
  await page.locator('.title-menu .btn', { hasText: /Saisons|Seasons/ }).click(force);
} else {
  await page.locator('.title-menu .btn.primary').click(force);
  await page.locator('.choice').first().click(force);
  await page.waitForTimeout(300);
  await page.locator('.letter .btn.ghost').click(force);
}

let nights = 0;
for (let step = 0; step < 4000; step++) {
  if (await page.locator('.ending-panel').count()) break;
  if (await page.locator('.card .btn.primary').count()) {
    nights++;
    await page.locator('.card .btn.primary').click(force);
    await page.waitForTimeout(1200);
    continue;
  }
  if (await page.locator('.close-shop').count()) {
    await page.screenshot({ path: `${out}/auto-night${nights}.png` });
    await page.locator('.close-shop').click(force);
    await page.waitForTimeout(900);
    continue;
  }
  if (await page.locator('.gazette').count() || await page.locator('.ledger-book').count()) {
    if (nights % 3 === 0) await page.screenshot({ path: `${out}/auto-morning${nights}-${step}.png` });
    await page.locator('.next').click(force);
    await page.waitForTimeout(900);
    continue;
  }
  // Night: decide from the dev hook.
  const info = await page.evaluate(() => {
    const n = window.__night;
    if (!n) return null;
    return { hasCur: !!n.current(), right: n.right(), hands: n.rules.hands, infected: n.infected(), client: !!n.client() };
  });
  if (!info) { await page.waitForTimeout(300); continue; }
  if (info.client && info.hands && info.infected && Math.random() < accuracy) {
    await page.locator('.client-actions .btn.danger').click(force);
    await page.waitForTimeout(300);
    const yes = page.locator('.confirm .btn.danger');
    if (await yes.count()) await yes.click(force);
    await page.waitForTimeout(1600);
    continue;
  }
  if (info.hasCur) {
    const all = ['edible', 'toxic', 'burn', 'seize'];
    let v = Math.random() < accuracy ? info.right : all[Math.floor(Math.random() * 2)];
    const btn = page.locator(`.stamp.${v}:not([disabled])`);
    if (await btn.count()) {
      await btn.click(force);
      await page.waitForTimeout(1500);
    } else await page.waitForTimeout(300);
    continue;
  }
  const basket = page.locator('.basket.ready');
  if (await basket.count()) await basket.click(force);
  // Dismiss the tutorial's last bubble if present.
  const dismiss = page.locator('.tutorial.show .btn');
  if (await dismiss.count()) await dismiss.click(force);
  await page.waitForTimeout(400);
  if (mode === 'endless' && nights > 3 && await page.locator('.close-shop').count() === 0 && step > 3000) break;
}
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}/auto-ending-${mode}-${acc}.png` });
const title = await page.locator('.ending-panel h1').textContent().catch(() => null);
console.log(`nights=${nights} ending=${title}`);
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
