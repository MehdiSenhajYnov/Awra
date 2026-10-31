import { audio } from '../audio';

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | null | undefined | false;

/** Tiny element factory: h('div.card#id', { onclick }, children). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K | `${K}.${string}` | `${K}#${string}`, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const [head, ...classes] = tag.split('.');
  const [name, id] = head.split('#');
  const el = document.createElement(name as K);
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function asset(name: string): string {
  return `img/${name}.webp`;
}

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  return h(`button.btn${cls ? `.${cls.split(' ').join('.')}` : ''}` as 'button', {
    onclick: () => {
      audio.play('click');
      onClick();
    },
  }, label);
}

export function img(name: string, cls = '', alt = ''): HTMLImageElement {
  return h(`img${cls ? `.${cls}` : ''}` as 'img', { src: asset(name), alt, draggable: 'false' });
}

export const stage = (): HTMLElement => document.getElementById('stage')!;

/** Replaces the whole stage content with a fade. */
export function show(scene: HTMLElement): void {
  const s = stage();
  s.replaceChildren(scene);
  scene.classList.add('scene-enter');
  requestAnimationFrame(() => scene.classList.remove('scene-enter'));
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Types a paragraph progressively; resolves when done or skipped by a click. */
export function typewriter(el: HTMLElement, text: string, speed = 18): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.textContent = text;
      el.removeEventListener('click', finish);
      resolve();
    };
    el.addEventListener('click', finish);
    const tick = () => {
      if (done) return;
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) finish();
      else setTimeout(tick, speed);
    };
    tick();
  });
}

let keyHandler: ((e: KeyboardEvent) => void) | null = null;

/** One scene-level keyboard handler at a time. */
export function onKeys(handler: ((e: KeyboardEvent) => void) | null): void {
  if (keyHandler) window.removeEventListener('keydown', keyHandler);
  keyHandler = handler;
  if (handler) window.addEventListener('keydown', handler);
}

export function modal(content: HTMLElement, cls = ''): { el: HTMLElement; close: () => void } {
  const el = h(`div.modal${cls ? `.${cls}` : ''}` as 'div', {}, h('div.modal-box', {}, content));
  stage().append(el);
  requestAnimationFrame(() => el.classList.add('open'));
  return {
    el,
    close: () => {
      el.classList.remove('open');
      setTimeout(() => el.remove(), 250);
    },
  };
}

export function confirmBox(text: string, yes: string, no: string): Promise<boolean> {
  return new Promise((resolve) => {
    const box = h('div.confirm', {}, h('p', {}, text));
    const m = modal(box, 'small');
    box.append(h('div.row', {},
      button(yes, () => { m.close(); resolve(true); }, 'danger'),
      button(no, () => { m.close(); resolve(false); })));
  });
}
