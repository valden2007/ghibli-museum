// Boy and the Heron scene: abandoned tower, spirit world, heron, fire,
// water and floating fragments. Meditative, experimental.
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

  const stars = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random() * 0.5, phase: rand(0, 6.28), speed: rand(0.0002, 0.0006) }));
  const embers = Array.from({ length: 18 }, () => ({ x: rand(0.3, 0.7), y: rand(0.7, 0.9), vx: rand(-0.001, 0.001), vy: rand(-0.003, -0.001), life: Math.random(), size: rand(1.5, 3) }));
  const fireflies = Array.from({ length: 12 }, () => ({ x: rand(0.1, 0.9), y: rand(0.3, 0.8), phase: rand(0, 6.28), speed: rand(0.0002, 0.0005) }));
  const rocks = Array.from({ length: 6 }, () => ({ x: rand(0.1, 0.9), y: rand(0.4, 0.7), size: rand(15, 35), phase: rand(0, 6.28) }));
  const water = Array.from({ length: 8 }, () => ({ x: rand(0, 1), phase: rand(0, 6.28) }));
  let heronNext = performance.now() + rand(20000, 35000);
  let heronStart = -1e9;
  let nextBell = performance.now() + rand(12000, 20000);
  let nextFire = performance.now() + rand(4000, 8000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const progress = clamp((window.scrollY - h * 0.1) / (h * 1.8));

    if (!single) {
      if (now >= heronNext) { heronNext = now + rand(30000, 50000); heronStart = now; if (soundOn()) audio.scene('bird', { frequency: 1800 }); }
      if (now >= nextBell) { nextBell = now + rand(12000, 20000); if (soundOn()) audio.scene('bell', { frequency: 720 }); }
      if (now >= nextFire) { nextFire = now + rand(4000, 8000); if (soundOn()) audio.scene('fire', { frequency: rand(100, 180) }); }
    }

    // dark twilight sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1a1a2a');
    sky.addColorStop(0.4, '#2a2a4a');
    sky.addColorStop(0.7, '#3b2a4a');
    sky.addColorStop(1, '#1a1a2a');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    // stars
    c.fillStyle = '#f5e6b8';
    for (const s of stars) {
      if (!single) s.y += s.speed * 0.0001;
      if (s.y > 0.5) s.y = Math.random() * 0.1;
      const tw = 0.3 + Math.sin(now * 0.003 + s.phase) * 0.7;
      c.globalAlpha = Math.max(0.1, tw);
      c.beginPath();
      c.arc(s.x * w, s.y * h, 1.4, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // distant mountains
    drawHills(c, { w, h, y: h * 0.6, amp: 24, color: '#1a1a2a', offset: -(p.x - 0.5) * 8, seed: 7 });

    // abandoned tower silhouette
    const tx = w * 0.15;
    c.fillStyle = '#0a0a14';
    c.fillRect(tx - 20, h * 0.25, 40, h * 0.45);
    for (let i = 0; i < 4; i++) {
      c.fillRect(tx - 28 + i * 12, h * 0.2 - i * 8, 8, 18);
    }
    // glowing windows
    c.fillStyle = 'rgba(201,106,42,0.6)';
    c.fillRect(tx - 8, h * 0.3, 6, 8);
    c.fillRect(tx + 2, h * 0.38, 6, 8);
    c.fillRect(tx - 8, h * 0.46, 6, 8);

    // floating rocks in spirit world
    for (const r of rocks) {
      const rx = r.x * w + Math.sin(now * 0.0003 + r.phase) * 8;
      const ry = r.y * h + Math.sin(now * 0.0004 + r.phase) * 6;
      c.fillStyle = 'rgba(60,50,80,0.7)';
      c.beginPath();
      c.ellipse(rx, ry, r.size, r.size * 0.6, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(201,106,42,0.3)';
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(rx, ry, r.size + 4, r.size * 0.6 + 4, 0, 0, Math.PI * 2);
      c.stroke();
    }

    // water surface
    const waterY = h * 0.78;
    const water = c.createLinearGradient(0, waterY, 0, h);
    water.addColorStop(0, '#2a2a4a');
    water.addColorStop(1, '#0a0a14');
    c.fillStyle = water;
    c.fillRect(0, waterY, w, h - waterY);
    c.strokeStyle = 'rgba(201,106,42,0.2)';
    c.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const wy = waterY + Math.sin(now * 0.001 + i) * 3;
      c.beginPath();
      c.moveTo(0, wy);
      for (let x = 0; x <= w; x += 30) c.lineTo(x, wy + Math.sin(x * 0.02 + now * 0.001 + i) * 2);
      c.stroke();
    }

    // fireflies
    c.fillStyle = '#f5e6b8';
    for (const f of fireflies) {
      if (!single) f.x += Math.sin(now * 0.0003 + f.phase) * 0.0002;
      const fx = f.x * w, fy = f.y * h;
      const glow = 0.4 + Math.sin(now * 0.002 + f.phase) * 0.6;
      c.globalAlpha = Math.max(0.1, glow);
      const grad = c.createRadialGradient(fx, fy, 0, fx, fy, 5);
      grad.addColorStop(0, 'rgba(255,200,120,0.9)');
      grad.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(fx, fy, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // embers near bottom
    c.fillStyle = '#c96a2a';
    for (const e of embers) {
      if (!single) {
        e.x += e.vx + (level === 'full' ? (p.x - 0.5) * 0.0004 : 0);
        e.y += e.vy;
        e.life -= 0.003;
        if (e.life <= 0) { e.x = rand(0.3, 0.7); e.y = rand(0.7, 0.9); e.vx = rand(-0.001, 0.001); e.vy = rand(-0.003, -0.001); e.life = 1; e.size = rand(1.5, 3); }
      }
      c.globalAlpha = e.life * 0.8;
      const grad = c.createRadialGradient(e.x * w, e.y * h, 0, e.x * w, e.y * h, e.size * 3);
      grad.addColorStop(0, 'rgba(201,106,42,0.9)');
      grad.addColorStop(1, 'rgba(201,106,42,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(e.x * w, e.y * h, e.size * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // heron crossing
    const heronAge = now - heronStart;
    if (heronAge >= 0 && heronAge < 8000) {
      const t = heronAge / 8000;
      const x = -120 + t * (w + 240);
      const y = h * 0.32 + Math.sin(t * Math.PI) * -h * 0.06;
      c.save();
      c.translate(x, y);
      if (Math.random() < 0.5) c.scale(-1, 1);
      c.fillStyle = '#e8e4d7';
      // body
      c.beginPath();
      c.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2);
      c.fill();
      // neck
      c.fillRect(-4, -24, 8, 24);
      // head
      c.beginPath();
      c.arc(0, -28, 7, 0, Math.PI * 2);
      c.fill();
      // beak
      c.fillStyle = '#c96a2a';
      c.beginPath();
      c.moveTo(6, -28); c.lineTo(18, -26); c.lineTo(6, -24);
      c.closePath();
      c.fill();
      // wings
      c.fillStyle = '#d9b080';
      c.beginPath();
      c.moveTo(-8, -4); c.lineTo(-30, -16); c.lineTo(-8, -2);
      c.fill();
      c.restore();
    }
    if (now >= heronNext) {
      heronNext = now + rand(30000, 50000);
      heronStart = now;
      if (soundOn()) audio.scene('bird', { frequency: 1800 });
    }

    if (!single) {
      if (now >= nextBell) { nextBell = now + rand(12000, 20000); if (soundOn()) audio.scene('bell', { frequency: 720 }); }
      if (now >= nextFire) { nextFire = now + rand(4000, 8000); if (soundOn()) audio.scene('fire', { frequency: rand(100, 180) }); }
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
