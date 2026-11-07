import { get as getSettings, set as setSettings, subscribe as subscribeSettings } from './settings.js';
import { setLang, getLang } from './i18n.js';
import * as audio from './audio.js';

export function initSettingsUI() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'settings-btn';
  btn.setAttribute('aria-label', 'Настройки');
  btn.textContent = '⚙';
  header.append(btn);

  const panel = document.createElement('div');
  panel.className = 'settings-panel';
  panel.hidden = true;
  header.append(panel);

  // sound toggle
  const soundRow = document.createElement('div');
  soundRow.className = 'settings-row';
  const soundLabel = document.createElement('span');
  soundLabel.textContent = 'Звук';
  const soundToggle = document.createElement('button');
  soundToggle.type = 'button';
  soundToggle.className = 'settings-toggle';
  soundRow.append(soundLabel, soundToggle);
  panel.append(soundRow);

  // volume
  const volRow = document.createElement('div');
  volRow.className = 'settings-row';
  const volLabel = document.createElement('span');
  volLabel.textContent = 'Громкость';
  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '1';
  volSlider.step = '0.05';
  volRow.append(volLabel, volSlider);
  panel.append(volRow);

  // effects
  const effRow = document.createElement('div');
  effRow.className = 'settings-row';
  const effLabel = document.createElement('span');
  effLabel.textContent = 'Эффекты';
  const effOpts = document.createElement('div');
  effOpts.className = 'settings-opts';
  const effButtons = {};
  ['full', 'lite', 'off'].forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'settings-opt';
    b.textContent = v === 'full' ? 'Полные' : v === 'lite' ? 'Лёгкие' : 'Выключены';
    b.addEventListener('click', () => setSettings({ effects: v }));
    effOpts.append(b);
    effButtons[v] = b;
  });
  effRow.append(effLabel, effOpts);
  panel.append(effRow);

  // lang
  const langRow = document.createElement('div');
  langRow.className = 'settings-row';
  const langLabel = document.createElement('span');
  langLabel.textContent = 'Язык';
  const langOpts = document.createElement('div');
  langOpts.className = 'settings-opts';
  ['ru', 'en'].forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'settings-opt';
    b.textContent = v.toUpperCase();
    b.addEventListener('click', () => setSettings({ lang: v }));
    langOpts.append(b);
    if (!window.__langOpts) window.__langOpts = {};
    window.__langOpts[v] = b;
  });
  langRow.append(langLabel, langOpts);
  panel.append(langRow);

  // indicator
  const indicator = document.createElement('span');
  indicator.className = 'settings-indicator';
  indicator.innerHTML = '<i></i><i></i><i></i>';
  btn.append(indicator);

  function sync(s) {
    soundToggle.textContent = s.sound ? 'Вкл' : 'Выкл';
    soundToggle.classList.toggle('active', s.sound);
    volSlider.value = s.volume;
    Object.keys(effButtons).forEach((k) => effButtons[k].classList.toggle('active', s.effects === k));
    if (window.__langOpts) {
      Object.keys(window.__langOpts).forEach((k) => window.__langOpts[k].classList.toggle('active', s.lang === k));
    }
    indicator.classList.toggle('playing', s.sound);
  }

  const initialSettings = getSettings();
  sync(initialSettings);
  audio.setThemeTrack(initialSettings.themeTrack);
  subscribeSettings(sync);

  soundToggle.addEventListener('click', () => {
    const s = getSettings();
    setSettings({ sound: !s.sound });
    if (!s.sound) {
      audio.init();
      audio.setEnabled(true);
      audio.setVolume(getSettings().volume || 0.5);
      audio.playAmbient();
      setSettings({ sound: true });
    } else {
      audio.stopAmbient();
      audio.setEnabled(false);
    }
  });

  volSlider.addEventListener('input', () => {
    setSettings({ volume: parseFloat(volSlider.value) });
    audio.setVolume(parseFloat(volSlider.value));
  });

  // toggle panel
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      const first = panel.querySelector('button');
      if (first) first.focus();
    } else {
      btn.focus();
    }
  });

  // close on outside click / esc
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
      panel.hidden = true;
      btn.focus();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      btn.focus();
    }
  });

  // audio enabled sync
  subscribeSettings((s) => {
    audio.setEnabled(s.sound);
    audio.setVolume(s.volume);
    audio.setThemeTrack(s.themeTrack);
    if (s.sound) audio.playAmbient();
    else audio.stopAmbient();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettingsUI);
} else {
  initSettingsUI();
}
