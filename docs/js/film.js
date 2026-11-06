import { loadFilms, loadImages } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initNav } from './nav.js';
import { mountMotif, mountCombined } from './motifs/index.js';
import { initReveal } from './reveal.js';
import { mountPlayer } from './player/index.js';

const titleEl = document.querySelector('#film-title');
const metaEl = document.querySelector('#film-meta');
const contentEl = document.querySelector('#film-content');
const emptyEl = document.querySelector('#film-empty');
const synopsisEl = document.querySelector('#film-synopsis');
const factsEl = document.querySelector('#film-facts');

const heroEl = document.querySelector('#film-hero');
const heroBg = document.querySelector('#film-hero-bg');
const prevLink = document.querySelector('#prev-film');
const nextLink = document.querySelector('#next-film');

let films = [];
let imagesData = {};
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

function renderCharacters(film) {
  const slot = document.querySelector('#film-characters-slot');
  if (!slot) return;
  slot.innerHTML = '';
  if (!film || !Array.isArray(film.characters) || film.characters.length === 0) {
    slot.hidden = true;
    return;
  }
  slot.hidden = false;
  const h = document.createElement('h2');
  h.textContent = t('film.charactersTitle') || 'Герои мира';
  const list = document.createElement('div');
  list.className = 'film-characters';
  film.characters.forEach((ch) => {
    const card = document.createElement('div');
    card.className = 'film-character';
    const name = document.createElement('strong');
    name.textContent = (ch.name && (ch.name[getLang()] || ch.name.ru)) || '';
    const role = document.createElement('p');
    role.textContent = (ch.role && (ch.role[getLang()] || ch.role.ru)) || '';
    const mood = document.createElement('p');
    mood.className = 'muted';
    mood.textContent = (ch.mood && (ch.mood[getLang()] || ch.mood.ru)) || '';
    card.append(name, role, mood);
    if (ch.image) {
      const img = document.createElement('img');
      img.src = ch.image;
      img.alt = name.textContent;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        const ph = document.createElement('div');
        ph.className = 'film-character-silhouette';
        ph.setAttribute('aria-hidden', 'true');
        card.prepend(ph);
      }, { once: true });
      card.prepend(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'film-character-silhouette';
      ph.setAttribute('aria-hidden', 'true');
      card.prepend(ph);
    }
    list.append(card);
  });
  slot.append(h, list);
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
    imagesData = await loadImages();
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
    motifHandle = null;
    const fx = film.fx || {};
    const types = [];
    const params = [];
    if (fx.base) { types.push(fx.base.type); params.push(fx.base.params); }
    if (fx.accent) { types.push(fx.accent.type); params.push(fx.accent.params); }
    if (fx.silhouette) { types.push(fx.silhouette.type); params.push(fx.silhouette.params); }
    if (types.length) {
      motifHandle = mountCombined(heroBg, types, film.palette, params);
    }
    // decor slot
    const decorInfo = imagesData?.[film.id]?.decor;
    if (decorInfo && decorInfo.file) {
      const dimg = document.createElement('img');
      dimg.className = 'film-decor';
      dimg.src = decorInfo.file;
      dimg.alt = decorInfo.alt || '';
      dimg.addEventListener('error', () => {
        console.log(`missing decor: ${decorInfo.file}`);
        dimg.remove();
      }, { once: true });
      heroBg.append(dimg);
    }
  }

  const slot = document.querySelector('#film-player-slot');
  if (slot) {
    slot.innerHTML = '';
    if (film.trailerId) {
      mountPlayer(slot, { adapter: 'youtube', videoId: film.trailerId, palette: film.palette });
    } else {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Трейлер скоро.';
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = `https://www.youtube.com/results?search_query=${encodeURIComponent((film.title.en || film.title.ru) + ' trailer')}`;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Поискать трейлер на YouTube';
      slot.append(p, a);
    }
  }

  if (contentEl) contentEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;

  renderCharacters(currentFilm);

  renderText();
  onLangChange(renderText);
}

init().catch((error) => console.error(error));