export function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;
  const layers = scene.querySelectorAll('[data-speed]');
  if (!layers.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduce) return;

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