import { loadFilms } from './data.js';
import { initI18n, getLang, onLangChange, setLang } from './i18n.js';
import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initReveal } from './reveal.js';
import { initSoot } from './soot.js';
import { initTimeline } from './timeline.js';
import { mountPlayer } from './player/index.js';

const grid = document.querySelector('#film-grid');
const filtersEl = document.querySelector('#film-filters');
const filmsSection = document.querySelector('.films-section');

let allFilms = [];
let activeEra = 'all';

function eras(films) {
  const set = new Set(films.map((f) => f.era));
  return ['all', ...Array.from(set)];
}

function renderFilters() {
  if (!filtersEl) return;
  filtersEl.innerHTML = '';
  eras(allFilms).forEach((era) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.type = 'button';
    btn.textContent = era === 'all' ? 'All' : era;
    btn.classList.toggle('active', era === activeEra);
    btn.addEventListener('click', () => {
      activeEra = era;
      renderFilters();
      renderFilms();
    });
    filtersEl.append(btn);
  });
}

function renderFilms() {
  if (!grid) return;
  grid.innerHTML = '';
  const lang = getLang();
  const list = activeEra === 'all' ? allFilms : allFilms.filter((f) => f.era === activeEra);
  list.forEach((film) => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `film.html?id=${encodeURIComponent(film.id)}`;
    card.dataset.era = film.era;

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

    // palette morph on hover
    card.addEventListener('mouseenter', () => {
      if (!filmsSection) return;
      film.palette.forEach((c, i) => {
        filmsSection.style.setProperty(`--c${i + 1}`, c);
      });
      filmsSection.classList.add('morphed');
    });
    card.addEventListener('mouseleave', () => {
      if (filmsSection) filmsSection.classList.remove('morphed');
    });
    card.addEventListener('focus', () => {
      if (!filmsSection) return;
      film.palette.forEach((c, i) => {
        filmsSection.style.setProperty(`--c${i + 1}`, c);
      });
      filmsSection.classList.add('morphed');
    });
    card.addEventListener('blur', () => {
      if (filmsSection) filmsSection.classList.remove('morphed');
    });

    grid.append(card);
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
  const showcase = document.querySelector('#player-showcase');
  if (showcase) {
    mountPlayer(showcase, { adapter: 'canvas', palette: ['#6fa8dc', '#b8d4e8', '#d9c98a', '#9fc9a0'] });
  }

  try {
    allFilms = await loadFilms();
    renderFilters();
    renderFilms();
  } catch (error) {
    if (grid) grid.textContent = 'Не удалось загрузить фильмы.';
    console.error(error);
  }
  onLangChange(() => renderFilms());
}

init().catch((error) => {
  console.error(error);
});