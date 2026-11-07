// Mononoke scene: dawn forest, four mossy trunk layers with parallax, god rays,
// ground mist pushed by the cursor, drifting spores, kodama that click when the
// cursor approaches, a rarely appearing deer-god silhouette, and cursed tendrils
// crawling along the "creation" section edges.
import { createCanvasLayer, createLoop, createPointerTracker, clamp, drawHills, drawTreeRow } from './kit.js';

const TREES = [
  { depth: 0.06, base: 0.56, top: 0.30, count: 5, color: '#17342c', seed: 11 },
  { depth: 0.12, base: 0.7, top: 0.36, count: 6, color: '#10241e', seed: 23 },
  { depth: 0.22, base: 0.88, top: 0.44, count: 7, color: '#0b1a15', seed: 37 },
  { depth: 0.34, base: 1.04, top: 0.52, count: 8, color: '#071210', seed: 59 },
];

const KODAMA = [
  { x: 0.14, y: 0.6 }, { x: 0.72, y: 0.58 }, { x: 0.3, y: 0.78 },
  { x: 0.86, y: 0.76 }, { x: 0.5, y: 0.52 }, { x: 0.06, y: 0.86 },
];

const MIST = [
  { x: 0.15, y: 0.82, r: 0.3 }, { x: 0.45, y: 0.9, r: 0.36 }, { x: 0.75, y: 0.85, r: 0.3 }, { x: 0.95, y: 0.94, r: 0.34 },
];

const rand = (a, b) => a + Math.random() * (b - a);

