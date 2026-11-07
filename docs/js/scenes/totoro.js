// Totoro scene: rural road, bus stop in the rain, giant camphor tree, grass
// and rice fields, dusk light. Rain with ripples, swaying grass, falling
// acorns that sprout on click, a Catbus silhouette behind the tree, soot
// sprites in the corners and fireflies after the rain.
import { createCanvasLayer, createLoop, createPointerTracker, clamp, drawHills, drawTreeRow } from './kit.js';

const rand = (a, b) => a + Math.random() * (b - a);

const RAINDROP_COUNT = 140;
const GRASS_COUNT = 60;
const ACORN_COUNT = 12;

export async function mount(ctx) {
  const { root, audio, kit, settings } = ctx;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = reduced ? 'off' : settings.get().effects;
  const canvasLayer = createCanvasLayer(root, 'scene-canvas');
  const pointer = createPointerTracker(root, level);
  const c = canvasLayer.ctx;

  const rain = Array.from({ length: RAINDROP_COUNT }, () => ({
    x: Math.random(), y: Math.random(), len: rand(10, 22), speed: rand(0.012, 0.028), phase: rand(0, 6.28),
  }));
  const ripples = [];
  const glass = Array.from({ length: 18 }, () => ({ x: rand(0.1, 0.9), y: rand(0, 0.3), vy: rand(0.0006, 0.0018), size: rand(1.5, 3.5) }));
  const grass = Array.from({ length: GRASS_COUNT }, (_, i) => ({
    x: (i + rand(-0.3, 0.3)) / GRASS_COUNT, height: rand(0.06, 0.13), phase: rand(0, 6.28), lean: 0,
  }));
  const acorns = [];
  const seedlings = [];
  const soot = Array.from({ length: 6 }, () => ({ x: rand(0.05, 0.95), y: rand(0.78, 0.95), vx: 0, vy: 0, phase: rand(0, 6.28) }));
  const fireflies = Array.from({ length: 14 }, () => ({ x: rand(0.1, 0.9), y: rand(0.3, 0.85), phase: rand(0, 6.28), speed: rand(0.0003, 0.0008) }));

  let catbusNext = performance.now() + rand(30000, 55000);
  let catbusStart = -1e9;
  let lastClick = 0;
  let nextFrog = performance.now() + rand(4000, 9000);
  let scrollY = 0;

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function ensureRain() {
    const target = level === 'off' ? 0 : level === 'lite' ? 45 : RAINDROP_COUNT;
    while (rain.length < target) rain.push({ x: Math.random(), y: Math.random(), len: rand(10, 22), speed: rand(0.012, 0.028), phase: rand(0, 6.28) });
    while (rain.length > target) rain.pop();
  }
  ensureRain();

  const onClick = (event) => {
    if (level === 'off' || !event.target?.closest?.('a,button,input,header,.film-subnav')) return;
    const w = canvasLayer.width, h = canvasLayer.height;
    const x = event.clientX, y = event.clientY;
    if (y < h * 0.55 || y > h * 0.95) return;
    if (acorns.length + seedlings.length >= ACORN_COUNT) return;
    acorns.push({ x: x / w, y: y / h, vy: 0.004, phase: rand(0, 6.28) });
  };
  window.addEventListener('click', onClick);

  function drawCatbus(now, w, h) {
    const age = now - catbusStart;
    if (age < 0 || age > 5000) return;
    const t = age / 5000;
    const x = -260 + t * (w + 520);
    const y = h * 0.34 + Math.sin(t * Math.PI) * -14;
    c.save();
    c.globalAlpha = Math.sin(t * Math.PI) * 0.85;
    c.fillStyle = '#4a3a7a';
    c.beginPath();
    c.ellipse(x, y, 90, 34, 0, 0, Math.PI * 2);
    c.fill();
    // ears
    c.beginPath();
    c.moveTo(x - 60, y - 24); c.lineTo(x - 44, y - 60); c.lineTo(x - 24, y - 26);
    c.moveTo(x + 24, y - 26); c.lineTo(x + 44, y - 60); c.lineTo(x + 60, y - 24);
    c.fill();
    // windows
    c.fillStyle = '#f5d089';
    for (let i = 0; i < 4; i++) c.fillRect(x - 60 + i * 32, y - 8, 16, 12);
    // legs
    c.strokeStyle = '#2a1f4a';
    c.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const lx = x - 70 + i * 28;
      const sway = Math.sin(now * 0.02 + i) * 8;
      c.beginPath();
      c.moveTo(lx, y + 24);
      c.lineTo(lx + sway, y + 52);
      c.stroke();
    }
    c.restore();
  }

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    scrollY = window.scrollY;
    const progress = clamp((scrollY - h * 0.3) / (h * 1.4));

    if (!single) {
      if (now >= catbusNext) { catbusNext = now + rand(45000, 90000); catbusStart = now; }
      if (now >= nextFrog) { nextFrog = now + rand(4000, 9000); if (soundOn()) audio.scene('bells', { frequency: 220, duration: 0.6, volume: 0.02 }); }
    }

    // dusk sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3a4a6a');
    sky.addColorStop(0.5, '#6b8f4e');
    sky.addColorStop(0.85, '#2f5d3a');
    sky.addColorStop(1, '#1a2a1a');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    drawHills(c, { w, h, y: h * 0.62, amp: 22, color: '#1f3d2a', offset: -(p.x - 0.5) * 10, seed: 7 });

    // camphor tree silhouette
    c.fillStyle = '#0d1f14';
    c.beginPath();
    c.moveTo(w * 0.38, h * 0.95);
    c.quadraticCurveTo(w * 0.4, h * 0.5, w * 0.46, h * 0.34);
    c.quadraticCurveTo(w * 0.52, h * 0.2, w * 0.6, h * 0.34);
    c.quadraticCurveTo(w * 0.66, h * 0.5, w * 0.64, h * 0.95);
    c.closePath();
    c.fill();
    // canopy
    c.fillStyle = '#0a1a10';
    for (const [ox, oy, r] of [[0.46, 0.3, 0.16], [0.56, 0.26, 0.14], [0.5, 0.22, 0.12]]) {
      c.beginPath();
      c.ellipse(w * ox, h * oy, w * r, h * r * 0.7, 0, 0, Math.PI * 2);
      c.fill();
    }

    // grass field sway
    const grassColor = '#2f5d3a';
    c.strokeStyle = grassColor;
    c.lineWidth = 1.4;
    c.globalAlpha = 0.85;
    for (const g of grass) {
      const sway = single ? 0 : Math.sin(now * 0.0012 + g.phase) * 4 + (level === 'full' ? (p.x - 0.5) * 6 : 0);
      const gx = g.x * w;
      const gy = h * 0.86;
      const gh = g.height * h;
      c.beginPath();
      c.moveTo(gx, gy);
      c.quadraticCurveTo(gx + sway * 0.6, gy - gh * 0.55, gx + sway, gy - gh);
      c.stroke();
    }
    c.globalAlpha = 1;

    // rain (intensity by scroll progress)
    const rainAlpha = 0.15 + progress * 0.55;
    c.strokeStyle = `rgba(200,220,230,${rainAlpha})`;
    c.lineWidth = 1;
    for (const r of rain) {
      if (!single) { r.y += r.speed; if (r.y > 1) { r.y = -r.len / h; r.x = Math.random(); } }
      c.beginPath();
      c.moveTo(r.x * w, r.y * h);
      c.lineTo(r.x * w - 0.5, r.y * h + r.len);
      c.stroke();
    }
    // puddle ripples at bottom
    c.strokeStyle = 'rgba(200,220,230,0.35)';
    c.lineWidth = 1;
    for (const rp of ripples) {
      const age = (now - rp.start) / rp.dur;
      if (age >= 1) { ripples.splice(ripples.indexOf(rp), 1); continue; }
      const r = age * 28;
      c.globalAlpha = (1 - age) * 0.6;
      c.beginPath();
      c.arc(rp.x * w, rp.y * h, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
    if (!single && Math.random() < 0.06) {
      ripples.push({ x: Math.random(), y: 0.88 + Math.random() * 0.08, start: now, dur: 900 });
    }

    // glass droplets sliding
    c.fillStyle = 'rgba(220,235,245,0.5)';
    for (const g of glass) {
      if (!single) { g.y += g.vy; if (g.y > 0.4) { g.y = rand(0, 0.1); g.x = rand(0.1, 0.9); } }
      c.beginPath();
      c.arc(g.x * w, g.y * h, g.size, 0, Math.PI * 2);
      c.fill();
    }

    // acorns falling + sprouting
    for (let i = acorns.length - 1; i >= 0; i--) {
      const a = acorns[i];
      if (!single) { a.vy += 0.0004; a.y += a.vy; }
      c.fillStyle = '#5a3a1f';
      c.beginPath();
      c.ellipse(a.x * w, a.y * h, 5, 4, 0, 0, Math.PI * 2);
      c.fill();
      if (a.y > 0.86) {
        seedlings.push({ x: a.x, phase: rand(0, 6.28), height: 0 });
        acorns.splice(i, 1);
      }
    }
    for (const s of seedlings) {
      if (!single) s.height = Math.min(0.06, s.height + 0.0008);
      const sx = s.x * w, sy = h * 0.86;
      const sh = s.height * h;
      const sway = single ? 0 : Math.sin(now * 0.0015 + s.phase) * 3;
      c.strokeStyle = '#6b8f4e';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(sx, sy);
      c.quadraticCurveTo(sx + sway * 0.5, sy - sh * 0.5, sx + sway, sy - sh);
      c.stroke();
      c.fillStyle = '#a8c09a';
      c.beginPath();
      c.ellipse(sx + sway, sy - sh, 4, 2.5, 0, 0, Math.PI * 2);
      c.fill();
    }

    // soot sprites in corners
    c.fillStyle = '#1a1a1a';
    for (const s of soot) {
      const sx = s.x * w, sy = s.y * h;
      const dx = sx - p.x * w, dy = sy - p.y * h;
      const dist = Math.hypot(dx, dy);
      if (level === 'full' && !single && dist < 120) {
        s.vx += (dx / (dist || 1)) * 0.003;
        s.vy += (dy / (dist || 1)) * 0.003;
      }
      s.vx *= 0.9; s.vy *= 0.9;
      s.x = clamp(s.x + s.vx, 0.03, 0.97);
      s.y = clamp(s.y + s.vy, 0.78, 0.96);
      const wig = single ? 0 : Math.sin(now * 0.005 + s.phase) * 1.2;
      c.beginPath();
      c.arc(s.x * w, s.y * h, 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(s.x * w - 2, s.y * h - 1.5, 1.2, 0, Math.PI * 2);
      c.arc(s.x * w + 2, s.y * h - 1.5, 1.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1a1a1a';
    }

    // Catbus silhouette behind the camphor tree, rare appearance
    const catAge = now - catbusStart;
    if (catAge >= 0 && catAge < 5000) {
      const t = catAge / 5000;
      const alpha = Math.sin(t * Math.PI) * 0.85;
      const x = w * 0.48 + Math.sin(t * Math.PI) * w * 0.05;
      const y = h * 0.38;
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = '#4a3a7a';
      c.beginPath();
      c.ellipse(x, y, 90, 34, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(x - 60, y - 24); c.lineTo(x - 44, y - 60); c.lineTo(x - 24, y - 26);
      c.moveTo(x + 24, y - 26); c.lineTo(x + 44, y - 60); c.lineTo(x + 60, y - 24);
      c.fill();
      c.fillStyle = '#f5d089';
      for (let i = 0; i < 4; i++) c.fillRect(x - 60 + i * 32, y - 8, 16, 12);
      c.strokeStyle = '#2a1f4a';
      c.lineWidth = 4;
      for (let i = 0; i < 6; i++) {
        const lx = x - 70 + i * 28;
        const sway = Math.sin(now * 0.02 + i) * 8;
        c.beginPath();
        c.moveTo(lx, y + 24);
        c.lineTo(lx + sway, y + 52);
        c.stroke();
      }
      c.restore();
    }
    if (!single && now >= catbusNext) {
      catbusNext = now + rand(45000, 90000);
      catbusStart = now;
    }

    // fireflies after rain (scroll progress > 0.4)
    if (progress > 0.35) {
      const fa = clamp((progress - 0.35) * 2);
      c.fillStyle = '#f5e6b8';
      for (const f of fireflies) {
        if (!single) f.x += Math.sin(now * 0.0003 + f.phase) * 0.0002;
        const fx = f.x * w, fy = f.y * h;
        const glow = fa * (0.5 + Math.sin(now * 0.002 + f.phase) * 0.5);
        c.globalAlpha = glow;
        const grad = c.createRadialGradient(fx, fy, 0, fx, fy, 6);
        grad.addColorStop(0, 'rgba(255,230,150,0.9)');
        grad.addColorStop(1, 'rgba(255,230,150,0)');
        c.fillStyle = grad;
        c.beginPath();
        c.arc(fx, fy, 6, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#2f5d3a';
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
      ensureRain();
    },
  };
}
