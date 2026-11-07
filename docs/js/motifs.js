// Catalog of procedural primitives for film effects.
// Each factory: (canvas, palette, params) -> { start, stop, resize }

function makeFactory(drawFn) {
  return function (canvas, palette, params) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0, running = false;
    const p = Object.assign({ count: 40, speed: 1, size: 2, colorHint: (palette && palette[0]) || '#ffffff' }, params || {});
    const items = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initItems() {
      items.length = 0;
      const n = Math.min(80, Math.max(1, Math.floor(p.count)));
      for (let i = 0; i < n; i++) {
        items.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * p.speed,
          vy: (Math.random() - 0.5) * p.speed,
          size: p.size * (0.5 + Math.random()),
          phase: Math.random() * Math.PI * 2,
          life: 1,
        });
      }
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      drawFn(ctx, w, h, t, items, p);
      raf = requestAnimationFrame(frame);
    }

    resize();
    initItems();
    const onResize = () => { resize(); initItems(); };
    window.addEventListener('resize', onResize, { passive: true });

    return {
      start() { if (running) return; running = true; raf = requestAnimationFrame(frame); },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      resize() { resize(); },
      destroy() { this.stop(); window.removeEventListener('resize', onResize); },
    };
  };
}

// draw functions (simple, transform/opacity friendly)
const DOTS = (ctx, w, h, t, items, p) => {
  items.forEach((it) => {
    it.x += it.vx; it.y += it.vy;
    if (it.x < 0) it.x = w; if (it.x > w) it.x = 0;
    if (it.y < 0) it.y = h; if (it.y > h) it.y = 0;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = p.colorHint;
    ctx.beginPath();
    ctx.arc(it.x, it.y, it.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
};

const LINES = (ctx, w, h, t, items, p) => {
  ctx.strokeStyle = p.colorHint;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  items.forEach((it) => {
    it.x += it.vx; it.y += it.vy;
    if (it.x < 0) it.x = w; if (it.x > w) it.x = 0;
    if (it.y < 0) it.y = h; if (it.y > h) it.y = 0;
    ctx.beginPath();
    ctx.moveTo(it.x, it.y);
    ctx.lineTo(it.x + it.vx * 8, it.y + it.vy * 8);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
};

const SILHOUETTE = (ctx, w, h, t, items, p) => {
  // a simple distant shape contour
  ctx.strokeStyle = p.colorHint;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const cx = w * 0.5, cy = h * 0.6;
  ctx.ellipse(cx, cy, 60, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

// combined factory: one canvas, one rAF, multiple primitive layers
export function makeCombined(types, palette, paramsList, options = {}) {
  return function (canvas, pal, _params) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, raf = 0, running = false;
    let effects = options.effects || 'full';
    let fps = effects === 'lite' ? 30 : 60;
    let lastFrame = 0;
    const layers = (types || []).map((type, idx) => {
      const draw = PRIMITIVE_DRAWS[type] || DOTS;
      const p = Object.assign({ count: 30, speed: 0.5, size: 2, colorHint: (palette && palette[idx % palette.length]) || '#ffffff' }, (paramsList && paramsList[idx]) || {});
      const items = [];
      function init() {
        items.length = 0;
        const n = Math.min(80, Math.max(1, Math.floor(p.count)));
        for (let i = 0; i < n; i++) {
          items.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * p.speed, vy: (Math.random() - 0.5) * p.speed, size: p.size * (0.5 + Math.random()), phase: Math.random() * Math.PI * 2, life: 1 });
        }
      }
      return { type, draw, p, baseCount: p.count, items, init };
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layers.forEach((l) => { l.init(); });
    }

    function drawFrame(t) {
      ctx.clearRect(0, 0, w, h);
      layers.forEach((l) => l.draw(ctx, w, h, t, l.items, l.p));
    }

    function frame(t) {
      if (!running) return;
      if (t - lastFrame >= 1000 / fps) { lastFrame = t; drawFrame(t); }
      raf = requestAnimationFrame(frame);
    }

    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize, { passive: true });

    return {
      start() {
        if (effects === 'off') { drawFrame(performance.now()); return; }
        if (running) return;
        running = true;
        raf = requestAnimationFrame(frame);
      },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
      resize() { resize(); },
      setEffects(level) {
        effects = level;
        fps = level === 'lite' ? 30 : 60;
        layers.forEach((l) => { l.p.count = level === 'lite' ? Math.max(1, Math.floor(l.baseCount * 0.4)) : l.baseCount; l.init(); });
        this.stop();
        if (level === 'off') drawFrame(performance.now()); else this.start();
      },
      destroy() { this.stop(); window.removeEventListener('resize', onResize); if (canvas.parentNode) canvas.parentNode.removeChild(canvas); },
    };
  };
}

export const PRIMITIVE_DRAWS = {
  spores: DOTS,
  'wind-gusts': LINES,
  'ohmu-silhouette': SILHOUETTE,
  clouds: DOTS,
  'light-rays': LINES,
  'floating-island': SILHOUETTE,
  rain: LINES,
  'glass-drops': DOTS,
  catbus: SILHOUETTE,
  seagulls: DOTS,
  wind: LINES,
  'flying-figure-broom': SILHOUETTE,
  seaplanes: DOTS,
  'distant-fleet': SILHOUETTE,
  kodama: DOTS,
  fog: DOTS,
  leaves: LINES,
  'boar-god': SILHOUETTE,
  'soot-sprites': DOTS,
  lanterns: DOTS,
  train: SILHOUETTE,
  embers: DOTS,
  stars: DOTS,
  'walking-castle': SILHOUETTE,
  smoke: DOTS,
  bubbles: DOTS,
  waves: LINES,
  fish: SILHOUETTE,
  'wind-grass': LINES,
  'blueprint-lines': LINES,
  fighters: SILHOUETTE,
  feather: LINES,
  heron: SILHOUETTE,
};

export const PRIMITIVES = {
  spores: makeFactory(DOTS),
  'wind-gusts': makeFactory(LINES),
  'ohmu-silhouette': makeFactory(SILHOUETTE),
  clouds: makeFactory(DOTS),
  'light-rays': makeFactory(LINES),
  'floating-island': makeFactory(SILHOUETTE),
  rain: makeFactory(LINES),
  'glass-drops': makeFactory(DOTS),
  catbus: makeFactory(SILHOUETTE),
  seagulls: makeFactory(DOTS),
  wind: makeFactory(LINES),
  'flying-figure-broom': makeFactory(SILHOUETTE),
  seaplanes: makeFactory(DOTS),
  'distant-fleet': makeFactory(SILHOUETTE),
  kodama: makeFactory(DOTS),
  fog: makeFactory(DOTS),
  leaves: makeFactory(LINES),
  'boar-god': makeFactory(SILHOUETTE),
  'soot-sprites': makeFactory(DOTS),
  lanterns: makeFactory(DOTS),
  train: makeFactory(SILHOUETTE),
  embers: makeFactory(DOTS),
  stars: makeFactory(DOTS),
  'walking-castle': makeFactory(SILHOUETTE),
  smoke: makeFactory(DOTS),
  bubbles: makeFactory(DOTS),
  waves: makeFactory(LINES),
  fish: makeFactory(SILHOUETTE),
  'wind-grass': makeFactory(LINES),
  'blueprint-lines': makeFactory(LINES),
  fighters: makeFactory(SILHOUETTE),
  feather: makeFactory(LINES),
  heron: makeFactory(SILHOUETTE),
};

export function getMotifFactory(type) {
  return PRIMITIVES[type] || null;
}

export function mountCombined(container, types, palette, paramsList, options = {}) {
  const factory = makeCombined(types, palette, paramsList, options);
  if (!factory || !container) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'motif-canvas';
  container.append(canvas);
  const motif = factory(canvas, palette, null);
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

export function mountMotif(container, type, palette, params) {
  // reuse existing mountMotif signature: (container, type, palette)
  // but support params as 4th
  const factory = PRIMITIVES[type];
  if (!factory || !container) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'motif-canvas';
  container.append(canvas);
  const motif = factory(canvas, palette, params);
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
