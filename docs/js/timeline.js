import { loadTimeline } from './data.js';
import { getLang, onLangChange } from './i18n.js';

export async function initTimeline() {
  const container = document.querySelector('#timeline-list');
  const yearEl = document.querySelector('#timeline-year');
  const titleEl = document.querySelector('#timeline-title');
  const section = document.querySelector('#timeline');
  if (!container) return;

  let items;
  try {
    items = await loadTimeline();
  } catch (e) {
    console.error(e);
    return;
  }

  const lang = getLang();
  container.innerHTML = '';
  items.forEach((item, index) => {
    const el = document.createElement('article');
    el.className = 'timeline-item';
    el.dataset.index = String(index);
    el.innerHTML = `
      <div class="timeline-item-year">${item.year}</div>
      <h3 class="timeline-item-title">${item.title[lang] || item.title.ru}</h3>
      <p class="timeline-item-text">${item.text[lang] || item.text.ru}</p>
    `;
    container.append(el);
  });

  // Observe items to update sticky panel
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const idx = Number(entry.target.dataset.index);
        const item = items[idx];
        if (!item) return;
        updateSticky(item, section);
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

  container.querySelectorAll('.timeline-item').forEach((el) => io.observe(el));

  // initial
  if (items[0]) updateSticky(items[0], section);

  onLangChange(() => {
    initTimeline();
  });
}

function updateSticky(item, section) {
  const yearEl = document.querySelector('#timeline-year');
  const titleEl = document.querySelector('#timeline-title');
  if (yearEl) {
    yearEl.classList.remove('roll');
    // force reflow
    void yearEl.offsetWidth;
    yearEl.textContent = item.year;
    yearEl.classList.add('roll');
  }
  if (titleEl) titleEl.textContent = item.title[getLang()] || item.title.ru;
  if (section) {
    section.style.setProperty('--timeline-accent', item.accent || '#c9a227');
    section.classList.add('timeline-active');
  }
}