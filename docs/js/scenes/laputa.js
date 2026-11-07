// Laputa scene: sea of clouds, a floating island with gardens and towers,
// drifting airships and ornithopters, a pulsing crystal glow (click to
// send a ring of light), and a giant gardener robot in the foreground.
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

  const clouds = Array.from({ length: 18 }, () => ({ x: Math.random(), y: rand(0.05, 0.55), depth: rand(0.2, 0.9), size: rand(60, 150), phase: rand(0, 6.28) }));
  const ships = Array.from({ length: 4 }, () => ({ x: rand(0, 1), y: rand(0.1, 0.45), speed: rand(0.00015, 0.0004), dir: Math.random() < 0.5 ? 1 : -1, phase: rand(0, 6.28) }));
  const crystal = { x: 0.5, y: 0.42, radius: 0, pulse: 0 };
  const ring = { active: false, start: -1e9, x: 0, y: 0 };
  let nextBell = performance.now() + rand(12000, 22000);
  let nextWind = performance.now() + rand(4000, 8000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  const onClick = (event) => {
    if (level === 'off' || !event.target?.closest?.('a,button,input,header,.film-subnav')) return;
    const w = canvasLayer.width, h = canvasLayer.height;
    const x = event.clientX, y = event.clientY;
    if (Math.hypot(x - crystal.x * w, y - crystal.y * h) < 80) {
      ring.active = true;
      ring.start = performance.now();
      ring.x = crystal.x * w;
      ring.y = crystal.y * h;
      if (soundOn()) audio.scene('bell', { frequency: 880 });
    }
  };
  window.addEventListener('click', onClick);

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();

    // pale sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#c9d6e8');
    sky.addColorStop(0.5, '#8fb3d9');
    sky.addColorStop(1, '#4a6fa5');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    // sea of clouds, layered parallax
    for (const cloud of clouds) {
      const depth = cloud.depth;
      const offset = (p.x - 0.5) * depth * 60;
      const cx = cloud.x * w + offset + Math.sin(now * 0.0002 + cloud.phase) * 12;
      const cy = cloud.y * h + Math.sin(now * 0.0003 + cloud.phase) * 6;
      c.fillStyle = `rgba(255,255,255,${0.35 + depth * 0.45})`;
      c.beginPath();
      c.ellipse(cx, cy, cloud.size * (0.7 + depth * 0.5), cloud.size * 0.4, 0, 0, Math.PI * 2);
      c.fill();
    }

    // floating island
    const ix = w * 0.5 + (p.x - 0.5) * 14;
    const iy = h * 0.42 + (p.y - 0.5) * 8;
    c.fillStyle = '#3a6b4a';
    c.beginPath();
    c.ellipse(ix, iy, 110, 26, 0, 0, Math.PI * 2);
    c.fill();
    // gardens
    c.fillStyle = '#6b8f4e';
    c.beginPath();
    c.ellipse(ix - 30, iy - 8, 38, 14, 0, 0, Math.PI * 2);
    c.ellipse(ix + 34, iy - 10, 44, 16, 0, 0, Math.PI * 2);
    c.fill();
    // towers
    c.fillStyle = '#2a3a5a';
    for (const [ox, oy, rw, rh] of [[-40, -38, 14, 34], [8, -46, 16, 42], [42, -32, 12, 28]]) {
      c.fillRect(ix + ox, iy + oy, rw, rh);
    }
    // crystal glow
    crystal.pulse = 0.6 + Math.sin(now * 0.002) * 0.4;
    const cg = c.createRadialGradient(ix, iy - 14, 2, ix, iy - 14, 40 * crystal.pulse);
    cg.addColorStop(0, 'rgba(143,179,217,0.85)');
    cg.addColorStop(1, 'rgba(143,179,217,0)');
    c.fillStyle = cg;
    c.beginPath();
    c.arc(ix, iy - 14, 40 * crystal.pulse, 0, Math.PI * 2);
    c.fill();
    // click ring
    if (ring.active) {
      const age = (now - ring.start) / 900;
      if (age >= 1) ring.active = false;
      else {
        const r = age * 180;
        c.globalAlpha = (1 - age) * 0.7;
        c.strokeStyle = '#8fb3d9';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(ring.x, ring.y, r, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      }
    }

    // airships / ornithopters
    for (const s of ships) {
      if (!single) {
        s.x += s.dir * s.speed;
        if (s.dir > 0 && s.x > 1.1) s.x = -0.1;
        if (s.dir < 0 && s.x < -0.1) s.x = 1.1;
      }
      const sx = s.x * w, sy = s.y * h + Math.sin(now * 0.001 + s.phase) * 6;
      c.save();
      c.translate(sx, sy);
      if (s.dir < 0) c.scale(-1, 1);
      c.fillStyle = '#2a3a5a';
      c.beginPath();
      c.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#8fb3d9';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-18, 0); c.lineTo(-26, -4);
      c.moveTo(18, 0); c.lineTo(26, -4);
      c.stroke();
      c.restore();
    }

    // giant gardener robot on the foreground green
    const rx = w * 0.82, ry = h * 0.86;
    c.fillStyle = '#2a3a5a';
    c.fillRect(rx - 16, ry - 60, 32, 50);
    c.beginPath();
    c.arc(rx, ry - 72, 14, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#8fb3d9';
    c.fillRect(rx - 6, ry - 76, 12, 6);
    c.fillStyle = '#3a6b4a';
    c.fillRect(rx - 28, ry - 4, 56, 12);

    // distant ground
    c.fillStyle = '#3a6b4a';
    c.fillRect(0, h * 0.86, w, h * 0.14);

    if (!single) {
      if (now >= nextBell) { nextBell = now + rand(12000, 22000); if (soundOn()) audio.scene('bell', { frequency: 880 }); }
      if (now >= nextWind) { nextWind = now + rand(4000, 8000); if (soundOn()) audio.scene('wind', { volume: 0.018 }); }
    }
  }

  const loop = createLoop(draw, root, { fps: 60, effects: level });
  draw(performance.now(), level === 'off');
  loop.start();

  return {
    unmount() { loop.destroy(); pointer.destroy(); canvasLayer.destroy(); window.removeEventListener('click', onClick); },
    resize() { canvasLayer.resize(); },
    onEffects(next) {
      level = reduced ? 'off' : next;
      loop.setEffects(level);
      pointer.setEffects(level);
    },
  };
}
