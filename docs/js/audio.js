let ctx = null;
let master = null;
let ambientNodes = [];
let enabled = false;
let volume = 0.5;
let playing = false;

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
    master.gain.linearRampToValueAtTime(volume * (playing ? 1 : 0), ctx.currentTime + 0.1);
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
  if (!enabled || !ctx || playing) return;
  playing = true;
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.5);

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
  if (!playing) return;
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

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (enabled) ctx.resume();
});
