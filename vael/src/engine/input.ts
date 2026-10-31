// Actions, not keys: keyboard (rebindable, by physical key code) and standard gamepads feed the same per-frame state.

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'blade' | 'blink' | 'art' | 'heal' | 'dash' | 'map' | 'inv' | 'pause' | 'confirm' | 'back';

export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'blade', 'blink', 'art', 'heal', 'dash', 'map', 'inv', 'pause'];

export type Bindings = Record<Action, string[]>;

export const DEFAULT_KEYS: Bindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ'],
  attack: ['KeyX', 'KeyJ'],
  blade: ['KeyC', 'KeyK'],
  blink: ['KeyV', 'KeyL'],
  art: ['KeyQ', 'KeyO'],
  heal: ['KeyF', 'KeyU'],
  dash: ['ShiftLeft', 'KeyI'],
  map: ['Tab', 'KeyM'],
  inv: ['KeyE', 'KeyB'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
};

// Standard mapping button indices.
const PAD: Record<Action, number[]> = {
  left: [14],
  right: [15],
  up: [12],
  down: [13],
  jump: [0],
  attack: [2],
  blade: [3],
  blink: [1],
  art: [7],
  heal: [4],
  dash: [5, 6],
  map: [8],
  inv: [],
  pause: [9],
  confirm: [0],
  back: [1],
};

class Input {
  private keys = new Set<string>();
  private now = new Set<Action>();
  private before = new Set<Action>();
  /** Presses buffered for a few frames so a jump pressed just before landing still counts. */
  private buffer = new Map<Action, number>();
  bindings: Bindings = structuredClone(DEFAULT_KEYS);
  /** Set while the options menu waits for a key to bind. */
  capture: ((code: string) => void) | null = null;
  lastDevice: 'keyboard' | 'pad' = 'keyboard';
  axisX = 0;
  axisY = 0;
  /** Scripted input for tests and demos; overrides devices when set. */
  script: Set<Action> | null = null;

  attach(): void {
    window.addEventListener('keydown', (e) => {
      if (this.capture) {
        e.preventDefault();
        const cb = this.capture;
        this.capture = null;
        cb(e.code);
        return;
      }
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Call once per fixed update. */
  poll(): void {
    this.before = this.now;
    this.now = new Set();
    if (this.script) {
      for (const a of this.script) this.now.add(a);
    } else {
      for (const a of Object.keys(this.bindings) as Action[]) {
        if (this.bindings[a].some((k) => this.keys.has(k))) this.now.add(a);
      }
      this.axisX = (this.now.has('right') ? 1 : 0) - (this.now.has('left') ? 1 : 0);
      this.axisY = (this.now.has('down') ? 1 : 0) - (this.now.has('up') ? 1 : 0);
      const pads = navigator.getGamepads?.() ?? [];
      for (const p of pads) {
        if (!p) continue;
        let any = false;
        for (const a of Object.keys(PAD) as Action[]) {
          if (PAD[a].some((i) => p.buttons[i]?.pressed)) { this.now.add(a); any = true; }
        }
        const ax = p.axes[0] ?? 0;
        const ay = p.axes[1] ?? 0;
        if (Math.abs(ax) > 0.35) { this.now.add(ax < 0 ? 'left' : 'right'); this.axisX = Math.sign(ax); any = true; }
        if (Math.abs(ay) > 0.5) { this.now.add(ay < 0 ? 'up' : 'down'); this.axisY = Math.sign(ay); any = true; }
        if (any) this.lastDevice = 'pad';
      }
      if (!this.now.has('left') && !this.now.has('right')) this.axisX = 0;
      else this.axisX = (this.now.has('right') ? 1 : 0) - (this.now.has('left') ? 1 : 0);
      this.axisY = (this.now.has('down') ? 1 : 0) - (this.now.has('up') ? 1 : 0);
    }
    if (this.script) {
      this.axisX = (this.now.has('right') ? 1 : 0) - (this.now.has('left') ? 1 : 0);
      this.axisY = (this.now.has('down') ? 1 : 0) - (this.now.has('up') ? 1 : 0);
    }
    for (const [a, n] of this.buffer) {
      if (n <= 1) this.buffer.delete(a); else this.buffer.set(a, n - 1);
    }
    for (const a of this.now) if (!this.before.has(a)) this.buffer.set(a, 8);
  }

  held(a: Action): boolean {
    return this.now.has(a);
  }

  pressed(a: Action): boolean {
    return this.now.has(a) && !this.before.has(a);
  }

  released(a: Action): boolean {
    return !this.now.has(a) && this.before.has(a);
  }

  /** A press within the last few frames; consumed on use. */
  buffered(a: Action): boolean {
    if (!this.buffer.has(a)) return false;
    this.buffer.delete(a);
    return true;
  }

  clearBuffer(): void {
    this.buffer.clear();
  }

  /** Display name of the first key bound to an action. */
  keyName(a: Action): string {
    if (this.lastDevice === 'pad') {
      const names: Record<number, string> = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Select', 9: 'Start', 12: '↑', 13: '↓', 14: '←', 15: '→' };
      return names[PAD[a][0]] ?? '?';
    }
    const code = this.bindings[a][0] ?? '';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const map: Record<string, string> = { Space: '␣', ShiftLeft: 'Maj', ShiftRight: 'Maj', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc', Enter: '↵', Tab: 'Tab', Backspace: '⌫' };
    return map[code] ?? code;
  }
}

export const input = new Input();
