export async function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  // grass blades (static decoration)
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
      if (!reduce) path.style.animation = `grassSway ${2 + Math.random()*2}s ease-in-out ${Math.random()*2}s infinite`;
      grassLayer.append(path);
    }
  }

  let manifest = [];
  try {
    const r = await fetch('data/scenes.json');
    if (r.ok) manifest = await r.json();
  } catch (e) { manifest = []; }
  if (!Array.isArray(manifest)) manifest = [];

  const trainEntry = manifest.find((e) => e.role === 'train');
  const castleEntry = manifest.find((e) => e.role === 'castle-howl');

  function missing(id, role) {
    console.log(`missing scene file: docs/img/scenes/${id}.png (role=${role})`);
  }

  // required roles
  if (!trainEntry || !trainEntry.file) { missing('train', 'train'); return; }
  if (!castleEntry || !castleEntry.file) { missing('castle-howl', 'castle-howl'); return; }

  // preload helper
  function preload(entry) {
    return new Promise((resolve) => {
      if (!entry || !entry.file) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve({ entry, img, ok: true });
      img.onerror = () => { missing(entry.id, entry.role); resolve({ entry, img, ok: false }); };
      img.src = entry.file;
    });
  }

  const [trainRes, castleRes] = await Promise.all([preload(trainEntry), preload(castleEntry)]);
  if (!trainRes.ok || !castleRes.ok) return;

  // preload event sprites
  const eventEntries = manifest.filter((e) => e.role !== 'train' && e.role !== 'castle-howl');
  const eventSprites = (await Promise.all(eventEntries.map(preload))).filter((r) => r && r.ok);

  if (reduce) {
    // static fallback: just show castle + train, no motion
    // (keep existing SVG scene visible, do nothing)
    return;
  }

  // hide original SVG scene, build stage
  const svg = scene.querySelector('svg.hero-sky');
  if (svg) svg.style.display = 'none';

  const stage = document.createElement('div');
  stage.className = 'hero-stage';
  scene.append(stage);

  // background image (station scene)
  const bgEntry = manifest.find((e) => e.role === 'background');
  const bgImg = document.createElement('img');
  bgImg.className = 'hero-bg';
  if (bgEntry) { bgImg.src = bgEntry.file; bgImg.alt = bgEntry.alt || ''; }
  stage.append(bgImg);

  // anchors
  const trainImg = document.createElement('img');
  trainImg.className = 'hero-train';
  trainImg.src = trainRes.img.src;
  trainImg.alt = trainEntry.alt || '';
  if (trainEntry.blend) trainImg.style.mixBlendMode = trainEntry.blend;
  stage.append(trainImg);

  const castleImg = document.createElement('img');
  castleImg.className = 'hero-castle';
  castleImg.src = castleRes.img.src;
  castleImg.alt = castleEntry.alt || '';
  if (castleEntry.blend) castleImg.style.mixBlendMode = castleEntry.blend;
  stage.append(castleImg);

  // window glow overlay for train
  const trainGlow = document.createElement('div');
  trainGlow.className = 'hero-train-glow';
  stage.append(trainGlow);

  // events container
  const eventsEl = document.createElement('div');
  eventsEl.className = 'hero-events';
  stage.append(eventsEl);

  const events = [];
  let nextSpawn = performance.now() + 2000 + Math.random() * 3000;
  const minGap = coarse ? 7000 : 4000;
  const maxGap = coarse ? 12000 : 9000;
  const maxActive = coarse ? 1 : 2;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

  function spawnEvent(now) {
    if (!eventSprites.length) return;
    const spr = eventSprites[Math.floor(Math.random() * eventSprites.length)];
    const el = document.createElement('img');
    el.className = 'hero-event-sprite';
    el.src = spr.img.src;
    el.alt = spr.entry.alt || '';
    eventsEl.append(el);

    const fromLeft = Math.random() < 0.5;
    const ev = {
      el,
      start: now,
      duration: rand(2500, 4500),
      x: fromLeft ? -120 : w + 120,
      y: rand(h * 0.25, h * 0.6),
      vx: (fromLeft ? 1 : -1) * rand(0.08, 0.18),
      vy: rand(-0.02, 0.02),
      scale: rand(0.6, 1.0),
      rot: rand(-0.1, 0.1),
      vr: rand(-0.002, 0.002),
      hold: spr.entry.holdMs || 0,
    };
    events.push(ev);
  }

  // parallax targets
  let scrollY = 0;
  let mx = 0, my = 0;
  let w = 0, h = 0, dpr = 1;

  function resize() {
    const rect = scene.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  if (!coarse) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  // train state
  let trainState = 'idle';
  let trainIdleUntil = performance.now() + 5000;
  let trainRideStart = 0;
  let trainRideDuration = 0;
  let trainDir = 1;
  let trainX = -300;
  let trainY = 0;
  let trainSpeed = 0;

  // castle state
  let castleX = w * 0.6;
  let castleY = h * 0.35;
  let castleBob = 0;

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; }, { threshold: 0 })
    : null;
  io?.observe(scene);

  function tick(now) {
    if (!running) { requestAnimationFrame(tick); return; }

    // train
    if (trainState === 'idle') {
      trainImg.style.opacity = '0';
      if (now >= trainIdleUntil) {
        trainState = 'riding';
        trainRideStart = now;
        trainRideDuration = rand(30000, 60000);
        trainDir = Math.random() < 0.5 ? 1 : -1;
        trainX = trainDir > 0 ? -400 : w + 400;
        trainSpeed = (w + 800) / trainRideDuration;
      }
    } else {
      const rp = (now - trainRideStart) / trainRideDuration;
      if (rp >= 1 || (trainDir > 0 && trainX > w + 400) || (trainDir < 0 && trainX < -400)) {
        trainState = 'idle';
        trainIdleUntil = now + 120000;
        trainImg.style.opacity = '0';
      } else {
        trainX += trainDir * trainSpeed * 16;
        const alpha = rp < 0.08 ? rp / 0.08 : rp > 0.92 ? (1 - rp) / 0.08 : 1;
        trainImg.style.opacity = String(alpha);
        trainY = h * 0.72 + Math.sin(now * 0.001) * 2;
        trainImg.style.transform = `translate3d(${trainX}px, ${trainY}px, 0)`;
      }
    }

    // castle
    castleX += 0.05;
    if (castleX > w + 120) castleX = -120;
    castleBob = Math.sin(now * 0.0008) * 8;
    castleImg.style.transform = `translate3d(${castleX}px, ${castleY + castleBob}px, 0)`;

    // events spawn
    if (events.length < maxActive && now >= nextSpawn) {
      spawnEvent(now);
      nextSpawn = now + (minGap + Math.random() * (maxGap - minGap));
    }

    // update events
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      const p = (now - ev.start) / ev.duration;
      if (p >= 1) { ev.el.remove(); events.splice(i, 1); continue; }
      ev.x += ev.vx;
      ev.y += ev.vy;
      ev.rot += ev.vr;
      const alpha = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
      ev.el.style.opacity = String(alpha);
      ev.el.style.transform = `translate3d(${ev.x}px, ${ev.y}px, 0) scale(${ev.scale}) rotate(${ev.rot}rad)`;
    }

    // parallax for background
    const px = coarse ? 0 : mx * 8;
    const py = scrollY * 0.03 + (coarse ? 0 : my * 6);
    bgImg.style.transform = `translate3d(${px}px, ${py}px, 0) scale(1.05)`;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
