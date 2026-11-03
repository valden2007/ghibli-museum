import { loadFilms } from './data.js';

const titleEl = document.querySelector('#film-title');
const emptyEl = document.querySelector('#empty');

async function init() {
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

  if (titleEl) titleEl.textContent = film.title.ru;
}

init();