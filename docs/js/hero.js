export function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    scene.style.background = 'linear-gradient(180deg, #0a3a4a 0%, #1a6a6a 45%, #e8a070 75%, #f2c9a0 100%)';
    return;
  }

  // local video background
  const wrap = document.createElement('div');
  wrap.className = 'hero-video-bg';
  const video = document.createElement('video');
  video.src = 'img/scenes/hero-bg.mp4';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  wrap.append(video);
  scene.append(wrap);

  const overlay = document.createElement('div');
  overlay.className = 'hero-overlay';
  scene.append(overlay);
}
