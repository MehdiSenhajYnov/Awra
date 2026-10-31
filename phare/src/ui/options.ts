import { L, LOCALES, type Lang, fmt } from '../i18n';
import { settings, updateSettings } from '../settings';
import { button, confirmBox, h, modal } from './dom';

const STORM_CHOICES = [0, 30, 45, 90];

export interface OptionHooks {
  onLangChange?: () => void;
  keeperName?: { get: () => string; set: (name: string) => void };
  onReset?: () => void;
  onTopChange?: (on: boolean) => void;
  desktop?: boolean;
}

export function openOptions(hooks: OptionHooks = {}): void {
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
      hooks.onLangChange?.();
      openOptions(hooks);
    }, code === s.lang ? 'small active' : 'small')));
  const storms = h('div.row', {}, ...STORM_CHOICES.map((n) =>
    button(n ? fmt(t.options.stormEvery, { n }) : t.options.stormOff, () => {
      updateSettings({ storms: n });
      for (const b of storms.querySelectorAll('button')) b.classList.remove('active');
      storms.children[STORM_CHOICES.indexOf(n)].classList.add('active');
    }, n === s.storms ? 'small active' : 'small')));

  box.append(h('div.opt', {}, h('span', {}, t.options.language), langs));
  if (hooks.keeperName) {
    const input = h('input.text', { type: 'text', maxlength: 18, value: hooks.keeperName.get(), placeholder: t.title.keeperDefault }) as HTMLInputElement;
    input.addEventListener('change', () => hooks.keeperName!.set(input.value.trim()));
    box.append(h('label.opt', {}, h('span', {}, t.options.keeper), input));
  }
  box.append(
    h('div.opt', {}, h('span', {}, t.options.storms), storms),
    slider(t.options.master, 'master'),
    slider(t.options.music, 'music'),
    slider(t.options.effects, 'effects'),
    toggle(t.options.fast, s.fast, (v) => updateSettings({ fast: v })),
  );
  if (hooks.desktop) box.append(toggle(t.options.onTop, s.onTop, (v) => { updateSettings({ onTop: v }); hooks.onTopChange?.(v); }));
  else box.append(toggle(t.options.fullscreen, !!document.fullscreenElement, (v) => {
    if (v) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    else if (document.fullscreenElement) void document.exitFullscreen();
  }));
  const row = h('div.row', {}, button(t.credits.title, () => {
    const cb = h('div.menu-box', {}, h('h2', {}, t.credits.title), h('p.credits', {}, t.credits.body));
    const cm = modal(cb);
    cb.append(button(t.options.close, () => cm.close(), 'primary'));
  }, 'small'));
  if (hooks.onReset) row.append(button(t.title.reset, async () => {
    if (await confirmBox(t.title.resetConfirm, t.options.yes, t.options.no)) { m.close(); hooks.onReset!(); }
  }, 'small ghost'));
  box.append(row, button(t.options.close, () => m.close(), 'primary'));
}
