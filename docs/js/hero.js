export function initHero() {
  const scene = document.querySelector('.hero-scene');
  if (!scene) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // reduced-motion fallback: static poster or gradient
  if (reduce) {
    const poster = new Image();
    poster.onload = () => {
      scene.style.backgroundImage = `url('${poster.src}')`;
      scene.style.backgroundSize = 'cover';
      scene.style.backgroundPosition = 'center';
    };
    poster.onerror = () => {
      scene.style.background = 'linear-gradient(180deg, #0a3a4a 0%, #1a6a6a 45%, #e8a070 75%, #f2c9a0 100%)';
    };
    poster.src = 'img/scenes/hero-poster.webp';
    return;
  }

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
