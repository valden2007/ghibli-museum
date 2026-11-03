export default function createLanterns(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const items = [];
  const colors = palette || ['#c9a227', '#6b1a2b', '#1a2a4a'];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    items.length = 0;
    const n = Math.min(28, Math.floor(w / 40));
    for (let i = 0; i < n; i++) {
      items.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 6 + Math.random() * 10,
        vy: 0.2 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    items.forEach((it) => {
      it.y -= it.vy;
      it.x += Math.sin(t * 0.001 + it.phase) * 0.3 + it.vx;
      if (it.y < -40) { it.y = h + 40; it.x = Math.random() * w; }
      // glow
      const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.r * 4);
      g.addColorStop(0, it.c + 'aa');
      g.addColorStop(1, it.c + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r * 4, 0, Math.PI * 2);
      ctx.fill();
      // lantern body
      ctx.fillStyle = it.c;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.roundRect(it.x - it.r * 0.6, it.y - it.r, it.r * 1.2, it.r * 2, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  function loop(t) { if (!running) return; draw(t); raf = requestAnimationFrame(loop); }
  return {
    start() { if (running) return; running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resize() { resize(); },
  };
}