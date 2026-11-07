import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const filmsPath = path.join(root, 'docs', 'data', 'films.json');

function fail(msg) { console.error('FAIL:', msg); process.exitCode = 1; }
function ok(msg) { console.log('OK:', msg); }

let data;
try {
  data = JSON.parse(fs.readFileSync(filmsPath, 'utf8'));
} catch (e) {
  fail('films.json invalid JSON: ' + e.message);
  process.exit();
}

if (!Array.isArray(data)) { fail('films.json must be an array'); process.exit(); }

const required = ['id','title','year','director','palette','era','motif','trailerId','watch','synopsis','facts','note','tagline','world','plot','characters','creation','inspiration','crew','themes','opinion','images','soundtrack','verify','sources'];
let total = 0;
for (const film of data) {
  total++;
  for (const f of required) {
    if (!(f in film)) { fail(`${film.id}: missing field ${f}`); continue; }
  }
  // non-empty strings for ru/en
  function checkText(obj, label) {
    if (!obj || typeof obj !== 'object') { fail(`${film.id}: ${label} not object`); return; }
    if (!obj.ru || !obj.en) fail(`${film.id}: ${label} empty ru/en`);
  }
  checkText(film.title, 'title');
  checkText(film.synopsis, 'synopsis');
  checkText(film.tagline, 'tagline');
  checkText(film.world, 'world');
  checkText(film.plot, 'plot');
  checkText(film.creation, 'creation');
  if (film.crew) { checkText(film.crew.music, 'crew.music'); checkText(film.crew.notes, 'crew.notes'); }
  if (film.opinion !== null) fail(`${film.id}: opinion must be null`);
  if (!Array.isArray(film.characters)) fail(`${film.id}: characters not array`);
  if (!Array.isArray(film.inspiration)) fail(`${film.id}: inspiration not array`);
  if (!Array.isArray(film.themes)) fail(`${film.id}: themes not array`);
  if (!Array.isArray(film.images)) fail(`${film.id}: images not array`);
  if (!Array.isArray(film.soundtrack)) fail(`${film.id}: soundtrack not array`);
  if (!Array.isArray(film.verify)) fail(`${film.id}: verify not array`);
  if (!Array.isArray(film.sources)) fail(`${film.id}: sources not array`);
  if (!Array.isArray(film.facts)) fail(`${film.id}: facts not array`);
  // facts non-empty
  for (const f of film.facts) {
    if (!f.ru || !f.en) fail(`${film.id}: empty fact`);
  }
  // characters
  for (const ch of film.characters) {
    if (!ch.id || !ch.name || !ch.role || !ch.description) fail(`${film.id}: character missing fields`);
    checkText(ch.name, 'character.name');
    checkText(ch.role, 'character.role');
    checkText(ch.description, 'character.description');
    if (ch.image) {
      const imgPath = path.join(root, 'docs', ch.image);
      if (!fs.existsSync(imgPath)) fail(`${film.id}: character image missing ${ch.image}`);
    }
  }
  // inspiration
  for (const ins of film.inspiration) {
    checkText(ins.title, 'inspiration.title');
    checkText(ins.text, 'inspiration.text');
  }
  // themes
  for (const th of film.themes) {
    if (!th.ru || !th.en) fail(`${film.id}: empty theme`);
  }
  // images
  for (const im of film.images) {
    if (im.file) {
      const imgPath = path.join(root, 'docs', im.file);
      if (!fs.existsSync(imgPath)) fail(`${film.id}: image file missing ${im.file}`);
      if (!im.alt?.ru?.trim() || !im.alt?.en?.trim()) fail(`${film.id}: image alt must be filled in ru/en (${im.file})`);
      if (!im.caption?.ru?.trim() || !im.caption?.en?.trim()) fail(`${film.id}: image caption must be filled in ru/en (${im.file})`);
      for (const variant of im.srcset || []) {
        const variantPath = path.join(root, 'docs', variant.file);
        if (!fs.existsSync(variantPath)) fail(`${film.id}: srcset file missing ${variant.file}`);
        if (variant.w >= 1600 && fs.existsSync(variantPath) && fs.statSync(variantPath).size > 400 * 1024) {
          fail(`${film.id}: 1600px image exceeds 400 KB (${variant.file})`);
        }
      }
      if (im.w && im.h && (im.w > 12000 || im.h > 12000)) fail(`${film.id}: unreasonable image dimensions ${im.w}x${im.h}`);
    }
  }
  for (const track of film.soundtrack || []) {
    if (!track.id || !track.file) fail(`${film.id}: soundtrack track needs id and file`);
    if (!track.title?.ru?.trim() || !track.title?.en?.trim()) fail(`${film.id}: soundtrack title must be filled in ru/en (${track.id})`);
    const audioFiles = [track.file, ...(track.alternatives || [])];
    for (const audioFile of audioFiles) {
      const audioPath = path.join(root, 'docs', audioFile);
      if (!fs.existsSync(audioPath)) fail(`${film.id}: soundtrack file missing ${audioFile}`);
      else if (fs.statSync(audioPath).size > 8 * 1024 * 1024) fail(`${film.id}: soundtrack file exceeds 8 MB (${audioFile})`);
    }
  }
  // sources
  for (const s of film.sources) {
    if (!s.label || !s.url) fail(`${film.id}: source missing label/url`);
  }
}

console.log(`Validated ${total} films.`);
if (process.exitCode) console.log('Validation FAILED');
else console.log('Validation PASSED');
