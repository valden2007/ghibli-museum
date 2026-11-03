export default function createSea(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const bubbles = [];
  const colors = palette || ['#4aa8a8', '#8ad0d0', '#2a4a5a'];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width); h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bubbles.length = 0;
    const n = Math.min(30, Math.floor(w / 20));
    for (let i = 0; i < n; i++) {
      bubbles.push({ x: Math.random() * w, y: Math.random() * h, r: 2 + Math.random() * 4, speed: 0.3 + Math.random() * 0.8, phase: Math.random() * Math.PI * 2 });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    // waves
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const base = h * (0.5 + i * 0.15);
      for (let x = 0; x <= w; x += 4) {
        const y = base + Math.sin((x + t * 0.04 * (i + 1)) * 0.02) * (8 + i * 4);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // bubbles
    bubbles.forEach((b) => {
      b.y -= b.speed;
      b.x += Math.sin(t * 0.001 + b.phase) * 0.2;
      if (b.y < -10) { b.y = h + 10; b.x = Math.random() * w; }
      ctx.fillStyle = colors[1];
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
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