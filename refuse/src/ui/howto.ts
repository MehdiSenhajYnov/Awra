import { L } from '../i18n';
import { button, h, modal } from './dom';

export function openHowto(onClose?: () => void): void {
  const t = L();
  let page = 0;
  const text = h('p.howto-text');
  const dots = h('div.dots');
  const box = h('div.menu-box.howto', {}, h('h2', {}, t.howto.title), text, dots);
  const m = modal(box);
  const next = button('→', () => {
    if (page < t.howto.pages.length - 1) { page++; render(); } else { m.close(); onClose?.(); }
  }, 'primary');
  const prev = button('←', () => { if (page > 0) { page--; render(); } }, 'small ghost');
  box.append(h('div.row', {}, prev, next));
  const render = () => {
    text.textContent = t.howto.pages[page];
    next.textContent = page === t.howto.pages.length - 1 ? t.howto.close : '→';
    prev.disabled = page === 0;
    dots.replaceChildren(...t.howto.pages.map((_, i) => h(`span${i === page ? '.on' : ''}` as 'span')));
  };
  render();
}
