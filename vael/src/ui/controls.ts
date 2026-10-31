import { Container, Graphics, type Text } from 'pixi.js';
import { audio } from '../engine/audio';
import { ACTIONS, type Action, DEFAULT_KEYS, input } from '../engine/input';
import { t } from '../i18n';
import { GOLD, PALE, panel, star, style, text } from './draw';
import type { Modal } from './modals';

/** Shows every action and its keys; select one and press a key to rebind it. */
export class ControlsScreen implements Modal {
  c = new Container();
  private sel = 0;
  private rows: Text[] = [];
  private g = new Graphics();
  private waiting = false;
  private list: (Action | 'reset')[] = [...ACTIONS, 'reset'];

  constructor(private onChange: () => void) {
    this.c.addChild(new Graphics().rect(0, 0, 1920, 1080).fill({ color: 0x020206, alpha: 0.85 }));
    const p = panel(1100, 960, 0.9);
    p.position.set(410, 60);
    this.c.addChild(p, this.g, text(t('options.keys'), style('title', GOLD, 40, 'center'), 960, 110, 0.5, 0.5));
    this.list.forEach((_, i) => {
      const r = text('', style('body', PALE, 30), 520, 180 + i * 58, 0, 0.5);
      this.rows.push(r);
      this.c.addChild(r);
    });
  }

  update(): boolean {
    if (this.waiting) return false;
    const n = this.list.length;
    if (input.pressed('down')) { this.sel = (this.sel + 1) % n; audio.play('uiMove'); }
    if (input.pressed('up')) { this.sel = (this.sel + n - 1) % n; audio.play('uiMove'); }
    if (input.pressed('confirm') || input.pressed('jump')) {
      const a = this.list[this.sel];
      if (a === 'reset') {
        for (const k of ACTIONS) input.bindings[k] = [...DEFAULT_KEYS[k]];
        this.onChange();
        audio.play('ui');
      } else {
        this.waiting = true;
        input.capture = (code) => {
          if (code !== 'Escape') {
            // The key leaves any other action it was bound to.
            for (const k of ACTIONS) input.bindings[k] = input.bindings[k].filter((c) => c !== code);
            input.bindings[a] = [code, ...input.bindings[a].filter((c) => c !== code)].slice(0, 2);
            this.onChange();
          }
          setTimeout(() => (this.waiting = false), 100);
          audio.play('ui');
        };
      }
    }
    this.draw();
    return !this.waiting && (input.pressed('back') || input.pressed('pause'));
  }

  private draw(): void {
    this.g.clear();
    this.list.forEach((a, i) => {
      const r = this.rows[i];
      if (a === 'reset') r.text = t('options.reset');
      else {
        const keys = input.bindings[a].map((c) => c.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '')).join('  /  ');
        r.text = `${t(`actions.${a}`)}  —  ${this.waiting && i === this.sel ? t('options.pressKey') : keys}`;
      }
      r.alpha = i === this.sel ? 1 : 0.6;
      if (i === this.sel) star(this.g, 490, r.y, 10, GOLD);
    });
  }
}
