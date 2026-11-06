import { loadTimeline, loadFilms, loadHistory } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';


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

  const creature = ms.creature;
  if (creature && creature.file) {
    const img = document.createElement('img');
    img.className = 'history-creature';
    img.src = creature.file;
    img.alt = creature.alt ? (creature.alt[lang] || creature.alt.ru) : '';
    img.setAttribute('aria-hidden', 'true');
    img.addEventListener('error', () => {
      console.log(`missing creature: ${creature.file}`);
      img.remove();
    }, { once: true });
    // static image, no animation
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

  wrap.append(year, title, imgWrap, detail, related);
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

  // filmography table
  const filmog = chapters.filmography || [];
  if (filmog.length) {
    const section = document.createElement('section');
    section.className = 'history-filmography';
    section.id = 'filmography';

    const h = document.createElement('h2');
    h.textContent = t('history.filmographyTitle') || (lang === 'en' ? 'Studio Filmography' : 'Фильмография студии');
    section.append(h);

    const table = document.createElement('table');
    table.className = 'history-table';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    const thYear = document.createElement('th');
    thYear.textContent = t('table.year') || (lang === 'en' ? 'Year' : 'Год');
    const thFilm = document.createElement('th');
    thFilm.textContent = t('table.film') || (lang === 'en' ? 'Film' : 'Фильм');
    const thDir = document.createElement('th');
    thDir.textContent = t('table.director') || (lang === 'en' ? 'Director' : 'Режиссёр');
    hr.append(thYear, thFilm, thDir);
    thead.append(hr);
    table.append(thead);

    const tbody = document.createElement('tbody');
    filmog.forEach((row) => {
      const tr = document.createElement('tr');
      const tdYear = document.createElement('td');
      tdYear.textContent = row.year;
      const tdFilm = document.createElement('td');
      tdFilm.textContent = row.title[lang] || row.title.ru;
      const tdDir = document.createElement('td');
      tdDir.textContent = row.director[lang] || row.director.ru;
      tr.append(tdYear, tdFilm, tdDir);
      tbody.append(tr);
    });
    table.append(tbody);
    section.append(table);

    // footnote special
    const special = chapters.filmographySpecial || [];
    if (special.length) {
      const foot = document.createElement('div');
      foot.className = 'history-special';
      const fh = document.createElement('h3');
      fh.textContent = t('history.specialTitles') || (lang === 'en' ? 'Special titles' : 'Особые позиции');
      foot.append(fh);
      special.forEach((row) => {
        const p = document.createElement('p');
        p.textContent = `${row.year} — ${row.title[lang] || row.title.ru} (${row.director[lang] || row.director.ru}) — ${row.note[lang] || row.note.ru}`;
        foot.append(p);
      });
      section.append(foot);
    }

    listEl.append(section);
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
