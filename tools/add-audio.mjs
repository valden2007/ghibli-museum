#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filmsPath = path.join(project, 'docs/data/films.json');
const args = process.argv.slice(2);
const opts = { titleRu: '', titleEn: '', credit: '' };
const flags = { '--title-ru': 'titleRu', '--title-en': 'titleEn', '--credit': 'credit' };
if (args.length < 2) {
  console.log('Usage: node tools/add-audio.mjs <filmId> <file> [--title-ru text] [--title-en text] [--credit text]');
  process.exit(1);
}
const filmId = args.shift();
const input = path.resolve(args.shift());
for (let i = 0; i < args.length; i++) if (flags[args[i]]) opts[flags[args[i]]] = args[++i] || '';
if (!/^[a-z0-9-]+$/.test(filmId)) throw new Error('filmId must be lowercase id from films.json');
const ext = path.extname(input).toLowerCase();
if (!['.mp3', '.ogg', '.m4a', '.wav'].includes(ext)) throw new Error(`Unsupported audio format: ${ext}`);
await fs.access(input);

const data = JSON.parse(await fs.readFile(filmsPath, 'utf8'));
const film = data.find((f) => f.id === filmId);
if (!film) throw new Error(`Unknown film id: ${filmId}`);
film.soundtrack ||= [];
const outDir = path.join(project, `docs/audio/${filmId}`);
await fs.mkdir(outDir, { recursive: true });
const stem = path.basename(input, ext).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'track';
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const hasFfprobe = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
const tracks = [];

if (hasFfmpeg) {
  for (const [format, outputExt, codecArgs] of [
    ['mp3', '.mp3', ['-c:a', 'libmp3lame', '-b:a', '128k']],
    ['ogg', '.ogg', ['-c:a', 'libvorbis', '-q:a', '4']],
  ]) {
    const filename = `${stem}${outputExt}`;
    const dest = path.join(outDir, filename);
    const result = spawnSync('ffmpeg', ['-y', '-i', input, '-vn', ...codecArgs, dest], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`ffmpeg failed converting ${format}`);
    tracks.push({ file: `audio/${filmId}/${filename}`, format, absolute: dest });
  }
} else {
  if (ext !== '.mp3' && ext !== '.ogg') console.warn('ffmpeg not found: m4a/wav copied as-is; browser support may vary.');
  const filename = `${stem}${ext}`;
  const dest = path.join(outDir, filename);
  await fs.copyFile(input, dest);
  tracks.push({ file: `audio/${filmId}/${filename}`, format: ext.slice(1), absolute: dest });
}

const chosen = tracks.find((t) => t.format === 'mp3') || tracks[0];
const stat = await fs.stat(chosen.absolute);
if (stat.size > 8 * 1024 * 1024) console.warn(`Warning: track is ${ (stat.size / 1024 / 1024).toFixed(2) } MB (> 8 MB).`);
let duration = null;
if (hasFfprobe) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', chosen.absolute], { encoding: 'utf8' });
  const seconds = Number(probe.stdout?.trim());
  if (Number.isFinite(seconds) && seconds > 0) duration = Math.round(seconds);
}

const track = {
  id: stem,
  title: { ru: opts.titleRu, en: opts.titleEn },
  file: chosen.file,
  alternatives: tracks.filter((t) => t !== chosen).map((t) => t.file),
  credit: opts.credit,
  duration,
};
const old = film.soundtrack.findIndex((t) => t.id === stem);
if (old >= 0) film.soundtrack[old] = track;
else film.soundtrack.push(track);
await fs.writeFile(filmsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${filmId}: added ${track.file}${duration ? ` (${duration}s)` : ''}`);
