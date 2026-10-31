import { L, LOCALES, type Lang } from '../i18n';
import { settings, updateSettings } from '../settings';
import { button, h, modal } from './dom';

export function openOptions(fromTitle: boolean, onChange?: () => void): void {
  const t = L();
  const s = settings();
  const box = h('div.menu-box.options', {}, h('h2', {}, t.options.title));
  const m = modal(box);

  const slider = (label: string, key: 'master' | 'ambience' | 'effects') => {
    const input = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s[key] * 100) }) as HTMLInputElement;
    input.addEventListener('input', () => updateSettings({ [key]: Number(input.value) / 100 }));
    return h('label.opt', {}, h('span', {}, label), input);
  };
  const toggle = (label: string, value: boolean, on: string, off: string, apply: (v: boolean) => void) => {
    const b = button(value ? on : off, () => {
      value = !value;
      b.textContent = value ? on : off;
      apply(value);
    }, 'small');
    return h('div.opt', {}, h('span', {}, label), b);
  };

  const langs = h('div.row', {}, ...(Object.keys(LOCALES) as Lang[]).map((code) =>
    button(LOCALES[code].meta.lang, () => {
      updateSettings({ lang: code });
      m.close();
      onChange?.();
      if (fromTitle) openOptions(true, onChange);
    }, code === (s.lang ?? '') ? 'small active' : 'small')));

  box.append(
    h('div.opt', {}, h('span', {}, t.options.language), langs),
    slider(t.options.master, 'master'),
    slider(t.options.ambience, 'ambience'),
    slider(t.options.effects, 'effects'),
    toggle(t.options.shake, s.shake, t.options.on, t.options.off, (v) => updateSettings({ shake: v })),
    toggle(t.options.textSize, s.largeText, t.options.large, t.options.small, (v) => updateSettings({ largeText: v })),
    toggle(t.options.fullscreen, !!document.fullscreenElement, t.options.on, t.options.off, (v) => {
      if (v) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) void document.exitFullscreen();
    }),
    button(t.options.close, () => m.close(), 'primary'),
  );
}
