// Plays a whole game through the real interface: refusals, purchases, trials, bankruptcies, the board, the ending.
// Time is fast-forwarded through the test hook between bursts of play.
// Usage: node tools/autoplay.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:4176', out = 'autoplay', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript((l) => {
  if (!localStorage.getItem('refuse.settings')) localStorage.setItem('refuse.settings', JSON.stringify({ lang: l, fast: true, music: 0, effects: 0 }));
}, lang);
const f = { force: true };
const visible = async (sel) => (await page.locator(sel).count()) > 0 && page.locator(sel).first().isVisible();
const shots = new Set();
const shot = async (n) => { if (shots.has(n)) return; shots.add(n); await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const game = () => page.evaluate(() => { const g = window.__refuse.game(); return { realm: g.realm, floor: g.floor, ecus: g.ecus, scandal: g.scandal, ended: g.ended, time: g.time, trial: !!g.trial, shares: g.shares, deck: g.deck.length }; });

await page.goto(`${url}?autoplay`);
await page.locator('.menu .btn.primary').click(f);
for (let i = 0; i < 4; i++) await page.locator('.howto .btn.primary').click(f);
let tab = 0;
let done = false;
for (let step = 0; step < 900 && !done; step++) {
  if (await visible('.ending')) {
    await page.waitForSelector('.ending .row .btn', { timeout: 30000 });
    await shot('90-ending');
    done = true;
    break;
  }
  if (await visible('.verdict .btn')) { await shot(`trial-verdict-${(await game()).realm}`); await page.locator('.verdict .btn').click(f); await page.waitForTimeout(400); continue; }
  if (await visible('.trial-hand')) {
    // The most specific fitting clause first; catch-alls are kept for later claims.
    const cards = page.locator('.trial-hand .card.fits');
    const n = await cards.count();
    let pick = -1;
    for (let i = 0; i < n; i++) if ((await cards.nth(i).locator('.chip.any').count()) === 0) { pick = i; break; }
    if (pick < 0 && n) pick = 0;
    if (pick >= 0) await cards.nth(pick).click(f); else await page.locator('.trial .btn.ghost').click(f);
    await page.waitForTimeout(250);
    continue;
  }
  if (await visible('.confirm')) { await page.locator('.confirm .btn.danger').click(f); await page.waitForTimeout(400); continue; }
  if (await visible('.board-perks')) {
    await shot(`board-${(await game()).realm}`);
    for (let k = 0; k < 20; k++) {
      const b = page.locator('.perk .btn:not([disabled])');
      if (!(await b.count())) break;
      await b.first().click(f);
    }
    await page.locator('.board-left .btn.primary').click(f);
    await page.waitForTimeout(400);
    continue;
  }
  if (await visible('.modal .menu-box .btn.primary')) { await page.locator('.modal .menu-box .btn.primary').last().click(f); await page.waitForTimeout(400); continue; }
  if (!(await visible('.desk'))) { await page.waitForTimeout(200); continue; }
  const s = await game();
  if (step % 25 === 0) console.log(`step ${step} realm ${s.realm} floor ${s.floor} time ${Math.round(s.time / 60)} min écus ${Math.round(s.ecus)} shares ${s.shares}`);
  await shot(`desk-${s.realm}-${s.floor}`);
  if (await visible('.btn.bankrupt')) { await page.locator('.btn.bankrupt').click(f); continue; }
  if (await visible('.plead.ready')) { await page.locator('.plead.ready').click(f); continue; }
  // A burst of desk work.
  for (let i = 0; i < 6; i++) {
    while (await page.evaluate(() => window.__refuse.isBusy())) await page.waitForTimeout(30);
    const scandal = await page.evaluate(() => window.__refuse.game().scandal);
    const idx = await page.evaluate(() => window.__refuse.fitIndex());
    if (scandal > 70 || idx < 0) await page.locator('.btn.approve').click(f);
    else await page.locator('.hand .card').nth(idx).click(f);
  }
  // Shopping: cycle through the tabs, buy whatever is affordable.
  await page.locator('.tab').nth(tab % 3).click(f);
  tab++;
  for (let k = 0; k < 6; k++) {
    // The most expensive affordable item: what a player saving up would pick.
    const b = page.locator('.panel .btn.buy:not([disabled])');
    if (!(await b.count())) break;
    await b.last().click(f);
  }
  await page.evaluate(() => window.__refuse.advance(90));
}
const final = await game();
console.log('final', JSON.stringify(final));
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
process.exit(done ? 0 : 1);
