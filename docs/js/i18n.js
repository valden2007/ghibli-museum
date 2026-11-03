import { loadI18n } from './data.js';

let dict = null;
let lang = 'ru';
const listeners = new Set();

export function getLang() {
  return lang;
}

export function t(key) {
  const entry = dict && dict[key];
  if (!entry) return null;
  return entry[lang] || entry.ru || null;
}

export async function initI18n() {
  dict = await loadI18n();
  const stored = localStorage.getItem('ghibli-lang');
  const browser = (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  lang = stored === 'ru' || stored === 'en' ? stored : browser;
  apply();
  updateHtmlLang();
}

export function setLang(next) {
  if (next !== 'ru' && next !== 'en') return;
  lang = next;
  localStorage.setItem('ghibli-lang', lang);
  apply();
  updateHtmlLang();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function apply() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = t(el.dataset.i18n);
    if (value !== null) el.textContent = value;
  });
}

function updateHtmlLang() {
  document.documentElement.lang = lang;
}