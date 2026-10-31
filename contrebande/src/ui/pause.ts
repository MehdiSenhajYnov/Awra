import type { RunState } from '../game/run';
import { L } from '../i18n';
import { clearRun } from '../save';
import { button, confirmBox, h, modal } from './dom';
import { openHowto } from './howto';
import { openOptions } from './options';
import { goTitle } from './router';

/** Pause menu over the cellar. The run is saved on every change, so leaving loses nothing. */
export function openPause(run: RunState): void {
  const t = L();
  const box = h('div.menu-box', {}, h('h2', {}, t.options.resume));
  const m = modal(box);
  box.append(
    button(t.options.resume, () => m.close(), 'primary'),
    button(t.title.howto, () => openHowto()),
    button(t.title.options, () => openOptions()),
    button(t.options.toTitle, () => { m.close(); goTitle(); }),
    button(t.options.abandon, async () => {
      if (await confirmBox(t.options.abandonConfirm, t.options.yes, t.options.no)) {
        m.close();
        if (!run.daily) clearRun();
        goTitle();
      }
    }, 'ghost'),
  );
}
