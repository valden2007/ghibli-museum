const KEY = 'ghibli.settings.v1';

const defaults = () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(hover: none)').matches;
  let effects = 'full';
  if (reduce) effects = 'off';
  else if (touch) effects = 'lite';
  return {
    sound: false,
    volume: 0.5,
    effects,
    lang: (document.documentElement.lang === 'en') ? 'en' : 'ru',
  };
};

let state = null;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign({}, defaults(), parsed);
    } else {
      state = defaults();
    }
  } catch (e) {
    state = defaults();
  }
  applyAttrs();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
}

function applyAttrs() {
  document.documentElement.setAttribute('data-effects', state.effects);
  document.documentElement.setAttribute('data-sound', state.sound ? 'on' : 'off');
}

export function get() { if (!state) load(); return { ...state }; }

export function set(patch) {
  if (!state) load();
  Object.assign(state, patch || {});
  applyAttrs();
  save();
  const ev = new CustomEvent('settings:change', { detail: { ...state } });
  document.dispatchEvent(ev);
  listeners.forEach((fn) => { try { fn({ ...state }); } catch (e) {} });
  // sync lang with i18n if present
  if (patch && patch.lang && window.__setLang) {
    window.__setLang(patch.lang);
  }
}

export function subscribe(fn) {
  if (!state) load();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

load();
