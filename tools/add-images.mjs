#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const filmsPath = path.join(project, 'docs/data/films.json');
const args = process.argv.slice(2);
const options = { inputs: [], credit: '', altRu: '', altEn: '', captionRu: '', captionEn: '' };
const flags = { '--credit': 'credit', '--alt-ru': 'altRu', '--alt-en': 'altEn', '--caption-ru': 'captionRu', '--caption-en': 'captionEn' };

function usage() {
  console.log('Usage: node tools/add-images.mjs <filmId> <file|folder...> [--credit text] [--alt-ru text] [--alt-en text] [--caption-ru text] [--caption-en text]');
}

if (args.length < 2) { usage(); process.exit(1); }
const filmId = args.shift();
for (let i = 0; i < args.length; i++) {
  if (flags[args[i]]) options[flags[args[i]]] = args[++i] || '';
  else options.inputs.push(path.resolve(args[i]));
}
if (!/^[a-z0-9-]+$/.test(filmId)) throw new Error('filmId must be lowercase id from films.json');

const files = [];
for (const input of options.inputs) {
  const st = await fs.stat(input);
  if (st.isDirectory()) {
    for (const name of (await fs.readdir(input)).sort()) {
      const p = path.join(input, name);
      if ((await fs.stat(p)).isFile() && /\.(png|jpe?g|webp|tiff?)$/i.test(name)) files.push(p);
    }
  } else files.push(input);
}
if (!files.length) throw new Error('No supported image files found');

const data = JSON.parse(await fs.readFile(filmsPath, 'utf8'));
const film = data.find((item) => item.id === filmId);
if (!film) throw new Error(`Unknown film id: ${filmId}`);
film.images ||= [];
const outDir = path.join(project, `docs/img/films/${filmId}`);
await fs.mkdir(outDir, { recursive: true });

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'image';
for (const input of files) {
  const stem = slug(path.parse(input).name);
  const existing = film.images.find((im) => path.basename(im.file, '.webp') === stem);
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) throw new Error(`Cannot read dimensions: ${input}`);
  const widths = [480, 960, 1600].filter((w) => w <= meta.width);
  if (!widths.length) widths.push(meta.width);
  const variants = [];
  for (const width of widths) {
    const filename = `${stem}-${width}.webp`;
    const dest = path.join(outDir, filename);
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(dest);
    variants.push({ file: `img/films/${filmId}/${filename}`, w: width, bytes: (await fs.stat(dest)).size });
  }
  const largest = variants.at(-1);
  const blurBuffer = await sharp(input).resize(16, 16, { fit: 'inside' }).webp({ quality: 35 }).toBuffer();
  const blur = `data:image/webp;base64,${blurBuffer.toString('base64')}`;
  const entry = {
    file: largest.file,
    w: largest.w,
    h: Math.round(meta.height * largest.w / meta.width),
    alt: { ru: options.altRu, en: options.altEn },
    caption: { ru: options.captionRu, en: options.captionEn },
    credit: options.credit,
    srcset: variants.map(({ file, w }) => ({ file, w })),
    blur,
  };
  if (existing) film.images[film.images.indexOf(existing)] = entry;
  else film.images.push(entry);
  console.log(`${filmId}: ${input} -> ${variants.map((v) => `${v.file} (${v.bytes} B)`).join(', ')}`);
}

await fs.writeFile(filmsPath, `${JSON.stringify(data, null, 2)}\n`);
