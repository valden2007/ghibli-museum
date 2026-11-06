import { loadTimeline, loadFilms } from './data.js';
import { getLang, onLangChange } from './i18n.js';

const NEUTRAL_PALETTE = ['#2f5d3a', '#6b8f4e', '#a8c09a', '#d9c9a3', '#7a6a55'];

export async function initTimeline() {
  const container = document.querySelector('#timeline-list');
  const yearEl = document.querySelector('#timeline-year');
  const titleEl = document.querySelector('#timeline-title');
  const section = document.querySelector('#timeline');
  const timeline = document.querySelector('.timeline');
  if (!container || !timeline) return;

  let items;
  let films = [];
  try {
    const tr = await fetch('data/timeline.json?v=3');
    const data = tr.ok ? await tr.json() : null;
    items = Array.isArray(data) ? data : (data && data.milestones) ? data.milestones : await loadTimeline();
    films = await loadFilms();
  } catch (e) {
    console.error(e);
    return;
  }

  const lang = getLang();
  container.innerHTML = '';

  // weather + creature layer host (created once)
  let weatherHost = section.querySelector('.timeline-weather');
  if (!weatherHost) {
    weatherHost = document.createElement('div');
    weatherHost.className = 'timeline-weather';
    weatherHost.setAttribute('aria-hidden', 'true');
    section.prepend(weatherHost);
  }
  let creatureEl = null;

  function paletteFor(item) {
    const fid = item.relatedFilms && item.relatedFilms[0];
    const film = fid ? films.find((f) => f.id === fid) : null;
    return film && Array.isArray(film.palette) ? film.palette : NEUTRAL_PALETTE;
  }

  function applyWorld(item) {
    const pal = paletteFor(item);
    pal.forEach((c, i) => section.style.setProperty(`--c${i + 1}`, c));

    // Keep the era palette and optional static image slot; home stays calm.
    weatherHost.innerHTML = '';

    // creature
    if (creatureEl) { creatureEl.remove(); creatureEl = null; }
    const creature = item.creature;
    if (creature && creature.file) {
      const img = new Image();
      img.onload = () => {
        creatureEl = document.createElement('img');
        creatureEl.className = 'timeline-creature';
        creatureEl.src = creature.file;
        creatureEl.alt = creature.alt ? (creature.alt[lang] || creature.alt.ru) : '';
        creatureEl.setAttribute('aria-hidden', 'true');
        weatherHost.append(creatureEl);
      };
      img.onerror = () => {
        console.log(`missing creature: ${creature.file}`);
      };
      img.src = creature.file;
    } else if (creature && (creature.file === null || creature.file === undefined)) {
      console.log(`missing creature: docs/img/milestones/creatures/${item.slug}.png`);
    }
  }

  items.forEach((item, index) => {
    const el = document.createElement('article');
    el.className = 'timeline-item';
    el.dataset.index = String(index);
    el.innerHTML = `
      <div class="timeline-item-year">${item.year}</div>
      <h3 class="timeline-item-title">${item.title[lang] || item.title.ru}</h3>
      <p class="timeline-item-text">${item.text[lang] || item.text.ru}</p>
      <a class="timeline-item-more" href="history.html#${encodeURIComponent(item.slug)}">${lang === 'en' ? 'Details →' : 'Подробнее →'}</a>
    `;
    container.append(el);
  });

  // rail + nodes
  let rail = timeline.querySelector('.timeline-rail');
  if (rail) rail.remove();
  rail = document.createElement('div');
  rail.className = 'timeline-rail';
  rail.innerHTML = '<svg preserveAspectRatio="none"><line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--color-border)" stroke-width="2" stroke-dasharray="6 6"/><line class="rail-progress" x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--timeline-accent, var(--color-accent))" stroke-width="2" stroke-dasharray="1000" stroke-dashoffset="1000"/></svg>';
  timeline.append(rail);
  const progressLine = rail.querySelector('.rail-progress');

  container.querySelectorAll('.timeline-item').forEach((el) => {
    const node = document.createElement('span');
    node.className = 'timeline-node';
    node.style.top = '12px';
    el.prepend(node);
  });

  function positionNodes() {
    const timelineRect = timeline.getBoundingClientRect();
    container.querySelectorAll('.timeline-item').forEach((el) => {
      const node = el.querySelector('.timeline-node');
      if (!node) return;
      const r = el.getBoundingClientRect();
      const top = r.top - timelineRect.top + 14;
      node.style.top = `${top}px`;
    });
  }
  positionNodes();
  window.addEventListener('resize', positionNodes, { passive: true });

  // IntersectionObserver for active + reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const idx = Number(entry.target.dataset.index);
        const item = items[idx];
        if (!item) return;
        updatePanel(item, section, yearEl, titleEl);
        applyWorld(item);
        container.querySelectorAll('.timeline-node').forEach((n, i) => {
          n.classList.toggle('active', i === idx);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  container.querySelectorAll('.timeline-item').forEach((el) => io.observe(el));

  function updateRail() {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height;
    const passed = Math.min(total, Math.max(0, vh * 0.5 - rect.top));
    const pct = total > 0 ? passed / total : 0;
    if (progressLine) {
      const len = 1000;
      progressLine.style.strokeDashoffset = String(len * (1 - pct));
    }
  }
  window.addEventListener('scroll', updateRail, { passive: true });
  updateRail();

  if (items[0]) {
    updatePanel(items[0], section, yearEl, titleEl);
    applyWorld(items[0]);
  }

  onLangChange(() => {
    initTimeline();
  });
}

function updatePanel(item, section, yearEl, titleEl) {
  if (yearEl) {
    yearEl.classList.remove('roll');
    void yearEl.offsetWidth;
    yearEl.textContent = item.year;
    yearEl.classList.add('roll');
  }
  if (titleEl) titleEl.textContent = item.title[getLang()] || item.title.ru;
  if (section) {
    section.style.setProperty('--timeline-accent', item.accent || '#c9a227');
  }
}
