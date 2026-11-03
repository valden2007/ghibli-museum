export default function createStars(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const stars = [];
  const colors = palette || ['#d9c9e8', '#8a9ac9', '#e8d9a0'];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.length = 0;
    const n = Math.min(80, Math.floor(w / 8));
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    stars.forEach((s) => {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      // cross sparkle occasionally
      if (alpha > 0.85) {
        ctx.strokeStyle = s.c;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x - s.r * 3, s.y);
        ctx.lineTo(s.x + s.r * 3, s.y);
        ctx.moveTo(s.x, s.y - s.r * 3);
        ctx.lineTo(s.x, s.y + s.r * 3);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }
  function loop(t) { if (!running) return; draw(t); raf = requestAnimationFrame(loop); }
  return {
    start() { if (running) return; running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resize() { resize(); },
  };
}