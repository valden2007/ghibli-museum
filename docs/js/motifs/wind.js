export default function createWind(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const lines = [];
  const planes = [];
  const colors = palette || ['#6fa8dc', '#b8d4e8', '#d9c98a'];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lines.length = 0;
    const n = Math.min(40, Math.floor(w / 20));
    for (let i = 0; i < n; i++) {
      lines.push({ y: Math.random() * h, x: Math.random() * w, len: 40 + Math.random() * 80, speed: 2 + Math.random() * 4, c: colors[Math.floor(Math.random() * colors.length)] });
    }
    planes.length = 0;
    for (let i = 0; i < 6; i++) {
      planes.push({ x: Math.random() * w, y: Math.random() * h, vx: 1 + Math.random() * 2, vy: (Math.random() - 0.5) * 0.5, angle: 0, c: colors[2] });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    lines.forEach((l) => {
      l.x += l.speed;
      if (l.x - l.len > w) { l.x = -l.len; l.y = Math.random() * h; }
      ctx.strokeStyle = l.c;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x - l.len, l.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    planes.forEach((p) => {
      p.x += p.vx; p.y += p.vy;
      p.angle = Math.atan2(p.vy, p.vx);
      if (p.x > w + 40) { p.x = -40; p.y = Math.random() * h; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-12, -5);
      ctx.lineTo(-12, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
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