export function createHtml5Adapter(container, src) {
  const video = document.createElement('video');
  video.src = src;
  video.playsInline = true;
  video.preload = 'metadata';
  container.append(video);

  const listeners = { play: [], pause: [], time: [], ended: [], error: [], ready: [] };
  function emit(name, payload) { (listeners[name] || []).forEach((fn) => fn(payload)); }

  video.addEventListener('play', () => emit('play'));
  video.addEventListener('pause', () => emit('pause'));
  video.addEventListener('ended', () => emit('ended'));
  video.addEventListener('error', () => emit('error'));
  video.addEventListener('loadedmetadata', () => emit('ready'));
  video.addEventListener('timeupdate', () => emit('time', video.currentTime));

  return {
    type: 'html5',
    supportsRate: true,
    element: video,
    async play() { await video.play(); },
    pause() { video.pause(); },
    seek(t) { video.currentTime = t; },
    setVolume(v) { video.volume = v; },
    getVolume() { return video.volume; },
    mute() { video.muted = true; },
    unmute() { video.muted = false; },
    isMuted() { return video.muted; },
    setRate(r) { video.playbackRate = r; },
    getRate() { return video.playbackRate; },
    getDuration() { return video.duration || 0; },
    getCurrentTime() { return video.currentTime || 0; },
    destroy() { video.pause(); video.removeAttribute('src'); video.load(); },
    on(name, fn) { if (listeners[name]) listeners[name].push(fn); },
    off(name, fn) { if (listeners[name]) listeners[name] = listeners[name].filter((f) => f !== fn); },
  };
}