import { L } from '../i18n';
import { button, confirmBox, h, modal } from './dom';
import { openOptions } from './options';
import { goTitle } from './router';

/** Pause menu during a night. The campaign was saved when the night started. */
export function openPause(onResume: () => void): void {
  const t = L();
  const box = h('div.menu-box', {}, h('h2', {}, t.hud.pause));
  const m = modal(box);
  const onEsc = (e: KeyboardEvent) => { if (e.code === 'Escape') resume(); };
  const resume = () => {
    window.removeEventListener('keydown', onEsc);
    m.close();
    onResume();
  };
  setTimeout(() => window.addEventListener('keydown', onEsc), 0);
  box.append(
    button(t.options.resume, resume),
    button(t.title.options, () => openOptions(false)),
    button(t.options.toTitle, async () => {
      if (await confirmBox(t.options.toTitle + ' ?', t.hud.yes, t.hud.no)) {
        window.removeEventListener('keydown', onEsc);
        m.close();
        goTitle();
      }
    }),
  );
}
