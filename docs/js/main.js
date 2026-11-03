import { loadFilms } from './data.js';
import { initI18n, getLang, onLangChange, setLang } from './i18n.js';
import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initReveal } from './reveal.js';
import { initTimeline } from './timeline.js';

const grid = document.querySelector('#film-grid');

function renderFilms() {
  if (!grid) return;
  loadFilms().then((films) => {
    grid.innerHTML = '';
    const lang = getLang();
    for (const film of films) {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `film.html?id=${encodeURIComponent(film.id)}`;

      const swatch = document.createElement('div');
      swatch.className = 'card-swatch';
      swatch.style.background = `linear-gradient(135deg, ${film.palette.join(', ')})`;

      const body = document.createElement('div');
      body.className = 'card-body';

      const title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = film.title[lang] || film.title.ru;

      const year = document.createElement('p');
      year.className = 'card-year';
      year.textContent = film.year;

      body.append(title, year);
      card.append(swatch, body);
      grid.append(card);
    }
  }).catch((error) => {
    if (grid) grid.textContent = 'Не удалось загрузить фильмы.';
    console.error(error);
  });
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

  let lenis = null;
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  initNav(lenis);
  initLangSwitch();
  initHero();
  initReveal();
  initSoot();
  initTimeline();
  renderFilms();
  onLangChange(() => renderFilms());
}

init().catch((error) => {
  console.error(error);
});