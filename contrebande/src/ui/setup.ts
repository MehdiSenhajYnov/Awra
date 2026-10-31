import { audio } from '../audio';
import { BAGS } from '../data/items';
import { L, fmt } from '../i18n';
import { loadProfile } from '../save';
import { button, h, img, onKeys, show } from './dom';
import { goTitle, startRun } from './router';

export function bagUnlocked(id: string): boolean {
  const p = loadProfile();
  if (id === 'poussette') return p.bestBorder >= 3;
  if (id === 'accordeon') return p.bestBorder >= 5;
  if (id === 'malle') return p.wins > 0;
  return true;
}

/** Luggage and alert level before a run. */
export function showSetup(): void {
  const t = L();
  const profile = loadProfile();
  let bag = 'carton';
  let alert = 0;
  const cards = h('div.bag-cards');
  const alerts = h('div.alerts');
  const alertDesc = h('p.alert-desc');
  const render = () => {
    cards.replaceChildren(...BAGS.map((b) => {
      const tx = t.bags[b.id as keyof typeof t.bags];
      const open = bagUnlocked(b.id);
      return h(`button.bag-card${b.id === bag ? '.on' : ''}${open ? '' : '.locked'}` as 'button', {
        onclick: () => { if (open) { bag = b.id; audio.play('click'); render(); } else audio.play('deny'); },
      },
      img(`sac_${b.id}`, 'bag-art'),
      h('h3', {}, tx.name),
      h('div.grid-size', {}, fmt(t.setup.grid, { c: b.cols, r: b.rows })),
      h('p', {}, open ? tx.desc : fmt(t.setup.locked, { how: tx.unlock })));
    }));
    alerts.replaceChildren(...t.setup.alertDesc.map((_, i) => {
      const open = i <= profile.maxAlert;
      const b = h(`button.alert-btn${i === alert ? '.on' : ''}` as 'button', { onclick: () => { if (open) { alert = i; audio.play('click'); render(); } } }, String(i));
      b.disabled = !open;
      return b;
    }));
    alertDesc.textContent = t.setup.alertDesc[alert];
  };
  const scene = h('div.scene.setup', {},
    h('div.bg', { style: "background-image:url('img/bg_cave.webp')" }),
    h('div.setup-box', {},
      h('h1', {}, t.setup.title),
      cards,
      h('div.alert-row', {}, h('h3', {}, t.setup.alert), alerts, alertDesc),
      h('div.row', {},
        button(t.setup.back, () => goTitle(), 'ghost'),
        button(t.setup.start, () => { onKeys(null); startRun(bag, alert); }, 'primary'))));
  show(scene);
  render();
  onKeys((e) => { if (e.code === 'Escape') goTitle(); });
}
