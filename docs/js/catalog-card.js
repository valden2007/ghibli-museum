import { mountMotif } from './motifs/index.js';

const atmosphereLabels = {
  rain: { ru: 'Дождь', en: 'Rain' },
  lanterns: { ru: 'Фонарики', en: 'Lanterns' },
  wind: { ru: 'Ветер', en: 'Wind' },
  leaves: { ru: 'Листья', en: 'Leaves' },
  clouds: { ru: 'Облака', en: 'Clouds' },
  sea: { ru: 'Море', en: 'Sea' },
  stars: { ru: 'Звёзды', en: 'Stars' },
  none: { ru: 'Тишина', en: 'Stillness' },
};

export function createCatalogCard(film, imageInfo, lang = 'ru') {
  const card = document.createElement('a');
  card.className = 'catalog-prototype';
  card.href = `film.html?id=${encodeURIComponent(film.id)}`;
  card.dataset.filmId = film.id;

  const tones = Array.isArray(film.palette) ? film.palette : [];
  tones.forEach((tone, i) => card.style.setProperty(`--tone-${i + 1}`, tone));

  const frame = document.createElement('div');
  frame.className = 'catalog-prototype__frame';
  frame.setAttribute('aria-label', film.title[lang] || film.title.ru);

  const hasImage = isValidImageManifest(film.id, imageInfo);
  if (hasImage) {
    const img = document.createElement('img');
    img.className = 'catalog-prototype__image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 480;
    img.height = 600;
    img.alt = imageInfo[lang === 'en' ? 'altEn' : 'altRu'] || '';
    if (imageInfo.fileSm) {
      img.srcset = `${imageInfo.fileSm} 360w, ${imageInfo.file} 480w`;
      img.sizes = '(max-width: 600px) calc(100vw - 48px), (max-width: 1100px) 30vw, 390px';
    }
    img.src = imageInfo.file;
    img.addEventListener('error', () => {
      img.remove();
      frame.classList.add('has-placeholder');
    }, { once: true });
    frame.append(img);
  } else {
    frame.classList.add('has-placeholder');
  }

  if (frame.classList.contains('has-placeholder')) {
    const placeholder = document.createElement('div');
    placeholder.className = 'catalog-prototype__placeholder';
    placeholder.innerHTML = `<strong>${escapeHTML(film.title[lang] || film.title.ru)}</strong><span>${lang === 'en' ? 'Frame expected' : 'Кадр ожидается'}</span>`;
    frame.append(placeholder);
  }

  const duotone = document.createElement('span');
  duotone.className = 'catalog-prototype__duotone';
  duotone.setAttribute('aria-hidden', 'true');
  const print = document.createElement('span');
  print.className = 'catalog-prototype__print';
  print.setAttribute('aria-hidden', 'true');
  const motif = document.createElement('span');
  motif.className = 'catalog-prototype__motif';
  motif.setAttribute('aria-hidden', 'true');
  frame.append(duotone, print, motif);

  const heading = document.createElement('div');
  heading.className = 'catalog-prototype__heading';
  const title = document.createElement('h2');
  title.className = 'catalog-prototype__title';
  title.textContent = film.title[lang] || film.title.ru;
  const year = document.createElement('span');
  year.className = 'catalog-prototype__year';
  year.textContent = String(film.year);
  heading.append(title, year);

  const passport = document.createElement('dl');
  passport.className = 'catalog-prototype__passport';
  appendField(passport, lang === 'en' ? 'Director' : 'Режиссёр', film.director);
  appendField(passport, lang === 'en' ? 'Era' : 'Период', film.era);
  appendField(passport, lang === 'en' ? 'Atmosphere' : 'Атмосфера', atmosphereLabels[film.motif]?.[lang] || film.motif);
  if (tones.length) {
    const toneField = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = lang === 'en' ? 'Palette' : 'Палитра';
    const dd = document.createElement('dd');
    dd.textContent = `${tones.length} ${lang === 'en' ? 'tones' : 'цветов'} `;
    const chips = document.createElement('span');
    chips.className = 'catalog-prototype__tones';
    chips.setAttribute('aria-label', tones.join(', '));
    tones.forEach((color) => {
      const chip = document.createElement('span');
      chip.className = 'catalog-prototype__tone';
      chip.style.backgroundColor = color;
      chip.setAttribute('aria-hidden', 'true');
      chips.append(chip);
    });
    dd.append(chips);
    toneField.append(dt, dd);
    passport.append(toneField);
  }

  card.append(frame, heading, passport);

  let motifHandle = null;
  let intersecting = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      syncMotif();
    }, { threshold: 0.2 })
    : null;
  observer?.observe(card);

  function syncMotif() {
    const active = intersecting && !reducedMotion.matches && (
      (finePointer.matches && card.matches(':hover')) || card.matches(':focus-visible')
    );
    card.classList.toggle('is-active', active);
    const showcase = card.closest('.catalog-showcase');
    showcase?.classList.toggle('is-active', active);
    if (active && !motifHandle) motifHandle = mountMotif(motif, film.motif, tones);
    if (!active && motifHandle) {
      motifHandle.destroy();
      motifHandle = null;
    }
  }

  card.addEventListener('pointerenter', syncMotif);
  card.addEventListener('pointerleave', syncMotif);
  card.addEventListener('focusin', syncMotif);
  card.addEventListener('focusout', syncMotif);
  reducedMotion.addEventListener?.('change', syncMotif);
  finePointer.addEventListener?.('change', syncMotif);

  return {
    element: card,
    destroy() {
      observer?.disconnect();
      motifHandle?.destroy();
      reducedMotion.removeEventListener?.('change', syncMotif);
      finePointer.removeEventListener?.('change', syncMotif);
    },
  };
}

function appendField(list, label, value) {
  if (value === undefined || value === null || value === '') return;
  const item = document.createElement('div');
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  item.append(term, description);
  list.append(item);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function isValidImageManifest(id, imageInfo) {
  return /^[a-z0-9-]+$/.test(id)
    && imageInfo?.ratio === '4:5'
    && imageInfo.file === `img/films/${id}.webp`
    && imageInfo.fileSm === `img/films/${id}-sm.webp`;
}
