// Register scene modules here as their per-film stages are completed.
// The loader imports only a registered film scene, avoiding 404 requests.
// Value is resolved relative to docs/js/film.js.
export const sceneModules = Object.freeze({
  mononoke: './scenes/mononoke.js',
  'spirited-away': './scenes/spirited-away.js',
  totoro: './scenes/totoro.js',
  howl: './scenes/howl.js',
  ponyo: './scenes/ponyo.js',
  nausicaa: './scenes/nausicaa.js',
  laputa: './scenes/laputa.js',
  kiki: './scenes/kiki.js',
  'porco-rosso': './scenes/porco-rosso.js',
});
