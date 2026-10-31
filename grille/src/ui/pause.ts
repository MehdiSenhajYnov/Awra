import type { RunState } from '../game/run';
import { L } from '../i18n';
import { clearRun } from '../save';
import { button, confirmBox, h, modal } from './dom';
import { openHowto } from './howto';
import { openOptions } from './options';
import { finishRun, goTitle } from './router';

/** Pause menu. The run is saved after every word, so leaving loses only the half-typed one. */
export function openPause(run: RunState): void {
  const t = L();
  const box = h('div.menu-box', {}, h('h2', {}, t.hud.pause));
  const m = modal(box);
  box.append(
    button(t.options.resume, () => m.close(), 'primary'),
    button(t.title.howto, () => openHowto()),
    button(t.title.options, () => openOptions()),
    button(t.options.toTitle, () => { m.close(); goTitle(); }),
  );
  if (run.phase === 'grid') {
    box.append(button(t.hud.giveUp, async () => {
      if (await confirmBox(t.hud.giveUpConfirm, t.options.yes, t.options.no)) {
        m.close();
        run.phase = 'lost';
        finishRun(run);
      }
    }, 'ghost'));
  }
  box.append(button(t.options.abandon, async () => {
    if (await confirmBox(t.options.abandonConfirm, t.options.yes, t.options.no)) {
      m.close();
      if (!run.daily) clearRun();
      goTitle();
    }
  }, 'ghost'));
}
