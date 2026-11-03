import { loadFilms } from './data.js';
import { initI18n, getLang, onLangChange, setLang } from './i18n.js';
import { initNav } from './nav.js';

const titleEl = document.querySelector('#film-title');
const emptyEl = document.querySelector('#empty');

let currentFilm = null;

function renderTitle() {
  if (!currentFilm) return;
  const lang = getLang();
  if (titleEl) titleEl.textContent = currentFilm.title[lang] || currentFilm.title.ru;
}

function initLangSwitch() {
  document.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
    btn.classList.toggle('active', btn.dataset.lang === getLang());
  });
  onLangChange((lang) => {
    document.querySelectorAll('.lang-switch button[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  });
}

async function init() {
  await initI18n();
  initNav();
  initLangSwitch();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  let films;
  try {
    films = await loadFilms();
  } catch (error) {
    if (titleEl) titleEl.textContent = 'Не удалось загрузить данные';
    console.error(error);
    return;
  }

  const film = films.find((item) => item.id === id);
  if (!film) {
    if (titleEl) titleEl.textContent = 'Фильм не найден';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  currentFilm = film;
  renderTitle();
  onLangChange(renderTitle);
}

init().catch((error) => console.error(error));