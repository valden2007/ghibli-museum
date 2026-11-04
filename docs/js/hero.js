export function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  // grass blades
  const grassLayer = scene.querySelector('.grass-layer');
  if (grassLayer) {
    const w = 1600;
    for (let i = 0; i < 60; i++) {
      const x = (i / 60) * w + (Math.random() - 0.5) * 20;
      const h = 40 + Math.random() * 60;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${x},${900} Q${x + (Math.random()-0.5)*8},${900 - h*0.6} ${x + (Math.random()-0.5)*12},${900 - h}`);
      path.setAttribute('stroke', i % 3 === 0 ? '#3a6b4a' : '#2f5d3a');
      path.setAttribute('stroke-width', (1 + Math.random()).toFixed(1));
      path.setAttribute('fill', 'none');
      path.setAttribute('class', 'grass-blade');
      path.style.transformOrigin = `${x}px 900px`;
      if (!reduce) {
        path.style.animation = `grassSway ${2 + Math.random()*2}s ease-in-out ${Math.random()*2}s infinite`;
      }
      grassLayer.append(path);
    }
  }

  const layers = scene.querySelectorAll('[data-speed]');
  let scrollY = 0;
  let mx = 0;
  let my = 0;

  function updateParallax() {
    if (reduce) return;
    layers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 0;
      const x = coarse ? 0 : mx * speed * 30;
      const y = scrollY * speed * 0.4 + (coarse ? 0 : my * speed * 20);
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    updateParallax();
  }, { passive: true });

  if (!coarse && !reduce) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      updateParallax();
    }, { passive: true });
  }
  updateParallax();

  if (reduce) return;

  // scenes manifest (optional real images)
  let scenes = [];
  fetch('data/scenes.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((d) => { if (Array.isArray(d)) scenes = d; })
    .catch(() => {});

  const imageCache = new Map();
  function loadImage(info) {
    if (!info || !info.file) return null;
    if (imageCache.has(info.file)) return imageCache.get(info.file);
    const img = new Image();
    const entry = { img, loaded: false, failed: false };
    img.onload = () => { entry.loaded = true; };
    img.onerror = () => { entry.failed = true; };
    img.src = info.file;
    imageCache.set(info.file, entry);
    return entry;
  }

  // event canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-event-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  scene.append(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;

  function resizeCanvas() {
    const rect = scene.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  const events = [];
  const minGap = coarse ? 7000 : 4000;
  const maxGap = coarse ? 12000 : 9000;
  const maxActive = coarse ? 1 : 2;
  let nextSpawn = performance.now() + 2000 + Math.random() * 3000;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }

  function spawnEvent(now) {
    const types = ['flyingShadow', 'fireflies', 'fallingLeaf', 'peekCreature', 'cloudShape', 'ripple'];
    const type = types[Math.floor(Math.random() * types.length)];
    const ev = { type, start: now, duration: rand(2500, 5000) };
    if (type === 'fireflies') {
      const n = coarse ? 4 : 7;
      ev.points = Array.from({ length: n }, () => ({
        x: rand(w * 0.1, w * 0.9),
        y: rand(h * 0.55, h * 0.85),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.2, 0.6),
      }));
    }
    if (type === 'fallingLeaf') {
      ev.x = rand(w * 0.2, w * 0.8);
      ev.y = -20;
      ev.vx = rand(-0.6, 0.6);
      ev.vy = rand(0.8, 1.6);
      ev.rot = Math.random() * Math.PI * 2;
      ev.vr = rand(-0.03, 0.03);
    }
    if (type === 'flyingShadow') {
      ev.y = rand(h * 0.08, h * 0.28);
      ev.dir = Math.random() < 0.5 ? 1 : -1;
      ev.x = ev.dir > 0 ? -60 : w + 60;
    }
    if (type === 'cloudShape') {
      ev.y = rand(h * 0.12, h * 0.35);
      ev.dir = Math.random() < 0.5 ? 1 : -1;
      ev.x = ev.dir > 0 ? -120 : w + 120;
      ev.scale = rand(0.8, 1.3);
    }
    if (type === 'ripple') {
      ev.x = rand(w * 0.25, w * 0.75);
      ev.y = h * 0.88;
    }
    if (type === 'peekCreature') {
      ev.side = Math.random() < 0.5 ? 'left' : 'right';
      ev.x = ev.side === 'left' ? -40 : w + 40;
      ev.targetX = ev.side === 'left' ? rand(40, 120) : w - rand(40, 120);
      ev.y = h * 0.72;
      ev.hold = rand(1200, 2000);
      if (scenes.length) {
        const s = scenes[Math.floor(Math.random() * scenes.length)];
        ev.image = loadImage(s);
      }
    }
    events.push(ev);
  }

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; }, { threshold: 0 })
    : null;
  io?.observe(scene);

  function drawFlyingShadow(ev, t, p) {
    const k = ease(p);
    const x = ev.dir > 0 ? -60 + (w + 120) * k : w + 60 - (w + 120) * k;
    const y = ev.y + Math.sin(p * Math.PI) * -40;
    ctx.save();
    ctx.globalAlpha = 0.28 * (1 - Math.abs(p - 0.5) * 0.6);
    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath();
    ctx.ellipse(x, y, 34, 12, -0.3 * ev.dir, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFireflies(ev, t, p) {
    const fade = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
    ev.points.forEach((pt) => {
      const x = pt.x + Math.sin(t * 0.001 * pt.speed + pt.phase) * 18;
      const y = pt.y + Math.cos(t * 0.0012 * pt.speed + pt.phase) * 12;
      ctx.save();
      ctx.globalAlpha = fade * 0.8;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
      g.addColorStop(0, 'rgba(255,240,180,1)');
      g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawFallingLeaf(ev, t, p) {
    ev.x += ev.vx;
    ev.y += ev.vy;
    ev.rot += ev.vr;
    const alpha = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
    ctx.save();
    ctx.translate(ev.x, ev.y);
    ctx.rotate(ev.rot);
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#6b8f4e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCloudShape(ev, t, p) {
    const k = ease(p);
    const x = ev.dir > 0 ? -120 + (w + 240) * k : w + 120 - (w + 240) * k;
    const y = ev.y;
    const s = ev.scale;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - Math.abs(p - 0.5) * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 18 * s, y - 6 * s, 22 * s, 0, Math.PI * 2);
    ctx.arc(x - 14 * s, y + 4 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRipple(ev, t, p) {
    const k = ease(p);
    const r = 8 + k * 90;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ev.x, ev.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPeekCreature(ev, t, p) {
    // p: 0 enter, 0.3 hold start, 0.7 hold end, 1 exit
    let yOff = 0;
    if (p < 0.3) yOff = (1 - p / 0.3) * 60;
    else if (p > 0.7) yOff = ((p - 0.7) / 0.3) * 60;
    const x = ev.x + (ev.targetX - ev.x) * (p < 0.3 ? ease(p / 0.3) : 1);
    const y = ev.y + yOff;
    const imgEntry = ev.image ? ev.image : null;
    ctx.save();
    ctx.translate(x, y);
    if (imgEntry && imgEntry.loaded) {
      const img = imgEntry.img;
      const iw = 64, ih = 64;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(img, -iw / 2, -ih, iw, ih);
    } else {
      // procedural silhouette
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath();
      ctx.ellipse(0, -18, 14, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, -34, 6, 0, Math.PI * 2);
      ctx.arc(8, -34, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function tick(now) {
    if (!running) {
      requestAnimationFrame(tick);
      return;
    }
    ctx.clearRect(0, 0, w, h);

    // spawn
    if (events.length < maxActive && now >= nextSpawn) {
      spawnEvent(now);
      nextSpawn = now + rand(minGap, maxGap);
    }

    // update + draw
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      const p = (now - ev.start) / ev.duration;
      if (p >= 1) { events.splice(i, 1); continue; }
      switch (ev.type) {
        case 'flyingShadow': drawFlyingShadow(ev, now, p); break;
        case 'fireflies': drawFireflies(ev, now, p); break;
        case 'fallingLeaf': drawFallingLeaf(ev, now, p); break;
        case 'cloudShape': drawCloudShape(ev, now, p); break;
        case 'ripple': drawRipple(ev, now, p); break;
        case 'peekCreature': drawPeekCreature(ev, now, p); break;
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
