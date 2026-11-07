export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const trackedLayers = new Set();
const trackedPools = new Set();
let activeLoops = 0;
let measuredFps = 0;

export function createLayer(root, className, { ariaHidden = true } = {}) {
  const layer = document.createElement('div');
  layer.className = className;
  if (ariaHidden) layer.setAttribute('aria-hidden', 'true');
  root.append(layer);
  trackedLayers.add(layer);
  return layer;
}

export function createCanvasLayer(root, className = 'scene-canvas') {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  root.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  let width = 1, height = 1, dpr = 1;
  const resize = () => {
    const rect = root.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const observer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  observer?.observe(root);
  resize();
  return { canvas, ctx, get width() { return width; }, get height() { return height; }, get dpr() { return dpr; }, resize, destroy() { observer?.disconnect(); canvas.remove(); } };
}

export function createLoop(draw, root, { fps = 60, effects = 'full' } = {}) {
  let raf = 0, running = false, visible = true, last = 0, sampleStart = 0, sampleFrames = 0;
  let reduced = effects === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let targetFps = effects === 'lite' ? Math.min(30, fps) : fps;
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start(); else stop();
  }, { threshold: 0 }) : null;
  io?.observe(root);
  const onVisibility = () => document.hidden ? stop() : start();
  document.addEventListener('visibilitychange', onVisibility);
  function tick(now) {
    if (!running) return;
    const interval = 1000 / targetFps;
    if (now - last >= interval) {
      last = now;
      draw(now);
      sampleFrames++;
      if (!sampleStart) sampleStart = now;
      if (now - sampleStart >= 1000) { measuredFps = sampleFrames; sampleFrames = 0; sampleStart = now; }
    }
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (reduced) { draw(performance.now(), true); return; }
    if (running || document.hidden || !visible) return;
    running = true;
    activeLoops++;
    raf = requestAnimationFrame(tick);
  }
  function stop() { if (running) activeLoops = Math.max(0, activeLoops - 1); running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function setEffects(level) {
    reduced = level === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    targetFps = level === 'lite' ? Math.min(30, fps) : fps;
    stop();
    if (reduced) draw(performance.now(), true); else start();
  }
  return { start, stop, setEffects, destroy() { stop(); io?.disconnect(); document.removeEventListener('visibilitychange', onVisibility); } };
}

export function createParticlePool(max = 100) {
  const particles = [];
  const pool = {
    items: particles,
    add(particle) { if (particles.length >= max) particles.shift(); particles.push(particle); },
    clear() { particles.length = 0; },
    get max() { return max; },
    setLimit(value) { max = Math.max(0, Math.floor(value)); while (particles.length > max) particles.shift(); },
    destroy() { particles.length = 0; trackedPools.delete(pool); },
  };
  trackedPools.add(pool);
  return pool;
}

export function getStats() {
  let particles = 0;
  trackedPools.forEach((pool) => { particles += pool.items.length; });
  let layers = 0;
  trackedLayers.forEach((layer) => { if (layer.isConnected) layers++; else trackedLayers.delete(layer); });
  return { fps: measuredFps, particles, activeLayers: layers, activeLoops };
}

export function createNoise(seed = 1) {
  let x = seed >>> 0;
  return () => { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; };
}

export function createPointerTracker(root, effects = 'full') {
  const state = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (event) => {
    if (effects !== 'full' || !fine) return;
    const rect = root.getBoundingClientRect();
    state.targetX = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
    state.targetY = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
  };
  root.addEventListener('pointermove', onMove, { passive: true });
  return {
    get() { state.x += (state.targetX - state.x) * 0.08; state.y += (state.targetY - state.y) * 0.08; return { x: state.x, y: state.y }; },
    setEffects(level) { effects = level; if (level !== 'full') { state.targetX = 0.5; state.targetY = 0.5; } },
    destroy() { root.removeEventListener('pointermove', onMove); },
  };
}

export function scrollProgress(root) {
  const rect = root.getBoundingClientRect();
  return clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
}

export function addSvgFilter(root, id = 'scene-watercolor') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('scene-svg-defs');
  svg.innerHTML = `<defs><filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency=".015" numOctaves="2"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter></defs>`;
  root.prepend(svg);
  return `url(#${id})`;
}

export function effectsConfig(level) {
  if (level === 'off') return { animate: false, particles: 0, fps: 0, pointer: false };
  if (level === 'lite') return { animate: true, particles: 0.4, fps: 30, pointer: false };
  return { animate: true, particles: 1, fps: 60, pointer: true };
}

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// Rolling hill silhouette band; offset shifts the whole band (parallax).
export function drawHills(c, { w, h, y, amp, color, offset = 0, seed = 1 }) {
  const rnd = seededRandom(seed);
  const phases = Array.from({ length: 8 }, () => rnd() * 6);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-60, h + 20);
  for (let i = 0; i <= 7; i++) {
    const x = -60 + (i / 7) * (w + 120) + offset;
    const yy = y + Math.sin(i * 1.7 + phases[i]) * amp;
    if (i === 0) c.lineTo(x, yy);
    else c.quadraticCurveTo(x - (w + 120) / 14, yy + amp * 0.6, x, yy);
  }
  c.lineTo(w + 60, h + 20);
  c.closePath();
  c.fill();
}

// Row of leaning tree silhouettes with canopy blobs.
export function drawTreeRow(c, { w, base, top, count, color, offset = 0, seed = 3 }) {
  const rnd = seededRandom(seed);
  c.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = ((i + rnd()) / count) * (w + 200) - 100 + offset;
    const trunkW = 6 + rnd() * 12;
    const height = base - top - rnd() * 46;
    c.beginPath();
    c.moveTo(x, base + 4);
    c.quadraticCurveTo(x + trunkW * 0.4, base - height * 0.55, x + trunkW * 0.9, base - height);
    c.lineTo(x + trunkW * 2.0, base - height);
    c.quadraticCurveTo(x + trunkW * 1.7, base - height * 0.5, x + trunkW * 2.8, base + 4);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(x + trunkW * 1.45, base - height, height * 0.2 + 14, 0, Math.PI * 2);
    c.arc(x + trunkW * 0.5, base - height * 0.82, height * 0.13 + 8, 0, Math.PI * 2);
    c.fill();
  }
}
