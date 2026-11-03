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
  return response.json();
}
  const response = await fetch('data/i18n.json');
  if (!response.ok) {
    throw new Error('Не удалось загрузить i18n.json');
  }
  return response.json();
}