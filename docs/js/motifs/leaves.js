export default function createLeaves(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const leaves = [];
  const colors = palette || ['#3a6b4a', '#7fb069', '#a8d5a2'];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    leaves.length = 0;
    const n = Math.min(40, Math.floor(w / 18));
    for (let i = 0; i < n; i++) {
      leaves.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 6 + Math.random() * 8,
        speed: 0.5 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.8,
        rot: Math.random() * Math.PI * 2,
        rSpeed: (Math.random() - 0.5) * 0.04,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.rot);
    ctx.fillStyle = l.c;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, l.size, l.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    leaves.forEach((l) => {
      l.y += l.speed;
      l.x += l.drift + Math.sin(t * 0.001 + l.rot) * 0.3;
      l.rot += l.rSpeed;
      if (l.y > h + 20) { l.y = -20; l.x = Math.random() * w; }
      drawLeaf(l);
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