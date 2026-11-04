export function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  if (reduce) return;

  // remove old SVG sun background
  const svg = scene.querySelector('svg.hero-sky');
  if (svg) svg.style.display = 'none';

  // YouTube video background
  const videoId = 'Y3_XCQ09f-Q';
  const wrap = document.createElement('div');
  wrap.className = 'hero-video-bg';
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1`;
  iframe.title = 'Hero background';
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'lazy');
  wrap.append(iframe);
  scene.append(wrap);

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  scene.append(overlay);
}
