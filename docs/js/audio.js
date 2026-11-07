let ctx = null;
let master = null;
let ambientNodes = [];
let enabled = false;
let volume = 0.5;
let playing = false;
let themeTrack = null;
let media = null;
let mediaGain = null;
let mediaSource = null;
let trackListeners = new Set();

function ensureCtx() {
  if (ctx) return ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

export function init() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

function notifyTrack() {
  const state = getTrackState();
  trackListeners.forEach((fn) => { try { fn(state); } catch (e) {} });
}

export function onTrackState(fn) {
  trackListeners.add(fn);
  return () => trackListeners.delete(fn);
}

function ensureMedia() {
  const c = ensureCtx();
  if (!c) return null;
  if (!media) {
    media = new Audio();
    media.preload = 'metadata';
    media.loop = true;
    mediaSource = c.createMediaElementSource(media);
    mediaGain = c.createGain();
    mediaGain.gain.value = 0;
    mediaSource.connect(mediaGain);
    mediaGain.connect(master);
    media.addEventListener('play', notifyTrack);
    media.addEventListener('pause', notifyTrack);
    media.addEventListener('timeupdate', notifyTrack);
    media.addEventListener('loadedmetadata', notifyTrack);
    media.addEventListener('error', () => {
      media.pause();
      themeTrack = null;
      notifyTrack();
      if (enabled) playAmbient();
    });
  }
  return media;
}

export function getTrackState() {
  return {
    src: media?.src || '',
    currentTime: media?.currentTime || 0,
    duration: Number.isFinite(media?.duration) ? media.duration : 0,
    playing: Boolean(media && !media.paused),
  };
}

export function seekTrack(time) {
  if (media && Number.isFinite(media.duration)) {
    media.currentTime = Math.max(0, Math.min(media.duration, time));
  }
}

export function pauseTrack() {
  if (media) media.pause();
  notifyTrack();
}

export async function playTrack(file, position = 0) {
  if (!file) return false;
  const player = ensureMedia();
  if (!player) return false;
  if (playing) {
    playing = false;
    ambientNodes.forEach((node) => {
      try { node.stop && node.stop(); } catch (e) { /* already stopped */ }
      try { node.disconnect && node.disconnect(); } catch (e) { /* already disconnected */ }
    });
    ambientNodes = [];
  }
  if (player.src !== new URL(file, document.baseURI).href) player.src = file;
  player.loop = true;
  themeTrack = file;
  enabled = true;
  if (ctx.state === 'suspended') await ctx.resume();
  if (master) master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.12);
  if (mediaGain) {
    mediaGain.gain.cancelScheduledValues(ctx.currentTime);
    mediaGain.gain.setValueAtTime(0, ctx.currentTime);
    mediaGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.8);
  }
  if (position > 0) {
    const setPosition = () => { player.currentTime = position; player.removeEventListener('loadedmetadata', setPosition); };
    if (player.readyState >= 1) player.currentTime = position;
    else player.addEventListener('loadedmetadata', setPosition);
  }
  try { await player.play(); notifyTrack(); return true; }
  catch (e) { notifyTrack(); return false; }
}

export function setThemeTrack(file) {
  const next = file || null;
  const changed = next !== themeTrack;
  themeTrack = next;
  if (changed && themeTrack && enabled) playTrack(themeTrack);
}

function startSynthAmbient() {
  if (!enabled || !ctx || playing) return;
  themeTrack = null;
  playing = true;
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5);
}

export function setEnabled(bool) {
  enabled = !!bool;
  if (!enabled) {
    stopAmbient();
    if (ctx) ctx.suspend();
  } else {
    const c = ensureCtx();
    if (c) c.resume();
  }
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master && ctx) {
    const active = playing || Boolean(media && !media.paused);
    master.gain.linearRampToValueAtTime(volume * (active ? 1 : 0), ctx.currentTime + 0.1);
  }
}

function makeImpulse() {
  if (!ctx) return null;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    }
  }
  return buf;
}

