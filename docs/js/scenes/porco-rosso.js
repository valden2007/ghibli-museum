// Porco Rosso scene: Adriatic sunset, seaplanes crossing, sun glitter on
// waves, cloud mountains, and a subtle film-grain flicker.
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

  const planes = Array.from({ length: 3 }, () => ({ x: rand(0, 1), y: rand(0.12, 0.38), speed: rand(0.0002, 0.0005), dir: Math.random() < 0.5 ? 1 : -1, phase: rand(0, 6.28) }));
  const glitter = Array.from({ length: 24 }, () => ({ x: rand(0, 1), y: rand(0.55, 0.95), phase: rand(0, 6.28) }));
  const clouds = Array.from({ length: 6 }, () => ({ x: rand(0, 1), y: rand(0.08, 0.3), size: rand(60, 130), speed: rand(0.00005, 0.00015), phase: rand(0, 6.28) }));
  let nextEngine = performance.now() + rand(4000, 8000);
  let nextWave = performance.now() + rand(6000, 10000);
  let nextJazz = performance.now() + rand(8000, 14000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();

    // sunset sky
    const sky = c.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#c97a4a');
    sky.addColorStop(0.35, '#d9b08a');
    sky.addColorStop(0.65, '#8a4a3a');
    sky.addColorStop(1, '#2a2a3a');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h * 0.6);

    // cloud mountains
    drawHills(c, { w, h, y: h * 0.42, amp: 20, color: '#5a3a2a', offset: -(p.x - 0.5) * 8, seed: 5 });
    for (const cloud of clouds) {
      if (!single) cloud.x += cloud.speed;
      if (cloud.x > 1.15) cloud.x = -0.15;
      const cx = cloud.x * w, cy = cloud.y * h + Math.sin(now * 0.0002 + cloud.phase) * 4;
      c.fillStyle = 'rgba(217,176,138,0.35)';
      c.beginPath();
      c.ellipse(cx, cy, cloud.size, cloud.size * 0.4, 0, 0, Math.PI * 2);
      c.fill();
    }

    // sea
    const sea = c.createLinearGradient(0, h * 0.6, 0, h);
    sea.addColorStop(0, '#c97a4a');
    sea.addColorStop(0.3, '#4a7a8a');
    sea.addColorStop(1, '#1a3a5a');
    c.fillStyle = sea;
    c.fillRect(0, h * 0.6, w, h * 0.4);

    // sun glitter
    c.fillStyle = 'rgba(255,220,160,0.7)';
    for (const g of glitter) {
      const gx = g.x * w, gy = g.y * h;
      const tw = 0.3 + Math.sin(now * 0.004 + g.phase) * 0.7;
      c.globalAlpha = Math.max(0, tw);
      c.fillRect(gx, gy, 2, 1);
    }
    c.globalAlpha = 1;

    // seaplanes
    for (const pl of planes) {
      if (!single) {
        pl.x += pl.dir * pl.speed;
        if (pl.dir > 0 && pl.x > 1.1) pl.x = -0.1;
        if (pl.dir < 0 && pl.x < -0.1) pl.x = 1.1;
      }
      const px = pl.x * w, py = pl.y * h + Math.sin(now * 0.001 + pl.phase) * 6;
      c.save();
      c.translate(px, py);
      if (pl.dir < 0) c.scale(-1, 1);
      c.fillStyle = '#2a2a3a';
      c.beginPath();
      c.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#c97a4a';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-16, 0); c.lineTo(-24, -3);
      c.moveTo(16, 0); c.lineTo(24, -3);
      c.stroke();
      c.restore();
    }

    // film grain flicker
    c.globalAlpha = 0.08;
    c.fillStyle = '#000';
    for (let i = 0; i < 40; i++) {
      c.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    c.globalAlpha = 1;

    if (!single) {
      if (now >= nextEngine) { nextEngine = now + rand(4000, 8000); if (soundOn()) audio.scene('engine'); }
      if (now >= nextWave) { nextWave = now + rand(6000, 10000); if (soundOn()) audio.scene('water', { volume: 0.02 }); }
      if (now >= nextJazz) { nextJazz = now + rand(8000, 14000); if (soundOn()) { audio.scene('bells', { frequency: 440, duration: 1.6, volume: 0.02 }); audio.scene('bells', { frequency: 554, duration: 1.6, volume: 0.015 }); } }
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
