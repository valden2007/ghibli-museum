// Kiki scene: seaside town with tiled roofs and a bakery, laundry and flags
// swaying, seagulls, a stylized girl on a broom crossing on scroll with a
// leaf trail, sparkles on water, windows lighting up at evening.
import { createCanvasLayer, createLoop, createPointerTracker, clamp, drawHills, addSvgFilter } from './kit.js';

const rand = (a, b) => a + Math.random() * (b - a);

export async function mount(ctx) {
  const { root, audio, kit, settings } = ctx;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = reduced ? 'off' : settings.get().effects;
  const canvasLayer = createCanvasLayer(root, 'scene-canvas');
  addSvgFilter(root);
  const pointer = createPointerTracker(root, level);
  const c = canvasLayer.ctx;

  const seagulls = Array.from({ length: 9 }, () => ({ x: rand(0, 1), y: rand(0.08, 0.36), speed: rand(0.0003, 0.0009), phase: rand(0, 6.28) }));
  const laundry = Array.from({ length: 14 }, (_, i) => ({ x: 0.1 + i * 0.055, y: 0.46 + (i % 3) * 0.01, phase: rand(0, 6.28), color: i % 2 === 0 ? '#f0d9a0' : '#8fa8d9' }));
  const trail = [];
  let broomNext = performance.now() + rand(12000, 22000);
  let broomStart = -1e9;
  let nextBell = performance.now() + rand(9000, 16000);
  let nextSeagull = performance.now() + rand(6000, 12000);
  let nextSea = performance.now() + rand(5000, 9000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const progress = clamp((window.scrollY - h * 0.2) / (h * 1.4));
    const evening = progress > 0.45;

    if (!single) {
      if (now >= broomNext) { broomNext = now + rand(25000, 40000); broomStart = now; }
      if (now >= nextBell) { nextBell = now + rand(9000, 16000); if (soundOn()) audio.scene('bell', { frequency: 920 }); }
      if (now >= nextSeagull) { nextSeagull = now + rand(6000, 12000); if (soundOn()) audio.scene('bird', { frequency: 1500 }); }
      if (now >= nextSea) { nextSea = now + rand(5000, 9000); if (soundOn()) audio.scene('water', { volume: 0.018 }); }
    }

    // day to evening sky
    const sky = c.createLinearGradient(0, 0, 0, h * 0.5);
    sky.addColorStop(0, evening ? '#2a2a4a' : '#6fa8dc');
    sky.addColorStop(0.6, evening ? '#6b4a7a' : '#b8d4e8');
    sky.addColorStop(1, evening ? '#c94a4a' : '#f0d9a0');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h * 0.5);

    // sea band
    const sea = c.createLinearGradient(0, h * 0.5, 0, h);
    sea.addColorStop(0, '#4aa8a8');
    sea.addColorStop(1, '#1a3a5a');
    c.fillStyle = sea;
    c.fillRect(0, h * 0.5, w, h * 0.5);

    // distant hills
    drawHills(c, { w, h, y: h * 0.5, amp: 18, color: '#2a4a5a', offset: -(p.x - 0.5) * 10, seed: 5 });

    // town rooftops silhouette
    c.fillStyle = '#2a2a3a';
    for (let i = 0; i < 11; i++) {
      const x = i * (w / 10) - 20;
      const rw = 40 + (i % 3) * 22;
      const rh = 28 + (i % 4) * 18;
      c.fillRect(x, h * 0.46 - rh, rw, rh);
      // chimney
      if (i % 2 === 0) c.fillRect(x + rw * 0.5 - 3, h * 0.46 - rh - 14, 6, 14);
    }
    // bakery (a slightly taller, warmer building)
    c.fillStyle = '#3a2a2a';
    c.fillRect(w * 0.42, h * 0.46 - 70, 90, 70);
    c.fillStyle = evening ? 'rgba(255,200,120,0.7)' : 'rgba(255,220,160,0.3)';
    c.fillRect(w * 0.44, h * 0.46 - 58, 14, 14);
    c.fillRect(w * 0.48, h * 0.46 - 58, 14, 14);

    // laundry and flags swaying
    c.strokeStyle = '#e8e4d7';
    c.lineWidth = 1;
    for (const l of laundry) {
      const sway = single ? 0 : Math.sin(now * 0.0015 + l.phase) * 4 + (level === 'full' ? (p.x - 0.5) * 3 : 0);
      const lx = l.x * w, ly = l.y * h;
      c.beginPath();
      c.moveTo(lx - 16, ly);
      c.lineTo(lx + 16, ly);
      c.stroke();
      c.fillStyle = l.color;
      c.beginPath();
      c.moveTo(lx - 14, ly);
      c.quadraticCurveTo(lx - 8 + sway * 0.5, ly + 6, lx + sway, ly + 12);
      c.lineTo(lx + sway + 2, ly + 12);
      c.quadraticCurveTo(lx - 6 + sway * 0.5, ly + 6, lx - 12, ly);
      c.closePath();
      c.fill();
    }

    // windows lighting up at evening
    if (evening) {
      c.fillStyle = 'rgba(255,200,120,0.55)';
      for (let i = 0; i < 11; i++) {
        const x = i * (w / 10) - 20 + 14;
        const y = h * 0.46 - (28 + (i % 4) * 18) + 6;
        c.fillRect(x, y, 8, 8);
      }
    }

    // broom silhouette crossing on scroll
    const broomAge = now - broomStart;
    if (broomAge >= 0 && broomAge < 7000) {
      const t = broomAge / 7000;
      const x = -120 + t * (w + 240);
      const y = h * 0.22 + Math.sin(t * Math.PI) * -h * 0.08;
      c.save();
      c.translate(x, y);
      c.fillStyle = '#1a1a2a';
      // girl silhouette
      c.beginPath();
      c.ellipse(0, -6, 8, 12, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(-3, 6, 6, 14);
      // broom
      c.strokeStyle = '#5a3a1f';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-14, 14);
      c.lineTo(22, 14);
      c.stroke();
      c.fillStyle = '#8a6a3a';
      c.beginPath();
      c.ellipse(26, 14, 6, 3, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      // leaf trail
      if (!single && Math.random() < 0.12) trail.push({ x: x / w, y: y / h, life: 1, vx: rand(-0.0004, 0.0004), vy: rand(0.0002, 0.0008) });
    }
    if (!single && now >= broomNext) {
      broomNext = now + rand(25000, 40000);
      broomStart = now;
      if (soundOn()) audio.scene('wind', { volume: 0.02 });
    }
    // draw leaf trail
    for (let i = trail.length - 1; i >= 0; i--) {
      const l = trail[i];
      if (!single) { l.x += l.vx; l.y += l.vy; l.life -= 0.012; }
      if (l.life <= 0) { trail.splice(i, 1); continue; }
      c.save();
      c.globalAlpha = l.life * 0.7;
      c.fillStyle = '#6b8f4e';
      c.beginPath();
      c.ellipse(l.x * w, l.y * h, 3, 1.5, l.life * 2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.globalAlpha = 1;

    // seagulls
    c.fillStyle = '#f4efe1';
    for (const g of seagulls) {
      if (!single) { g.x += g.speed; if (g.x > 1.05) g.x = -0.05; }
      const gx = g.x * w, gy = g.y * h + Math.sin(now * 0.001 + g.phase) * 6;
      c.save();
      c.translate(gx, gy);
      c.beginPath();
      c.moveTo(-6, 0); c.quadraticCurveTo(0, -4, 6, 0);
      c.stroke();
      c.restore();
    }

    // sparkles on water
    c.fillStyle = 'rgba(255,240,180,0.7)';
    for (let i = 0; i < 14; i++) {
      const sx = (i * 0.073 + now * 0.00002) % 1 * w;
      const sy = h * 0.52 + (i % 3) * 4;
      const tw = 0.3 + Math.sin(now * 0.003 + i) * 0.7;
      c.globalAlpha = Math.max(0, tw);
      c.fillRect(sx, sy, 2, 1);
    }
    c.globalAlpha = 1;

    if (!single) {
      if (now >= nextBell) { nextBell = now + rand(9000, 16000); if (soundOn()) audio.scene('bell', { frequency: 900 }); }
      if (now >= nextSeagull) { nextSeagull = now + rand(6000, 12000); if (soundOn()) audio.scene('bird', { frequency: 1600 }); }
      if (now >= nextSea) { nextSea = now + rand(5000, 9000); if (soundOn()) audio.scene('water', { volume: 0.018 }); }
    }
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
    },
  };
}
