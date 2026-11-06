import { loadTimeline, loadFilms, loadHistory } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';
import { mountMotif } from './motifs/index.js';

const listEl = document.querySelector('#history-list');

let milestones = [];
let films = [];
let chapters = [];

const PRIMARY_MOTIF = {
  '1985-founding': 'clouds',
  '1988-totoro-grave': 'rain',
  '2001-ghibli-museum': 'clouds',
  '2001-spirited': 'lanterns',
  '2003-oscar-spirited': 'lanterns',
  '2013-wind': 'wind',
  '2022-ghibli-park': 'leaves',
  '2023-boy-heron': 'stars',
  '2024-oscar-boy-heron': 'stars',
};
const NEUTRAL_PALETTE = ['#2f5d3a', '#6b8f4e', '#a8c09a', '#d9c9a3', '#7a6a55'];

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

function paletteFor(slug) {
  const ms = milestones.find((m) => m.slug === slug);
  const fid = ms && ms.relatedFilms && ms.relatedFilms[0];
  const film = fid ? films.find((f) => f.id === fid) : null;
  return film && Array.isArray(film.palette) ? film.palette : NEUTRAL_PALETTE;
}

function renderMilestoneInlay(ms) {
  const lang = getLang();
  const wrap = document.createElement('article');
  wrap.className = 'history-milestone-inlay';
  wrap.id = ms.slug;

  const year = document.createElement('p');
  year.className = 'history-year';
  year.textContent = ms.year;

  const title = document.createElement('h3');
  title.className = 'history-title';
  title.textContent = ms.title[lang] || ms.title.ru;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'history-image';
  if (ms.image) {
    const img = document.createElement('img');
    img.src = ms.image;
    img.alt = ms.title[lang] || ms.title.ru;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      console.log(`missing milestone image: ${ms.image}`);
      img.remove();
      const ph = document.createElement('div');
      ph.className = 'milestone-placeholder';
      ph.textContent = lang === 'en' ? 'Image expected' : 'Изображение ожидается';
      imgWrap.append(ph);
    }, { once: true });
    imgWrap.append(img);
  } else {
    console.log(`missing milestone image: docs/img/milestones/${ms.slug}.webp`);
    const ph = document.createElement('div');
    ph.className = 'milestone-placeholder';
    ph.textContent = lang === 'en' ? 'Image expected' : 'Изображение ожидается';
    imgWrap.append(ph);
  }

  const detail = document.createElement('p');
  detail.className = 'history-detail';
  detail.textContent = ms.detail[lang] || ms.detail.ru;

  const weather = document.createElement('div');
  weather.className = 'history-weather';
  weather.setAttribute('aria-hidden', 'true');
  const pal = paletteFor(ms.slug);
  const motifType = PRIMARY_MOTIF[ms.slug];
  if (motifType) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) mountMotif(weather, motifType, pal);
  }

  const creature = ms.creature;
  if (creature && creature.file) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('img');
      c.className = 'history-creature';
      c.src = creature.file;
      c.alt = creature.alt ? (creature.alt[lang] || creature.alt.ru) : '';
      c.setAttribute('aria-hidden', 'true');
      weather.append(c);
    };
    img.onerror = () => console.log(`missing creature: ${creature.file}`);
    img.src = creature.file;
  } else if (creature && (creature.file === null || creature.file === undefined)) {
    console.log(`missing creature: docs/img/milestones/creatures/${ms.slug}.png`);
  }

  const related = document.createElement('div');
  related.className = 'history-related';
  const ids = ms.relatedFilms || [];
  ids.forEach((fid) => {
    const film = films.find((f) => f.id === fid);
    if (!film) return;
    const a = document.createElement('a');
    a.className = 'btn';
    a.href = `film.html?id=${encodeURIComponent(fid)}`;
    a.textContent = film.title[lang] || film.title.ru;
    related.append(a);
  });

  wrap.append(year, title, imgWrap, detail, weather, related);
  return wrap;
}

function render() {
  if (!listEl) return;
  const lang = getLang();
  listEl.innerHTML = '';
  chapters.forEach((ch) => {
    const section = document.createElement('section');
    section.className = 'history-chapter';
    section.id = `chapter-${ch.id}`;

    const title = document.createElement('h2');
    title.className = 'history-chapter-title';
    title.textContent = ch.title[lang] || ch.title.ru;

    const body = document.createElement('div');
    body.className = 'history-chapter-body';
    const p = document.createElement('p');
    p.textContent = ch.body[lang] || ch.body.ru;
    body.append(p);

    section.append(title, body);

    (ch.milestoneSlugs || []).forEach((slug) => {
      const ms = milestones.find((m) => m.slug === slug);
      if (!ms) return;
      const inlay = renderMilestoneInlay(ms);
      section.append(inlay);
    });

    listEl.append(section);
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

  try {
    milestones = await loadTimeline();
    films = await loadFilms();
    chapters = await loadHistory();
  } catch (error) {
    console.error(error);
    return;
  }

  render();
  onLangChange(render);
}

init().catch((error) => console.error(error));
