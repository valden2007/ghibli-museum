export function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;
  const layers = scene.querySelectorAll('[data-speed]');
  if (!layers.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduce) return;

  // generate grass blades
  const grassLayer = scene.querySelector('.grass-layer');
  if (grassLayer) {
    const w = 1600;
    const baseY = 800;
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
      path.style.animation = `grassSway ${2 + Math.random()*2}s ease-in-out ${Math.random()*2}s infinite`;
      grassLayer.append(path);
    }
  }

  let scrollY = 0;
  let mx = 0;
  let my = 0;

  function update() {
    layers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 0;
      const x = mx * speed * 30;
      const y = scrollY * speed * 0.4 + my * speed * 20;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    update();
  }, { passive: true });

  if (!coarse) {
    window.addEventListener('mousemove', (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      update();
    }, { passive: true });
  }

  update();
}