import { audio } from '../audio';
import { L } from '../i18n';
import { button, h, onKeys, show, typewriter } from './dom';

export function showIntro(onDone: () => void): void {
  const t = L();
  let page = 0;
  const text = h('div.letter-text');
  const next = button(t.intro.next, () => advance(), 'primary');
  const skip = button(t.intro.skip, () => finish(), 'ghost');
  const scene = h('div.scene.intro', {},
    h('div.bg.dim', { style: "background-image:url('img/bg_titre.webp')" }),
    h('div.letter', {}, text, h('div.row', {}, skip, next)));
  show(scene);
  audio.music('title');

  const finish = () => {
    onKeys(null);
    onDone();
  };
  const render = () => {
    audio.play('paper');
    next.textContent = page === t.intro.pages.length - 1 ? t.intro.begin : t.intro.next;
    void typewriter(text, t.intro.pages[page], 12);
  };
  const advance = () => {
    if (page >= t.intro.pages.length - 1) return finish();
    page++;
    render();
  };
  onKeys((e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); advance(); } });
  render();
}
