import { loadTimeline, loadFilms } from './data.js';
import { initI18n, getLang, onLangChange, setLang, t } from './i18n.js';
import { initNav } from './nav.js';
import { initReveal } from './reveal.js';

const listEl = document.querySelector('#history-list');

let milestones = [];
let films = [];
let intro = null;

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
  if (!listEl) return;
  const lang = getLang();
  listEl.innerHTML = '';
  if (intro) {
    const introBlock = document.createElement('section');
    introBlock.className = 'history-intro';
    const h = document.createElement('h2');
    h.textContent = t('history.introTitle') || (lang === 'en' ? 'Introduction' : 'Введение');
    const p1 = document.createElement('p');
    p1.textContent = intro[lang] || intro.ru;
    introBlock.append(h, p1);
    listEl.append(introBlock);
  }
  const sorted = [...milestones].sort((a, b) => a.year - b.year || a.slug.localeCompare(b.slug));
  sorted.forEach((m) => {
    if (!m.image) console.log(`missing milestone image: docs/img/milestones/${m.slug}.webp`);
    const section = document.createElement('section');
    section.className = 'history-milestone';
    section.id = m.slug;

    const year = document.createElement('p');
    year.className = 'history-year';
    year.textContent = m.year;

    const title = document.createElement('h2');
    title.className = 'history-title';
    title.textContent = m.title[lang] || m.title.ru;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'history-image';
    if (m.image) {
      const img = document.createElement('img');
      img.src = m.image;
      img.alt = m.title[lang] || m.title.ru;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        const ph = document.createElement('div');
        ph.className = 'milestone-placeholder';
        ph.textContent = lang === 'en' ? 'Image expected' : 'Изображение ожидается';
        imgWrap.append(ph);
      }, { once: true });
      imgWrap.append(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'milestone-placeholder';
      ph.textContent = lang === 'en' ? 'Image expected' : 'Изображение ожидается';
      imgWrap.append(ph);
    }

    const detail = document.createElement('p');
    detail.className = 'history-detail';
    detail.textContent = m.detail[lang] || m.detail.ru;

    const related = document.createElement('div');
    related.className = 'history-related';
    const ids = m.relatedFilms || [];
    if (ids.length) {
      ids.forEach((fid) => {
        const film = films.find((f) => f.id === fid);
        if (!film) return;
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = `film.html?id=${encodeURIComponent(fid)}`;
        a.textContent = film.title[lang] || film.title.ru;
        related.append(a);
      });
    }

    section.append(year, title, imgWrap, detail, related);
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
    const tl = await loadTimeline();
    milestones = tl;
    intro = tl.intro || null;
    films = await loadFilms();
  } catch (error) {
    console.error(error);
    return;
  }

  render();
  onLangChange(render);
}

init().catch((error) => console.error(error));
