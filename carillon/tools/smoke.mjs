// Plays the opening through the interface in headless Chromium: title, new game, the Echo, menus,
// a death, save and continue. Usage: node tools/smoke.mjs <url> <out-dir> [lang]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5178', out = 'shots', lang = 'fr'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript((l) => { if (!localStorage.getItem('carillon.settings')) localStorage.setItem('carillon.settings', JSON.stringify({ lang: l, master: 0 })); }, lang);
const shot = async (n) => { await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${n}.png` }); console.log('shot', n); };
const hold = async (actions, frames) => {
  await page.evaluate((a) => { window.__carillon.input.script = new Set(a); }, actions);
  await page.waitForTimeout((frames / 60) * 1000);
  await page.evaluate(() => { window.__carillon.input.script = new Set(); });
  await page.waitForTimeout(50);
};
const tap = async (a) => hold([a], 3);
const scene = () => page.evaluate(() => { const s = window.__carillon.app.screen.scene; return s ? { room: s.room.id, x: Math.round(s.player.cx), hp: s.player.hp, res: s.player.res, modal: s.modal?.constructor.name ?? null, abilities: s.save.abilities.join(','), bronze: s.save.bronze } : null; });
const modal = () => page.evaluate(() => window.__carillon.app.screen.scene?.modal?.constructor.name ?? null);
const skipDialogue = async () => { for (let i = 0; i < 20 && (await modal()) === 'Dialogue'; i++) await tap('confirm'); };
const teleport = (room, x) => page.evaluate(([room, x]) => { const s = window.__carillon.app.screen.scene; s.enter(room, { x: x * 20 + 10, y: 300 }); }, [room, x]);

await page.goto(url.includes('?') ? url : `${url}?autoplay`);
await page.waitForTimeout(1500);
await shot('01-title');
await tap('confirm'); // Nouvelle partie
await shot('02-slots');
await tap('confirm'); // Slot 1
await page.waitForTimeout(800);
await shot('03-start');
// To Master Knell: talk, then take the Echo.
await teleport('b_echo', 8);
await page.waitForTimeout(300);
await hold(['left'], 20);
await tap('up');
await page.waitForTimeout(300);
await shot('04-dialogue');
await skipDialogue();
console.log('after talk', await scene());
// Stand on the lectern ledge where the Echo waits.
await page.evaluate(() => { const s = window.__carillon.app.screen.scene; s.player.place(13 * 20 + 10, 11 * 20); });
await page.waitForTimeout(600);
await shot('05-ability');
await tap('confirm');
console.log('after ability', await scene());
// Use the echo: swing, move, echo.
await page.evaluate(() => { window.__carillon.app.screen.scene.player.res = 2; });
await tap('attack');
await hold(['left'], 30);
await tap('echo');
await page.waitForTimeout(250);
await shot('06-echo');
// Pause menu, map, notes.
await tap('pause');
await shot('07-pause');
await tap('down'); await tap('down'); await tap('confirm');
await page.waitForTimeout(200);
await shot('08-map');
await tap('back');
await tap('pause'); await tap('down'); await tap('confirm');
await shot('09-notes');
await tap('back');
// Rest at a lectern.
await teleport('b_lutrin', 16);
await page.waitForTimeout(300);
await tap('up');
await page.waitForTimeout(300);
await shot('10-rest');
await tap('down'); await tap('down'); await tap('confirm');
console.log('after rest', await scene(), await page.evaluate(() => window.__carillon.app.screen.scene.save.lectern));
// Shop with Madame Tierce.
await page.evaluate(() => { window.__carillon.app.screen.scene.save.bronze = 500; });
await teleport('b_lutrin', 23);
await page.waitForTimeout(300);
await tap('up');
await skipDialogue();
await page.waitForTimeout(200);
await shot('11-shop');
await tap('confirm');
await page.waitForTimeout(400);
await shot('11b-bought');
await tap('confirm');
console.log('after shop', await scene());
for (let i = 0; i < 4; i++) await tap('back');
// Death and the Glas.
await page.evaluate(() => { const s = window.__carillon.app.screen.scene; s.modal = null; s.save.bronze = 123; s.hurtPlayer(20, 0); });
await page.waitForTimeout(2500);
await shot('12-respawn');
console.log('after death', await scene(), await page.evaluate(() => JSON.stringify(window.__carillon.app.screen.scene.save.glas)));
// Save and quit, then continue.
await tap('pause');
for (let i = 0; i < 4; i++) await tap('down');
await tap('confirm');
await page.waitForTimeout(500);
await shot('13-title-continue');
await tap('confirm');
await page.waitForTimeout(800);
console.log('continued', await scene());
await shot('14-continued');
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
