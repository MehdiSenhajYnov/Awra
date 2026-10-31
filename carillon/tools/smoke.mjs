// Plays the opening through scripted inputs in headless Chromium and saves screenshots.
// Usage: node tools/smoke.mjs <url> <out-dir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5178', out = 'shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript(() => localStorage.setItem('carillon.settings', JSON.stringify({ lang: 'fr', master: 0 })));
const shot = async (n) => { await page.waitForTimeout(250); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
/** Holds actions for a number of frames (60 per second). */
const hold = async (actions, frames) => {
  await page.evaluate((a) => { window.__carillon.input.script = new Set(a); }, actions);
  await page.waitForTimeout((frames / 60) * 1000);
  await page.evaluate(() => { window.__carillon.input.script = new Set(); });
  await page.waitForTimeout(40);
};
const state = () => page.evaluate(() => {
  const s = window.__carillon.app.screen.scene;
  return s ? { room: s.room.id, x: Math.round(s.player.cx), y: Math.round(s.player.cy), hp: s.player.hp, res: s.player.res } : null;
});
await page.goto(url.includes('?') ? url : `${url}?autoplay`);
await page.waitForTimeout(1500);
await shot('01-title');
await hold(['confirm'], 3); // Nouvelle partie
await hold(['confirm'], 3); // slot 1
await page.waitForTimeout(800);
await shot('02-start');
console.log(await state());
await hold(['right'], 70);
await hold(['right', 'jump'], 30);
await hold(['right'], 40);
await shot('03-walk');
await hold(['attack'], 4);
await page.waitForTimeout(80);
await shot('04-swing');
console.log(await state());
await hold(['right'], 200);
console.log(await state());
await shot('05-charpente');
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