export function playAmbient() {
  if (!enabled || !ctx) return;
  if (themeTrack) {
    const target = new URL(themeTrack, document.baseURI).href;
    if (!media || media.paused || media.src !== target) playTrack(themeTrack);
    return;
  }
  startSynthAmbient();

  // pad: two detuned sines
  const pad = ctx.createOscillator();
  const pad2 = ctx.createOscillator();
  const padGain = ctx.createGain();
  pad.type = 'sine'; pad.frequency.value = 110;
  pad2.type = 'sine'; pad2.frequency.value = 110.5;
  padGain.gain.value = 0.08;
  pad.connect(padGain); pad2.connect(padGain);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 800;
  padGain.connect(filter);
  const conv = ctx.createConvolver();
  conv.buffer = makeImpulse();
  filter.connect(conv);
  conv.connect(master);
  pad.start(); pad2.start();
  ambientNodes.push(pad, pad2, padGain, filter, conv);

  // wind noise
  const bufSize = ctx.sampleRate * 2;
  const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 600; noiseFilter.Q.value = 0.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.03;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start();
  ambientNodes.push(noise, noiseFilter, noiseGain);

  // pentatonic notes
  const notes = [261.63, 293.66, 329.63, 392.0, 440.0];
  function scheduleNote(time) {
    if (!playing) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.06, time + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, time + 2.5);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1200;
    osc.connect(f); f.connect(g); g.connect(master);
    osc.start(time); osc.stop(time + 2.6);
    const next = time + 3 + Math.random() * 4;
    setTimeout(() => scheduleNote(next), (next - ctx.currentTime) * 1000);
  }
  scheduleNote(ctx.currentTime + 1);
}

export function stopAmbient() {
  if (media && !media.paused) {
    if (mediaGain && ctx) mediaGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    setTimeout(() => { if (mediaGain?.gain.value === 0) media.pause(); }, 1250);
  }
  if (!playing) { notifyTrack(); return; }
  playing = false;
  if (master && ctx) {
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  }
  setTimeout(() => {
    ambientNodes.forEach((n) => { try { n.stop && n.stop(); } catch (e) {} try { n.disconnect && n.disconnect(); } catch (e) {} });
    ambientNodes = [];
  }, 1600);
}

export function sfx(name) {
  if (!enabled || !ctx) return;
  if (name === 'click') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.09);
  }
}

export function scene(name, opts = {}) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  const presets = {
    rain: { kind: 'noise', filter: 1400, duration: 1.6, volume: 0.04 },
    wind: { kind: 'noise', filter: 380, duration: 2.6, volume: 0.035 },
    water: { kind: 'noise', filter: 700, duration: 1.4, volume: 0.04 },
    rustle: { kind: 'noise', filter: 2600, duration: 0.7, volume: 0.02 },
    fire: { kind: 'tone', wave: 'triangle', frequency: 140, slide: 90, duration: 0.3, volume: 0.03 },
    footsteps: { kind: 'tone', wave: 'sine', frequency: 92, slide: 60, duration: 0.16, volume: 0.05 },
    bells: { kind: 'tone', wave: 'sine', frequency: 660, slide: 655, duration: 1.4, volume: 0.035 },
    bell: { kind: 'tone', wave: 'sine', frequency: 1046, slide: 1040, duration: 1.8, volume: 0.028 },
    click: { kind: 'tone', wave: 'square', frequency: 1100, slide: 760, duration: 0.05, volume: 0.04 },
    clank: { kind: 'tone', wave: 'square', frequency: 320, slide: 210, duration: 0.14, volume: 0.05 },
    drum: { kind: 'tone', wave: 'sine', frequency: 58, slide: 40, duration: 1.3, volume: 0.09 },
    bird: { kind: 'tone', wave: 'sine', frequency: 2100, slide: 2900, duration: 0.22, volume: 0.022 },
    hum: { kind: 'tone', wave: 'sine', frequency: 196, slide: 190, duration: 2.4, volume: 0.026 },
    musicbox: { kind: 'tone', wave: 'triangle', frequency: 880, slide: 878, duration: 1.2, volume: 0.03 },
    engine: { kind: 'noise', filter: 240, duration: 3.2, volume: 0.03 },
  };
  const preset = { ...(presets[name] || presets.wind), ...(opts || {}) };
  const duration = Math.max(0.04, preset.duration);
  const volume = Math.min(0.12, preset.volume ?? 0.04);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.15, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = preset.filter || 1600;
  let source;
  if (preset.kind === 'noise') {
    const len = Math.max(1, Math.ceil(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      brown = (brown + 0.03 * (Math.random() * 2 - 1)) / 1.03;
      data[i] = brown * 3.2;
    }
    source = c.createBufferSource();
    source.buffer = buf;
  } else {
    source = c.createOscillator();
    source.type = preset.wave || 'sine';
    source.frequency.setValueAtTime(preset.frequency, now);
    if (preset.slide) source.frequency.exponentialRampToValueAtTime(preset.slide, now + duration);
  }
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master || c.destination);
  source.start(now);
  source.stop(now + duration + 0.02);
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (enabled) ctx.resume();
});
