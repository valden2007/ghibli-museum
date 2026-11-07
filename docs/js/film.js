import { loadFilms, loadImages } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initNav } from './nav.js';
import { mountCombined } from './motifs/index.js';
import { initReveal } from './reveal.js';
import { mountPlayer } from './player/index.js';
import { mountMusicPlayer } from './music-player.js';
import { get as getSettings, subscribe as subscribeSettings } from './settings.js';
import * as sceneAudio from './audio.js';
import * as sceneKit from './scenes/kit.js';
import { sceneModules } from './scenes/manifest.js';
import { createMotionController } from './motion.js';

const titleEl = document.querySelector('#film-title');
const metaEl = document.querySelector('#film-meta');
const taglineEl = document.querySelector('#film-tagline');
const contentEl = document.querySelector('#film-content');
const emptyEl = document.querySelector('#film-empty');
const heroEl = document.querySelector('#film-hero');
const heroBg = document.querySelector('#film-hero-bg');
const prevLink = document.querySelector('#prev-film');
const nextLink = document.querySelector('#next-film');

let films = [];
let imagesData = {};
let currentFilm = null;
let musicPlayerHandle = null;
let galleryImages = [];
let galleryIndex = 0;
let activeScene = null;
let sceneFallback = null;
let activeSceneModule = null;
let sceneThemeLink = null;
let sceneDebugTimer = 0;

const sectionIds = ['world', 'plot', 'characters', 'creation', 'inspiration', 'crew', 'facts', 'themes', 'gallery', 'opinion', 'trailer', 'sources'];

const lightbox = document.querySelector('#film-lightbox');
let lightboxReturnFocus = null;

function renderLightbox() {
  if (!lightbox || !galleryImages.length) return;
  const lang = getLang();
  const item = galleryImages[galleryIndex];
  const img = lightbox.querySelector('.lightbox-image');
  img.src = item.file;
  img.alt = (item.alt && (item.alt[lang] || item.alt.ru)) || '';
  if (Array.isArray(item.srcset) && item.srcset.length) {
    img.srcset = item.srcset.map((variant) => `${variant.file} ${variant.w}w`).join(', ');
    img.sizes = '90vw';
  } else img.removeAttribute('srcset');
  if (item.w) img.width = item.w;
  if (item.h) img.height = item.h;
  lightbox.querySelector('.lightbox-caption').textContent = item.caption?.[lang] || item.caption?.ru || '';
  lightbox.querySelector('.lightbox-credit').textContent = item.credit || '';
}

function openLightbox(index) {
  if (!lightbox) return;
  galleryIndex = index;
  lightboxReturnFocus = document.activeElement;
  renderLightbox();
  lightbox.hidden = false;
  document.body.classList.add('lightbox-open');
  lightbox.querySelector('.lightbox-close')?.focus();
}

function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.hidden = true;
  document.body.classList.remove('lightbox-open');
  lightboxReturnFocus?.focus?.();
}

function moveLightbox(direction) {
  if (!galleryImages.length) return;
  galleryIndex = (galleryIndex + direction + galleryImages.length) % galleryImages.length;
  renderLightbox();
}

lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => moveLightbox(-1));
lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => moveLightbox(1));
lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (event) => {
  if (!lightbox || lightbox.hidden) return;
  if (event.key === 'Escape') closeLightbox();
  else if (event.key === 'ArrowLeft') moveLightbox(-1);
  else if (event.key === 'ArrowRight') moveLightbox(1);
});

function loadFilmTheme(id) {
  if (sceneThemeLink) sceneThemeLink.remove();
  sceneThemeLink = document.createElement('link');
  sceneThemeLink.rel = 'stylesheet';
  sceneThemeLink.href = `css/films/${id}.css`;
  sceneThemeLink.dataset.filmTheme = id;
  document.head.append(sceneThemeLink);
}

function resetScene() {
  activeScene?.unmount?.();
  activeScene?.destroy?.();
  activeScene = null;
  sceneFallback?.destroy?.();
  sceneFallback = null;
}