export async function mount(ctx) {
  const { root, audio, kit, settings } = ctx;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = reduced ? 'off' : settings.get().effects;
  const canvasLayer = kit.createCanvasLayer(root, 'scene-canvas');
  kit.addSvgFilter(root);
  const pointer = createPointerTracker(root, level);
  const { ctx: c } = canvasLayer;

  const spores = [];
  const kodama = KODAMA.map((k) => ({ ...k, alpha: 0, visible: Math.random() < 0.6, nextToggle: performance.now() + rand(3000, 16000), shake: 0, lastClick: 0 }));
  let deerNext = performance.now() + rand(20000, 35000);
  let deerStart = -1e9;
  let nextRustle = performance.now() + rand(5000, 9000);
  let nextBird = performance.now() + rand(14000, 26000);
  let hideUntil = 0;
  let lastY = window.scrollY;

  const tentacles = [];
  const creationSection = document.getElementById('creation');
  if (creationSection) {
    for (const side of ['left', 'right']) {
      const tendril = document.createElement('span');
      tendril.className = `curse-tendril curse-tendril--${side}`;
      tendril.setAttribute('aria-hidden', 'true');
      creationSection.append(tendril);
      tentacles.push(tendril);
    }
  }

  const soundOn = () => !reduced && level !== 'off' && settings.get().sound;

  function ensureSpores() {
    const target = level === 'off' ? 0 : level === 'lite' ? 14 : 34;
    while (spores.length < target) spores.push({ x: Math.random(), y: Math.random(), phase: Math.random() * 6.28, speed: rand(0.01, 0.035) });
    while (spores.length > target) spores.pop();
  }
  ensureSpores();

  function drawDeer(now, w, h) {
    const age = now - deerStart;
    if (age < 0 || age > 7000) return;
    const t = age / 7000;
    const alpha = Math.sin(t * Math.PI) * 0.7;
    const x = w * (0.55 + t * 0.04);
    const y = h * 0.44;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = '#0a1f18';
    c.beginPath();
    c.ellipse(x, y, 46, 26, 0, 0, Math.PI * 2); // body
    c.ellipse(x + 44, y - 30, 12, 18, 0.5, 0, Math.PI * 2); // head/neck
    for (const leg of [-26, -12, 14, 30]) { c.fillRect(x + leg, y + 14, 5, 38); }
    c.strokeStyle = '#0a1f18';
    c.lineWidth = 3; // branching antlers like tree limbs
    for (const dir of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + 46 + dir * 4, y - 44);
      c.lineTo(x + 52 + dir * 14, y - 74);
      c.moveTo(x + 50 + dir * 10, y - 62);
      c.lineTo(x + 58 + dir * 26, y - 66);
      c.moveTo(x + 52 + dir * 14, y - 74);
      c.lineTo(x + 56 + dir * 20, y - 92);
      c.stroke();
    }
    c.restore();
  }

  function draw(now, single) {
    const w = canvasLayer.width, h = canvasLayer.height;
    const scrollY = window.scrollY;
    const p = pointer.get(); // 0..1
    const px = (p.x - 0.5) * 2;

    // dawn sky
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a2230');
    sky.addColorStop(0.5, '#1c4a3e');
    sky.addColorStop(0.72, '#c9a227');
    sky.addColorStop(1, '#071210');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    drawHills(c, { w, h, y: h * 0.47, amp: 26, color: '#0d2823', offset: -px * 8 - scrollY * 0.03, seed: 5 });

    if (!single) {
      if (now >= deerNext) { deerNext = now + rand(40000, 60000); deerStart = now; if (soundOn()) audio.scene('drum'); }
      if (now >= nextRustle) { nextRustle = now + rand(7000, 13000); if (soundOn()) audio.scene('rustle', { volume: 0.018 }); }
      if (now >= nextBird) { nextBird = now + rand(16000, 30000); if (soundOn()) { audio.scene('bird'); audio.scene('bird', { frequency: rand(2400, 3200) }); } }
    }
    drawDeer(now, w, h);

    // god rays through the canopy
    c.save();
    c.translate(w * 0.2, -h * 0.1);
    c.globalAlpha = 0.1;
    c.fillStyle = '#f5e6b8';
    const sway = single ? 0 : Math.sin(now * 0.00016) * 0.06;
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate(0.5 + i * 0.22 + sway);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(38 + i * 10, h * 1.4);
      c.lineTo(70 + i * 12, h * 1.4);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();

    // four mossy trunk layers with parallax by pointer + scroll
    for (const layer of TREES) {
      const offset = -px * layer.depth * 70 - (scrollY * layer.depth) % (w + 200);
      drawTreeRow(c, { w, base: h * layer.base, top: h * layer.top, count: layer.count, color: layer.color, offset, seed: layer.seed });
    }

    // low mist, pushed aside by the cursor
    const pointerX = p.x * w, pointerY = p.y * h;
    c.save();
    for (const m of MIST) {
      let mx = m.x * w + Math.sin(now * 0.00005 + m.y * 9) * 40;
      const my = m.y * h;
      const dx = mx - pointerX, dy = my - pointerY;
      const dist = Math.hypot(dx, dy);
      if (level === 'full' && dist < 220) mx += (dx / (dist || 1)) * (220 - dist) * 0.35;
      const grad = c.createRadialGradient(mx, my, 10, mx, my, m.r * w * 0.5);
      grad.addColorStop(0, 'rgba(210,228,214,0.16)');
      grad.addColorStop(1, 'rgba(210,228,214,0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(mx, my, m.r * w * 0.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    // drifting spores / pollen
    c.fillStyle = '#c9e0c0';
    for (const s of spores) {
      if (!single) { s.y -= s.speed * 0.004; s.x += Math.sin(now * 0.0004 + s.phase) * 0.0006; if (s.y < -0.02) s.y = 1.02; }
      c.globalAlpha = 0.5;
      c.beginPath();
      c.arc(s.x * w, s.y * h, 1.8, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    // kodama: fade near trunks, rattle the head when the cursor is close
    const scrollDelta = Math.abs(scrollY - lastY);
    lastY = scrollY;
    if (scrollDelta > 45 && !single) hideUntil = now + 1000;
    for (const k of kodama) {
      if (!single) {
        if (now >= k.nextToggle) {
          k.nextToggle = now + rand(4000, 15000);
          k.visible = Math.random() < 0.65;
        }
        const targetAlpha = (k.visible && now > hideUntil) ? 0.9 : 0;
        k.alpha += (targetAlpha - k.alpha) * 0.05;
      } else if (k.alpha === 0 && k.visible) k.alpha = 0.9;
      if (k.alpha < 0.03) continue;
      const kx = k.x * w, ky = k.y * h;
      const dist = Math.hypot(kx - pointerX, ky - pointerY);
      let headTilt = Math.sin(now * 0.002 + k.x * 10) * 0.06;
      if (level === 'full' && dist < 120 && k.alpha > 0.5) {
        headTilt = Math.sin(now * 0.03) * 0.35;
        if (!single && now - k.lastClick > 900 && soundOn()) {
          k.lastClick = now;
          audio.scene('click', { frequency: rand(820, 1500) });
        }
      }
      c.save();
      c.globalAlpha = k.alpha;
      c.fillStyle = '#eef5ea';
      c.beginPath();
      c.ellipse(kx, ky, 7, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.translate(kx, ky - 14);
      c.rotate(headTilt);
      c.beginPath();
      c.arc(0, 0, 6.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#0a1f18';
      c.beginPath();
      c.arc(-2.2, -1, 1.1, 0, Math.PI * 2);
      c.arc(2.2, -1, 1.1, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  const loop = createLoop(draw, root, { fps: 60, effects: level });
  draw(performance.now(), level === 'off');
  loop.start();

  return {
    unmount() { loop.destroy(); pointer.destroy(); canvasLayer.destroy(); tentacles.forEach((t) => t.remove()); },
    resize() { canvasLayer.resize(); },
    onEffects(next) {
      level = reduced ? 'off' : next;
      loop.setEffects(level);
      pointer.setEffects(level);
      ensureSpores();
    },
  };
}
