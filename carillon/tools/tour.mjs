// Visits rooms of every zone (god mode) and photographs them, then starts a few boss fights.
// Usage: node tools/tour.mjs <url> <out-dir>
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [url = 'http://localhost:5178', out = 'tour'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));
await page.addInitScript(() => localStorage.setItem('carillon.settings', JSON.stringify({ lang: 'fr', master: 0 })));
await page.goto(url.includes('?') ? url : `${url}?autoplay`);
await page.waitForTimeout(1200);
const hold = async (actions, frames) => {
  await page.evaluate((a) => { window.__carillon.input.script = new Set(a); }, actions);
  await page.waitForTimeout((frames / 60) * 1000);
  await page.evaluate(() => { window.__carillon.input.script = new Set(); });
  await page.waitForTimeout(30);
};
await hold(['confirm'], 3);
await hold(['confirm'], 3);
await page.waitForTimeout(600);
const rooms = (process.env.ROOMS ?? 'b_charpente,b_echo,g_toits,f_coulee,o_tuyaux,c_nef,j_serre,ci_grande,h_rouages,bo_descente').split(',');
for (const id of rooms) {
  await page.evaluate((id) => {
    const s = window.__carillon.app.screen.scene;
    s.god = true;
    s.save.abilities = ['echo', 'dash', 'walljump', 'swap', 'double', 'slam', 'grapple'];
    s.applySave();
    s.modal = null;
    s.pending = null; s.fade = 0; s.fadeTo = 0; s.respawning = false; s.player.hp = s.player.maxHp;
    s.enter(id);
  }, id);
  await hold(['right'], 50);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${id}.png` });
  console.log('shot', id);
}
const bosses = (process.env.BOSSES ?? 'b_arene').split(',').filter(Boolean);
for (const id of bosses) {
  await page.evaluate((id) => {
    const s = window.__carillon.app.screen.scene;
    for (const k of Object.keys(s.save.flags)) if (k.startsWith('boss_')) delete s.save.flags[k];
    s.pending = null; s.fade = 0; s.fadeTo = 0; s.respawning = false; s.modal = null;
    s.enter(id);
    s.player.body.x = s.room.w * 10;
    s.player.body.y = 200;
  }, id);
  for (let i = 0; i < 6; i++) { await hold(i % 2 ? ['attack'] : ['left', 'attack'], 20); }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/boss-${id}.png` });
  console.log('boss', id, await page.evaluate(() => { const s = window.__carillon.app.screen.scene; return s.boss ? `${s.boss.constructor.name} hp ${Math.round(s.boss.hp)}/${s.boss.maxHp}` : 'none'; }));
}
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no errors');
await browser.close();
