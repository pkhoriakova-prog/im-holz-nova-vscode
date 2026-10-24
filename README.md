# IM HOLZ Nova — проект для VS Code

Статический сайт из исходного HTML. HTML, CSS, JavaScript и изображения
разделены на файлы. Сборка и npm не нужны.

## Как открыть и запустить

1. Распакуйте архив целиком.
2. В VS Code выберите **File → Open Folder** и откройте папку `im-holz-nova-vscode`.
3. Установите расширение **Live Server** от Ritwick Dey. VS Code предложит его
   в рекомендациях этого проекта.
4. Нажмите правой кнопкой на `index.html` → **Open with Live Server**.
5. Правьте файлы и сохраняйте изменения — страница будет обновляться.

Альтернатива, если установлен Python: из папки проекта выполните
`python -m http.server 8000` (или `python3 -m http.server 8000`), затем откройте
`http://localhost:8000` в браузере.

Запускайте сайт через локальный HTTP-сервер: так браузер корректно загружает
SVG-маски стрелок и иконки письма.

## Где что менять

| Путь | Содержимое |
| --- | --- |
| `index.html` | Тексты, структура страницы и ссылки на изображения |
| `css/styles.css` | Цвета, размеры, адаптивная верстка, CSS-анимации и позиции подписей |
| `js/main.js` | Мобильное меню, галерея, вкладки и анимации при прокрутке |
| `images/photos/` | Фотографии AVIF |
| `images/logos/` | Зеленый и белый SVG-логотипы |
| `images/illustrations/` | Иллюстрации AVIF и SVG |
| `images/icons/` | SVG-иконки карточек, стрелки и письма |
| `.vscode/extensions.json` | Рекомендация расширения Live Server |

## Как заменить картинку

Положите новый файл в `images/photos/` и поменяйте `src` нужного тега `<img>`
в `index.html`. Например: `src="images/photos/my-photo.avif"`.
Либо замените существующую картинку файлом с тем же именем.
При другой пропорции фотографии обновите ее атрибуты `width` и `height`.
Пути в HTML считаются от `index.html`, а пути `url(...)` в CSS — от папки `css/`.

Основные фотографии:

- `hero-grieskirchen.avif` — большое изображение первого экрана.
- `gallery-01.avif` … `gallery-06.avif` — бегущая фотогалерея.
- `maggies-centre-exterior.avif`, `maggies-centre-interior.avif` — две сцены
  анимации в разделе Sustainability.
- `kindergarten-hallwang.avif`, `healthcare-madeleine-bres.avif`,
  `housing-schildacker.avif`, `hospitality-quartier.avif` — карточки проектов.

Все статичные SVG вынесены в файлы. В HTML оставлен только пустой элемент SVG
для соединительных линий экосистемы: JavaScript рисует и изменяет их при
прокрутке. Цвета и толщина линий статичных SVG заданы атрибутами внутри самих
SVG-файлов, чтобы они отображались как самостоятельные изображения.

Шрифт Manrope, как в исходнике, подключен через Google Fonts и требует
интернета. Без сети браузер использует системный запасной шрифт.
Ссылки-заглушки и языковые кнопки сохранены в исходном виде.

## CSS class naming

All HTML, SVG, CSS and JavaScript class names use BEM with the bb- prefix:

- Block: bb-viewer
- Element: bb-viewer__image
- Modifier: bb-viewer__nav--prev (alongside bb-viewer__nav)
- State: bb-vision-slide--current or bb-vision--held (alongside the base class)

Update markup, CSS selectors and JavaScript class references together. IDs, data attributes and CSS custom properties keep their existing names.

An element belongs to a block on the same node or an ancestor. Keep modifiers alongside their base class, and list each class only once per HTML attribute. Reuse the same class for repeated instances of a component; give unrelated components separate block names.

Shared typography uses independent `bb-heading` and `bb-section-label` blocks. Shared section structure uses `bb-section__intro`, `bb-section__head`, `bb-section__cards` and `bb-section__ground`. Project introductions use `bb-project-intro` with its own `__head` and `__lede` elements. Photo grids, work grids and source links are independent `bb-photo-grid`, `bb-work-grid` and `bb-source-link` blocks, since they appear in different sections. Card artwork, status and numbering belong to `bb-card`; photo caption details belong to `bb-disclosure`.

## Heading hierarchy

Each complete page has one visible h1 describing its main topic. Heading levels and visual styling are independent; BEM classes control appearance.

On index.html and index-no-pillars.html, the agreed structure uses exactly two h2 headings: the left-hand labels Our Projects and Ecosystem. Their large headings on the right use h3, and their card headings use h4. Other left-hand section labels (The Shift, In Numbers, Project Types, For Whom and Contact) use h3, their large headings on the right use h4, and their card headings use h5. This intentionally allows h3 headings before the first h2; the two-h2 limit is a project preference.

Other pages retain h2 for section headings and h3 for their cards. Footer column labels and photo captions are paragraphs. Files in fragments/ are standalone previews with their own h1; omit the preview header when embedding their sections in another page. Keep aria-labelledby references pointing to existing headings.

All headings use the shared bb-section-label (left labels) or bb-heading class. Context-specific title widths and variants use bb-heading modifiers, including --hero, --projects, --our-projects, --numbers, --audiences, --vision, --ecosystem, --contact and --legal. Card and annotation styles use --project, --work, --card, --eco-card and --annotation modifiers. Always include the base class alongside a modifier.

Repeated components use shared bases with modifiers: bb-card (--audience, --ecosystem, --work), bb-copy (--section, --hero, --project, --work, --card, --ecosystem, --annotation, --footer-brand, --hub), bb-section-label (--footer, --footer-second) and bb-card__icon (--ecosystem). Variant rules retain existing dimensions, spacing and colours. Navigation underline has a fixed 0.8px height and animates its width from 0 to 100% on hover over 0.22 seconds, without transforms.
