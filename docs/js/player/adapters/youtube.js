export function createYouTubeAdapter(container, videoId, options = {}) {
  return new Promise((resolve, reject) => {
    const host = 'https://www.youtube-nocookie.com';

    function loadAPI() {
      if (window.YT && window.YT.Player) return Promise.resolve();
      return new Promise((res) => {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.append(tag);
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          res();
        };
      });
    }

    loadAPI().then(() => {
      const player = new window.YT.Player(container, {
        host,
        videoId,
        playerVars: {
          controls: 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => resolve(makeAdapter(player)),
          onError: (e) => reject(new Error('YouTube error ' + e.data)),
        },
      });
    }).catch(reject);
  });
}

function makeAdapter(player) {
  let state = 0;
  const listeners = { play: [], pause: [], time: [], ended: [], error: [], ready: [] };
  function emit(name, payload) {
    (listeners[name] || []).forEach((fn) => fn(payload));
  }
  player.addEventListener('onStateChange', (e) => {
    state = e.data;
    if (e.data === window.YT.PlayerState.PLAYING) emit('play');
    if (e.data === window.YT.PlayerState.PAUSED) emit('pause');
    if (e.data === window.YT.PlayerState.ENDED) emit('ended');
  });

  return {
    type: 'youtube',
    supportsRate: true,
    async play() { player.playVideo(); },
    pause() { player.pauseVideo(); },
    seek(t) { player.seekTo(t, true); },
    setVolume(v) { player.setVolume(Math.round(v * 100)); },
    getVolume() { return (player.getVolume() || 0) / 100; },
    mute() { player.mute(); },
    unmute() { player.unMute(); },
    isMuted() { return player.isMuted(); },
    setRate(r) { player.setPlaybackRate(r); },
    getRate() { return player.getPlaybackRate(); },
    getDuration() { return player.getDuration() || 0; },
    getCurrentTime() { return player.getCurrentTime() || 0; },
    destroy() { try { player.destroy(); } catch (e) {} },
    on(name, fn) { if (listeners[name]) listeners[name].push(fn); },
    off(name, fn) { if (listeners[name]) listeners[name] = listeners[name].filter((f) => f !== fn); },
  };
}