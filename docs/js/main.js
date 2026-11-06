import { loadFilms, loadImages } from './data.js';
import { initI18n, getLang, onLangChange, setLang } from './i18n.js';
import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initReveal } from './reveal.js';
import { initSoot } from './soot.js';
import { initTimeline } from './timeline.js';

import { mountMotif } from './motifs/index.js';
import { createCatalogCard } from './catalog-card.js';

const grid = document.querySelector('#film-grid');
const filtersEl = document.querySelector('#film-filters');
const filmsSection = document.querySelector('.films-section');

const sceneBackdrop = document.createElement('div');
sceneBackdrop.className = 'scene-backdrop';
filmsSection?.prepend(sceneBackdrop);

const filmsWeatherHost = document.createElement('div');
filmsWeatherHost.className = 'films-weather';
filmsSection?.prepend(filmsWeatherHost);

const filmsDecor = document.createElement('img');
filmsDecor.className = 'films-decor';
filmsDecor.alt = '';
filmsDecor.setAttribute('aria-hidden', 'true');
filmsSection?.append(filmsDecor);

let filmsWeatherHandle = null;
let decorLoaded = false;

function applyIdle() {
  if (filmsSection) filmsSection.classList.remove('is-world');
  sceneBackdrop.classList.remove('is-active');
  sceneBackdrop.style.background = '';
  if (filmsWeatherHandle) { filmsWeatherHandle.destroy(); filmsWeatherHandle = null; }
  filmsWeatherHost.innerHTML = '';
  filmsDecor.style.opacity = '0';
  filmsDecor.removeAttribute('src');
  decorLoaded = false;
}

function applyWorld(detail) {
  if (!detail) return;
  const palette = Array.isArray(detail.palette) ? detail.palette : [];
  if (filmsSection) {
    filmsSection.classList.add('is-world');
    palette.forEach((c, i) => filmsSection.style.setProperty(`--c${i + 1}`, c));
  }
  // global backdrop tint
  if (palette.length) {
    sceneBackdrop.style.background = `radial-gradient(ellipse at 30% 20%, ${palette[0]}33, transparent 60%), radial-gradient(ellipse at 70% 80%, ${palette[2] || palette[0]}22, transparent 60%)`;
    sceneBackdrop.classList.add('is-active');
  }
  // weather motif
  if (filmsWeatherHandle) { filmsWeatherHandle.destroy(); filmsWeatherHandle = null; }
  filmsWeatherHost.innerHTML = '';
  if (detail.motif) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) filmsWeatherHandle = mountMotif(filmsWeatherHost, detail.motif, palette);
  }
  // decor slot
  const decorInfo = imagesData[detail.id]?.decor;
  if (decorInfo && decorInfo.file) {
    const img = new Image();
    img.onload = () => {
      filmsDecor.src = decorInfo.file;
      filmsDecor.alt = decorInfo.alt || '';
      filmsDecor.style.opacity = '0.6';
      decorLoaded = true;
    };
    img.onerror = () => {
      console.log(`missing decor: ${decorInfo.file}`);
      filmsDecor.style.opacity = '0';
    };
    img.src = decorInfo.file;
  } else {
    filmsDecor.style.opacity = '0';
    if (decorInfo === null || decorInfo === undefined) {
      // convention fallback
      const conv = `img/decor/${detail.id}.png`;
      // do not request; log only
      // console.log(`missing decor: ${conv}`);
    }
  }
}

grid?.addEventListener('card:activate', (event) => {
  applyWorld(event.detail);
});
grid?.addEventListener('card:deactivate', (event) => {
  applyIdle();
});
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

let imagesData = {};
let cardInstances = [];

function morphSection(film) {
  if (!filmsSection) return;
  (film.palette || []).forEach((color, i) => {
    filmsSection.style.setProperty(`--c${i + 1}`, color);
  });
  filmsSection.classList.add('morphed');
}

function renderFilms() {
  if (!grid) return;
  cardInstances.forEach((instance) => instance?.destroy?.());
  cardInstances = [];
  grid.innerHTML = '';
  const lang = getLang();
  const list = activeEra === 'all' ? allFilms : allFilms.filter((f) => f.era === activeEra);
  list.forEach((film) => {
    const instance = createCatalogCard(film, imagesData[film.id], lang);
    cardInstances.push(instance);
    const el = instance.element;
    el.addEventListener('mouseenter', () => morphSection(film));
    el.addEventListener('mouseleave', () => filmsSection?.classList.remove('morphed'));
    el.addEventListener('focusin', () => morphSection(film));
    el.addEventListener('focusout', () => filmsSection?.classList.remove('morphed'));
    grid.append(el);
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

  try {
    allFilms = await loadFilms();
    imagesData = await loadImages();
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