import { loadTimeline, loadFilms } from './data.js';
import { initI18n, getLang, onLangChange, setLang } from './i18n.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';

const yearEl = document.querySelector('#milestone-year');
const titleEl = document.querySelector('#milestone-title');
const contentEl = document.querySelector('#milestone-content');
const emptyEl = document.querySelector('#milestone-empty');
const detailEl = document.querySelector('#milestone-detail');
const relatedEl = document.querySelector('#milestone-related');
const prevLink = document.querySelector('#prev-milestone');
const nextLink = document.querySelector('#next-milestone');

let milestones = [];
let films = [];
let current = null;

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

function render() {
  if (!current) return;
  const lang = getLang();
  if (yearEl) yearEl.textContent = current.year;
  if (titleEl) {
    const span = titleEl.querySelector('span');
    if (span) span.textContent = current.title[lang] || current.title.ru;
    else titleEl.textContent = current.title[lang] || current.title.ru;
  }
  if (detailEl) detailEl.textContent = current.detail[lang] || current.detail.ru;

  // related films
  if (relatedEl) {
    relatedEl.innerHTML = '';
    const ids = current.relatedFilms || [];
    if (!ids.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = lang === 'en' ? 'No linked films' : 'Связанных фильмов нет';
      relatedEl.append(p);
    } else {
      ids.forEach((fid) => {
        const film = films.find((f) => f.id === fid);
        if (!film) return;
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = `film.html?id=${encodeURIComponent(fid)}`;
        a.textContent = film.title[lang] || film.title.ru;
        relatedEl.append(a);
      });
    }
  }

  // neighbors by year
  const sorted = [...milestones].sort((a, b) => a.year - b.year || a.slug.localeCompare(b.slug));
  const idx = sorted.findIndex((m) => m.slug === current.slug);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  if (prevLink) {
    if (prev) {
      prevLink.href = `milestone.html?id=${encodeURIComponent(prev.slug)}`;
      prevLink.textContent = `← ${prev.title[lang] || prev.title.ru}`;
      prevLink.hidden = false;
    } else {
      prevLink.hidden = true;
    }
  }
  if (nextLink) {
    if (next) {
      nextLink.href = `milestone.html?id=${encodeURIComponent(next.slug)}`;
      nextLink.textContent = `${next.title[lang] || next.title.ru} →`;
      nextLink.hidden = false;
    } else {
      nextLink.hidden = true;
    }
  }

  // hero image
  const heroBg = document.querySelector('#milestone-hero-bg');
  if (heroBg) {
    heroBg.innerHTML = '';
    if (current.image) {
      const img = document.createElement('img');
      img.src = current.image;
      img.alt = current.title[lang] || current.title.ru;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        console.log(`missing milestone image: ${current.image}`);
        img.remove();
        const ph = document.createElement('div');
        ph.className = 'milestone-placeholder';
        ph.textContent = lang === 'en' ? 'Image expected' : 'Изображение ожидается';
        heroBg.append(ph);
      }, { once: true });
      heroBg.append(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'milestone-placeholder';
      ph.textContent = lang === 'en' ? 'Image expected' : 'Изображение ожидается';
      heroBg.append(ph);
    }
  }
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
    const tr = await fetch('data/timeline.json?v=2');
    milestones = tr.ok ? await tr.json() : await loadTimeline();
    films = await loadFilms();
  } catch (error) {
    console.error(error);
    if (titleEl) titleEl.textContent = 'Не удалось загрузить данные';
    return;
  }

  const ms = milestones.find((m) => m.slug === id);
  if (ms && !ms.image) {
    console.log(`missing milestone image: docs/img/milestones/${ms.slug}.webp`);
  }
  if (!ms) {
    if (emptyEl) emptyEl.hidden = false;
    if (contentEl) contentEl.hidden = true;
    if (titleEl) {
      const span = titleEl.querySelector('span');
      if (span) span.textContent = 'Веха не найдена';
      else titleEl.textContent = 'Веха не найдена';
    }
    return;
  }

  current = ms;
  if (contentEl) contentEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;
  render();
  onLangChange(render);
}

init().catch((error) => console.error(error));