async function mountFilmScene(film) {
  if (!heroBg) return;
  resetScene();
  document.body.classList.add('film-page');
  document.body.dataset.filmWorld = film.id;
  heroBg.classList.add('film-scene-root');
  if (heroBg.parentElement !== document.body) document.body.prepend(heroBg);
  heroBg.style.background = `linear-gradient(155deg, ${(film.palette || []).join(', ')})`;
  loadFilmTheme(film.id);

  const settings = getSettings();
  const effectLevel = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : settings.effects;
  if (sceneModules[film.id]) {
    try {
      const module = await import(sceneModules[film.id]);
      activeSceneModule = module.default || module;
      const ctx = { root: heroBg, palette: film.palette, settings: getSettings(), audio: sceneAudio, kit: sceneKit };
      const result = await activeSceneModule.mount(ctx);
      activeScene = result || activeSceneModule;
      activeScene?.onEffects?.(effectLevel);
    } catch (error) {
      console.error(`Film scene failed: ${film.id}`, error);
      activeSceneModule = null;
    }
  }

  if (!activeSceneModule) {
    const fx = film.fx || {};
    const types = [];
    const params = [];
    if (fx.base) { types.push(fx.base.type); params.push(fx.base.params); }
    if (fx.accent) { types.push(fx.accent.type); params.push(fx.accent.params); }
    if (fx.silhouette) { types.push(fx.silhouette.type); params.push(fx.silhouette.params); }
    if (types.length) sceneFallback = mountCombined(heroBg, types, film.palette, params, { effects: effectLevel });
    const slot = imagesData?.[film.id]?.decor;
    const creatureFile = slot && slot.file;
    if (creatureFile) {
      const decor = document.createElement('img');
      decor.className = 'film-decor';
      decor.src = creatureFile;
      decor.alt = slot.alt || '';
      decor.setAttribute('aria-hidden', 'true');
      decor.addEventListener('error', () => { console.log(`missing decor: ${creatureFile}`); decor.remove(); }, { once: true });
      heroBg.append(decor);
    } else {
      console.log(`missing film scene creature: docs/img/film-creatures/${film.id}.png`);
    }
  }

  if (new URLSearchParams(location.search).has('debug')) mountSceneDebug();
}

function mountSceneDebug() {
  if (sceneDebugTimer) clearInterval(sceneDebugTimer);
  const debug = document.createElement('pre');
  debug.className = 'scene-debug';
  debug.textContent = 'scene debug';
  document.body.append(debug);
  window.__sceneStats = () => ({
    film: document.body.dataset.filmWorld,
    canvas: heroBg?.querySelectorAll('canvas').length || 0,
    effects: getSettings().effects,
    module: Boolean(activeSceneModule),
    ...sceneKit.getStats(),
  });
  const update = () => { debug.textContent = JSON.stringify(window.__sceneStats(), null, 2); };
  update();
  sceneDebugTimer = setInterval(update, 500);
  window.addEventListener('pagehide', () => clearInterval(sceneDebugTimer), { once: true });
}

function applyPalette(film) {
  (film.palette || []).forEach((c, i) => {
    document.documentElement.style.setProperty(`--c${i + 1}`, c);
  });
  if (heroEl) heroEl.style.background = `linear-gradient(135deg, ${(film.palette || []).join(', ')})`;
}

function showSection(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
  const navLink = document.querySelector(`.film-subnav a[href="#${id}"]`);
  if (navLink) navLink.hidden = false;
}

function hideSection(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
  const navLink = document.querySelector(`.film-subnav a[href="#${id}"]`);
  if (navLink) navLink.hidden = true;
}

