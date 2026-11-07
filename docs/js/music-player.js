import { get as getSettings, set as setSettings } from './settings.js';
import { t } from './i18n.js';
import * as audio from './audio.js';

const RESUME_KEY = 'ghibli.music.resume.v1';

function timeText(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function getResume() {
  try { return JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null'); } catch { return null; }
}

export function mountMusicPlayer(root, tracks, lang = 'ru', onLanguageChange = () => {}) {
  if (!root || !Array.isArray(tracks) || !tracks.length) return null;
  root.replaceChildren();
  const list = document.createElement('ol');
  list.className = 'music-track-list';
  const dock = document.createElement('div');
  dock.className = 'music-dock';
  dock.hidden = true;
  const now = document.createElement('p');
  now.className = 'music-now';
  const controls = document.createElement('div');
  controls.className = 'music-controls';
  const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', t('film.music.previous'));
  const play = document.createElement('button'); play.type = 'button'; play.textContent = t('film.music.play');
  const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', t('film.music.next'));
  const elapsed = document.createElement('span'); elapsed.textContent = '0:00';
  const seek = document.createElement('input'); seek.type = 'range'; seek.min = '0'; seek.max = '1000'; seek.value = '0'; seek.setAttribute('aria-label', t('film.music.seek'));
  const duration = document.createElement('span'); duration.textContent = '0:00';
  const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '0.01'; volume.value = String(getSettings().volume); volume.setAttribute('aria-label', t('film.music.volume'));
  const theme = document.createElement('button'); theme.type = 'button';
  controls.append(prev, play, next, elapsed, seek, duration, volume, theme);
  dock.append(now, controls);
  root.append(list, dock);

  let activeIndex = -1;
  let scrubbing = false;
  const resume = getResume();
  let continueButton = null;

  const titleOf = (track) => track?.title?.[lang] || track?.title?.ru || track?.id || '';
  const render = () => {
    list.replaceChildren();
    tracks.forEach((track, index) => {
      const li = document.createElement('li');
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'music-track';
      choose.textContent = titleOf(track);
      choose.addEventListener('click', () => start(index, 0));
      li.append(choose);
      if (track.credit) {
        const credit = document.createElement('small');
        credit.textContent = track.credit;
        li.append(credit);
      }
      list.append(li);
    });
    theme.textContent = t('film.music.theme');
    prev.setAttribute('aria-label', t('film.music.previous'));
    next.setAttribute('aria-label', t('film.music.next'));
    seek.setAttribute('aria-label', t('film.music.seek'));
    volume.setAttribute('aria-label', t('film.music.volume'));
    if (continueButton) continueButton.textContent = t('film.music.continue');
  };

  async function start(index, position = 0) {
    const track = tracks[index];
    if (!track) return;
    activeIndex = index;
    dock.hidden = false;
    now.textContent = titleOf(track);
    setSettings({ sound: true });
    audio.init();
    audio.setEnabled(true);
    audio.setVolume(getSettings().volume);
    await audio.playTrack(track.file, position);
    play.textContent = t('film.music.pause');
    if (continueButton) continueButton.hidden = true;
  }

  if (resume?.file) {
    continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'music-continue';
    continueButton.textContent = t('film.music.continue');
    continueButton.addEventListener('click', async () => {
      dock.hidden = false;
      activeIndex = tracks.findIndex((track) => track.file === resume.file);
      now.textContent = resume.title || (activeIndex >= 0 ? titleOf(tracks[activeIndex]) : resume.file.split('/').pop());
      setSettings({ sound: true });
      audio.init();
      audio.setEnabled(true);
      audio.setVolume(getSettings().volume);
      await audio.playTrack(resume.file, resume.time || 0);
      play.textContent = t('film.music.pause');
      continueButton.hidden = true;
    });
    root.prepend(continueButton);
  }

  play.addEventListener('click', () => {
    if (audio.getTrackState().playing) {
      audio.pauseTrack();
      play.textContent = t('film.music.play');
    } else if (activeIndex >= 0) start(activeIndex, audio.getTrackState().currentTime);
    else if (tracks.length) start(0);
  });
  prev.addEventListener('click', () => start((Math.max(activeIndex, 0) - 1 + tracks.length) % tracks.length));
  next.addEventListener('click', () => start((Math.max(activeIndex, -1) + 1) % tracks.length));
  seek.addEventListener('input', () => { scrubbing = true; });
  seek.addEventListener('change', () => {
    const state = audio.getTrackState();
    if (state.duration) audio.seekTrack(Number(seek.value) / 1000 * state.duration);
    scrubbing = false;
  });
  volume.addEventListener('input', () => {
    const value = Number(volume.value);
    setSettings({ volume: value });
    audio.setVolume(value);
  });
  theme.addEventListener('click', () => {
    if (activeIndex < 0) return;
    const file = tracks[activeIndex].file;
    setSettings({ themeTrack: file, sound: true });
    audio.setEnabled(true);
    audio.setThemeTrack(file);
    audio.playTrack(file, audio.getTrackState().currentTime);
  });

  const unsubscribe = audio.onTrackState((state) => {
    if (state.duration && !scrubbing) seek.value = String(Math.round(state.currentTime / state.duration * 1000));
    elapsed.textContent = timeText(state.currentTime);
    duration.textContent = timeText(state.duration);
    if (!state.playing && activeIndex >= 0) play.textContent = t('film.music.play');
    if (state.src && state.duration) {
      const track = tracks[activeIndex];
      try { sessionStorage.setItem(RESUME_KEY, JSON.stringify({ file: state.src, time: state.currentTime, title: track ? titleOf(track) : '' })); } catch { /* storage optional */ }
    }
  });

  const keydown = (event) => {
    if (!root.contains(document.activeElement) || event.target.matches('input,button')) return;
    if (event.code === 'Space') { event.preventDefault(); play.click(); }
    if (event.key === 'ArrowLeft') audio.seekTrack(audio.getTrackState().currentTime - 5);
    if (event.key === 'ArrowRight') audio.seekTrack(audio.getTrackState().currentTime + 5);
  };
  root.addEventListener('keydown', keydown);
  render();
  return {
    setLang(next) { lang = next; render(); if (activeIndex >= 0) now.textContent = titleOf(tracks[activeIndex]); },
    destroy() { unsubscribe(); root.removeEventListener('keydown', keydown); },
  };
}
