// Howl scene: twilight hills, flower meadows, a walking castle silhouette
// that smokes and clanks, falling stars, a fire demon in the chimney, and
// a door color wheel that cycles the page palette among four variants.
import { createCanvasLayer, createLoop, createPointerTracker, clamp, drawHills, addSvgFilter } from './kit.js';

const rand = (a, b) => a + Math.random() * (b - a);

const PALETTES = [
  ['#4a5a7a', '#8a9ac9', '#d9c9e8', '#e8d9a0', '#2a2a4a'],
  ['#6b4a7a', '#c94a4a', '#8fa8d9', '#f0d9a0', '#3a2a4a'],
  ['#2f5d3a', '#6b8f4e', '#a8c09a', '#d9c9a3', '#7a6a55'],
  ['#1a3a5a', '#4a7a8a', '#c97a4a', '#d9b08a', '#2a2a3a'],
];

export async function mount(ctx) {
  const { root, audio, kit, settings } = ctx;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = reduced ? 'off' : settings.get().effects;
  const canvasLayer = createCanvasLayer(root, 'scene-canvas');
  addSvgFilter(root);
  const pointer = createPointerTracker(root, level);
  const c = canvasLayer.ctx;

  const stars = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.5, phase: rand(0, 6.28), speed: rand(0.0004, 0.0012) }));
  const flowers = Array.from({ length: 80 }, () => ({ x: Math.random(), y: 0.78 + Math.random() * 0.18, size: rand(1.5, 3.5), phase: rand(0, 6.28), color: Math.random() < 0.5 ? '#e8d9a0' : '#f0b8c8' }));
  const embers = Array.from({ length: 24 }, () => ({ x: 0.48 + rand(-0.04, 0.04), y: 0.78, vx: rand(-0.001, 0.001), vy: rand(-0.004, -0.0015), life: Math.random(), size: rand(1.5, 3) }));
  const smoke = Array.from({ length: 12 }, () => ({ x: 0.48 + rand(-0.03, 0.03), y: 0.7, vy: rand(-0.0008, -0.0003), size: rand(6, 14), phase: rand(0, 6.28) }));
  let castleX = -260;
  let castleNext = performance.now() + 2000;
  let lastClank = 0;
  let nextCrackle = performance.now() + rand(2000, 4000);
  let paletteIndex = 0;

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  const wheel = document.createElement('button');
  wheel.type = 'button';
  wheel.className = 'scene-door-wheel';
  wheel.setAttribute('aria-label', 'Cycle page palette');
  wheel.innerHTML = '<span></span><span></span><span></span><span></span>';
  root.append(wheel);
  const applyPalette = (index) => {
    paletteIndex = index % PALETTES.length;
    const p = PALETTES[paletteIndex];
    p.forEach((c, i) => document.documentElement.style.setProperty(`--c${i + 1}`, c));
    if (document.body) document.body.style.background = `radial-gradient(ellipse at top, ${p[0]}22, var(--color-bg) 60%)`;
    wheel.dataset.palette = String(paletteIndex);
  };
  wheel.addEventListener('click', () => {
    applyPalette(paletteIndex + 1);
    if (soundOn()) audio.scene('click', { frequency: 660 });
  });

  function drawCastle(now, w, h, single) {
    c.fillStyle = '#2a2440';
    // base block
    c.fillRect(-60, -10, 120, 70);
    // towers
    for (const [ox, oy, rw, rh] of [[-50, -46, 22, 36], [20, -52, 26, 44], [56, -30, 16, 20]]) {
      c.fillRect(ox, oy, rw, rh);
    }
    // chimney
    c.fillRect(46, -70, 14, 24);
    // legs
    c.strokeStyle = '#1a1730';
    c.lineWidth = 5;
    for (const lx of [-40, 0, 40]) {
      c.beginPath();
      c.moveTo(lx, 60);
      c.lineTo(lx + Math.sin(now * 0.002 + lx) * 6, 108);
      c.stroke();
    }
    c.restore();
    // smoke puffs
    c.fillStyle = 'rgba(200,205,220,0.25)';
    for (const s of smoke) {
      if (!single) { s.y -= s.vy; s.x += Math.sin(now * 0.0004 + s.phase) * 0.0003; if (s.y < 0.55) { s.y = 0.7; s.x = 0.46 + rand(-0.03, 0.03); } }
      c.beginPath();
      c.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
      c.fill();
    }
    // metal clank
    if (!single && now - lastClank > 5000 && Math.random() < 0.003) {
      lastClank = now;
      if (soundOn()) audio.scene('clank');
    }
  }

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const progress = clamp((window.scrollY) / (h * 2));

    // twilight sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1a2a4a');
    sky.addColorStop(0.45, '#4a5a7a');
    sky.addColorStop(0.72, '#c97a4a');
    sky.addColorStop(0.9, '#e8d9a0');
    sky.addColorStop(1, '#2a2a4a');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    drawHills(c, { w, h, y: h * 0.74, amp: 26, color: '#2a3a2a', offset: -(p.x - 0.5) * 14, seed: 7 });
    drawHills(c, { w, h, y: h * 0.82, amp: 18, color: '#1f2f1f', offset: -(p.x - 0.5) * 22, seed: 13 });

    // falling stars (night only, rare)
    c.fillStyle = '#fff6d8';
    for (const s of stars) {
      if (!single) { s.y += s.speed; s.x += s.speed * 0.4; if (s.y > 0.6) { s.y = Math.random() * 0.1; s.x = Math.random(); } }
      const tw = 0.4 + Math.sin(now * 0.004 + s.phase) * 0.6;
      c.globalAlpha = Math.max(0.1, tw);
      c.beginPath();
      c.arc(s.x * w, s.y * h, 1.6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // flower meadow
    for (const f of flowers) {
      const sway = single ? 0 : Math.sin(now * 0.001 + f.phase) * 2 + (level === 'full' ? (p.x - 0.5) * 4 : 0);
      c.fillStyle = f.color;
      c.beginPath();
      c.arc(f.x * w + sway, f.y * h, f.size, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#2f5d3a';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(f.x * w + sway, f.y * h + f.size);
      c.lineTo(f.x * w + sway, f.y * h + f.size + 8);
      c.stroke();
    }

    drawCastle(now, w, h, single);

    // fire demon (embers in chimney area)
    c.fillStyle = '#f5a623';
    for (const e of embers) {
      if (!single) {
        e.x += e.vx + (level === 'full' ? (p.x - 0.5) * 0.0006 : 0);
        e.y += e.vy;
        e.life -= 0.004;
        if (e.life <= 0) { e.x = 0.48 + rand(-0.04, 0.04); e.y = 0.78; e.vx = rand(-0.001, 0.001); e.vy = rand(-0.004, -0.0015); e.life = 1; e.size = rand(1.5, 3); }
      }
      c.globalAlpha = e.life * 0.85;
      const grad = c.createRadialGradient(e.x * w, e.y * h, 0, e.x * w, e.y * h, e.size * 3);
      grad.addColorStop(0, 'rgba(255,180,60,0.95)');
      grad.addColorStop(1, 'rgba(255,180,60,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(e.x * w, e.y * h, e.size * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    if (!single && now >= nextCrackle) {
      nextCrackle = now + rand(2200, 4800);
      if (soundOn()) audio.scene('fire', { frequency: rand(120, 200) });
    }
  }

  const loop = createLoop(draw, root, { fps: 60, effects: level });
  draw(performance.now(), level === 'off');
  loop.start();

  return {
    unmount() { wheel.remove(); loop.destroy(); pointer.destroy(); canvasLayer.destroy(); },
    resize() { canvasLayer.resize(); },
    onEffects(next) {
      level = reduced ? 'off' : next;
      loop.setEffects(level);
      pointer.setEffects(level);
    },
  };
}
