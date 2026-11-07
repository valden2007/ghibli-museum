// Wind Rises scene: sky of dreams, clouds, green meadows, wind. A blueprint
// plane is "drawn" by lines as you scroll (stroke-dashoffset), fighters cross,
// and wind carries grass and paper.
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

  const clouds = Array.from({ length: 10 }, () => ({ x: rand(0, 1), y: rand(0.05, 0.4), size: rand(70, 160), speed: rand(0.0001, 0.0003), phase: rand(0, 6.28) }));
  const grass = Array.from({ length: 70 }, (_, i) => ({ x: (i + rand(-0.4, 0.4)) / 70, height: rand(0.05, 0.12), phase: rand(0, 6.28), lean: 0 }));
  const fighters = Array.from({ length: 3 }, () => ({ x: rand(0, 1), y: rand(0.12, 0.32), speed: rand(0.0004, 0.0009), dir: Math.random() < 0.5 ? 1 : -1, phase: rand(0, 6.28) }));
  const papers = Array.from({ length: 8 }, () => ({ x: rand(0, 1), y: rand(0.3, 0.7), vx: rand(-0.0003, 0.0003), vy: rand(0.0002, 0.0006), phase: rand(0, 6.28), rot: rand(0, 6.28) }));
  let nextWind = performance.now() + rand(3000, 6000);
  let nextDrone = performance.now() + rand(8000, 14000);

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const p = pointer.get();
    const progress = clamp((window.scrollY - h * 0.1) / (h * 1.8));

    if (!single) {
      if (now >= nextWind) { nextWind = now + rand(3000, 6000); if (soundOn()) audio.scene('wind', { volume: 0.02 }); }
      if (now >= nextDrone) { nextDrone = now + rand(8000, 14000); if (soundOn()) audio.scene('hum', { frequency: 196, duration: 2.4, volume: 0.022 }); }
    }

    // sky of dreams
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#b8d4e8');
    sky.addColorStop(0.5, '#6fa8dc');
    sky.addColorStop(0.85, '#9fc9a0');
    sky.addColorStop(1, '#e8f0f5');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    // drifting clouds
    for (const cloud of clouds) {
      if (!single) cloud.x += cloud.speed;
      if (cloud.x > 1.15) cloud.x = -0.15;
      const cx = cloud.x * w + (p.x - 0.5) * 12;
      const cy = cloud.y * h + Math.sin(now * 0.0002 + cloud.phase) * 4;
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath();
      c.ellipse(cx, cy, cloud.size, cloud.size * 0.4, 0, 0, Math.PI * 2);
      c.ellipse(cx + cloud.size * 0.5, cy - cloud.size * 0.15, cloud.size * 0.7, cloud.size * 0.35, 0, 0, Math.PI * 2);
      c.fill();
    }

    // green meadows
    drawHills(c, { w, h, y: h * 0.72, amp: 18, color: '#6b8f4e', offset: -(p.x - 0.5) * 10, seed: 7 });
    drawHills(c, { w, h, y: h * 0.86, amp: 12, color: '#3a6b4a', offset: -(p.x - 0.5) * 18, seed: 13 });

    // grass sway
    c.strokeStyle = '#2f5d3a';
    c.lineWidth = 1.2;
    for (const g of grass) {
      const sway = single ? 0 : Math.sin(now * 0.0012 + g.phase) * 4 + (level === 'full' ? (p.x - 0.5) * 5 : 0);
      const gx = g.x * w, gy = h * 0.86;
      const gh = g.height * h;
      c.beginPath();
      c.moveTo(gx, gy);
      c.quadraticCurveTo(gx + sway * 0.6, gy - gh * 0.55, gx + sway, gy - gh);
      c.stroke();
    }

    // blueprint plane drawn by lines (stroke-dashoffset as scroll progresses)
    const planeAlpha = clamp(progress * 1.4);
    if (planeAlpha > 0.02) {
      c.save();
      c.globalAlpha = planeAlpha * 0.7;
      c.strokeStyle = 'rgba(30,50,90,0.85)';
      c.lineWidth = 1.4;
      const cx = w * 0.5, cy = h * 0.42;
      const s = Math.min(w, h) * 0.18;
      const lines = [
        [[-s, 0], [s, 0]], [[0, -s * 0.6], [0, s * 0.6]], [[-s * 0.7, -s * 0.3], [s * 0.7, -s * 0.3]],
        [[-s * 0.7, s * 0.3], [s * 0.7, s * 0.3]], [[-s * 0.4, -s * 0.5], [s * 0.4, -s * 0.5]],
      ];
      const dash = 1000 * (1 - progress);
      c.setLineDash([1000]);
      c.lineDashOffset = dash;
      for (const [a, b] of lines) {
        c.beginPath();
        c.moveTo(cx + a[0], cy + a[1]);
        c.lineTo(cx + b[0], cy + b[1]);
        c.stroke();
      }
      c.setLineDash([]);
      c.globalAlpha = 1;
      c.restore();
    }

    // fighters crossing
    for (const f of fighters) {
      if (!single) {
        f.x += f.dir * f.speed;
        if (f.dir > 0 && f.x > 1.1) f.x = -0.1;
        if (f.dir < 0 && f.x < -0.1) f.x = 1.1;
      }
      const fx = f.x * w, fy = f.y * h + Math.sin(now * 0.001 + f.phase) * 6;
      c.save();
      c.translate(fx, fy);
      if (f.dir < 0) c.scale(-1, 1);
      c.fillStyle = '#2a3a5a';
      c.beginPath();
      c.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#6fa8dc';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-14, 0); c.lineTo(-22, -3);
      c.moveTo(14, 0); c.lineTo(22, -3);
      c.stroke();
      c.restore();
    }

    // wind-blown papers
    c.fillStyle = 'rgba(232,228,215,0.7)';
    for (const pp of papers) {
      if (!single) {
        pp.x += pp.vx + (p.x - 0.5) * 0.0004;
        pp.y += pp.vy;
        pp.rot += 0.01;
        if (pp.x < -0.05) pp.x = 1.05; if (pp.x > 1.05) pp.x = -0.05;
        if (pp.y > 1.05) { pp.y = -0.05; pp.x = Math.random(); }
      }
      c.save();
      c.translate(pp.x * w, pp.y * h);
      c.rotate(pp.rot);
      c.fillRect(-6, -4, 12, 8);
      c.restore();
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
