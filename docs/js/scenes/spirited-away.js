// Spirited Away scene: night bathhouse road over water, rows of red lanterns
// igniting on scroll (click a lantern to light it early), rising steam,
// susuwati soot balls scattering from the cursor, a distant No-Face that
// occasionally turns its mask toward the pointer, and a rare water train.
import { createCanvasLayer, createLoop, createPointerTracker, clamp, drawHills, addSvgFilter } from './kit.js';

const rand = (a, b) => a + Math.random() * (b - a);

const LANTERNS = Array.from({ length: 10 }, (_, i) => ({
  x: 0.05 + i * 0.095,
  y: 0.56 + (i % 2) * 0.02,
  lit: 0,
  boost: 0,
  flicker: Math.random() * 6.28,
}));

export async function mount(ctx) {
  const { root, audio, kit, settings } = ctx;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = reduced ? 'off' : settings.get().effects;
  const canvasLayer = createCanvasLayer(root, 'scene-canvas');
  addSvgFilter(root);
  const pointer = createPointerTracker(root, level);
  const c = canvasLayer.ctx;

  const steam = [];
  const soot = Array.from({ length: 7 }, () => ({
    x: Math.random(), y: 0.62 + Math.random() * 0.28,
    vx: 0, vy: 0, phase: rand(0, 6.28), jitter: rand(0.6, 1.4),
  }));
  let trainNext = performance.now() + rand(18000, 32000);
  let trainStart = -1e9;
  let nextBell = performance.now() + rand(9000, 15000);
  let nextWater = performance.now() + rand(6000, 10000);
  let noFaceTurnUntil = 0;
  let noFaceNext = performance.now() + rand(12000, 24000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function ensureSteam() {
    const target = level === 'off' ? 0 : level === 'lite' ? 10 : 26;
    while (steam.length < target) steam.push({ x: rand(0.2, 0.8), y: rand(0.6, 1), size: rand(8, 22), speed: rand(0.012, 0.03) });
    while (steam.length > target) steam.pop();
  }
  ensureSteam();

  const onClick = (event) => {
    if (level === 'off') return;
    if (event.target?.closest?.('a,button,input,header,.film-subnav')) return;
    const w = canvasLayer.width, h = canvasLayer.height;
    const x = event.clientX, y = event.clientY;
    if (y < 0 || y > h) return;
    for (const l of LANTERNS) {
      const lx = l.x * w, ly = l.y * h;
      if (Math.hypot(x - lx, y - ly) < 34) {
        l.boost = 1;
        if (soundOn()) audio.scene('bell', { frequency: rand(720, 900) });
        return;
      }
    }
  };
  window.addEventListener('click', onClick);

  function drawLantern(l, w, h, now, single) {
    const x = l.x * w, y = l.y * h;
    const flicker = single ? 1 : 0.85 + Math.sin(now * 0.003 + l.flicker) * 0.12;
    const glow = clamp(l.lit + l.boost);
    if (glow > 0.05) {
      const grad = c.createRadialGradient(x, y, 2, x, y, 42 * glow);
      grad.addColorStop(0, `rgba(255,170,80,${0.32 * glow * flicker})`);
      grad.addColorStop(1, 'rgba(255,170,80,0)');
      c.fillStyle = grad;
      c.fillRect(x - 46, y - 46, 92, 92);
    }
    c.fillStyle = `rgba(198,58,58,${0.35 + glow * 0.65})`;
    c.beginPath();
    c.ellipse(x, y, 9, 12, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#241014';
    c.fillRect(x - 5, y - 15, 10, 3);
    c.fillRect(x - 5, y + 12, 10, 3);
  }

  function drawTrain(now, w, h) {
    const age = now - trainStart;
    if (age < 0 || age > 11000) return;
    const t = age / 11000;
    const x = -260 + t * (w + 520);
    const y = h * 0.74;
    c.save();
    c.globalAlpha = Math.sin(t * Math.PI) * 0.95;
    c.fillStyle = '#7a1f1f';
    c.fillRect(x, y, 210, 26); // engine + cars silhouette band
    c.fillRect(x - 96, y + 4, 92, 22);
    c.fillStyle = '#f5d089';
    for (let i = 0; i < 6; i++) c.fillRect(x + 12 + i * 32, y + 7, 10, 8);
    for (let i = 0; i < 3; i++) c.fillRect(x - 88 + i * 30, y + 9, 8, 7);
    // wavy reflection on water
    c.globalAlpha *= 0.35;
    c.fillStyle = '#c9a227';
    for (let i = 0; i < 8; i++) {
      const rx = x + i * 26 + Math.sin(now * 0.002 + i) * 3;
      c.fillRect(rx, y + 34 + i % 2 * 4, 14, 2);
    }
    c.restore();
  }

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const px = p.x * w, py = p.y * h;
    const progress = clamp((window.scrollY - h * 0.4) / (h * 1.6));

    if (!single) {
      if (now >= trainNext) {
        trainNext = now + rand(38000, 60000);
        trainStart = now;
        if (soundOn()) audio.scene('engine');
      }
      if (now >= nextBell) { nextBell = now + rand(9000, 16000); if (soundOn()) audio.scene('bells'); }
      if (now >= nextWater) { nextWater = now + rand(5000, 9000); if (soundOn()) audio.scene('water', { volume: 0.02 }); }
      if (now >= noFaceNext && now > noFaceTurnUntil) {
        noFaceNext = now + rand(16000, 28000);
        noFaceTurnUntil = now + 2200;
      }
    }

    // night sky and distant bathhouse
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(0.55, '#1a2340');
    sky.addColorStop(0.78, '#25221c');
    sky.addColorStop(1, '#05070d');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    // bathhouse silhouette on the far bank (own vector composition)
    const bx = w * 0.5 + Math.sin(now * 0.00003) * 6 - (p.x - 0.5) * 10;
    c.fillStyle = '#141225';
    c.fillRect(bx - 120, h * 0.36, 240, 90);
    c.fillRect(bx - 86, h * 0.28, 172, 60);
    c.fillRect(bx - 52, h * 0.21, 104, 50);
    for (const [ox, oy, rw] of [[-100, 0.36], [-60, 0.28], [0, 0.21]]) {
      c.beginPath();
      c.moveTo(bx + ox - rw * 0.5 - 14, h * oy + 6);
      c.lineTo(bx + ox, h * oy - 12);
      c.lineTo(bx + ox + rw * 0.5 + 14, h * oy + 6);
      c.closePath();
      c.fill();
    }
    // lit bathhouse windows twinkle
    c.fillStyle = 'rgba(255,196,110,0.55)';
    for (let i = 0; i < 10; i++) {
      const wx = bx - 100 + (i % 5) * 46;
      const wy = h * 0.4 + Math.floor(i / 5) * 26;
      const tw = single ? 0.6 : 0.35 + Math.abs(Math.sin(now * 0.0012 + i * 2.1)) * 0.5;
      c.globalAlpha = tw;
      c.fillRect(wx, wy, 7, 10);
    }
    c.globalAlpha = 1;

    drawHills(c, { w, h, y: h * 0.5, amp: 14, color: '#101a2e', offset: -(p.x - 0.5) * 14, seed: 7 });

    // water band with moon shimmer
    const water = c.createLinearGradient(0, h * 0.62, 0, h);
    water.addColorStop(0, '#0c1a33');
    water.addColorStop(1, '#04070f');
    c.fillStyle = water;
    c.fillRect(0, h * 0.62, w, h * 0.38);
    c.strokeStyle = 'rgba(180,200,235,0.09)';
    c.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const yy = h * (0.66 + i * 0.036);
      c.beginPath();
      for (let x = 0; x <= w; x += 24) {
        const wave = single ? 2 : Math.sin(x * 0.02 + now * 0.0011 + i) * 2.4;
        if (x === 0) c.moveTo(x, yy + wave); else c.lineTo(x, yy + wave);
      }
      c.stroke();
    }

    // No-Face drifting in the distance, occasionally turning to the pointer
    const nf = { x: w * 0.16 + Math.sin(now * 0.00008) * w * 0.05, y: h * 0.52 };
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = '#0a0c18';
    c.beginPath();
    c.ellipse(nf.x, nf.y, 20, 34, 0, 0, Math.PI * 2);
    c.fill();
    const turned = !single && now < noFaceTurnUntil;
    const shift = turned ? clamp((p.x - nf.x / w) * 0.4, -1, 1) * 4 : 0;
    c.fillStyle = '#f2efe6'; // mask
    c.beginPath();
    c.ellipse(nf.x + shift, nf.y - 12, 12, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#4c5570';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(nf.x + shift - 6, nf.y - 16); c.lineTo(nf.x + shift - 2, nf.y - 16);
    c.moveTo(nf.x + shift + 2, nf.y - 16); c.lineTo(nf.x + shift + 6, nf.y - 16);
    c.stroke();
    c.restore();

    // steam rising from the water road
    c.save();
    for (const s of steam) {
      if (!single) {
        s.y -= s.speed * 0.01;
        s.x += Math.sin(now * 0.0006 + s.y * 9) * 0.0004;
        if (s.y < 0.4) { s.y = rand(0.75, 1); s.x = rand(0.2, 0.8); }
      }
      const grad = c.createRadialGradient(s.x * w, s.y * h, 1, s.x * w, s.y * h, s.size * 2.2);
      grad.addColorStop(0, 'rgba(214,222,235,0.1)');
      grad.addColorStop(1, 'rgba(214,222,235,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(s.x * w, s.y * h, s.size * 2.2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    // lantern row igniting with scroll
    for (const l of LANTERNS) {
      const target = clamp((progress - (l.x - 0.05) * 0.5) * 3);
      l.lit += (target - l.lit) * (single ? 1 : 0.04);
      if (l.boost > 0) l.boost = single ? 0 : Math.max(0, l.boost - 0.002);
      drawLantern(l, w, h, now, single);
    }

    // susuwati scatter away from the cursor "light"
    for (const so of soot) {
      const sx = so.x * w, sy = so.y * h;
      const dx = sx - px, dy = sy - py;
      const dist = Math.hypot(dx, dy);
      if (level === 'full' && !single && dist < 160) {
        so.vx += (dx / (dist || 1)) * 0.0035 * so.jitter;
        so.vy += (dy / (dist || 1)) * 0.0035 * so.jitter;
      }
      so.vx *= 0.92; so.vy *= 0.92;
      so.x = clamp(so.x + so.vx, 0.02, 0.98);
      so.y = clamp(so.y + so.vy, 0.6, 0.94);
      const wig = single ? 0 : Math.sin(now * 0.004 + so.phase) * 1.5;
      c.fillStyle = '#0c0d10';
      c.beginPath();
      c.arc(sx, sy, 9, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(12,13,16,0.85)';
      c.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + wig * 0.05;
        c.beginPath();
        c.moveTo(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8);
        c.lineTo(sx + Math.cos(a) * 13, sy + Math.sin(a) * 13);
        c.stroke();
      }
      c.fillStyle = '#eef2f7';
      c.beginPath();
      c.arc(sx - 3, sy - 2, 2, 0, Math.PI * 2);
      c.arc(sx + 3, sy - 2, 2, 0, Math.PI * 2);
      c.fill();
    }

    drawTrain(now, w, h);
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
      ensureSteam();
    },
  };
}
