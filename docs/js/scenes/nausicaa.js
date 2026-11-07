// Nausicaa scene: wind valley and toxic forest, spores blown by the wind,
// windmill, giant fungi-trees, Omula eyes glowing in the mist (turning red
// on sudden cursor movement), and a glider crossing the sky.
import { createCanvasLayer, createLoop, createPointerTracker, clamp, drawHills, drawTreeRow } from './kit.js';

const rand = (a, b) => a + Math.random() * (b - a);

export async function mount(ctx) {
  const { root, audio, kit, settings } = ctx;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = reduced ? 'off' : settings.get().effects;
  const canvasLayer = createCanvasLayer(root, 'scene-canvas');
  const pointer = createPointerTracker(root, level);
  const c = canvasLayer.ctx;

  const spores = Array.from({ length: 48 }, () => ({ x: Math.random(), y: Math.random(), size: rand(1.5, 3.5), phase: rand(0, 6.28), speed: rand(0.0002, 0.0006) }));
  const omula = Array.from({ length: 5 }, () => ({ x: rand(0.1, 0.9), y: rand(0.45, 0.85), size: rand(3, 6), red: 0, phase: rand(0, 6.28) }));
  const glider = { active: false, start: -1e9, x: 0, y: 0, dir: 1 };
  let nextGlider = performance.now() + rand(15000, 28000);
  let lastPointer = { x: 0.5, y: 0.5, t: performance.now() };
  let pointerSpeed = 0;
  let nextRustle = performance.now() + rand(5000, 9000);
  let nextWind = performance.now() + rand(3000, 6000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function ensureSpores() {
    const target = level === 'off' ? 0 : level === 'lite' ? 16 : 48;
    while (spores.length < target) spores.push({ x: Math.random(), y: Math.random(), size: rand(1.5, 3.5), phase: rand(0, 6.28), speed: rand(0.0002, 0.0006) });
    while (spores.length > target) spores.pop();
  }
  ensureSpores();

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const px = (p.x - 0.5) * 2;
    const py = (p.y - 0.5) * 2;
    if (!single) {
      const dt = Math.max(1, now - lastPointer.t);
      pointerSpeed = Math.hypot(p.x - lastPointer.x, p.y - lastPointer.y) / dt * 1000;
      lastPointer = { x: p.x, y: p.y, t: now };
      if (now >= nextGlider) { nextGlider = now + rand(25000, 45000); glider.active = true; glider.start = now; glider.dir = Math.random() < 0.5 ? 1 : -1; glider.x = glider.dir > 0 ? -120 : w + 120; glider.y = h * rand(0.12, 0.32); }
      if (now >= nextRustle) { nextRustle = now + rand(5000, 9000); if (soundOn()) audio.scene('rustle', { volume: 0.018 }); }
      if (now >= nextWind) { nextWind = now + rand(3000, 6000); if (soundOn()) audio.scene('wind', { volume: 0.02 }); }
    }

    // sandy sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d9c98a');
    sky.addColorStop(0.45, '#b8d4a0');
    sky.addColorStop(0.75, '#7fb069');
    sky.addColorStop(1, '#3a6b4a');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    drawHills(c, { w, h, y: h * 0.5, amp: 24, color: '#4a7c5a', offset: -px * 10, seed: 5 });
    drawHills(c, { w, h, y: h * 0.62, amp: 18, color: '#3a6b4a', offset: -px * 18, seed: 9 });

    // giant fungi-trees
    drawTreeRow(c, { w, base: h * 0.72, top: h * 0.26, count: 7, color: '#2f5d3a', offset: -px * 30, seed: 13 });
    drawTreeRow(c, { w, base: h * 0.86, top: h * 0.4, count: 9, color: '#1f3d2a', offset: -px * 46, seed: 29 });

    // windmill silhouette
    const hubX = w * 0.78 - (p.x - 0.5) * 18;
    const hubY = h * 0.24;
    c.save();
    c.translate(hubX, hubY);
    c.fillStyle = '#3a2a1a';
    c.fillRect(-4, -26, 8, 52);
    c.rotate(single ? 0 : now * 0.002);
    c.strokeStyle = '#d9c98a';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, -34);
      c.lineTo(6, -30);
      c.lineTo(6, 0);
      c.closePath();
      c.fillStyle = 'rgba(217,201,138,0.85)';
      c.fill();
    }
    c.restore();

    // spores blown by wind, following cursor
    c.fillStyle = '#e8f0d8';
    for (const s of spores) {
      if (!single) {
        const wind = level === 'full' ? (p.x - 0.5) * 0.004 : 0.001;
        s.x += wind + s.speed;
        s.y += Math.sin(now * 0.0005 + s.phase) * 0.0003;
        if (s.x > 1.05) s.x = -0.05;
        if (s.x < -0.05) s.x = 1.05;
        if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0;
      }
      c.globalAlpha = 0.6;
      c.beginPath();
      c.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // Omula eyes in the mist: blue at rest, red on fast cursor movement
    for (const o of omula) {
      const ox = o.x * w, oy = o.y * h;
      const red = clamp(pointerSpeed / 1400);
      o.red += (red - o.red) * 0.08;
      const glow = c.createRadialGradient(ox, oy, 1, ox, oy, o.size * 3);
      const r = Math.round(90 + o.red * 160);
      const g = Math.round(160 - o.red * 100);
      const b = Math.round(200 - o.red * 160);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      c.fillStyle = glow;
      c.beginPath();
      c.arc(ox, oy, o.size * 3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgb(${r},${g},${b})`;
      c.beginPath();
      c.arc(ox, oy, o.size, 0, Math.PI * 2);
      c.fill();
    }

    // glider crossing the sky
    const gAge = now - glider.start;
    if (glider.active && gAge >= 0 && gAge < 9000) {
      const t = gAge / 9000;
      const x = glider.dir > 0 ? -140 + t * (w + 280) : w + 140 - t * (w + 280);
      const y = h * 0.18 + Math.sin(t * Math.PI) * -h * 0.06;
      c.save();
      c.translate(x, y);
      if (glider.dir < 0) c.scale(-1, 1);
      c.fillStyle = '#e8e4d7';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(46, -6);
      c.lineTo(52, 0);
      c.lineTo(46, 6);
      c.closePath();
      c.fill();
      c.strokeStyle = '#2f5d3a';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(4, 0); c.lineTo(46, 0);
      c.stroke();
      c.restore();
    } else if (gAge >= 9000) glider.active = false;
  }

  const loop = createLoop(draw, root, { fps: 60, effects: level });
  draw(performance.now(), level === 'off');
  loop.start();

  return {
    unmount() { loop.destroy(); pointer.destroy(); canvasLayer.destroy(); },
    resize() { canvasLayer.resize(); },
    onEffects(next) {
      level = reduced ? 'off' : next;
      loop.setEffects(level);
      pointer.setEffects(level);
      ensureSpores();
    },
  };
}
