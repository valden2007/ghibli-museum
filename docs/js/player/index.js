import { createYouTubeAdapter } from './adapters/youtube.js';
import { createHtml5Adapter } from './adapters/html5.js';
import { createCanvasAdapter } from './adapters/canvas.js';

function formatTime(s) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export async function mountPlayer(container, options = {}) {
  container.classList.add('player');
  container.tabIndex = 0;

  const mediaHost = document.createElement('div');
  mediaHost.className = 'player-media';
  container.append(mediaHost);

  const controls = document.createElement('div');
  controls.className = 'player-controls';
  container.append(controls);

  const playBtn = document.createElement('button');
  playBtn.className = 'player-btn';
  playBtn.textContent = '▶';
  playBtn.setAttribute('aria-label', 'Play');

  const seek = document.createElement('input');
  seek.setAttribute('aria-label', 'Seek');
  seek.className = 'player-seek';
  seek.min = '0';
  seek.max = '100';
  seek.value = '0';
  seek.step = '0.1';

  const timeLabel = document.createElement('span');
  timeLabel.className = 'player-time';
  timeLabel.textContent = '0:00 / 0:00';

  const muteBtn = document.createElement('button');
  muteBtn.className = 'player-btn';
  muteBtn.textContent = '🔊';
  muteBtn.setAttribute('aria-label', 'Mute');

  const volume = document.createElement('input');
  volume.type = 'range';
  volume.className = 'player-volume';
  volume.setAttribute('aria-label', 'Volume');
  volume.max = '1';
  volume.step = '0.01';
  volume.value = '1';

  const speed = document.createElement('select');
  speed.className = 'player-speed';
  speed.setAttribute('aria-label', 'Playback speed');
  [0.5, 0.75, 1, 1.25, 1.5, 2].forEach((r) => {
    const o = document.createElement('option');
    o.value = String(r);
    o.textContent = `${r}x`;
    if (r === 1) o.selected = true;
    speed.append(o);
  });

  const fsBtn = document.createElement('button');
  fsBtn.className = 'player-btn';
  fsBtn.textContent = '⛶';
  fsBtn.setAttribute('aria-label', 'Fullscreen');

  controls.append(playBtn, seek, timeLabel, muteBtn, volume, speed, fsBtn);

  // loading overlay
  const loading = document.createElement('div');
  loading.className = 'player-loading';
  loading.textContent = 'Загрузка…';
  container.append(loading);

  let adapter = null;
  let hideTimer = null;

  function showControls() {
    container.classList.add('controls-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (adapter && !isPaused()) container.classList.remove('controls-visible');
    }, 2000);
  }

  function isPaused() {
    // best effort
    return !container.classList.contains('is-playing');
  }

  container.addEventListener('mousemove', showControls);
  container.addEventListener('mouseenter', showControls);
  container.addEventListener('mouseleave', () => {
    clearTimeout(hideTimer);
    container.classList.remove('controls-visible');
  });

  // create adapter
  try {
    if (options.adapter === 'youtube') {
      adapter = await createYouTubeAdapter(mediaHost, options.videoId, options);
    } else if (options.adapter === 'html5') {
      adapter = createHtml5Adapter(mediaHost, options.src);
    } else {
      adapter = createCanvasAdapter(mediaHost, options.palette);
    }
  } catch (e) {
    loading.textContent = 'Ошибка загрузки плеера';
    console.error(e);
    return null;
  }
  loading.remove();

  // wire adapter events
  adapter.on('ready', () => {
    seek.max = String(adapter.getDuration() || 0);
    timeLabel.textContent = `${formatTime(0)} / ${formatTime(adapter.getDuration())}`;
  });
  adapter.on('play', () => {
    container.classList.add('is-playing');
    playBtn.textContent = '⏸';
    showControls();
  });
  adapter.on('pause', () => {
    container.classList.remove('is-playing');
    playBtn.textContent = '▶';
    container.classList.add('controls-visible');
  });
  adapter.on('ended', () => {
    container.classList.remove('is-playing');
    playBtn.textContent = '▶';
    container.classList.add('controls-visible');
  });
  adapter.on('time', (t) => {
    if (!seek.matches(':active')) seek.value = String(t);
    timeLabel.textContent = `${formatTime(t)} / ${formatTime(adapter.getDuration())}`;
  });
  adapter.on('error', () => {
    loading.remove();
    const err = document.createElement('div');
    err.className = 'player-error';
    err.textContent = 'Ошибка воспроизведения';
    container.append(err);
  });

  // controls actions
  playBtn.addEventListener('click', () => {
    if (container.classList.contains('is-playing')) adapter.pause();
    else adapter.play();
  });

  seek.addEventListener('input', () => {
    adapter.seek(parseFloat(seek.value));
  });

  muteBtn.addEventListener('click', () => {
    if (adapter.isMuted()) { adapter.unmute(); muteBtn.textContent = '🔊'; }
    else { adapter.mute(); muteBtn.textContent = '🔇'; }
  });

  volume.addEventListener('input', () => {
    adapter.setVolume(parseFloat(volume.value));
  });

  speed.addEventListener('change', () => {
    if (adapter.supportsRate) adapter.setRate(parseFloat(speed.value));
  });

  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen?.();
  });

  // keyboard
  container.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); adapter.seek(adapter.getCurrentTime() + 5); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); adapter.seek(adapter.getCurrentTime() - 5); }
    else if (e.code === 'ArrowUp') { e.preventDefault(); adapter.setVolume(Math.min(1, adapter.getVolume() + 0.1)); volume.value = adapter.getVolume(); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); adapter.setVolume(Math.max(0, adapter.getVolume() - 0.1)); volume.value = adapter.getVolume(); }
    else if (e.key === 'm' || e.key === 'M') { muteBtn.click(); }
    else if (e.key === 'f' || e.key === 'F') { fsBtn.click(); }
  });

  // initial
  container.classList.add('controls-visible');

  return adapter;
}