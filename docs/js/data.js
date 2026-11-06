export async function loadFilms() {
  const response = await fetch('data/films.json');
  if (!response.ok) {
    throw new Error('Не удалось загрузить films.json');
  }
  return response.json();
}

export async function loadTimeline() {
  const response = await fetch('data/timeline.json');
  if (!response.ok) {
    throw new Error('Не удалось загрузить timeline.json');
  }
  const data = await response.json();
  if (Array.isArray(data)) return data;
  const list = data.milestones || [];
  if (data.intro) list.intro = data.intro;
  return list;
}

export async function loadHistory() {
  const response = await fetch('data/history.json');
  if (!response.ok) throw new Error('Не удалось загрузить history.json');
  const data = await response.json();
  const list = Array.isArray(data) ? data : (data.chapters || []);
  if (!Array.isArray(data)) {
    if (data.filmography) list.filmography = data.filmography;
    if (data.filmographySpecial) list.filmographySpecial = data.filmographySpecial;
  }
  return list;
}

export async function loadImages() {
  const response = await fetch('data/images.json');
  if (!response.ok) throw new Error('Не удалось загрузить images.json');
  return response.json();
}

export async function loadI18n() {
  const response = await fetch('data/i18n.json');
  if (!response.ok) {
    throw new Error('Не удалось загрузить i18n.json');
  }
  return response.json();
}