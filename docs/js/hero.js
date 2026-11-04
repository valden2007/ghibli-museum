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

  // load available film frames
  let frames = [];
  try {
    const r = await fetch('data/images.json');
    if (r.ok) {
      const data = await r.json();
      frames = Object.values(data).filter((e) => e && e.file).map((e) => e.file);
    }
  } catch (e) { frames = []; }

  const svg = scene.querySelector('svg.hero-sky');
  if (!frames.length) {
    // fallback: keep original SVG hero
    return;
  }

  if (svg) svg.style.display = 'none';

  const stage = document.createElement('div');
  stage.className = 'hero-stage';
  scene.append(stage);

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  stage.append(overlay);

  // two layers for crossfade
  const layerA = document.createElement('img');
  const layerB = document.createElement('img');
  layerA.className = 'hero-bg hero-bg-a';
  layerB.className = 'hero-bg hero-bg-b';
  layerA.src = frames[0];
  layerB.src = frames[1 % frames.length];
  stage.append(layerA, layerB);

  let activeIndex = 0;
  let nextSwap = performance.now() + 8000;
  let showA = true;

  layerA.style.opacity = '1';
  layerB.style.opacity = '0';

  let scrollY = 0;
  let mx = 0, my = 0;

  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  if (!coarse && !reduce) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; }, { threshold: 0 })
    : null;
  io?.observe(scene);

  function tick(now) {
    if (!running) { requestAnimationFrame(tick); return; }

    if (!reduce && frames.length > 1 && now >= nextSwap) {
      activeIndex = (activeIndex + 1) % frames.length;
      const nextSrc = frames[activeIndex];
      if (showA) {
        layerB.src = nextSrc;
        layerB.style.opacity = '1';
        layerA.style.opacity = '0';
      } else {
        layerA.src = nextSrc;
        layerA.style.opacity = '1';
        layerB.style.opacity = '0';
      }
      showA = !showA;
      nextSwap = now + 8000 + Math.random() * 4000;
    }

    const px = coarse ? 0 : mx * 10;
    const py = scrollY * 0.03 + (coarse ? 0 : my * 6);
    const activeLayer = showA ? layerA : layerB;
    activeLayer.style.transform = `translate3d(${px}px, ${py}px, 0) scale(1.05)`;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
