import { L, LOCALES, type Lang } from '../i18n';
import { settings, updateSettings } from '../settings';
import { button, h, modal } from './dom';

export function openOptions(onLangChange?: () => void): void {
  const t = L();
  const s = settings();
  const box = h('div.menu-box.options', {}, h('h2', {}, t.options.title));
  const m = modal(box);

  const slider = (label: string, key: 'master' | 'music' | 'effects') => {
    const input = h('input', { type: 'range', min: 0, max: 100, value: Math.round(s[key] * 100), id: `opt-${key}` }) as HTMLInputElement;
    input.addEventListener('input', () => updateSettings({ [key]: Number(input.value) / 100 }));
    return h('label.opt', { for: `opt-${key}` }, h('span', {}, label), input);
  };
  const toggle = (label: string, value: boolean, apply: (v: boolean) => void) => {
    const b = button(value ? t.options.on : t.options.off, () => {
      value = !value;
      b.textContent = value ? t.options.on : t.options.off;
      apply(value);
    }, 'small');
    return h('div.opt', {}, h('span', {}, label), b);
  };
  const langs = h('div.row', {}, ...(Object.keys(LOCALES) as Lang[]).map((code) =>
    button(LOCALES[code].meta.lang, () => {
      updateSettings({ lang: code });
      m.close();
      onLangChange?.();
      openOptions(onLangChange);
    }, code === s.lang ? 'small active' : 'small')));

  box.append(
    h('div.opt', {}, h('span', {}, t.options.language), langs),
    slider(t.options.master, 'master'),
    slider(t.options.music, 'music'),
    slider(t.options.effects, 'effects'),
    toggle(t.options.fast, s.fast, (v) => updateSettings({ fast: v })),
    toggle(t.options.fullscreen, !!document.fullscreenElement, (v) => {
      if (v) void document.documentElement.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) void document.exitFullscreen();
    }),
    button(t.options.close, () => m.close(), 'primary'),
  );
}
