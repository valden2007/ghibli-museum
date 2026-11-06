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

const required = ['id','title','year','director','palette','era','motif','trailerId','watch','synopsis','facts','note','tagline','world','plot','characters','creation','inspiration','crew','themes','opinion','images','verify','sources'];
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
