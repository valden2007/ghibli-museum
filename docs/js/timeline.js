import { loadTimeline } from './data.js';
import { getLang, onLangChange } from './i18n.js';

export async function initTimeline() {
  const container = document.querySelector('#timeline-list');
  const yearEl = document.querySelector('#timeline-year');
  const titleEl = document.querySelector('#timeline-title');
  const section = document.querySelector('#timeline');
  const timeline = document.querySelector('.timeline');
  if (!container || !timeline) return;

  let items;
  try {
    const tr = await fetch('data/timeline.json?v=2');
    items = tr.ok ? await tr.json() : await loadTimeline();
  } catch (e) {
    console.error(e);
    return;
  }

  const lang = getLang();
  container.innerHTML = '';
  items.forEach((item, index) => {
    const el = document.createElement('a');
    el.className = 'timeline-item';
    el.dataset.index = String(index);
    el.href = `milestone.html?id=${encodeURIComponent(item.slug)}`;
    el.setAttribute('aria-label', `${item.year} — ${item.title[lang] || item.title.ru}`);
    el.innerHTML = `
      <div class="timeline-item-year">${item.year}</div>
      <h3 class="timeline-item-title">${item.title[lang] || item.title.ru}</h3>
      <p class="timeline-item-text">${item.text[lang] || item.text.ru}</p>
      <span class="timeline-item-more">${lang === 'en' ? 'Details →' : 'Подробнее →'}</span>
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

  // nodes
  container.querySelectorAll('.timeline-item').forEach((el, index) => {
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
        // nodes
        container.querySelectorAll('.timeline-node').forEach((n, i) => {
          n.classList.toggle('active', i === idx);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  container.querySelectorAll('.timeline-item').forEach((el) => io.observe(el));

  // scroll draw
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

  if (items[0]) updatePanel(items[0], section, yearEl, titleEl);

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