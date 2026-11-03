export default function createClouds(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const clouds = [];
  const colors = palette || ['#8fb3d9', '#c9d6e8', '#4a6fa5'];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clouds.length = 0;
    const n = Math.min(12, Math.floor(w / 120));
    for (let i = 0; i < n; i++) {
      clouds.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.6,
        scale: 0.6 + Math.random() * 1.2,
        speed: 0.1 + Math.random() * 0.3,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
  function drawCloud(x, y, scale, c) {
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.35;
    const r = 30 * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 1.2, y - r * 0.3, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x - r * 1.1, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y + r * 0.4, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    clouds.forEach((cld) => {
      cld.x += cld.speed;
      if (cld.x - 100 > w) { cld.x = -120; cld.y = Math.random() * h * 0.6; }
      drawCloud(cld.x, cld.y, cld.scale, cld.c);
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