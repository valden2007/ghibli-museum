import { get as getSettings, set as setSettings } from './settings.js';
import { setLang, getLang } from './i18n.js';
import * as audio from './audio.js';

const SESSION_KEY = 'ghibli.gate.seen';

export function shouldShowGate() {
  try { return sessionStorage.getItem(SESSION_KEY) !== '1'; } catch (e) { return true; }
}

export function markGateSeen() {
  try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { /* noop */ }
}

export async function initGate() {
  if (!shouldShowGate()) return false;

  const overlay = document.createElement('div');
  overlay.className = 'gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Вход в музей');
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  const settings = getSettings();

  // background
  const bg = document.createElement('div');
  bg.className = 'gate-bg';
  overlay.append(bg);

  // video background is opt-in: set INTRO_VIDEO_AVAILABLE = true when media/intro.mp4 exists
  const INTRO_VIDEO_AVAILABLE = false;
  if (INTRO_VIDEO_AVAILABLE) {
    const v = document.createElement('video');
    v.src = 'media/intro.mp4';
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.className = 'gate-video';
    bg.append(v);
  } else {
    bg.classList.add('gate-fallback');
  }

  // content
  const content = document.createElement('div');
  content.className = 'gate-content';
  overlay.append(content);

  const title = document.createElement('h1');
  title.className = 'gate-title';
  title.textContent = 'Ghibli Museum';
  content.append(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'gate-subtitle';
  subtitle.textContent = 'Музей готовится к открытию…';
  content.append(subtitle);

  // progress
  const progressWrap = document.createElement('div');
  progressWrap.className = 'gate-progress';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 20');
  const lineBg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  lineBg.setAttribute('x1', '0'); lineBg.setAttribute('y1', '10');
  lineBg.setAttribute('x2', '200'); lineBg.setAttribute('y2', '10');
  lineBg.setAttribute('stroke', 'rgba(255,255,255,0.2)');
  lineBg.setAttribute('stroke-width', '2');
  const lineFg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  lineFg.setAttribute('x1', '0'); lineFg.setAttribute('y1', '10');
  lineFg.setAttribute('x2', '0'); lineFg.setAttribute('y2', '10');
  lineFg.setAttribute('stroke', '#fff');
  lineFg.setAttribute('stroke-width', '2');
  lineFg.setAttribute('stroke-linecap', 'round');
  svg.append(lineBg, lineFg);
  progressWrap.append(svg);
  content.append(progressWrap);

  // questions
  const questions = document.createElement('div');
  questions.className = 'gate-questions';
  content.append(questions);

  function makeGroup(label, options, current, onChange) {
    const group = document.createElement('div');
    group.className = 'gate-group';
    const lbl = document.createElement('p');
    lbl.className = 'gate-group-label';
    lbl.textContent = label;
    group.append(lbl);
    const row = document.createElement('div');
    row.className = 'gate-options';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gate-option';
      btn.textContent = opt.label;
      if (opt.value === current) btn.classList.add('active');
      btn.addEventListener('click', () => {
        row.querySelectorAll('.gate-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onChange(opt.value);
      });
      row.append(btn);
    });
    group.append(row);
    if (options[0].hint) {
      const hint = document.createElement('p');
      hint.className = 'gate-hint';
      hint.textContent = options.find((o) => o.value === current)?.hint || '';
      group.append(hint);
    }
    return group;
  }

  let selectedLang = settings.lang;
  let selectedSound = settings.sound;
  let selectedEffects = settings.effects;

  const langGroup = makeGroup('Язык / Language', [
    { label: 'RU', value: 'ru' },
    { label: 'EN', value: 'en' },
  ], selectedLang, (v) => { selectedLang = v; setLang(v); });
  questions.append(langGroup);

  const soundGroup = makeGroup('Звук', [
    { label: 'Со звуком', value: true },
    { label: 'Без звука', value: false },
  ], selectedSound, (v) => { selectedSound = v; });
  questions.append(soundGroup);

  const effectsGroup = makeGroup('Эффекты', [
    { label: 'Полные', value: 'full', hint: 'Все анимации, частицы и параллакс.' },
    { label: 'Лёгкие', value: 'lite', hint: 'Меньше частиц, параллакс только по скроллу.' },
    { label: 'Выключены', value: 'off', hint: 'Без анимаций и частиц.' },
  ], selectedEffects, (v) => { selectedEffects = v; });
  questions.append(effectsGroup);

  const note = document.createElement('p');
  note.className = 'gate-note';
  note.textContent = 'Настройки можно изменить позже в шапке.';
  content.append(note);

  // enter button
  const enterBtn = document.createElement('button');
  enterBtn.type = 'button';
  enterBtn.className = 'gate-enter';
  enterBtn.textContent = 'Войти в музей';
  enterBtn.disabled = true;
  content.append(enterBtn);

  // preload
  let progress = 0;
  function setProgress(p) {
    progress = Math.max(progress, Math.min(100, p));
    const x2 = (progress / 100) * 200;
    lineFg.setAttribute('x2', String(x2));
  }

  const preloadPromise = (async () => {
    const tasks = [];
    // fonts
    tasks.push(document.fonts.ready.then(() => setProgress(20)).catch(() => setProgress(20)));
    // films.json
    tasks.push(fetch('data/films.json').then(() => setProgress(40)).catch(() => setProgress(40)));
    // images: totoro etc (just count as 60)
    tasks.push(new Promise((res) => { setTimeout(() => { setProgress(60); res(); }, 300); }));
    // video (none in fallback)
    tasks.push(Promise.resolve().then(() => setProgress(80)));
    // final
    tasks.push(new Promise((res) => { setTimeout(() => { setProgress(100); res(); }, 500); }));
    await Promise.all(tasks);
  })();

  const maxTimer = setTimeout(() => { setProgress(100); }, 8000);

  preloadPromise.then(() => {
    clearTimeout(maxTimer);
    setProgress(100);
    enterBtn.disabled = false;
    subtitle.textContent = 'Добро пожаловать';
  });

  // focus trap
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const focusable = overlay.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  overlay.addEventListener('keydown', trapFocus);

  // enter
  enterBtn.addEventListener('click', () => {
    setSettings({ lang: selectedLang, sound: selectedSound, effects: selectedEffects });
    markGateSeen();
    // audio init by gesture
    audio.init();
    audio.setEnabled(selectedSound);
    audio.setVolume(getSettings().volume || 0.5);
    if (selectedSound) setTimeout(() => audio.playAmbient(), 300);
    if (selectedEffects === 'off') {
      overlay.style.transition = 'opacity 0.2s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        document.dispatchEvent(new CustomEvent('gate:done'));
      }, 220);
      return;
    }
    const rect = enterBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy));
    overlay.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
    overlay.style.transition = 'clip-path 1.2s cubic-bezier(0.4,0,0.2,1)';
    requestAnimationFrame(() => {
      overlay.style.clipPath = `circle(${maxR}px at ${cx}px ${cy}px)`;
    });
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
      document.dispatchEvent(new CustomEvent('gate:done'));
    }, 1300);
  });

  // focus first group
  setTimeout(() => {
    const firstBtn = questions.querySelector('.gate-option');
    if (firstBtn) firstBtn.focus();
  }, 100);

  return true;
}
