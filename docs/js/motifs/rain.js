export default function createRain(canvas, palette) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let raf = 0;
  let running = false;
  const drops = [];
  const blades = [];
  const colors = palette || ['#2f5d3a', '#6b8f4e', '#a8c09a'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drops.length = 0;
    const count = Math.min(120, Math.floor(w / 6));
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 8 + Math.random() * 14,
        speed: 4 + Math.random() * 6,
        c: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    blades.length = 0;
    const bcount = Math.min(24, Math.floor(w / 24));
    for (let i = 0; i < bcount; i++) {
      blades.push({ x: (i + 0.5) * (w / bcount), phase: Math.random() * Math.PI * 2 });
    }
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    // grass blades
    ctx.lineWidth = 1.5;
    blades.forEach((b) => {
      const sway = Math.sin(t * 0.0015 + b.phase) * 6;
      ctx.strokeStyle = colors[0];
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(b.x, h);
      ctx.quadraticCurveTo(b.x + sway, h - 24, b.x + sway * 1.4, h - 42);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // rain
    drops.forEach((d) => {
      d.y += d.speed;
      if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
      ctx.strokeStyle = d.c;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 1, d.y + d.len);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    if (!running) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  return {
    start() { if (running) return; running = true; raf = requestAnimationFrame(loop); },
    stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    resize() { resize(); },
  };
}