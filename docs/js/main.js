import { loadFilms } from './data.js';

const grid = document.querySelector('#film-grid');

async function init() {
  const films = await loadFilms();
  if (!grid) return;
  grid.innerHTML = '';
  for (const film of films) {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `film.html?id=${encodeURIComponent(film.id)}`;

    const swatch = document.createElement('div');
    swatch.className = 'card-swatch';
    swatch.style.background = `linear-gradient(135deg, ${film.palette.join(', ')})`;

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = film.title.ru;

    const year = document.createElement('p');
    year.className = 'card-year';
    year.textContent = film.year;

    body.append(title, year);
    card.append(swatch, body);
    grid.append(card);
  }
}

init().catch((error) => {
  if (grid) grid.textContent = 'Не удалось загрузить фильмы.';
  console.error(error);
});