function renderText() {
  if (!currentFilm) return;
  const lang = getLang();
  const film = currentFilm;

  if (titleEl) {
    const span = titleEl.querySelector('span');
    if (span) span.textContent = film.title[lang] || film.title.ru;
    else titleEl.textContent = film.title[lang] || film.title.ru;
  }
  if (metaEl) metaEl.textContent = `${film.year} · ${film.director}`;
  if (taglineEl) {
    const tg = film.tagline && (film.tagline[lang] || film.tagline.ru);
    taglineEl.textContent = tg || '';
    taglineEl.hidden = !tg;
  }

  // world
  const worldEl = document.getElementById('film-world');
  const worldText = film.world && (film.world[lang] || film.world.ru);
  if (worldText) { worldEl.textContent = worldText; showSection('world'); } else hideSection('world');

  // plot
  const plotEl = document.getElementById('film-plot');
  const plotText = film.plot && (film.plot[lang] || film.plot.ru);
  if (plotText) { plotEl.textContent = plotText; showSection('plot'); } else hideSection('plot');

  // characters
  const charsEl = document.getElementById('film-characters');
  const chars = Array.isArray(film.characters) ? film.characters : [];
  if (chars.length) {
    charsEl.innerHTML = '';
    chars.forEach((ch) => {
      const card = document.createElement('div');
      card.className = 'film-character';
      if (ch.image) {
        const img = document.createElement('img');
        img.src = ch.image;
        img.alt = (ch.name && (ch.name[lang] || ch.name.ru)) || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => { img.remove(); }, { once: true });
        card.append(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'film-character-silhouette';
        ph.setAttribute('aria-hidden', 'true');
        const initial = ((ch.name && (ch.name[lang] || ch.name.ru)) || '?').charAt(0).toUpperCase();
        ph.textContent = initial;
        card.append(ph);
      }
      const name = document.createElement('strong');
      name.textContent = (ch.name && (ch.name[lang] || ch.name.ru)) || '';
      const role = document.createElement('p');
      role.textContent = (ch.role && (ch.role[lang] || ch.role.ru)) || '';
      const desc = document.createElement('p');
      desc.textContent = (ch.description && (ch.description[lang] || ch.description.ru)) || '';
      card.append(name, role, desc);
      charsEl.append(card);
    });
    showSection('characters');
  } else hideSection('characters');

  // creation
  const creationEl = document.getElementById('film-creation');
  const creationText = film.creation && (film.creation[lang] || film.creation.ru);
  if (creationText) {
    creationEl.innerHTML = '';
    creationText.split('\n\n').forEach((para) => {
      const p = document.createElement('p');
      p.textContent = para.trim();
      creationEl.append(p);
    });
    showSection('creation');
  } else hideSection('creation');

  // inspiration
  const inspEl = document.getElementById('film-inspiration');
  const insp = Array.isArray(film.inspiration) ? film.inspiration : [];
  if (insp.length) {
    inspEl.innerHTML = '';
    insp.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'film-inspiration-item';
      const h = document.createElement('h3');
      h.textContent = (item.title && (item.title[lang] || item.title.ru)) || '';
      const p = document.createElement('p');
      p.textContent = (item.text && (item.text[lang] || item.text.ru)) || '';
      div.append(h, p);
      inspEl.append(div);
    });
    showSection('inspiration');
  } else hideSection('inspiration');

  // crew
  const musicEl = document.getElementById('film-music');
  const notesEl = document.getElementById('film-notes');
  const musicText = film.crew && film.crew.music && (film.crew.music[lang] || film.crew.music.ru);
  const notesText = film.crew && film.crew.notes && (film.crew.notes[lang] || film.crew.notes.ru);
  if (musicText || notesText) {
    if (musicEl) { musicEl.textContent = musicText || ''; musicEl.hidden = !musicText; }
    if (notesEl) { notesEl.textContent = notesText || ''; notesEl.hidden = !notesText; }
    showSection('crew');
  } else hideSection('crew');

  // soundtrack player
  const soundtrack = Array.isArray(film.soundtrack) ? film.soundtrack : [];
  const musicSlot = document.getElementById('film-music-player');
  if (soundtrack.length && musicSlot) {
    showSection('music');
    if (!musicPlayerHandle) musicPlayerHandle = mountMusicPlayer(musicSlot, soundtrack, lang, () => {});
    else musicPlayerHandle.setLang(lang);
  } else {
    hideSection('music');
    if (musicSlot) musicSlot.replaceChildren();
    musicPlayerHandle?.destroy();
    musicPlayerHandle = null;
  }

  // facts
  const factsEl = document.getElementById('film-facts');
  const facts = Array.isArray(film.facts) ? film.facts : [];
  if (facts.length) {
    factsEl.innerHTML = '';
    facts.forEach((f) => {
      const li = document.createElement('li');
      li.textContent = f[lang] || f.ru;
      factsEl.append(li);
    });
    showSection('facts');
  } else hideSection('facts');

  // themes
  const themesEl = document.getElementById('film-themes');
  const themes = Array.isArray(film.themes) ? film.themes : [];
  if (themes.length) {
    themesEl.innerHTML = '';
    themes.forEach((th) => {
      const span = document.createElement('span');
      span.className = 'theme-pill';
      span.textContent = th[lang] || th.ru;
      themesEl.append(span);
    });
    showSection('themes');
  } else hideSection('themes');

  // gallery
  const galleryEl = document.getElementById('film-gallery');
  const images = Array.isArray(film.images) ? film.images : [];
  galleryImages = images;
  if (images.length) {
    galleryEl.innerHTML = '';
    images.forEach((im, index) => {
      const figure = document.createElement('figure');
      figure.className = 'film-gallery-item';
      const img = document.createElement('img');
      img.alt = (im.alt && (im.alt[lang] || im.alt.ru)) || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      if (im.w) img.width = im.w;
      if (im.h) img.height = im.h;
      if (Array.isArray(im.srcset) && im.srcset.length) {
        img.srcset = im.srcset.map((variant) => `${variant.file} ${variant.w}w`).join(', ');
        img.sizes = '(max-width: 720px) 88vw, 720px';
      }
      if (im.blur) {
        img.style.backgroundImage = `url("${im.blur}")`;
        img.classList.add('is-blurred');
        img.addEventListener('load', () => img.classList.remove('is-blurred'), { once: true });
      }
      img.addEventListener('click', () => openLightbox(index));
      img.src = im.file;
      figure.append(img);
      if (im.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = im.caption[lang] || im.caption.ru;
        figure.append(cap);
      }
      if (im.credit) {
        const cr = document.createElement('p');
        cr.className = 'muted';
        cr.textContent = im.credit;
        figure.append(cr);
      }
      galleryEl.append(figure);
    });
    showSection('gallery');
  } else hideSection('gallery');

  // opinion
  const opinionEl = document.getElementById('film-opinion');
  const opinion = film.opinion;
  const opinionText = opinion && (opinion[lang] || opinion.ru);
  if (opinionText) {
    opinionEl.textContent = opinionText;
    showSection('opinion');
  } else hideSection('opinion');

  // sources
  const sourcesEl = document.getElementById('film-sources');
  const sources = Array.isArray(film.sources) ? film.sources : [];
  if (sources.length) {
    sourcesEl.innerHTML = '';
    sources.forEach((s) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.label;
      li.append(a);
      sourcesEl.append(li);
    });
    showSection('sources');
  } else hideSection('sources');

  // trailer
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

  // neighbors
  const sorted = [...films].sort((a, b) => a.year - b.year);
  const idx = sorted.findIndex((f) => f.id === film.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  if (prevLink) {
    if (prev) {
      prevLink.href = `film.html?id=${encodeURIComponent(prev.id)}`;
      prevLink.textContent = `← ${prev.title[lang] || prev.title.ru}`;
      prevLink.hidden = false;
    } else prevLink.hidden = true;
  }
  if (nextLink) {
    if (next) {
      nextLink.href = `film.html?id=${encodeURIComponent(next.id)}`;
      nextLink.textContent = `${next.title[lang] || next.title.ru} →`;
      nextLink.hidden = false;
    } else nextLink.hidden = true;
  }

  if (lightbox && !lightbox.hidden) renderLightbox();
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
  const motion = createMotionController();
  const initialSettings = getSettings();
  const initialEffects = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : initialSettings.effects;
  initNav(motion.setEffects(initialEffects));
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

  await mountFilmScene(film);
  subscribeSettings((settings) => {
    const effectLevel = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : settings.effects;
    motion.setEffects(effectLevel);
    if (activeScene) activeScene.onEffects?.(effectLevel);
    else sceneFallback?.motif?.setEffects?.(effectLevel);
  });

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

  renderText();
  onLangChange(renderText);
}

init().catch((error) => console.error(error));
