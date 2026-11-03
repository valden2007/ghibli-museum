import createRain from './rain.js';
import createLanterns from './lanterns.js';
import createWind from './wind.js';
import createLeaves from './leaves.js';
import createClouds from './clouds.js';
import createSea from './sea.js';
import createStars from './stars.js';

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

export function getMotifFactory(type) {
  return registry[type] || null;
}

export function mountMotif(container, type, palette) {
  const factory = getMotifFactory(type);
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