import { loadFilms } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initNav } from './nav.js';
import { mountMotif } from './motifs/index.js';
import { initReveal } from './reveal.js';

const titleEl = document.querySelector('#film-title');
const metaEl = document.querySelector('#film-meta');
const contentEl = document.querySelector('#film-content');
const emptyEl = document.querySelector('#film-empty');
const synopsisEl = document.querySelector('#film-synopsis');
const factsEl = document.querySelector('#film-facts');
const watchEl = document.querySelector('#film-watch');
const heroEl = document.querySelector('#film-hero');
const heroBg = document.querySelector('#film-hero-bg');
const prevLink = document.querySelector('#prev-film');
const nextLink = document.querySelector('#next-film');

let films = [];
let currentFilm = null;
let motifHandle = null;

function applyPalette(film) {
  film.palette.forEach((c, i) => {
    document.documentElement.style.setProperty(`--c${i + 1}`, c);
  });
  // page background tint
  document.body.style.background = `radial-gradient(ellipse at top, ${film.palette[0]}22, var(--color-bg) 60%)`;
  if (heroEl) {
    heroEl.style.background = `linear-gradient(135deg, ${film.palette.join(', ')})`;
  }
}

function renderText() {
  if (!currentFilm) return;
  const lang = getLang();
  if (titleEl) {
    const span = titleEl.querySelector('span');
    if (span) span.textContent = currentFilm.title[lang] || currentFilm.title.ru;
    else titleEl.textContent = currentFilm.title[lang] || currentFilm.title.ru;
  }
  if (metaEl) {
    metaEl.textContent = `${currentFilm.year} · ${currentFilm.director}`;
  }
  if (synopsisEl) synopsisEl.textContent = currentFilm.synopsis[lang] || currentFilm.synopsis.ru;
  if (factsEl) {
    factsEl.innerHTML = '';
    (currentFilm.facts || []).forEach((f) => {
      const li = document.createElement('li');
      li.textContent = f[lang] || f.ru;
      factsEl.append(li);
    });
  }
  if (watchEl) {
    watchEl.innerHTML = '';
    if (!currentFilm.watch || currentFilm.watch.length === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = t('film.watch.empty') || 'Скоро';
      watchEl.append(p);
    } else {
      currentFilm.watch.forEach((w) => {
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = w.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = w.region || w.url;
        watchEl.append(a);
      });
    }
  }
  // neighbors
  const sorted = [...films].sort((a, b) => a.year - b.year);
  const idx = sorted.findIndex((f) => f.id === currentFilm.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  if (prevLink) {
    if (prev) {
      prevLink.href = `film.html?id=${encodeURIComponent(prev.id)}`;
      prevLink.textContent = `← ${prev.title[lang] || prev.title.ru}`;
      prevLink.hidden = false;
    } else {
      prevLink.hidden = true;
    }
  }
  if (nextLink) {
    if (next) {
      nextLink.href = `film.html?id=${encodeURIComponent(next.id)}`;
      nextLink.textContent = `${next.title[lang] || next.title.ru} →`;
      nextLink.hidden = false;
    } else {
      nextLink.hidden = true;
    }
  }
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
  let lenis = null;
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  await initI18n();
  initNav(lenis);
  initLangSwitch();
  initReveal();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  try {
    films = await loadFilms();
  } catch (error) {
    console.error(error);
    if (titleEl) titleEl.textContent = 'Не удалось загрузить данные';
    return;
  }

  const film = films.find((item) => item.id === id);
  if (!film) {
    if (emptyEl) emptyEl.hidden = false;
    if (contentEl) contentEl.hidden = true;
    if (titleEl) {
      const span = titleEl.querySelector('span');
      if (span) span.textContent = 'Фильм не найден';
      else titleEl.textContent = 'Фильм не найден';
    }
    return;
  }

  currentFilm = film;
  applyPalette(film);

  if (heroBg) {
    if (motifHandle) motifHandle.destroy();
    motifHandle = mountMotif(heroBg, film.motif, film.palette);
  }

  if (contentEl) contentEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;

  renderText();
  onLangChange(renderText);
}

init().catch((error) => console.error(error));