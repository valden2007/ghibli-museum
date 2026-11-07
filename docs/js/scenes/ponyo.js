// Ponyo scene: bright sea at the cliff, hand-drawn wave crests, underwater
// god rays, a water level that rises with scroll, bubbles, jellyfish, and
// wave-fish racing along the lower edge.
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

  const bubbles = Array.from({ length: 28 }, () => ({ x: rand(0.05, 0.95), y: rand(0.55, 0.95), size: rand(2, 6), speed: rand(0.0008, 0.0022), phase: rand(0, 6.28) }));
  const jellyfish = Array.from({ length: 6 }, () => ({ x: rand(0.1, 0.9), y: rand(0.55, 0.9), size: rand(8, 16), phase: rand(0, 6.28), speed: rand(0.0002, 0.0006) }));
  const waveFish = Array.from({ length: 5 }, () => ({ x: rand(0, 1), speed: rand(0.0004, 0.001), phase: rand(0, 6.28), size: rand(6, 12) }));
  const foam = Array.from({ length: 18 }, () => ({ x: Math.random(), phase: rand(0, 6.28) }));
  let nextBubblePop = performance.now() + rand(3000, 6000);
  let nextMusicBox = performance.now() + rand(12000, 20000);
  let nextWave = performance.now() + rand(7000, 12000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function ensureBubbles() {
    const target = level === 'off' ? 0 : level === 'lite' ? 10 : 28;
    while (bubbles.length < target) bubbles.push({ x: rand(0.05, 0.95), y: rand(0.55, 0.95), size: rand(2, 6), speed: rand(0.0008, 0.0022), phase: rand(0, 6.28) });
    while (bubbles.length > target) bubbles.pop();
  }
  ensureBubbles();

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const progress = clamp((window.scrollY - h * 0.2) / (h * 1.4));
    const waterY = h * (0.7 - progress * 0.28);

    if (!single) {
      if (now >= nextBubblePop) { nextBubblePop = now + rand(2500, 5000); if (soundOn()) audio.scene('water', { volume: 0.022, frequency: 900 }); }
      if (now >= nextMusicBox) { nextMusicBox = now + rand(12000, 20000); if (soundOn()) audio.scene('musicbox', { frequency: 880, duration: 1.4, volume: 0.025 }); }
      if (now >= nextWave) { nextWave = now + rand(7000, 12000); if (soundOn()) audio.scene('water', { volume: 0.03, duration: 1.8 }); }
    }

    // bright sky
    const sky = c.createLinearGradient(0, 0, 0, waterY);
    sky.addColorStop(0, '#5fb8e8');
    sky.addColorStop(0.6, '#8ad0d0');
    sky.addColorStop(1, '#4aa8a8');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, waterY);

    // distant cliffs / horizon
    c.fillStyle = '#2a5a6a';
    c.beginPath();
    c.moveTo(0, waterY);
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * w;
      const yy = waterY - 18 - Math.sin(i * 1.4) * 12;
      if (i === 0) c.lineTo(x, yy); else c.quadraticCurveTo(x - w / 12, yy + 8, x, yy);
    }
    c.lineTo(w, waterY);
    c.closePath();
    c.fill();

    // underwater god rays
    c.save();
    c.globalAlpha = 0.14;
    c.fillStyle = '#fff6d8';
    const sway = single ? 0 : Math.sin(now * 0.0003) * 0.08;
    for (let i = 0; i < 5; i++) {
      c.save();
      c.translate(w * (0.12 + i * 0.19), waterY);
      c.rotate(0.15 + i * 0.05 + sway);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-18, h - waterY + 40);
      c.lineTo(18, h - waterY + 40);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();

    // water body
    const water = c.createLinearGradient(0, waterY, 0, h);
    water.addColorStop(0, '#4aa8a8');
    water.addColorStop(0.5, '#2a6a7a');
    water.addColorStop(1, '#1a3a4a');
    c.fillStyle = water;
    c.fillRect(0, waterY, w, h - waterY);

    // wave crests (wavy surface line)
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2;
    c.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const wave = single ? 0 : Math.sin(x * 0.03 + now * 0.002) * 4 + Math.sin(x * 0.07 + now * 0.003) * 2;
      if (x === 0) c.moveTo(x, waterY + wave); else c.lineTo(x, waterY + wave);
    }
    c.stroke();
    // foam dots
    c.fillStyle = 'rgba(255,255,255,0.55)';
    for (const f of foam) {
      const fx = f.x * w;
      const fy = waterY + Math.sin(fx * 0.03 + now * 0.002 + f.phase) * 4;
      c.beginPath();
      c.arc(fx, fy, 2, 0, Math.PI * 2);
      c.fill();
    }

    // bubbles
    c.fillStyle = 'rgba(220,240,250,0.55)';
    for (const b of bubbles) {
      if (!single) { b.y -= b.speed; if (b.y < 0.45) { b.y = 0.95; b.x = rand(0.05, 0.95); } }
      const bx = b.x * w + Math.sin(now * 0.001 + b.phase) * 4;
      const by = b.y * h;
      c.beginPath();
      c.arc(bx, by, b.size, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(bx - b.size * 0.3, by - b.size * 0.3, b.size * 0.25, 0, Math.PI * 2);
      c.fill();
    }

    // jellyfish
    for (const j of jellyfish) {
      if (!single) { j.x += Math.sin(now * 0.0004 + j.phase) * 0.0003; j.y += Math.sin(now * 0.0006 + j.phase) * 0.0002; }
      const jx = j.x * w, jy = j.y * h;
      const pulse = 0.85 + Math.sin(now * 0.003 + j.phase) * 0.15;
      c.save();
      c.globalAlpha = 0.5;
      c.fillStyle = '#c94a3a';
      c.beginPath();
      c.ellipse(jx, jy, j.size * pulse, j.size * 0.6 * pulse, 0, Math.PI, 0);
      c.fill();
      c.strokeStyle = 'rgba(201,74,58,0.4)';
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const tx = jx + (i - 1.5) * j.size * 0.4;
        c.beginPath();
        c.moveTo(tx, jy);
        c.quadraticCurveTo(tx + Math.sin(now * 0.002 + i) * 4, jy + j.size * 0.8, tx, jy + j.size * 1.4);
        c.stroke();
      }
      c.restore();
    }

    // wave-fish running along the lower edge
    c.fillStyle = '#1a3a4a';
    for (const f of waveFish) {
      if (!single) { f.x += f.speed; if (f.x > 1.1) { f.x = -0.1; } }
      const fx = f.x * w, fy = waterY + 12 + Math.sin(fx * 0.04 + now * 0.003 + f.phase) * 6;
      c.save();
      c.translate(fx, fy);
      c.scale(f.size, f.size);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(4, -2, 8, 0);
      c.quadraticCurveTo(4, 2, 0, 0);
      c.fill();
      c.restore();
    }

    // chalky noise texture
    c.globalAlpha = 0.06;
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      c.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    c.globalAlpha = 1;
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
      ensureBubbles();
    },
  };
}
