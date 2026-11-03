import { createCatalogCard } from './catalog-card.js';

const mount = document.querySelector('#catalog-prototype');
const status = document.querySelector('#catalog-status');

async function init() {
  const [filmsResponse, imagesResponse] = await Promise.all([
    fetch('data/films.json'),
    fetch('data/images.json'),
  ]);
  if (!filmsResponse.ok || !imagesResponse.ok) throw new Error('Не удалось загрузить данные прототипа.');

  const [films, images] = await Promise.all([filmsResponse.json(), imagesResponse.json()]);
  const film = films.find(({ id }) => id === 'totoro');
  if (!film) throw new Error('Фильм totoro отсутствует в films.json.');

  const prototype = createCatalogCard(film, images.totoro, document.documentElement.lang === 'en' ? 'en' : 'ru');
  mount.append(prototype.element);
  status.textContent = images.totoro?.file
    ? 'Кадр загружен из локального WebP.'
    : 'Кадр не приложен: отображается штатный бумажный placeholder.';
}

init().catch((error) => {
  status.textContent = error.message;
  console.error(error);
});
