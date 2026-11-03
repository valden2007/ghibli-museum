export function createCanvasAdapter(container, palette) {
  const canvas = document.createElement('canvas');
  canvas.className = 'player-canvas';
  container.append(canvas);
  const ctx = canvas.getContext('2d');

  const duration = 25;
  let time = 0;
  let playing = false;
  let rate = 1;
  let raf = 0;
  let last = 0;
  const colors = palette || ['#6fa8dc', '#b8d4e8', '#d9c98a', '#9fc9a0'];

  const stars = [];
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (stars.length === 0) {
      for (let i = 0; i < 60; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: 0.5 + Math.random() * 2, phase: Math.random() * Math.PI * 2 });
      }
    }
  }

  const listeners = { play: [], pause: [], time: [], ended: [], error: [], ready: [] };
  function emit(name, payload) { (listeners[name] || []).forEach((fn) => fn(payload)); }

  function draw(tSec) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    // background gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colors[0]);
    g.addColorStop(1, colors[2] || colors[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // stars
    stars.forEach((s) => {
      const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(tSec * 2 + s.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // moving orb
    const orbX = (tSec / duration) * w;
    const orbY = h / 2 + Math.sin(tSec * 2) * (h * 0.2);
    const rg = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 40);
    rg.addColorStop(0, colors[1]);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 40, 0, Math.PI * 2);
    ctx.fill();
    // time text
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${tSec.toFixed(1)}s / ${duration}s`, 12, h - 12);
  }

  function loop(ts) {
    if (!playing) return;
    if (!last) last = ts;
    const dt = (ts - last) / 1000;
    last = ts;
    time = Math.min(duration, time + dt * rate);
    draw(time);
    emit('time', time);
    if (time >= duration) {
      playing = false;
      emit('ended');
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  draw(0);
  emit('ready');

  return {
    type: 'canvas',
    supportsRate: true,
    async play() { if (time >= duration) time = 0; playing = true; last = 0; emit('play'); raf = requestAnimationFrame(loop); },
    pause() { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; emit('pause'); },
    seek(t) { time = Math.max(0, Math.min(duration, t)); draw(time); emit('time', time); },
    setVolume() {},
    getVolume() { return 1; },
    mute() {},
    unmute() {},
    isMuted() { return false; },
    setRate(r) { rate = r; },
    getRate() { return rate; },
    getDuration() { return duration; },
    getCurrentTime() { return time; },
    destroy() { playing = false; if (raf) cancelAnimationFrame(raf); if (canvas.parentNode) canvas.parentNode.removeChild(canvas); window.removeEventListener('resize', resize); },
    on(name, fn) { if (listeners[name]) listeners[name].push(fn); },
    off(name, fn) { if (listeners[name]) listeners[name] = listeners[name].filter((f) => f !== fn); },
  };
}