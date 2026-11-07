import { loadFilms, loadImages } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { get as getSettings } from './settings.js';
import * as audio from './audio.js';

const cardsEl = document.querySelector('#lost-cards');
const langButton = document.querySelector('#lost-lang');

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function renderCards(films, images) {
  if (!cardsEl) return;
  const lang = getLang();
  cardsEl.replaceChildren();
  shuffle(films).slice(0, 3).forEach((film) => {
    const info = images[film.id];
    const link = document.createElement('a');
    link.className = 'lost-card';
    link.href = `film.html?id=${encodeURIComponent(film.id)}`;
    if (info?.file) {
      const img = document.createElement('img');
      img.src = info.fileSm || info.file;
      img.alt = info[lang === 'en' ? 'altEn' : 'altRu'] || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      link.append(img);
    }
    const title = document.createElement('strong');
    title.textContent = film.title[lang] || film.title.ru;
    const year = document.createElement('span');
    year.textContent = String(film.year);
    link.append(title, year);
    cardsEl.append(link);
  });
}

async function init() {
  await initI18n();
  const settings = getSettings();
  document.documentElement.setAttribute('data-effects', settings.effects);
  document.documentElement.setAttribute('data-sound', settings.sound ? 'on' : 'off');

  if (settings.effects === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('.lost-lights')?.setAttribute('hidden', '');
  } else if (settings.effects === 'lite') {
    document.querySelectorAll('.lost-light').forEach((light, index) => {
      if (index > 0) light.remove();
    });
  }

  const [films, images] = await Promise.all([loadFilms(), loadImages()]);
  renderCards(films, images);
  langButton.textContent = getLang() === 'ru' ? 'EN' : 'RU';
  langButton.addEventListener('click', () => {
    setLang(getLang() === 'ru' ? 'en' : 'ru');
  });
  onLangChange(() => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = t(el.dataset.i18n);
      if (value !== null) el.textContent = value;
    });
    langButton.textContent = getLang() === 'ru' ? 'EN' : 'RU';
    renderCards(films, images);
  });

  if (settings.sound) {
    const startAudio = () => {
      audio.init();
      audio.setEnabled(true);
      audio.setVolume(settings.volume);
      audio.playAmbient();
      document.removeEventListener('pointerdown', startAudio);
      document.removeEventListener('keydown', startAudio);
    };
    document.addEventListener('pointerdown', startAudio, { once: true });
    document.addEventListener('keydown', startAudio, { once: true });
  }
}

init().catch((error) => console.error(error));
