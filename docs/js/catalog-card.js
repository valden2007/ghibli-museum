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

// Blend mode of the live motif over the frame, chosen by palette luminance
// (perceived brightness of palette[] entries):
//   light palette (avg >= 138) -> screen (Totoro-like, motif glows);
//   dark palette (darkest tone <= 46 or avg <= 105) -> overlay (reads on dark frames);
//   otherwise -> soft-light.
// Reproducible heuristic; final recognizability is verified by eye on the grid.
function motifBlendMode(palette) {
  const tones = Array.isArray(palette) ? palette : [];
  if (!tones.length) return 'screen';
  const brightness = (hex) => {
    const c = String(hex).replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };
  const values = tones.map(brightness);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  if (min <= 46 || avg <= 105) return 'overlay';
  if (avg >= 138) return 'screen';
  return 'soft-light';
}

export function createCatalogCard(film, imageInfo, lang = 'ru') {
  const card = document.createElement('a');
  card.className = 'catalog-prototype';
  card.href = `film.html?id=${encodeURIComponent(film.id)}`;
  card.dataset.filmId = film.id;

  const tones = Array.isArray(film.palette) ? film.palette : [];
  tones.forEach((tone, i) => card.style.setProperty(`--tone-${i + 1}`, tone));
  card.style.setProperty('--motif-blend', motifBlendMode(tones));

  const frame = document.createElement('div');
  frame.className = 'catalog-prototype__frame';
  frame.setAttribute('aria-label', film.title[lang] || film.title.ru);

  const ambient = document.createElement('span');
  ambient.className = 'catalog-prototype__ambient';
  ambient.setAttribute('aria-hidden', 'true');

  const hasImage = Boolean(imageInfo?.file);
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
    if (imageInfo?.crop) {
      img.style.transform = imageInfo.crop;
      img.style.transformOrigin = 'center top';
    }
    img.addEventListener('error', () => {
      img.remove();
      frame.classList.add('has-placeholder');
      const placeholder = document.createElement('div');
      placeholder.className = 'catalog-prototype__placeholder';
      placeholder.innerHTML = `<strong>${escapeHTML(film.title[lang] || film.title.ru)}</strong><span>${lang === 'en' ? 'Frame expected' : 'Кадр ожидается'}</span>`;
      frame.append(placeholder);
    }, { once: true });
    frame.append(img);
  } else {
    frame.classList.add('has-placeholder');
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
  frame.append(ambient, duotone, print, motif);

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


  card.append(frame, heading, passport);

  let motifHandle = null;
  let intersecting = true;
  let hovered = false;
  let focused = false;

  const baseType = (film.fx && film.fx.base && film.fx.base.type) || film.motif;
  const baseCap = { count: 5, speed: 0.5, size: 2 };
  const capMap = {
    'soot-sprites': { count: 4 },
    'kodama': { count: 3 },
    'bubbles': { count: 5 },
    'embers': { count: 5 },
    'spores': { count: 6 },
    'seagulls': { count: 3 },
    'seaplanes': { count: 2 },
    'fighters': { count: 2 },
    'feather': { count: 2 },
    'fish': { count: 3 },
    'rain': { count: 12 },
    'clouds': { count: 8 },
    'wind': { count: 8 },
    'lanterns': { count: 6 },
    'stars': { count: 8 },
    'leaves': { count: 10 },
    'wind-grass': { count: 8 },
  };
  const cap = Object.assign({}, baseCap, capMap[baseType] || {});
  const baseParams = Object.assign({}, cap, film.fx && film.fx.base && film.fx.base.params ? film.fx.base.params : {});
  // enforce cap on count
  if (film.fx && film.fx.base && film.fx.base.params && film.fx.base.params.count) {
    baseParams.count = Math.min(film.fx.base.params.count, cap.count);
  } else {
    baseParams.count = cap.count;
  }
  baseParams.colorHint = (film.fx && film.fx.base && film.fx.base.colorHint) || (tones[0] || '#ffffff');
  console.log(film.id, 'cardType=', baseType, 'fxBase=', (film.fx && film.fx.base && film.fx.base.type) || null, 'cap=', JSON.stringify({ opacity: 0.22, maxParticles: baseParams.count }));
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
    const active = intersecting && !reducedMotion.matches && (hovered || focused);
    const wasActive = card.classList.contains('is-active');
    card.classList.toggle('is-active', active);
    const showcase = card.closest('.catalog-showcase');
    showcase?.classList.toggle('is-active', active);
    if (active && !wasActive) {
      card.dispatchEvent(new CustomEvent('card:activate', {
        bubbles: true,
        detail: { id: film.id, palette: tones, motif: film.motif, era: film.era, fxBase: (film.fx && film.fx.base && film.fx.base.type) || null },
      }));
    }
    if (!active && wasActive) {
      card.dispatchEvent(new CustomEvent('card:deactivate', {
        bubbles: true,
        detail: { id: film.id, palette: tones, motif: film.motif, era: film.era, fxBase: (film.fx && film.fx.base && film.fx.base.type) || null },
      }));
    }
    if (active && !motifHandle) motifHandle = mountMotif(motif, baseType, tones, baseParams);
    if (!active && motifHandle) {
      motifHandle.destroy();
      motifHandle = null;
    }
  }

  card.addEventListener('pointerenter', () => { hovered = true; syncMotif(); });
  card.addEventListener('pointerleave', () => { hovered = false; syncMotif(); });
  card.addEventListener('focusin', () => { focused = true; syncMotif(); });
  card.addEventListener('focusout', () => { focused = false; syncMotif(); });
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
