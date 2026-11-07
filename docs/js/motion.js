export function createMotionController() {
  let lenis = null;
  let rafId = 0;

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lenis?.destroy?.();
    lenis = null;
    window.__lenis = null;
  }

  function setEffects(level) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (level === 'off' || reduced || !window.Lenis) { stop(); return null; }
    if (lenis) return lenis;
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    const frame = (time) => {
      if (!lenis) return;
      lenis.raf(time);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return lenis;
  }

  return { setEffects, get instance() { return lenis; }, destroy: stop };
}
