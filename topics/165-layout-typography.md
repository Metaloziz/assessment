# 1. Тема

**Типографика. Типы шрифтов. Свойства для изменения шрифтов. Подключение шрифтов**

---

# 2. Главное в одну фразу

Типографика — это выбор гарнитуры, размеров и интерлиньяжа; браузер рисует текст выбранным шрифтом из стека `font-family`, а веб-шрифты подключают через `@font-face` или `<link>`, не забывая про `font-display` и метрики, чтобы текст не «прыгал» при загрузке.

---

# 3. Суть

> **Типографика** — как выглядит и читается текст: какой **шрифт** (гарнитура), насколько он **крупный**, **жирный**, с каким **межстрочным интервалом** и **межбуквенным** расстоянием. В CSS это не «оформление ради красоты», а часть UX: иерархия заголовков, плотность абзаца, контраст с фоном.

> **Типы шрифтов по начертанию:** **serif** (с засечками — Times, Georgia), **sans-serif** (без засечек — Arial, system-ui), **monospace** (равная ширина символов — для кода), **cursive** и **fantasy** — реже в интерфейсах. В CSS вы не называете «тип файла», а задаёте **стек** `font-family`: «сначала наш брендовый, если не загрузился — системный sans, иначе любой sans-serif».

> **Свойства шрифта:** `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, `font-variant`, сокращение `font`. Размеры лучше в **`rem`** (от корневого `html`), чтобы масштабирование и доступность были предсказуемы. **`line-height`** без единиц (1.5) считается от размера текущей строки; с `px`/`rem` — фиксированная высота строки.

> **Подключение:** локальный файл — **`@font-face`** с `src: url(...)` и форматами `woff2` (основной), `woff`; Google Fonts и аналоги — **`<link rel="stylesheet">`** или `@import` (хуже для perf). **`font-display: swap`** показывает fallback сразу и меняет на webfont после загрузки; **`optional`** — только если шрифт успел быстро, иначе остаётся системный (меньше сдвигов layout). Preload (`<link rel="preload" as="font" crossorigin>`) ускоряет критичный шрифт.

> Ловушка: десять разных `font-size` в `px` на странице вместо **type scale**; `font-weight: 300` для гарнитуры, у которой нет этого начертания (браузер **синтезирует** — «жирность» выглядит криво); подключить только `.ttf` без `woff2`; не указать `font-display` — долгий invisible text (FOIT) или заметный скачок (FOUT/CLS).

---

# 4. Самое главное запомнить

- `font-family` — **стек** с fallback: бренд → системный → generic (`sans-serif`, `serif`, `monospace`).
- Serif / sans / mono — про **начертание**, не про формат файла (`.woff2`, `.ttf`).
- `font-size` + `line-height` + `font-weight` задают ритм; для UI удобна **шкала** (например 0.875 / 1 / 1.25 / 1.5 rem).
- Webfont: `@font-face` + `woff2`; в `<link>` — preconnect к CDN при внешнем хостинге.
- `font-display: swap` — текст виден сразу; `optional` — меньше layout shift, но webfont может не примениться.
- Синтетический bold/italic хуже настоящих начертаний — подключайте нужные `font-weight` / `font-style` в `@font-face`.

---

# 5. Описание

```text
  HTML / CSS
       │
       ├─ @font-face (woff2) ──► файлы на CDN / static
       ├─ <link> Google Fonts ──► stylesheet + font files
       │
       ▼
  font-family: "Brand", system-ui, sans-serif
  font-size / weight / line-height / letter-spacing
       │
       ▼
  браузер: fallback → (загрузка) → webfont · метрики · отрисовка
```

## Типы шрифтов и стек

**Generic-семейства** в конце стека страхуют, если ничего выше не найдено:

```css
body {
  font-family: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
}

code {
  font-family: ui-monospace, "Cascadia Code", monospace;
}
```

**Serif** часто в длинных статьях; **sans** — в интерфейсах; **monospace** — код, таблицы с выравниванием символов.

## Свойства текста

| Свойство | Зачем |
| --- | --- |
| `font-size` | Кегль; `rem` от `html { font-size: 100%; }` |
| `font-weight` | 100–900 или `normal` / `bold`; только реально подключённые начертания |
| `line-height` | Межстрочный интервал; 1.4–1.6 для абзацев |
| `letter-spacing` | Разрядка; заголовки CAPS часто чуть шире |
| `font-style` | `italic` / `normal` |
| `font` | Сокращение: `font: 600 1rem/1.5 "Brand", sans-serif` |

Пример **type scale** через переменные:

```css
:root {
  --font-sans: "Geist", system-ui, sans-serif;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
}

h1 {
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: var(--leading-tight);
}
```

## @font-face

```css
@font-face {
  font-family: "Geist";
  src:
    url("/fonts/geist-latin.woff2") format("woff2"),
    url("/fonts/geist-latin.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* ← текст сразу системным, потом подмена */
}
```

Отдельное правило на каждую пару **weight + style**, если файлы разные. Variable font может покрыть диапазон весов одним файлом.

## Подключение через link

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
  rel="stylesheet"
/>
```

`display=swap` в URL Google Fonts задаёт `font-display` в ответе. Критичный шрифт для LCP-текста можно **preload**:

```html
<link
  rel="preload"
  href="/fonts/geist-latin.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

## FOIT, FOUT и метрики

Пока webfont не готов, браузер либо **скрывает** текст (FOIT), либо показывает **fallback** (FOUT). Разные метрики fallback и webfont дают **layout shift** (CLS). Смягчают: `font-display`, **size-adjust** / **@font-face** с близкими метриками, `optional` для некритичного текста, variable fonts.

## Ловушки

- Копировать `font-family` из Figma без стека — на машине без шрифта всё «поедет».
- `font-weight: 500` при подключённых только 400 и 700 — браузер «нарисует» полужирность сам.
- `@import url(...)` в CSS блокирует параллельную загрузку хуже, чем `<link>` в `<head>`.
- Только `.ttf` без `woff2` — лишний вес; для продакшена нужен современный формат.

Соседние темы: **дизайн-система** — токены в том числе для типографики; **SCSS/PostCSS** — переменные и сборка; **a11y** — контраст и масштаб текста.

---

# 6. Ссылки

- [MDN: font-family](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family)
- [MDN: @font-face](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)
- [MDN: font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [web.dev: Best practices for fonts](https://web.dev/articles/font-best-practices)
- [CSS Fonts Module Level 4 — generic families](https://www.w3.org/TR/css-fonts-4/#generic-font-families)
