import createRain from './rain.js';
import createLanterns from './lanterns.js';
import createWind from './wind.js';
import createLeaves from './leaves.js';
import createClouds from './clouds.js';
import createSea from './sea.js';
import createStars from './stars.js';
import { PRIMITIVES, mountMotif as mountNew, mountCombined as mountCombinedNew } from '../motifs.js';

const registry = {
  rain: createRain,
  lanterns: createLanterns,
  wind: createWind,
  leaves: createLeaves,
  clouds: createClouds,
  sea: createSea,
  stars: createStars,
  none: null,
};

// merge new primitives
Object.keys(PRIMITIVES).forEach((k) => {
  if (!registry[k]) registry[k] = PRIMITIVES[k];
});

export function getMotifFactory(type) {
  const f = registry[type];
  if (typeof f === 'function' && f.prototype === undefined) {
    // PRIMITIVES entries are factories already; return as-is
  }
  return registry[type] || null;
}

// mountMotif: if type is new primitive, use mountNew; else existing logic
export function mountCombined(container, types, palette, paramsList, options) {
  return mountCombinedNew(container, types, palette, paramsList, options);
}

export function mountMotif(container, type, palette, params) {
  if (PRIMITIVES[type]) {
    return mountNew(container, type, palette, params);
  }
  // existing logic for original motifs
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const factory = registry[type];
  if (!factory || !container) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'motif-canvas';
  container.append(canvas);
  const motif = factory(canvas, palette);
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) motif.start();
        else motif.stop();
      });
    }, { threshold: 0 });
    io.observe(canvas);
  } else {
    motif.start();
  }
  const onResize = () => motif.resize();
  window.addEventListener('resize', onResize, { passive: true });
  motif.resize();
  return {
    canvas,
    motif,
    destroy() {
      motif.stop();
      if (io) io.disconnect();
      window.removeEventListener('resize', onResize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
