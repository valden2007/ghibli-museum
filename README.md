# Ghibli Museum

Интерактивный музей-сайт студии Гибли: таймлайн, фильмография и плеер
официальных трейлеров. Статический сайт на GitHub Pages.

![screenshot placeholder](docs/preview.png)

## Юридические границы

Карточки фильмов строятся на референсных кадрах, чтобы передать узнаваемость
их миров; фоны, мотивы и декорации созданы собственной SVG/CSS/canvas-графикой.
Видео воспроизводится через YouTube iframe с официальных каналов. Тексты авторские.

## Запуск локально

```
cd docs
python -m http.server 8000
```

Откройте http://localhost:8000

## Деплой

GitHub Pages: branch `main`, папка `/docs`.
Живая ссылка: https://valden2007.github.io/ghibli-museum/

### Деплой: чек-лист
- Регистр путей: каждый путь в `<link>`, `@import`, `import`, `fetch`, `url()` должен совпадать с именем файла в репо побуквенно (GitHub Pages чувствителен к регистру).
- Все нужные файлы закоммичены: проверь `git ls-files` vs фактические файлы в `docs/`.
- `.gitignore` не должен исключать нужные css/js/data.
- После пуша проверь живой URL с кэш-бастингом `?v=timestamp`: статусы ≥400, ошибки консоли, скриншоты на 1440 и 390.

## Лицензии

- Lenis — MIT (см. docs/js/vendor/LENIS-LICENSE.txt)
- Шрифты — системный стек, без внешних шрифтов
- Демо-ролик в плеере — собственная процедурная canvas-анимация, без внешних медиа

## Как добавить картинки, музыку и мнение

Картинки оптимизируются локально через Sharp (dev dependency); оригиналы остаются вне репозитория. Укажи id фильма из `films.json`, источник и двуязычные подписи:

```
npm install
node tools/add-images.mjs totoro ./photos/totoro-still.jpg --credit "Studio Ghibli" --alt-ru "Тоторо под дождём" --alt-en "Totoro in the rain" --caption-ru "..." --caption-en "..."
```

В `images[]` появится объект вида:

```json
{ "file": "img/films/totoro/totoro-still-1600.webp", "w": 1600, "h": 900, "alt": { "ru": "...", "en": "..." }, "caption": { "ru": "...", "en": "..." }, "credit": "...", "srcset": [{ "file": "img/films/totoro/totoro-still-480.webp", "w": 480 }], "blur": "data:image/webp;base64,..." }
```

Музыка фильма добавляется командой; если установлен ffmpeg, создаются mp3/ogg варианты:

```
node tools/add-audio.mjs totoro ./audio/totoro-theme.mp3 --title-ru "Тема Тоторо" --title-en "Totoro Theme" --credit "..."
```

Запись попадёт в `soundtrack[]` с относительным `file`, `credit` и длительностью (если доступен ffprobe). Мнение автора: заполни `opinion` как `{ "ru": "...", "en": "..." }`; при `null` раздел скрыт.

## Страница 404 и локальная проверка

GitHub Pages автоматически отдаёт `docs/404.html`. На ней `<base>` вычисляется первым inline-скриптом: для `*.github.io` используется первый сегмент пути репозитория, для localhost — `/`. Это нужно, чтобы относительные CSS, JS и медиа работали и на вложенных неизвестных URL.

Локально запусти fallback-сервер без зависимостей: `node tools/dev-server.mjs 4173`, затем открой `http://localhost:4173/путь-которого-нет`.

## Вход (Врата)

На главной странице показывается экран входа «Врата» при первом заходе в сессию. Вопросы: язык, звук, эффекты. Значения сохраняются в localStorage.

Чтобы добавить видео-фон врат: положи файл `docs/media/intro.mp4` (10–20 с, зацикливаемое, без звука, 720p, вес до 6–10 МБ) и постер `docs/media/intro-poster.jpg`. Команда ffmpeg:

```
ffmpeg -i input.mp4 -vf "scale=1280:-2" -an -c:v libx264 -crf 28 -preset slow -movflags +faststart docs/media/intro.mp4
```

Тексты врат меняются через `docs/data/i18n.json` (ключи `gate.*`). Значения по умолчанию: effects определяются по устройству (reduced-motion → off, touch → lite, иначе full).

## Лицензии сторонних ресурсов

Референсные кадры используются в карточках фильмов; фоны, мотивы и декорации —
собственная SVG/CSS/canvas-графика.
